"""Nurse Orbit - Backend API."""
import os
import re
import math
import uuid
import base64
import random
import logging
import json
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List, Literal, Tuple

import jwt
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form, Header
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, field_validator
from pwdlib import PasswordHash
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool

from seed_data import SUBJECTS, LESSONS, QUESTIONS, EXAMS, PATHWAYS, NEWS, JOBS
from library_data import CATEGORIES as LIB_CATS, BOOKS as LIB_BOOKS
from clinical_data import DRUGS, ECG_CASES, SIM_CASES, SKILLS, EMERGENCY_TOPICS, VENTILATOR_TOPICS
from medical_images import detect_medical_images
from pediatric_data import BROSELOW_ZONES, PEDIATRIC_DRUGS, broselow_zone_for
from nursing_scope_data import NURSING_SCOPES, CATEGORIES_ORDER, NURSING_TRENDS
from clinical_sims import CLINICAL_SIMS
from procedures_data import NURSING_PROCEDURES, ABNORMAL_DELIVERIES
from language_data import OET_SECTIONS, IELTS_SECTIONS, GERMAN_LESSONS
from osce_data import OSCE_STATIONS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nurse-orbit")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nurseorbit.app").lower().strip()
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()] or ["*"]

# LLM used for chat / structured generation (Emergent LLM key)
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "anthropic")
LLM_MODEL = os.environ.get("LLM_MODEL", "claude-sonnet-5")
IMAGE_MODEL = os.environ.get("IMAGE_MODEL", "gemini-2.5-flash-image-preview")
CHAT_HISTORY_MESSAGES = 20  # prior messages replayed to the model for context

# Object storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "nurse-orbit"
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
_storage_key: Optional[str] = None

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)


def init_storage(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY is not set; object storage unavailable")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _storage_request(method: str, path: str, **kw) -> requests.Response:
    """Call the object store, re-initialising the storage key once if it was rejected."""
    extra_headers = kw.pop("headers", {})
    for attempt in range(2):
        key = init_storage(force=attempt > 0)
        resp = requests.request(method, f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, **extra_headers}, **kw)
        if resp.status_code in (401, 403) and attempt == 0:
            continue
        resp.raise_for_status()
        return resp
    return resp


def put_object(path: str, data: bytes, content_type: str) -> dict:
    resp = _storage_request("PUT", path, headers={"Content-Type": content_type}, data=data, timeout=120)
    try:
        return resp.json()
    except ValueError:
        return {}


def get_object(path: str) -> Tuple[bytes, str]:
    resp = _storage_request("GET", path, timeout=60)
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


async def store_file(path: str, data: bytes, content_type: str) -> None:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "File storage is not configured")
    try:
        await run_in_threadpool(put_object, path, data, content_type)
    except Exception:
        logger.exception("object upload failed: %s", path)
        raise HTTPException(502, "File upload failed. Please try again.")


async def fetch_file(path: str) -> Tuple[bytes, str]:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "File storage is not configured")
    try:
        return await run_in_threadpool(get_object, path)
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            raise HTTPException(404, "File not found in storage")
        logger.exception("object download failed: %s", path)
        raise HTTPException(502, "Could not fetch the file. Please try again.")
    except Exception:
        logger.exception("object download failed: %s", path)
        raise HTTPException(502, "Could not fetch the file. Please try again.")


async def read_upload(file: UploadFile) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(400, "Uploaded file is empty")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File too large (max {MAX_UPLOAD_MB} MB)")
    return data


def safe_ext(filename: Optional[str], default: str) -> str:
    name = filename or ""
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    ext = re.sub(r"[^a-z0-9]", "", ext)[:8]
    return ext or default


# ---------------------------- Validation helpers ----------------------------
AI_TONES = ("warm", "funny", "strict", "neutral")
DOC_CATEGORIES = ["Identity", "Education", "Licensing", "Certifications", "Experience", "Language", "CME", "Career"]


def is_iso_date(s: Optional[str]) -> bool:
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return True
    except (TypeError, ValueError):
        return False


def iso_date_or_none(v: Optional[str]) -> Optional[str]:
    """Pydantic validator body: '' / None -> None, otherwise must be YYYY-MM-DD."""
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    v = v.strip()
    if not is_iso_date(v):
        raise ValueError("must be a date in YYYY-MM-DD format")
    return v


def parse_date(s: Optional[str], field: str = "date") -> date:
    """Parse a YYYY-MM-DD string or raise a 400 the client can show."""
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise HTTPException(400, f"Invalid {field} '{s}'. Expected YYYY-MM-DD.")


def iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def extract_json(text: Optional[str]) -> Optional[dict]:
    """Pull the first JSON object out of an LLM reply (tolerates ``` fences and prose)."""
    if not text:
        return None
    t = re.sub(r"```(?:json)?", "", text).strip()
    m = re.search(r"\{.*\}", t, re.DOTALL)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


# ---------------------------- Models ----------------------------
class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v.strip()


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class TokenResp(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class OnboardingBody(BaseModel):
    role: Optional[str] = Field(None, max_length=100)
    user_type: Optional[str] = Field(None, max_length=100)  # Nursing Student / Staff Nurse / ICU Nurse / ... / International Nurse
    qualification: Optional[str] = Field(None, max_length=100)
    program: Optional[str] = Field(None, max_length=100)  # ANM / GNM / B.Sc / Post Basic / M.Sc
    year: Optional[str] = Field(None, max_length=50)  # 1st Year, 2nd, ..., Postgraduate
    language: Optional[str] = Field(None, max_length=50)  # English / Hindi / Hinglish
    country: Optional[str] = Field(None, max_length=100)
    goal: Optional[str] = Field(None, max_length=200)
    focus_areas: Optional[List[str]] = Field(None, max_length=30)
    ai_name: Optional[str] = Field(None, max_length=40)  # Nickname the user gives the AI (e.g. "Nurse Meera", "Buddy")
    ai_tone: Optional[Literal["warm", "funny", "strict", "neutral"]] = None


class QuestionAttemptBody(BaseModel):
    question_id: str
    selected_index: int = Field(ge=0)
    time_spent_seconds: Optional[int] = 0
    mode: Optional[str] = "practice"


class RecoverySessionCreate(BaseModel):
    topic: str = Field(min_length=1, max_length=200)

    @field_validator("topic")
    @classmethod
    def _topic_not_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("topic must not be blank")
        return s


class RevisionPlanGenerateBody(BaseModel):
    topic: Optional[str] = None


class LogbookEntryCreate(BaseModel):
    clinical_placement: str = Field(min_length=1, max_length=200)
    hospital_department: str = Field(min_length=1, max_length=200)
    date: str
    procedures_observed: List[str] = Field(default_factory=list)
    procedures_performed: List[str] = Field(default_factory=list)
    patients_encountered: int = Field(ge=0, default=0)
    clinical_hours: float = Field(ge=0.0, default=0.0)
    skills_achieved: List[str] = Field(default_factory=list)
    supervisor_feedback: Optional[str] = ""
    reflection: Optional[str] = ""

    @field_validator("date")
    @classmethod
    def _validate_date(cls, v: str) -> str:
        if not v or not is_iso_date(v.strip()):
            raise ValueError("date must be in YYYY-MM-DD format")
        return v.strip()


class LogbookEntryPatch(BaseModel):
    clinical_placement: Optional[str] = Field(None, min_length=1, max_length=200)
    hospital_department: Optional[str] = Field(None, min_length=1, max_length=200)
    date: Optional[str] = None
    procedures_observed: Optional[List[str]] = None
    procedures_performed: Optional[List[str]] = None
    patients_encountered: Optional[int] = Field(None, ge=0)
    clinical_hours: Optional[float] = Field(None, ge=0.0)
    skills_achieved: Optional[List[str]] = None
    supervisor_feedback: Optional[str] = None
    reflection: Optional[str] = None

    @field_validator("date")
    @classmethod
    def _validate_date(cls, v: Optional[str]) -> Optional[str]:
        return iso_date_or_none(v)


class CMERecordCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=100)  # Clinical, Professional Development, Education, Mandatory Training, Other
    hours: float = Field(gt=0, le=1000)
    provider: Optional[str] = Field("", max_length=200)
    date: Optional[str] = None

    @field_validator("date")
    @classmethod
    def _check_date(cls, v):
        return iso_date_or_none(v)


class OETWritingFeedbackBody(BaseModel):
    letter_text: str = Field(min_length=1)

    @field_validator("letter_text")
    @classmethod
    def _text_not_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("letter_text must not be blank")
        return s


class LanguagePracticeBody(BaseModel):
    type: str = Field(min_length=1)  # "oet_speaking", "oet_writing", "ielts_writing", "german_dialogue"
    user_input: str = Field(min_length=1)
    context: Optional[str] = None


class OsceAttemptBody(BaseModel):
    station_id: str = Field(min_length=1, max_length=100)
    checked_steps: List[int] = Field(default_factory=list)  # list of step numbers the student ticked
    time_spent_seconds: Optional[int] = Field(None, ge=0)
    self_notes: Optional[str] = Field("", max_length=2000)


class OsceExaminerBody(BaseModel):
    station_id: str = Field(min_length=1, max_length=100)
    checked_steps: List[int] = Field(default_factory=list)
    self_notes: Optional[str] = Field("", max_length=2000)


class AIChatBody(BaseModel):
    session_id: str = Field(min_length=1, max_length=128)
    message: str = Field(min_length=1, max_length=8000)
    mode: Optional[str] = "STUDENT"  # SIMPLE, STUDENT, CLINICAL, EXAM, QUICK

    @field_validator("message")
    @classmethod
    def _message_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v


# ---------------------------- Helpers ----------------------------
def make_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": user_id, "iat": now, "exp": now + timedelta(minutes=JWT_EXPIRE_MIN)}, JWT_SECRET, algorithm=JWT_ALG)


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role"),
        "user_type": u.get("user_type"),
        "qualification": u.get("qualification"),
        "program": u.get("program"),
        "year": u.get("year"),
        "language": u.get("language", "English"),
        "country": u.get("country"),
        "goal": u.get("goal"),
        "focus_areas": u.get("focus_areas", []),
        "ai_name": u.get("ai_name", "Nurse AI"),
        "ai_tone": u.get("ai_tone", "warm"),
        "onboarded": u.get("onboarded", False),
        "is_admin": u.get("is_admin", False),
        "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }


async def current_user(cred: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    unauth = HTTPException(status_code=401, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    if not cred:
        raise unauth
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload.get("sub")
    except jwt.InvalidTokenError:
        raise unauth
    user = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not user:
        raise unauth
    return user


async def user_id_from_token(token: Optional[str], authorization: Optional[str]) -> str:
    """Auth for file endpoints, which also accept ?token= so <Image>/<WebView> can load them."""
    jwt_token = None
    if authorization and authorization.lower().startswith("bearer "):
        jwt_token = authorization.split(" ", 1)[1].strip()
    elif token:
        jwt_token = token
    if not jwt_token:
        raise HTTPException(401, "Missing token")
    try:
        uid = jwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALG]).get("sub")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    if not uid or not await db.users.find_one({"id": uid}, {"_id": 1}):
        raise HTTPException(401, "Invalid token")
    return uid


def require_ai():
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI is not configured on this server")


# ---------------------------- App ----------------------------
async def _ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id")
    for coll, keys in [
        ("documents", [("user_id", 1)]),
        ("attempts", [("user_id", 1), ("created_at", 1)]),
        ("bookmarks", [("user_id", 1), ("question_id", 1)]),
        ("pathway_progress", [("user_id", 1), ("pathway_id", 1)]),
        ("cme", [("user_id", 1)]),
        ("chats", [("session_id", 1), ("user_id", 1), ("created_at", 1)]),
        ("case_attempts", [("user_id", 1)]),
        ("care_plans", [("user_id", 1), ("created_at", -1)]),
        ("gamification", [("user_id", 1)]),
        ("lib_categories", [("id", 1)]),
        ("lib_books", [("id", 1)]),
        ("lib_books", [("category_id", 1)]),
        ("lib_bookmarks", [("user_id", 1), ("book_id", 1)]),
        ("lib_progress", [("user_id", 1), ("book_id", 1)]),
        ("lib_notes", [("user_id", 1), ("book_id", 1)]),
        ("calendar_events", [("user_id", 1), ("date", 1)]),
        ("leave_configs", [("user_id", 1)]),
        ("health_profiles", [("user_id", 1)]),
        ("vitals", [("user_id", 1), ("at", -1)]),
        ("medications", [("user_id", 1)]),
        ("step_entries", [("user_id", 1), ("date", 1)]),
        ("meals", [("user_id", 1), ("date", 1)]),
        ("labs", [("user_id", 1)]),
        ("translations", [("user_id", 1), ("at", -1)]),
        ("ai_images", [("id", 1), ("user_id", 1)]),
        ("recovery_sessions", [("user_id", 1), ("created_at", -1)]),
        ("revision_plans", [("user_id", 1), ("created_at", -1)]),
        ("logbook", [("user_id", 1)]),
        ("logbook", [("user_id", 1), ("date", -1)]),
        ("journey_plans", [("user_id", 1), ("created_at", -1)]),
    ]:
        await db[coll].create_index(keys)
    # One row per user+lesson / user+day, so double taps and concurrent upserts cannot duplicate
    await db.lesson_progress.create_index([("user_id", 1), ("lesson_id", 1)], unique=True)
    await db.wellbeing.create_index([("user_id", 1), ("date", 1)], unique=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await _ensure_indexes()
    await _bootstrap_library()
    if EMERGENT_LLM_KEY:
        try:
            await run_in_threadpool(init_storage)
            logger.info("Object storage initialized")
        except Exception as e:
            logger.warning(f"Storage init failed (ok in dev): {e}")
    yield
    client.close()


app = FastAPI(title="Nurse Orbit API", lifespan=lifespan)
api = APIRouter(prefix="/api")


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    """Return a human-readable `detail` string (the app shows `detail` directly) plus the raw errors."""
    msgs = []
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path", "form")]
        msg = err.get("msg", "Invalid value").replace("Value error, ", "")
        msgs.append(f"{'.'.join(loc)}: {msg}" if loc else msg)
    return JSONResponse(status_code=422, content={"detail": "; ".join(msgs) or "Invalid request", "errors": jsonable_encoder(exc.errors())})


# ---------------------------- Auth ----------------------------
@api.post("/auth/signup", response_model=TokenResp)
async def signup(body: SignupBody):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "email": email,
        "name": body.name,
        "password_hash": password_hash.hash(body.password),
        "onboarded": False,
        "is_admin": email == ADMIN_EMAIL,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(409, "Email already registered")
    user_out = {k: v for k, v in user.items() if k != "password_hash"}
    return {"access_token": make_token(uid), "token_type": "bearer", "user": public_user(user_out)}


@api.post("/auth/login", response_model=TokenResp)
async def login(body: LoginBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not password_hash.verify(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return {"access_token": make_token(user["id"]), "token_type": "bearer", "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return {"user": public_user(user)}


def _clean_profile_update(upd: dict) -> dict:
    for k in ("name", "ai_name", "role", "user_type", "qualification", "program", "year", "language", "country", "goal"):
        if isinstance(upd.get(k), str):
            upd[k] = upd[k].strip()
    if "name" in upd and not upd["name"]:
        raise HTTPException(400, "Name cannot be empty")
    if "ai_name" in upd and not upd["ai_name"]:
        upd["ai_name"] = "Nurse AI"
    if upd.get("focus_areas") is not None:
        upd["focus_areas"] = [f.strip() for f in upd["focus_areas"] if isinstance(f, str) and f.strip()]
    return upd


@api.post("/auth/onboarding")
async def save_onboarding(body: OnboardingBody, user: dict = Depends(current_user)):
    upd = _clean_profile_update({k: v for k, v in body.model_dump().items() if v is not None})
    upd["onboarded"] = True
    await db.users.update_one({"id": user["id"]}, {"$set": upd})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"user": public_user(fresh)}


class ProfileUpdateBody(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    ai_name: Optional[str] = Field(None, max_length=40)
    ai_tone: Optional[Literal["warm", "funny", "strict", "neutral"]] = None
    language: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=100)
    goal: Optional[str] = Field(None, max_length=200)
    focus_areas: Optional[List[str]] = Field(None, max_length=30)


@api.put("/auth/profile")
async def update_profile(body: ProfileUpdateBody, user: dict = Depends(current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "No fields to update")
    upd = _clean_profile_update(upd)
    await db.users.update_one({"id": user["id"]}, {"$set": upd})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"user": public_user(fresh)}


class AIImageBody(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    style: Optional[Literal["medical_illustration", "anatomy", "pathology"]] = "medical_illustration"


IMAGE_STYLE_HINTS = {
    "medical_illustration": "clean modern medical textbook illustration, flat vector style, anatomically accurate, labelled, high contrast, white background, no text overlays that could be inaccurate",
    "anatomy": "detailed medical anatomy diagram, labelled parts, cross-section view, educational, white background",
    "pathology": "clinical pathology illustration, side-by-side normal vs abnormal, educational textbook style",
}


@api.post("/ai/generate_image")
async def ai_generate_image(body: AIImageBody, user: dict = Depends(current_user)):
    """Generate a medical illustration using Gemini Nano Banana via Emergent LLM key."""
    require_ai()
    prompt = body.prompt.strip()
    if not prompt:
        raise HTTPException(400, "prompt is required")
    style = body.style or "medical_illustration"
    full_prompt = f"{prompt}. Style: {IMAGE_STYLE_HINTS[style]}. Purpose: nursing education."

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"img-{user['id']}-{uuid.uuid4()}",
            system_message="You are a medical illustration image generator.",
        ).with_model("gemini", IMAGE_MODEL).with_params(modalities=["image", "text"])
        _text, images = await chat.send_message_multimodal_response(UserMessage(text=full_prompt))
    except Exception:
        logger.exception("AI image gen failed")
        raise HTTPException(502, "Image generation failed. Please try again.")

    if not images or not images[0].get("data"):
        raise HTTPException(502, "No image returned by model")
    img_b64 = images[0]["data"]
    mime = images[0].get("mime_type") or "image/png"
    try:
        data = base64.b64decode(img_b64)
    except Exception:
        raise HTTPException(502, "Model returned an invalid image")

    # Store in object storage so the client gets a stable URL; fall back to an inline data URL.
    image_id = str(uuid.uuid4())
    path = f"{APP_NAME}/ai_images/{user['id']}/{image_id}.{'jpg' if 'jpeg' in mime else 'png'}"
    stored = False
    try:
        await store_file(path, data, mime)
        stored = True
    except HTTPException:
        logger.warning("AI image not stored; returning inline data URL")

    await db.ai_images.insert_one({
        "id": image_id, "user_id": user["id"], "prompt": prompt, "style": style,
        "storage_path": path if stored else None, "mime_type": mime,
        "created_at": datetime.now(timezone.utc),
    })
    url = f"/api/ai/generated_image/{image_id}" if stored else f"data:{mime};base64,{img_b64}"
    return {"image_id": image_id, "url": url, "mime_type": mime, "stored": stored, "prompt": prompt}


@api.get("/ai/generated_image/{image_id}")
async def get_generated_image(image_id: str, token: Optional[str] = None, authorization: Optional[str] = Header(None)):
    uid = await user_id_from_token(token, authorization)
    doc = await db.ai_images.find_one({"id": image_id, "user_id": uid}, {"_id": 0})
    if not doc or not doc.get("storage_path"):
        raise HTTPException(404, "Image not found")
    content, _ctype = await fetch_file(doc["storage_path"])
    return Response(content=content, media_type=doc.get("mime_type") or "image/png", headers={"Cache-Control": "private, max-age=86400"})


# ---------------------------- Home ----------------------------
CME_REQUIRED_HOURS = 40
EXPIRING_SOON_DAYS = 60
CREDENTIAL_PATTERNS = {
    "License": re.compile(r"\blicen[cs]e\b", re.I),
    "BLS": re.compile(r"\bbls\b", re.I),
    "ACLS": re.compile(r"\bacls\b", re.I),
    "PALS": re.compile(r"\bpals\b", re.I),
}


def expiry_status(exp_str: Optional[str], today: date) -> Tuple[str, Optional[int]]:
    """(status, days_left) for a document expiry date; no/invalid expiry counts as ACTIVE."""
    if not exp_str:
        return "ACTIVE", None
    try:
        days = (datetime.strptime(exp_str[:10], "%Y-%m-%d").date() - today).days
    except ValueError:
        return "ACTIVE", None
    if days < 0:
        return "EXPIRED", days
    if days < EXPIRING_SOON_DAYS:
        return "EXPIRING SOON", days
    return "ACTIVE", days


@api.get("/home/dashboard")
async def home_dashboard(user: dict = Depends(current_user)):
    # Credential statuses (based on documents). When several documents match a credential
    # (e.g. an old and a renewed BLS card) the one that is valid longest wins.
    now = datetime.now(timezone.utc).date()
    creds = {k: "MISSING" for k in CREDENTIAL_PATTERNS}
    cred_expiry = {}
    best_rank = {}
    async for d in db.documents.find({"user_id": user["id"]}, {"_id": 0}):
        for key, pattern in CREDENTIAL_PATTERNS.items():
            if not pattern.search(d.get("name") or ""):
                continue
            status_val, days = expiry_status(d.get("expiry_date"), now)
            rank = float("inf") if days is None else days
            if key in best_rank and rank <= best_rank[key]:
                continue
            best_rank[key] = rank
            creds[key] = status_val
            if days is None:
                cred_expiry.pop(key, None)
            else:
                cred_expiry[key] = {"date": d["expiry_date"], "days": days}

    # CME hours
    total = 0.0
    async for c in db.cme.find({"user_id": user["id"]}, {"_id": 0, "hours": 1}):
        total += float(c.get("hours") or 0)

    # Attempts stats
    attempts = await db.attempts.count_documents({"user_id": user["id"]})
    correct = await db.attempts.count_documents({"user_id": user["id"], "correct": True})
    accuracy = round((correct / attempts) * 100) if attempts else 0

    # Continue learning: the library chapter the user read most recently, else a starter suggestion
    continue_lesson = {"subject": "Pharmacology", "topic": "Cardiovascular Drugs", "progress": 0}
    last = await db.lib_progress.find_one({"user_id": user["id"]}, {"_id": 0}, sort=[("updated_at", -1)])
    if last:
        book = await db.lib_books.find_one({"id": last["book_id"]}, {"_id": 0, "title": 1, "chapters.number": 1, "chapters.title": 1})
        if book:
            ch_n = last.get("current_chapter", 1)
            ch = next((c for c in book.get("chapters", []) if c.get("number") == ch_n), None)
            continue_lesson = {
                "subject": book["title"], "topic": ch["title"] if ch else f"Chapter {ch_n}",
                "progress": last.get("percentage", 0), "book_id": last["book_id"], "chapter": ch_n,
            }

    # Career goal readiness = completed steps of the matching abroad pathway
    goal = user.get("goal") or "Germany"
    readiness = 0
    pathway = next((p for p in PATHWAYS if p["country"].lower() in goal.lower() or p["id"] == goal), None)
    if pathway:
        prog = await db.pathway_progress.find_one({"user_id": user["id"], "pathway_id": pathway["id"]}, {"_id": 0})
        done = len(set(prog.get("completed", [])) & {s["n"] for s in pathway["steps"]}) if prog else 0
        readiness = round(done / len(pathway["steps"]) * 100) if pathway["steps"] else 0

    # Upcoming expiry
    upcoming = None
    for key, val in cred_expiry.items():
        if val["days"] >= 0 and val["days"] < 90:
            if upcoming is None or val["days"] < upcoming["days"]:
                upcoming = {"name": f"{key} Certificate", "date": val["date"], "days": val["days"]}

    return {
        "greeting_name": user.get("name") or "Nurse",
        "country": user.get("country"),
        "role": user.get("role"),
        "credentials": [
            {"name": "License", "status": creds["License"]},
            {"name": "BLS", "status": creds["BLS"]},
            {"name": "ACLS", "status": creds["ACLS"], "expires_in": cred_expiry.get("ACLS", {}).get("days")},
        ],
        "cme": {"completed": total, "required": CME_REQUIRED_HOURS, "remaining": max(0, CME_REQUIRED_HOURS - total)},
        "continue_learning": continue_lesson,
        "career_goal": {"country": pathway["country"] if pathway else goal, "pathway_id": pathway["id"] if pathway else None, "readiness": readiness},
        "upcoming_expiry": upcoming,
        "attempts": attempts,
        "accuracy": accuracy,
    }


# ---------------------------- Study ----------------------------
@api.get("/study/subjects")
async def list_subjects():
    return {"subjects": SUBJECTS}


def subject_lessons(subject_id: str) -> List[dict]:
    return LESSONS.get(subject_id) or [
        # Placeholder lessons until the subject has real content
        {"id": f"{subject_id}-l{i}", "title": f"Topic {i}: Core concepts", "duration": "15 min", "objectives": ["Understand foundational principles", "Apply to clinical scenarios"], "key_concepts": "This lesson covers essential concepts for the subject. Content will be expanded soon.", "clinical_notes": "Review with your instructor.", "references": "Standard nursing textbooks."}
        for i in range(1, 6)
    ]


@api.get("/study/subjects/{subject_id}/lessons")
async def list_lessons(subject_id: str):
    sub = next((s for s in SUBJECTS if s["id"] == subject_id), None)
    if not sub:
        raise HTTPException(404, "Subject not found")
    return {"lessons": subject_lessons(subject_id)}


# ---------------------------- Question Bank ----------------------------
QUESTION_BY_ID = {q["id"]: q for q in QUESTIONS}
SUBJECT_NAME_BY_ID = {s["id"]: s["name"] for s in SUBJECTS}
WEAK_TOPIC_ACCURACY = 0.7  # topics answered correctly less often than this count as weak


def _parse_attempt_datetime(a: dict) -> datetime:
    ca = a.get("created_at")
    if isinstance(ca, datetime):
        return ca if ca.tzinfo else ca.replace(tzinfo=timezone.utc)
    if isinstance(ca, str):
        try:
            dt = datetime.fromisoformat(ca.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc)


@api.get("/questions")
async def get_questions(
    subject_id: Optional[str] = None,
    mode: Literal["practice", "timed", "mock", "weak", "bookmarked", "incorrect"] = "practice",
    limit: int = Query(20, ge=1, le=200),
    user: dict = Depends(current_user),
):
    qs = [q for q in QUESTIONS if not subject_id or q["subject_id"] == subject_id]
    if mode == "bookmarked":
        ids = {b["question_id"] async for b in db.bookmarks.find({"user_id": user["id"]}, {"_id": 0, "question_id": 1})}
        qs = [q for q in qs if q["id"] in ids]
    elif mode == "incorrect":
        ids = {a["question_id"] async for a in db.attempts.find({"user_id": user["id"], "correct": False}, {"_id": 0, "question_id": 1})}
        qs = [q for q in qs if q["id"] in ids]
    elif mode == "weak":
        seen, right = {}, {}
        async for a in db.attempts.find({"user_id": user["id"]}, {"_id": 0, "question_id": 1, "correct": 1}):
            q = QUESTION_BY_ID.get(a["question_id"])
            if q:
                seen[q["topic"]] = seen.get(q["topic"], 0) + 1
                right[q["topic"]] = right.get(q["topic"], 0) + (1 if a.get("correct") else 0)
        accuracy = {t: right[t] / n for t, n in seen.items()}
        qs = sorted((q for q in qs if accuracy.get(q["topic"], 1) < WEAK_TOPIC_ACCURACY), key=lambda q: accuracy[q["topic"]])
    elif mode in ("timed", "mock"):
        qs = random.sample(qs, len(qs))
    return {"questions": qs[:limit]}


@api.post("/questions/attempt")
async def submit_attempt(body: QuestionAttemptBody, user: dict = Depends(current_user)):
    q = QUESTION_BY_ID.get(body.question_id)
    if not q:
        raise HTTPException(404, "Question not found")
    if body.selected_index >= len(q["options"]):
        raise HTTPException(400, f"selected_index must be between 0 and {len(q['options']) - 1}")
    correct = body.selected_index == q["correct_index"]
    time_spent = int(body.time_spent_seconds or 0)
    mode = body.mode or "practice"
    await db.attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "question_id": body.question_id,
        "selected_index": body.selected_index,
        "correct": correct,
        "topic": q.get("topic", ""),
        "subject_id": q.get("subject_id", ""),
        "difficulty": q.get("difficulty", ""),
        "time_spent_seconds": time_spent,
        "mode": mode,
        "created_at": datetime.now(timezone.utc),
    })
    if correct:
        try:
            await _grant_xp(user["id"], 5, "mcq_correct")
        except Exception:
            logger.exception("XP grant failed")

    opt_exps = list(q.get("option_explanations") or [])
    remember_this = str(q.get("remember_this") or "")
    why_wrong = ""
    if not correct and 0 <= body.selected_index < len(opt_exps):
        why_wrong = opt_exps[body.selected_index]

    return {
        "correct": correct,
        "correct_index": q["correct_index"],
        "explanation": q["explanation"],
        "rationale": q["rationale"],
        "reference": q["reference"],
        "option_explanations": opt_exps,
        "remember_this": remember_this,
        "why_wrong": why_wrong,
    }


@api.post("/questions/{qid}/bookmark")
async def bookmark(qid: str, user: dict = Depends(current_user)):
    if qid not in QUESTION_BY_ID:
        raise HTTPException(404, "Question not found")
    r = await db.bookmarks.delete_one({"user_id": user["id"], "question_id": qid})
    if r.deleted_count:
        return {"bookmarked": False}
    await db.bookmarks.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "question_id": qid, "created_at": datetime.now(timezone.utc)})
    return {"bookmarked": True}


@api.get("/questions/stats")
async def question_stats(user: dict = Depends(current_user)):
    cursor = db.attempts.find({"user_id": user["id"]}).sort("created_at", 1)
    attempts = await cursor.to_list(length=None)

    # In-memory backfill for legacy attempts
    for a in attempts:
        q = QUESTION_BY_ID.get(a.get("question_id"))
        if not a.get("topic") and q:
            a["topic"] = q.get("topic", "")
        if not a.get("subject_id") and q:
            a["subject_id"] = q.get("subject_id", "")
        if not a.get("difficulty") and q:
            a["difficulty"] = q.get("difficulty", "")
        if "time_spent_seconds" not in a:
            a["time_spent_seconds"] = 0
        if not a.get("mode"):
            a["mode"] = "practice"

    attempted = len(attempts)
    correct = sum(1 for a in attempts if a.get("correct"))
    accuracy = round(correct / attempted, 2) if attempted else 0.0

    now_utc = datetime.now(timezone.utc)
    today_date = now_utc.date()

    last_7_days = [today_date - timedelta(days=i) for i in range(6, -1, -1)]
    daily_counts = {d: 0 for d in last_7_days}

    questions_today = 0
    total_time = 0

    subject_stats = {}   # subject_key -> {"total": int, "correct": int}
    topic_stats = {}     # topic_name -> {"total": int, "correct": int, "missed": int}
    mock_by_date = {}    # date_str -> {"total": int, "correct": int, "dt": datetime}

    for a in attempts:
        dt = _parse_attempt_datetime(a)
        a_date = dt.date()

        if a_date == today_date:
            questions_today += 1
        if a_date in daily_counts:
            daily_counts[a_date] += 1

        total_time += int(a.get("time_spent_seconds") or 0)

        is_corr = bool(a.get("correct"))
        sub_id = a.get("subject_id") or ""
        sub_name = SUBJECT_NAME_BY_ID.get(sub_id, sub_id)
        if sub_name:
            if sub_name not in subject_stats:
                subject_stats[sub_name] = {"total": 0, "correct": 0}
            subject_stats[sub_name]["total"] += 1
            if is_corr:
                subject_stats[sub_name]["correct"] += 1

        top = a.get("topic") or ""
        if top:
            if top not in topic_stats:
                topic_stats[top] = {"total": 0, "correct": 0, "missed": 0}
            topic_stats[top]["total"] += 1
            if is_corr:
                topic_stats[top]["correct"] += 1
            else:
                topic_stats[top]["missed"] += 1

        if a.get("mode") == "mock":
            d_str = a_date.isoformat()
            if d_str not in mock_by_date:
                mock_by_date[d_str] = {"total": 0, "correct": 0, "dt": dt}
            mock_by_date[d_str]["total"] += 1
            if is_corr:
                mock_by_date[d_str]["correct"] += 1
            if dt > mock_by_date[d_str]["dt"]:
                mock_by_date[d_str]["dt"] = dt

    questions_this_week = sum(daily_counts.values())
    avg_time_seconds = round(total_time / attempted, 1) if attempted else 0.0

    daily_questions = [{"date": d.isoformat(), "count": daily_counts[d]} for d in last_7_days]

    strong_list = []
    weak_list = []

    for sub_name, st in subject_stats.items():
        sub_acc = round(st["correct"] / st["total"], 2) if st["total"] else 0.0
        item = {"subject": sub_name, "accuracy": sub_acc, "count": st["total"]}
        if sub_acc >= 0.75:
            strong_list.append(item)
        if sub_acc < 0.70:
            weak_list.append(item)

    strong_subjects = sorted(strong_list, key=lambda x: (-x["accuracy"], -x["count"], x["subject"]))[:3]
    weak_subjects = sorted(weak_list, key=lambda x: (x["accuracy"], -x["count"], x["subject"]))[:5]

    frequently_missed = []
    for top, st in topic_stats.items():
        if st["missed"] > 2:
            top_acc = round(st["correct"] / st["total"], 2) if st["total"] else 0.0
            frequently_missed.append({
                "topic": top,
                "missed_count": st["missed"],
                "accuracy": top_acc,
            })
    frequently_missed.sort(key=lambda x: (-x["missed_count"], x["accuracy"], x["topic"]))

    mock_sessions = []
    for d_str, st in mock_by_date.items():
        m_acc = round(st["correct"] / st["total"], 2) if st["total"] else 0.0
        mock_sessions.append({
            "date": d_str,
            "total": st["total"],
            "correct": st["correct"],
            "accuracy": m_acc,
            "_dt": st["dt"],
        })
    mock_sessions.sort(key=lambda x: x["_dt"], reverse=True)
    mock_sessions_result = [
        {"date": m["date"], "total": m["total"], "correct": m["correct"], "accuracy": m["accuracy"]}
        for m in mock_sessions[:5]
    ]

    return {
        "attempted": attempted,
        "correct": correct,
        "accuracy": accuracy,
        "questions_today": questions_today,
        "questions_this_week": questions_this_week,
        "avg_time_seconds": avg_time_seconds,
        "strong_subjects": strong_subjects,
        "weak_subjects": weak_subjects,
        "frequently_missed": frequently_missed,
        "mock_sessions": mock_sessions_result,
        "daily_questions": daily_questions,
    }


@api.get("/questions/insights")
async def question_insights(user: dict = Depends(current_user)):
    cursor = db.attempts.find({"user_id": user["id"]}).sort("created_at", -1)
    attempts = await cursor.to_list(length=None)

    for a in attempts:
        q = QUESTION_BY_ID.get(a.get("question_id"))
        if not a.get("topic") and q:
            a["topic"] = q.get("topic", "")

    topic_attempts = {}
    for a in attempts:
        top = a.get("topic") or ""
        if not top:
            continue
        if top not in topic_attempts:
            topic_attempts[top] = []
        topic_attempts[top].append(a)

    qualifying_weakest = []
    all_attempted = []

    for top, att_list in topic_attempts.items():
        recent = att_list[:20]
        cnt = len(recent)
        corr = sum(1 for x in recent if x.get("correct"))
        acc = round(corr / cnt, 2) if cnt else 0.0

        item = {"topic": top, "accuracy": acc, "count": cnt, "attempts": cnt}
        all_attempted.append(item)

        if cnt >= 3 and acc < 0.65:
            qualifying_weakest.append(item)

    qualifying_weakest.sort(key=lambda x: (x["accuracy"], -x["count"], x["topic"]))
    all_attempted.sort(key=lambda x: (x["accuracy"], -x["count"], x["topic"]))

    weakest_topics = qualifying_weakest[:3]

    if weakest_topics:
        focus = weakest_topics[0]["topic"]
        insight = f"Your weakest area this week is {focus}."
    elif all_attempted:
        focus = all_attempted[0]["topic"]
        insight = f"Your weakest area this week is {focus}."
    else:
        focus = ""
        insight = "No weak areas identified this week. Keep up the great work!"

    return {
        "weakest_topics": weakest_topics,
        "insight": insight,
        "suggested_revision_focus": focus,
    }


@api.get("/questions/recovery-candidates")
async def recovery_candidates(user: dict = Depends(current_user)):
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)
    cursor = db.attempts.find({"user_id": user["id"]}).sort("created_at", -1)
    attempts = await cursor.to_list(length=None)

    topic_data = {}
    for a in attempts:
        dt = _parse_attempt_datetime(a)
        if dt < cutoff:
            continue

        q = QUESTION_BY_ID.get(a.get("question_id"))
        top = a.get("topic") or (q.get("topic") if q else "") or ""
        if not top:
            continue

        if top not in topic_data:
            topic_data[top] = {
                "total": 0,
                "correct": 0,
                "missed_count": 0,
                "last_missed_at": None,
            }
        topic_data[top]["total"] += 1
        if a.get("correct"):
            topic_data[top]["correct"] += 1
        else:
            topic_data[top]["missed_count"] += 1
            if topic_data[top]["last_missed_at"] is None or dt > topic_data[top]["last_missed_at"]:
                topic_data[top]["last_missed_at"] = dt

    candidates = []
    for top, data in topic_data.items():
        if data["missed_count"] > 2:
            acc = round(data["correct"] / data["total"], 2) if data["total"] else 0.0
            last_dt = data["last_missed_at"]
            candidates.append({
                "topic": top,
                "missed_count": data["missed_count"],
                "last_missed_at": iso(last_dt) if last_dt else iso(now),
                "accuracy": acc,
            })

    candidates.sort(key=lambda x: (-x["missed_count"], x["accuracy"], x["topic"]))
    return {"candidates": candidates[:5]}


# ---------------------------- Recovery Sessions ----------------------------
@api.post("/recovery/session")
async def create_recovery_session(body: RecoverySessionCreate, user: dict = Depends(current_user)):
    require_ai()
    try:
        from emergentintegrations.llm.chat import UserMessage
    except ImportError:
        class UserMessage:
            def __init__(self, text: str):
                self.text = text

    topic = body.topic.strip()

    prompt = f"""You are an expert NCLEX clinical nursing educator. Generate an auto-generated Recovery Session (a 6-step mini-curriculum) to help a nursing student master the topic: "{topic}".

You MUST return ONLY a valid JSON object (no markdown formatting fences, no explanations outside JSON) with this exact schema:
{{
  "topic": "{topic}",
  "step1_explanation": "A comprehensive 300-400 word clinical explanation covering pathophysiology, key mechanisms, pharmacology/interventions, and NCLEX priorities.",
  "step2_visual": "A structured text-based breakdown, ASCII diagram, or table summarizing essential relationships, algorithms, or classifications.",
  "step3_mini_case": "A realistic 1-paragraph clinical patient presentation illustrating the topic.",
  "step4_mcqs": [
    {{
      "question": "NCLEX-style practice question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Detailed rationale explaining why the correct option is right and distractors are wrong."
    }}
  ],
  "step5_clinical_scenario": "A clinical decision-making case requiring prioritization and critical nursing judgment.",
  "step6_assessment": [
    {{
      "question": "Final assessment question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0
    }}
  ]
}}

Requirements:
- step4_mcqs MUST contain exactly 5 high-yield multiple-choice questions with 4 options each, correct_index (0-3), and detailed explanations.
- step6_assessment MUST contain exactly 3 final assessment questions with 4 options each and correct_index (0-3).
- Output strictly valid JSON only."""

    chat = new_llm_chat(
        f"recovery-{user['id']}-{uuid.uuid4().hex[:8]}",
        "You are an expert NCLEX nursing instructor. Respond ONLY with valid JSON matching the requested structure."
    )
    try:
        reply = await chat.send_message(UserMessage(text=prompt))
        data = extract_json(reply)
    except Exception:
        logger.exception("Recovery session LLM generation failed")
        raise HTTPException(502, "The AI service is unavailable right now. Please try again.")

    if not data or not isinstance(data, dict):
        raise HTTPException(502, "The AI returned an invalid response structure. Please try again.")

    data["topic"] = topic
    data.setdefault("step1_explanation", f"Clinical review for {topic}.")
    data.setdefault("step2_visual", f"Structured summary for {topic}.")
    data.setdefault("step3_mini_case", f"Patient case presentation for {topic}.")
    data.setdefault("step4_mcqs", [])
    data.setdefault("step5_clinical_scenario", f"Clinical decision scenario for {topic}.")
    data.setdefault("step6_assessment", [])

    session_id = str(uuid.uuid4())
    doc = {
        "id": session_id,
        "user_id": user["id"],
        "topic": topic,
        "created_at": datetime.now(timezone.utc),
        "session_data": data,
        "completed": False,
    }
    await db.recovery_sessions.insert_one(doc)

    return {
        "session_id": session_id,
        "session_data": data,
        **data,
    }


@api.post("/recovery/session/{session_id}/complete")
async def complete_recovery_session(session_id: str, user: dict = Depends(current_user)):
    sess = await db.recovery_sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not sess:
        raise HTTPException(404, "Recovery session not found")

    await db.recovery_sessions.update_one(
        {"id": session_id, "user_id": user["id"]},
        {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc)}}
    )
    if not sess.get("completed"):
        try:
            await _grant_xp(user["id"], 50, "recovery_session_complete")
        except Exception:
            logger.exception("XP grant failed for recovery session")

    return {"completed": True, "xp_awarded": 50}


@api.get("/recovery/sessions")
async def list_recovery_sessions(user: dict = Depends(current_user)):
    out = []
    async for s in db.recovery_sessions.find(
        {"user_id": user["id"]},
        {"_id": 0, "id": 1, "topic": 1, "created_at": 1, "completed": 1}
    ).sort("created_at", -1).limit(10):
        out.append({
            "id": s["id"],
            "topic": s.get("topic", ""),
            "created_at": iso(s.get("created_at")),
            "completed": bool(s.get("completed", False)),
        })
    return {"sessions": out}


# ---------------------------- Revision Plans ----------------------------
async def _detect_weakest_topic(user_id: str) -> Optional[str]:
    cursor = db.attempts.find({"user_id": user_id}).sort("created_at", -1)
    attempts = await cursor.to_list(length=None)

    for a in attempts:
        q = QUESTION_BY_ID.get(a.get("question_id"))
        if not a.get("topic") and q:
            a["topic"] = q.get("topic", "")

    topic_attempts = {}
    for a in attempts:
        top = a.get("topic") or ""
        if not top:
            continue
        if top not in topic_attempts:
            topic_attempts[top] = []
        topic_attempts[top].append(a)

    qualifying_weakest = []
    for top, att_list in topic_attempts.items():
        recent = att_list[:20]
        cnt = len(recent)
        corr = sum(1 for x in recent if x.get("correct"))
        acc = round(corr / cnt, 2) if cnt else 0.0
        if cnt >= 3 and acc < 0.65:
            qualifying_weakest.append({"topic": top, "accuracy": acc, "count": cnt})

    if not qualifying_weakest:
        return None

    qualifying_weakest.sort(key=lambda x: (x["accuracy"], -x["count"], x["topic"]))
    return qualifying_weakest[0]["topic"]


@api.post("/revision/generate-plan")
async def generate_revision_plan(body: RevisionPlanGenerateBody, user: dict = Depends(current_user)):
    topic = (body.topic or "").strip()
    if not topic:
        topic = await _detect_weakest_topic(user["id"])
        if not topic:
            raise HTTPException(400, "No weak areas detected yet. Complete more questions first.")

    require_ai()
    try:
        from emergentintegrations.llm.chat import UserMessage
    except ImportError:
        class UserMessage:
            def __init__(self, text: str):
                self.text = text

    prompt = f"""You are an expert NCLEX clinical nursing tutor and curriculum planner. Generate a structured 7-day revision study plan for a nursing student focused on: "{topic}".

You MUST return ONLY a valid JSON object (no markdown formatting fences, no explanations outside JSON) with this exact schema:
{{
  "topic": "{topic}",
  "rationale": "1-2 sentences explaining why this topic is the focus and why mastering it is vital for NCLEX success and patient safety.",
  "days": [
    {{
      "day": 1,
      "title": "Day 1 Title (e.g., Core Principles & Drug Classifications)",
      "focus": "High-yield focus area for Day 1",
      "tasks": [
        "Task 1: Specific actionable clinical study task",
        "Task 2: Practice question drill or case review",
        "Task 3: Synthesis or flashcard review"
      ],
      "ai_prompt": "A ready-to-use prompt the student can paste into Orbit AI Tutor"
    }}
  ]
}}

Requirements:
- The "days" array MUST contain exactly 7 objects (days 1 through 7).
- Each day must include 3 to 5 specific, practical tasks.
- Each day must include a distinct, insightful "ai_prompt" ready for an AI tutor.
- Output strictly valid JSON only."""

    chat = new_llm_chat(
        f"revision-{user['id']}-{uuid.uuid4().hex[:8]}",
        "You are an expert NCLEX nursing tutor. Respond ONLY with valid JSON matching the requested structure."
    )
    try:
        reply = await chat.send_message(UserMessage(text=prompt))
        data = extract_json(reply)
    except Exception:
        logger.exception("Revision plan LLM generation failed")
        raise HTTPException(502, "The AI service is unavailable right now. Please try again.")

    if not data or not isinstance(data, dict):
        raise HTTPException(502, "The AI returned an invalid response structure. Please try again.")

    data["topic"] = topic
    data.setdefault("rationale", f"A targeted 7-day study curriculum focusing on {topic} for NCLEX mastery.")
    data.setdefault("days", [])

    plan_id = str(uuid.uuid4())
    doc = {
        "id": plan_id,
        "user_id": user["id"],
        "topic": topic,
        "created_at": datetime.now(timezone.utc),
        "plan_data": data,
    }
    await db.revision_plans.insert_one(doc)

    return {
        "plan_id": plan_id,
        "id": plan_id,
        "plan_data": data,
        **data,
    }


@api.get("/revision/plans")
async def list_revision_plans(user: dict = Depends(current_user)):
    out = []
    async for p in db.revision_plans.find(
        {"user_id": user["id"]},
        {"_id": 0, "id": 1, "topic": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5):
        out.append({
            "id": p["id"],
            "topic": p.get("topic", ""),
            "created_at": iso(p.get("created_at")),
        })
    return {"plans": out}


@api.get("/revision/plans/{plan_id}")
async def get_revision_plan(plan_id: str, user: dict = Depends(current_user)):
    p = await db.revision_plans.find_one({"id": plan_id, "user_id": user["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Revision plan not found")

    plan_data = p.get("plan_data") or {}
    return {
        "id": p["id"],
        "plan_id": p["id"],
        "topic": p.get("topic", ""),
        "created_at": iso(p.get("created_at")),
        "plan_data": plan_data,
        **plan_data,
    }


# ---------------------------- Clinical Logbook ----------------------------
@api.post("/logbook")
async def create_logbook_entry(body: LogbookEntryCreate, user: dict = Depends(current_user)):
    entry_id = str(uuid.uuid4())
    now_dt = datetime.now(timezone.utc)
    doc = {
        "id": entry_id,
        "user_id": user["id"],
        "clinical_placement": body.clinical_placement.strip(),
        "hospital_department": body.hospital_department.strip(),
        "date": body.date,
        "procedures_observed": [p.strip() for p in body.procedures_observed if p.strip()],
        "procedures_performed": [p.strip() for p in body.procedures_performed if p.strip()],
        "patients_encountered": int(body.patients_encountered or 0),
        "clinical_hours": round(float(body.clinical_hours or 0.0), 2),
        "skills_achieved": [s.strip() for s in body.skills_achieved if s.strip()],
        "supervisor_feedback": (body.supervisor_feedback or "").strip(),
        "reflection": (body.reflection or "").strip(),
        "created_at": now_dt,
    }
    await db.logbook.insert_one(doc)
    try:
        await _grant_xp(user["id"], 10, "logbook_entry")
    except Exception:
        logger.exception("XP grant failed for logbook entry")

    doc["created_at"] = iso(doc["created_at"])
    doc.pop("_id", None)
    return doc


@api.get("/logbook")
async def list_logbook_entries(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user: dict = Depends(current_user),
):
    query = {"user_id": user["id"]}
    date_filter = {}
    if from_date:
        f_date = parse_date(from_date, "from_date")
        date_filter["$gte"] = f_date.isoformat()
    if to_date:
        t_date = parse_date(to_date, "to_date")
        date_filter["$lte"] = t_date.isoformat()
    if date_filter:
        query["date"] = date_filter

    entries = []
    total_hours = 0.0
    total_patients = 0
    unique_skills_set = set()
    unique_skills = []

    async for e in db.logbook.find(query, {"_id": 0}).sort([("date", -1), ("created_at", -1)]):
        e["created_at"] = iso(e.get("created_at"))
        entries.append(e)
        total_hours += float(e.get("clinical_hours") or 0.0)
        total_patients += int(e.get("patients_encountered") or 0)
        for s in e.get("skills_achieved") or []:
            s_clean = s.strip()
            if s_clean and s_clean not in unique_skills_set:
                unique_skills_set.add(s_clean)
                unique_skills.append(s_clean)

    summary = {
        "total_entries": len(entries),
        "total_hours": round(total_hours, 2),
        "total_patients": total_patients,
        "unique_skills": unique_skills,
    }
    return {"entries": entries, "summary": summary}


@api.get("/logbook/portfolio")
async def get_logbook_portfolio(user: dict = Depends(current_user)):
    cursor = db.logbook.find({"user_id": user["id"]}, {"_id": 0}).sort([("date", 1), ("created_at", 1)])
    all_entries = await cursor.to_list(length=None)

    total_hours = 0.0
    total_patients = 0
    placement_map = {}
    observed_set = set()
    observed_list = []
    performed_set = set()
    performed_list = []
    skills_set = set()
    skills_list = []
    timeline = []
    feedback_snippets = []

    for e in all_entries:
        hrs = float(e.get("clinical_hours") or 0.0)
        pts = int(e.get("patients_encountered") or 0)
        total_hours += hrs
        total_patients += pts

        plc = (e.get("clinical_placement") or "General").strip()
        dept = (e.get("hospital_department") or "").strip()
        key = (plc, dept)
        if key not in placement_map:
            placement_map[key] = {"placement": plc, "department": dept, "hours": 0.0, "entries": 0}
        placement_map[key]["hours"] += hrs
        placement_map[key]["entries"] += 1

        for p in e.get("procedures_observed") or []:
            p_clean = p.strip()
            if p_clean and p_clean not in observed_set:
                observed_set.add(p_clean)
                observed_list.append(p_clean)

        for p in e.get("procedures_performed") or []:
            p_clean = p.strip()
            if p_clean and p_clean not in performed_set:
                performed_set.add(p_clean)
                performed_list.append(p_clean)

        for s in e.get("skills_achieved") or []:
            s_clean = s.strip()
            if s_clean and s_clean not in skills_set:
                skills_set.add(s_clean)
                skills_list.append(s_clean)

        timeline.append({
            "date": e.get("date") or "",
            "placement": plc,
            "hours": round(hrs, 2),
        })

        fb = (e.get("supervisor_feedback") or "").strip()
        if fb:
            feedback_snippets.append(fb)

    placements = [
        {"placement": v["placement"], "department": v["department"], "hours": round(v["hours"], 2), "entries": v["entries"]}
        for v in placement_map.values()
    ]

    last_feedbacks = feedback_snippets[-3:]
    last_feedbacks.reverse()

    return {
        "student_name": user.get("name") or "Nursing Student",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_clinical_hours": round(total_hours, 2),
        "total_patients_encountered": total_patients,
        "total_entries": len(all_entries),
        "placements": placements,
        "procedures_observed": observed_list,
        "procedures_performed": performed_list,
        "skills_achieved": skills_list,
        "skills_count": len(skills_list),
        "timeline": timeline,
        "supervisor_feedback_snippets": last_feedbacks,
    }


@api.get("/logbook/{entry_id}")
async def get_logbook_entry(entry_id: str, user: dict = Depends(current_user)):
    entry = await db.logbook.find_one({"id": entry_id, "user_id": user["id"]}, {"_id": 0})
    if not entry:
        raise HTTPException(404, "Logbook entry not found")
    entry["created_at"] = iso(entry.get("created_at"))
    return entry


@api.put("/logbook/{entry_id}")
async def update_logbook_entry(entry_id: str, body: LogbookEntryPatch, user: dict = Depends(current_user)):
    entry = await db.logbook.find_one({"id": entry_id, "user_id": user["id"]}, {"_id": 0})
    if not entry:
        raise HTTPException(404, "Logbook entry not found")

    updates = {}
    if body.clinical_placement is not None:
        updates["clinical_placement"] = body.clinical_placement.strip()
    if body.hospital_department is not None:
        updates["hospital_department"] = body.hospital_department.strip()
    if body.date is not None:
        updates["date"] = body.date
    if body.procedures_observed is not None:
        updates["procedures_observed"] = [p.strip() for p in body.procedures_observed if p.strip()]
    if body.procedures_performed is not None:
        updates["procedures_performed"] = [p.strip() for p in body.procedures_performed if p.strip()]
    if body.patients_encountered is not None:
        updates["patients_encountered"] = int(body.patients_encountered)
    if body.clinical_hours is not None:
        updates["clinical_hours"] = round(float(body.clinical_hours), 2)
    if body.skills_achieved is not None:
        updates["skills_achieved"] = [s.strip() for s in body.skills_achieved if s.strip()]
    if body.supervisor_feedback is not None:
        updates["supervisor_feedback"] = body.supervisor_feedback.strip()
    if body.reflection is not None:
        updates["reflection"] = body.reflection.strip()

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        await db.logbook.update_one({"id": entry_id, "user_id": user["id"]}, {"$set": updates})

    updated_entry = await db.logbook.find_one({"id": entry_id, "user_id": user["id"]}, {"_id": 0})
    updated_entry["created_at"] = iso(updated_entry.get("created_at"))
    if "updated_at" in updated_entry:
        updated_entry["updated_at"] = iso(updated_entry.get("updated_at"))
    return updated_entry


@api.delete("/logbook/{entry_id}")
async def delete_logbook_entry(entry_id: str, user: dict = Depends(current_user)):
    r = await db.logbook.delete_one({"id": entry_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Logbook entry not found")
    return {"deleted": True, "id": entry_id}


# ---------------------------- Languages (OET, IELTS, German) ----------------------------
@api.get("/languages/oet")
async def get_oet_sections():
    return OET_SECTIONS


@api.get("/languages/ielts")
async def get_ielts_sections():
    return IELTS_SECTIONS


@api.get("/languages/german")
async def get_german_lessons(level: Optional[str] = None):
    if level:
        lvl = level.strip().upper()
        return [l for l in GERMAN_LESSONS if l.get("level", "").upper() == lvl]
    return GERMAN_LESSONS


@api.get("/languages/german/{lesson_id}")
async def get_german_lesson(lesson_id: str):
    lesson = next((l for l in GERMAN_LESSONS if l.get("id") == lesson_id), None)
    if not lesson:
        raise HTTPException(404, "German lesson not found")
    return lesson


@api.post("/languages/oet/writing-feedback")
async def oet_writing_feedback(body: OETWritingFeedbackBody, user: dict = Depends(current_user)):
    require_ai()
    try:
        from emergentintegrations.llm.chat import UserMessage
    except ImportError:
        class UserMessage:
            def __init__(self, text: str):
                self.text = text

    letter_text = body.letter_text.strip()

    prompt = f"""You are an official, senior OET (Occupational English Test) Writing examiner evaluating an official nursing referral or transfer letter.
Evaluate the letter strictly against official OET assessment criteria:
1. Purpose and genre (clear immediate purpose, clinical urgency, formal tone)
2. Content & Outcome (completeness, accuracy of patient information, diagnosis, management plan)
3. Organization and layout (professional letterhead format, salutation, logical paragraph sequencing, concise clinical flow)
4. Language (clinical register, grammatical accuracy, spelling, vocabulary, cohesive markers)

Letter submitted for evaluation:
\"\"\"
{letter_text}
\"\"\"

You MUST return ONLY a valid JSON object (no markdown formatting, no code fences) matching this schema:
{{
  "grade": "B",
  "feedback": "Detailed examiner assessment summarizing performance across purpose, content, layout, and language.",
  "strengths": [
    "Specific positive aspect 1 with medical context",
    "Specific positive aspect 2 with medical context"
  ],
  "improvements": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ]
}}
Requirements:
- grade MUST be one of: "A", "B", "C+", "C", "D", "E"
- strengths MUST be a non-empty list of strings
- improvements MUST be a non-empty list of strings
- Output strictly valid JSON only."""

    chat = new_llm_chat(
        f"oet-feedback-{user['id']}-{uuid.uuid4().hex[:8]}",
        "You are an official OET writing examiner for nurses. Respond strictly with valid JSON."
    )
    try:
        reply = await chat.send_message(UserMessage(text=prompt))
        data = extract_json(reply)
    except Exception:
        logger.exception("OET writing feedback LLM call failed")
        raise HTTPException(502, "The AI service is unavailable right now. Please try again.")

    if not data or not isinstance(data, dict):
        raise HTTPException(502, "Invalid response from AI examiner. Please try again.")

    grade = str(data.get("grade", "B")).strip().upper()
    if grade not in ("A", "B", "C+", "C", "D", "E"):
        grade = "B"
    feedback = str(data.get("feedback", "Your OET referral letter has been assessed against official criteria.")).strip()
    strengths = data.get("strengths") or ["Clear clinical purpose and accurate patient context."]
    if not isinstance(strengths, list):
        strengths = [str(strengths)]
    improvements = data.get("improvements") or ["Ensure precise paragraph sequencing for secondary diagnoses."]
    if not isinstance(improvements, list):
        improvements = [str(improvements)]

    return {
        "grade": grade,
        "feedback": feedback,
        "strengths": [str(s) for s in strengths],
        "improvements": [str(i) for i in improvements],
    }


@api.post("/languages/practice")
async def language_practice(body: LanguagePracticeBody, user: dict = Depends(current_user)):
    require_ai()
    try:
        from emergentintegrations.llm.chat import UserMessage, TextDelta, StreamDone
    except ImportError:
        class UserMessage:
            def __init__(self, text: str):
                self.text = text
        class TextDelta:
            def __init__(self, content: str):
                self.content = content
        class StreamDone:
            pass

    ptype = body.type.strip().lower()
    user_input = body.user_input.strip()
    context = (body.context or "").strip()

    if ptype == "oet_speaking":
        system_instruction = (
            "You are an interlocutor and patient in an OET Speaking role-play with a registered nurse. "
            "Respond authentically as the patient, expressing symptoms or concerns naturally while assessing "
            "the nurse's bedside empathy, clarity, and communication technique."
        )
    elif ptype == "oet_writing":
        system_instruction = (
            "You are an expert OET nurse educator. Assess the user's clinical writing draft, highlighting "
            "formal register, clinical conciseness, and grammar corrections."
        )
    elif ptype == "ielts_writing":
        system_instruction = (
            "You are an IELTS academic examiner specialized in healthcare topics. Analyze the user's essay draft, "
            "providing Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Accuracy feedback."
        )
    elif ptype == "german_dialogue":
        system_instruction = (
            "Du bist ein deutscher Patient oder ein Kollege im Krankenhaus. Antworte auf Deutsch im Pflegekontext "
            "und gib am Ende eine kurze Übersetzung oder Korrekturhilfe für die Pflegekraft."
        )
    else:
        system_instruction = (
            "You are a clinical language coach for international nurses. Respond to the user's nursing language practice."
        )

    chat = new_llm_chat(f"lang-practice-{user['id']}-{uuid.uuid4().hex[:8]}", system_instruction)

    prompt = user_input
    if context:
        prompt = f"[Context / Scenario: {context}]\n\n{user_input}"

    async def event_generator():
        try:
            async for event in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(event, TextDelta) or (hasattr(event, "content") and not isinstance(event, StreamDone) and type(event).__name__ != "StreamDone"):
                    c = getattr(event, "content", "")
                    if c:
                        yield f"data: {json.dumps({'delta': c})}\n\n"
                elif isinstance(event, StreamDone) or type(event).__name__ == "StreamDone":
                    break
        except Exception:
            logger.exception("Language practice stream error")
            yield f"data: {json.dumps({'error': 'The AI service is unavailable right now. Please try again.'})}\n\n"
            return

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


# ---------------------------- Exams ----------------------------
@api.get("/exams")
async def list_exams():
    return {"exams": EXAMS}


@api.get("/exams/{exam_id}")
async def get_exam(exam_id: str):
    e = next((x for x in EXAMS if x["id"] == exam_id), None)
    if not e:
        raise HTTPException(404, "Exam not found")
    return {"exam": {**e, "last_reviewed": "2026-04-01"}}


# ---------------------------- Abroad Pathways ----------------------------
@api.get("/abroad/pathways")
async def list_pathways():
    return {"pathways": [{"id": p["id"], "country": p["country"], "flag": p["flag"], "demand": p["demand"], "language": p["language"], "total_steps": len(p["steps"])} for p in PATHWAYS]}


@api.get("/abroad/pathways/{pid}")
async def get_pathway(pid: str, user: dict = Depends(current_user)):
    p = next((x for x in PATHWAYS if x["id"] == pid), None)
    if not p:
        raise HTTPException(404, "Pathway not found")
    progress = await db.pathway_progress.find_one({"user_id": user["id"], "pathway_id": pid}, {"_id": 0})
    completed = progress.get("completed", []) if progress else []
    return {"pathway": p, "completed": completed}


@api.post("/abroad/pathways/{pid}/step/{step_n}/toggle")
async def toggle_step(pid: str, step_n: int, user: dict = Depends(current_user)):
    p = next((x for x in PATHWAYS if x["id"] == pid), None)
    if not p:
        raise HTTPException(404, "Pathway not found")
    if not any(s["n"] == step_n for s in p["steps"]):
        raise HTTPException(404, "Step not found")
    key = {"user_id": user["id"], "pathway_id": pid}
    prog = await db.pathway_progress.find_one(key, {"_id": 0, "completed": 1})
    op = "$pull" if prog and step_n in prog.get("completed", []) else "$addToSet"
    await db.pathway_progress.update_one(key, {op: {"completed": step_n}}, upsert=True)
    prog = await db.pathway_progress.find_one(key, {"_id": 0, "completed": 1})
    return {"completed": prog.get("completed", [])}


# ---------------------------- Passport (Documents) ----------------------------
@api.get("/passport/documents")
async def list_documents(user: dict = Depends(current_user)):
    docs = []
    today = datetime.now(timezone.utc).date()
    async for d in db.documents.find({"user_id": user["id"]}, {"_id": 0, "storage_path": 0}):
        d["status"], _days = expiry_status(d.get("expiry_date"), today)
        d["created_at"] = iso(d.get("created_at"))
        docs.append(d)
    return {"documents": docs}


@api.post("/passport/documents")
async def create_document(
    name: str = Form(..., max_length=200),
    category: str = Form(...),
    issuer: str = Form("", max_length=200),
    certificate_number: str = Form("", max_length=100),
    issue_date: str = Form(""),
    expiry_date: str = Form(""),
    notes: str = Form("", max_length=2000),
    file: Optional[UploadFile] = File(None),
    user: dict = Depends(current_user),
):
    name = name.strip()
    if not name:
        raise HTTPException(400, "Document name is required")
    if category not in DOC_CATEGORIES:
        raise HTTPException(400, f"category must be one of: {', '.join(DOC_CATEGORIES)}")
    issue_date = issue_date.strip() or None
    expiry_date = expiry_date.strip() or None
    for field, val in (("issue_date", issue_date), ("expiry_date", expiry_date)):
        if val:
            parse_date(val, field)
    if issue_date and expiry_date and expiry_date < issue_date:
        raise HTTPException(400, "expiry_date cannot be before issue_date")

    doc_id = str(uuid.uuid4())
    storage_path = None
    file_type = None
    if file is not None and file.filename:
        contents = await read_upload(file)
        file_type = file.content_type or "application/octet-stream"
        storage_path = f"{APP_NAME}/uploads/{user['id']}/{doc_id}.{safe_ext(file.filename, 'bin')}"
        await store_file(storage_path, contents, file_type)

    doc = {
        "id": doc_id,
        "user_id": user["id"],
        "name": name,
        "category": category,
        "issuer": issuer.strip(),
        "certificate_number": certificate_number.strip(),
        "issue_date": issue_date,
        "expiry_date": expiry_date,
        "notes": notes.strip(),
        "storage_path": storage_path,
        "file_type": file_type,
        "created_at": datetime.now(timezone.utc),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("storage_path", None)
    doc["created_at"] = doc["created_at"].isoformat()
    doc["status"], _days = expiry_status(expiry_date, datetime.now(timezone.utc).date())
    return {"document": doc}


@api.get("/passport/documents/{doc_id}/file")
async def download_document(doc_id: str, token: Optional[str] = None, authorization: Optional[str] = Header(None)):
    uid = await user_id_from_token(token, authorization)
    doc = await db.documents.find_one({"id": doc_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    if not doc.get("storage_path"):
        raise HTTPException(404, "No file attached")
    content, ctype = await fetch_file(doc["storage_path"])
    return Response(content=content, media_type=doc.get("file_type") or ctype)


@api.delete("/passport/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(current_user)):
    r = await db.documents.delete_one({"id": doc_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---------------------------- CME ----------------------------
@api.get("/cme")
async def list_cme(user: dict = Depends(current_user)):
    records = []
    total = 0.0
    async for c in db.cme.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1):
        c["created_at"] = iso(c.get("created_at"))
        records.append(c)
        total += float(c.get("hours") or 0)
    return {"records": records, "total": total, "required": CME_REQUIRED_HOURS, "remaining": max(0, CME_REQUIRED_HOURS - total)}


@api.post("/cme")
async def add_cme(body: CMERecordCreate, user: dict = Depends(current_user)):
    data = body.model_dump()
    data["title"] = data["title"].strip()
    if not data["title"]:
        raise HTTPException(400, "Title is required")
    rec = {"id": str(uuid.uuid4()), "user_id": user["id"], **data, "created_at": datetime.now(timezone.utc)}
    await db.cme.insert_one(rec)
    rec.pop("_id", None)
    rec["created_at"] = rec["created_at"].isoformat()
    return {"record": rec}


# ---------------------------- Jobs / News ----------------------------
@api.get("/jobs")
async def list_jobs(country: Optional[str] = None):
    js = JOBS
    if country:
        js = [j for j in js if j["country"].lower() == country.lower()]
    return {"jobs": js}


@api.get("/news")
async def list_news():
    return {"news": NEWS}


# ---------------------------- AI Nurse (Streaming Claude Sonnet 5) ----------------------------
SYSTEM_PROMPT = (
    "You are AI Nurse, an educational assistant for nursing students, registered nurses, and internationally educated nurses. "
    "Give clear, structured, evidence-informed answers using plain language, referencing textbooks and guidelines when relevant. "
    "For clinical questions, always add a brief educational disclaimer that you are not a substitute for institutional protocols "
    "or licensed clinical judgment. Prefer bullet points and short paragraphs. Cite common sources like Brunner & Suddarth, "
    "Lehne's Pharmacology, WHO, CDC, AHA, and NMC when applicable."
)

MODE_INSTRUCTIONS = {
    "SIMPLE": "Explain like the student is a beginner with no background. Use short sentences and everyday analogies.",
    "STUDENT": "Explain at the level of a second-year nursing student. Use structured sections and clinical relevance.",
    "CLINICAL": "Provide a detailed clinical explanation for an experienced nurse, including pathophysiology, nursing management and evidence base.",
    "EXAM": "Give an exam-focused answer with high-yield bullet points, key differentials, and a memory-aid.",
    "QUICK": "Give a very brief revision summary in under 120 words.",
}


TONE_DESCRIPTIONS = {
    "warm": "warm, kind and encouraging, like a supportive senior nurse",
    "funny": "playful and light, using occasional friendly humour while staying medically accurate",
    "strict": "concise, precise and no-nonsense, like an exam-focused clinical instructor",
    "neutral": "neutral and professional",
}


def new_llm_chat(session_id: str, system_message: str, history: Optional[List[dict]] = None):
    from emergentintegrations.llm.chat import LlmChat
    initial = [{"role": "system", "content": system_message}, *history] if history else None
    return LlmChat(
        api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_message, initial_messages=initial,
    ).with_model(LLM_PROVIDER, LLM_MODEL)


async def llm_json(prompt: str, session_prefix: str) -> Optional[dict]:
    """One-shot structured generation; None when the model's reply holds no JSON object."""
    from emergentintegrations.llm.chat import UserMessage
    chat = new_llm_chat(f"{session_prefix}-{uuid.uuid4()}", "You output valid JSON only.")
    return extract_json(await chat.send_message(UserMessage(text=prompt)))


async def chat_history_for_model(session_id: str, user_id: str) -> List[dict]:
    """Recent turns of a conversation as alternating user/assistant messages, oldest first."""
    recent = [
        m async for m in db.chats.find({"session_id": session_id, "user_id": user_id}, {"_id": 0, "role": 1, "content": 1})
        .sort("created_at", -1).limit(CHAT_HISTORY_MESSAGES)
    ][::-1]
    turns: List[dict] = []
    for m in recent:
        if not m.get("content") or m.get("role") not in ("user", "assistant"):
            continue
        if turns and turns[-1]["role"] == m["role"]:
            turns[-1]["content"] += "\n\n" + m["content"]
        else:
            turns.append({"role": m["role"], "content": m["content"]})
    while turns and turns[0]["role"] != "user":
        turns.pop(0)
    if turns and turns[-1]["role"] == "user":  # previous turn got no reply; the new message follows
        turns.pop()
    return turns


@api.post("/ai/chat")
async def ai_chat_stream(body: AIChatBody, user: dict = Depends(current_user)):
    require_ai()
    history = await chat_history_for_model(body.session_id, user["id"])

    # Persist user message
    await db.chats.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": body.session_id,
        "user_id": user["id"],
        "role": "user",
        "content": body.message,
        "created_at": datetime.now(timezone.utc),
    })

    # Search library for grounding context (only when we get real hits)
    lib_hits = await _library_matches_async(body.message, max_books=2)
    context_block = ""
    references: list[dict] = []
    if lib_hits:
        parts = ["Library context (Nurse Orbit — original nursing content). Use it when relevant and cite it."]
        for h in lib_hits:
            b = h["book"]
            for ch in h["chapters"]:
                parts.append(f"\n[{b['title']} — {b['author']}, Ch. {ch['number']}: {ch['title']}]\n{ch['content'][:1400]}")
                references.append({"book_id": b["id"], "book_title": b["title"], "author": b["author"], "chapter": ch["number"], "chapter_title": ch["title"]})
        context_block = "\n".join(parts)

    async def event_generator():
        from emergentintegrations.llm.chat import UserMessage, TextDelta, StreamDone
        mode_instr = MODE_INSTRUCTIONS.get((body.mode or "STUDENT").upper(), MODE_INSTRUCTIONS["STUDENT"])
        lang = user.get("language") or "English"
        lang_line = "" if lang == "English" else f"\n\nRespond in {lang}. Keep English medical terminology (drug names, disease names, guideline abbreviations)."

        # Persona (user-chosen nickname + tone)
        ai_name = (user.get("ai_name") or "Nurse AI").strip() or "Nurse AI"
        tone_desc = TONE_DESCRIPTIONS.get((user.get("ai_tone") or "warm").lower(), TONE_DESCRIPTIONS["warm"])
        student_name = (user.get("name") or "").split(" ")[0]
        persona_line = (
            f"\n\nYou are '{ai_name}', the personal nursing tutor for {student_name or 'the user'}. "
            f"Your tone is {tone_desc}. Introduce yourself as '{ai_name}' when greeting or when the user is new. "
            f"Address the user by their first name occasionally. Never break character."
        )
        # Textbook-style formatting so answers look like a study page
        format_line = (
            "\n\nFORMAT ANSWERS LIKE A NURSING TEXTBOOK PAGE:\n"
            "• Start with a bold one-line summary (## Title).\n"
            "• Use clear H2/H3 headings for each section (Definition, Causes, Signs & Symptoms, Investigations, Management, Nursing Priorities, Complications, Patient Education, Memory Aid).\n"
            "• Bullet lists (not paragraphs) for symptoms, causes, meds.\n"
            "• Use tables (Markdown) for drug doses or differential diagnosis where useful.\n"
            "• Add a mnemonic or 'Nurse Tip' box at the end.\n"
            "• Keep tone matched to the mode; do not exceed the mode's length limit."
        )
        system = SYSTEM_PROMPT + persona_line + format_line + "\n\nResponse mode: " + mode_instr + lang_line + ("\n\n" + context_block if context_block else "")
        chat = new_llm_chat(body.session_id, system, history)

        full = []
        try:
            async for event in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(event, TextDelta):
                    full.append(event.content)
                    yield f"data: {json.dumps({'delta': event.content})}\n\n"
                elif isinstance(event, StreamDone):
                    break
        except Exception:
            logger.exception("AI stream error")
            yield f"data: {json.dumps({'error': 'The AI service is unavailable right now. Please try again.'})}\n\n"
            if not full:
                return

        reply_text = "".join(full)
        # Auto-detect medical/anatomy images from the combined question + answer
        images: list[dict] = []
        try:
            images = detect_medical_images(f"{body.message}\n{reply_text}", max_images=3)
        except Exception:
            logger.exception("medical image detection failed")

        # Persist assistant reply
        await db.chats.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": body.session_id,
            "user_id": user["id"],
            "role": "assistant",
            "content": reply_text,
            "references": references,
            "images": images,
            "created_at": datetime.now(timezone.utc),
        })
        if references:
            yield f"data: {json.dumps({'references': references})}\n\n"
        if images:
            yield f"data: {json.dumps({'images': images})}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api.get("/ai/chat/{session_id}/history")
async def chat_history(session_id: str, user: dict = Depends(current_user)):
    msgs = []
    async for m in db.chats.find({"session_id": session_id, "user_id": user["id"]}, {"_id": 0}).sort("created_at", 1):
        m["created_at"] = iso(m.get("created_at"))
        msgs.append(m)
    return {"messages": msgs}


# ---------------------------- Clinical Modules ----------------------------
@api.get("/drugs")
async def list_drugs(q: Optional[str] = None):
    ds = DRUGS
    if q:
        ql = q.lower()
        ds = [d for d in DRUGS if ql in d["name"].lower() or ql in d["class"].lower() or any(ql in i.lower() for i in d["indications"])]
    return {"drugs": [{"id": d["id"], "name": d["name"], "class": d["class"], "indications": d["indications"][:3]} for d in ds]}


@api.get("/drugs/{drug_id}")
async def get_drug(drug_id: str):
    d = next((x for x in DRUGS if x["id"] == drug_id), None)
    if not d:
        raise HTTPException(404, "Drug not found")
    return {"drug": d, "disclaimer": "For educational purposes. Verify against current institutional protocols and prescribing information before patient care."}


@api.get("/ecg/cases")
async def list_ecg_cases():
    return {"cases": [{"id": c["id"], "title": c["title"], "difficulty": c["difficulty"]} for c in ECG_CASES]}


@api.get("/ecg/cases/{case_id}")
async def get_ecg_case(case_id: str):
    c = next((x for x in ECG_CASES if x["id"] == case_id), None)
    if not c:
        raise HTTPException(404, "ECG case not found")
    return {"case": c}


class ABGInput(BaseModel):
    # Bounds are wide physiological limits; they only reject typos and unit mix-ups.
    pH: float = Field(ge=6.5, le=8.0)
    PaCO2: float = Field(ge=5, le=200)
    HCO3: float = Field(ge=1, le=80)
    PaO2: Optional[float] = Field(None, ge=10, le=800)
    SaO2: Optional[float] = Field(None, ge=0, le=100)


@api.post("/abg/interpret")
async def abg_interpret(v: ABGInput):
    problems: list[str] = []
    primary = "Normal"
    compensation = "Not applicable"
    if v.pH < 7.35:
        acidbase = "Acidosis"
    elif v.pH > 7.45:
        acidbase = "Alkalosis"
    else:
        acidbase = "Normal pH"
    # Determine primary disturbance
    if v.pH < 7.35 and v.PaCO2 > 45:
        primary = "Respiratory Acidosis"
    elif v.pH > 7.45 and v.PaCO2 < 35:
        primary = "Respiratory Alkalosis"
    elif v.pH < 7.35 and v.HCO3 < 22:
        primary = "Metabolic Acidosis"
    elif v.pH > 7.45 and v.HCO3 > 26:
        primary = "Metabolic Alkalosis"
    elif 7.35 <= v.pH <= 7.45 and (v.PaCO2 > 45 or v.PaCO2 < 35 or v.HCO3 > 26 or v.HCO3 < 22):
        primary = "Mixed / Compensated disorder"
    # Compensation logic (educational, simplified)
    if primary == "Respiratory Acidosis" and v.HCO3 > 26:
        compensation = "Metabolic compensation (chronic)"
    elif primary == "Metabolic Acidosis" and v.PaCO2 < 35:
        compensation = "Respiratory compensation (Kussmaul respiration)"
    elif primary == "Respiratory Alkalosis" and v.HCO3 < 22:
        compensation = "Metabolic compensation"
    elif primary == "Metabolic Alkalosis" and v.PaCO2 > 45:
        compensation = "Respiratory compensation (hypoventilation)"
    if v.PaO2 is not None:
        if v.PaO2 < 60:
            problems.append("Severe hypoxaemia (PaO2 < 60 mm Hg)")
        elif v.PaO2 < 80:
            problems.append("Mild hypoxaemia (PaO2 60–80 mm Hg)")
    common_causes = {
        "Respiratory Acidosis": ["COPD exacerbation", "Opioid overdose", "Neuromuscular disease", "Pneumonia"],
        "Respiratory Alkalosis": ["Anxiety/hyperventilation", "Pain", "Sepsis (early)", "PE"],
        "Metabolic Acidosis": ["DKA", "Lactic acidosis", "Renal failure", "Diarrhoea"],
        "Metabolic Alkalosis": ["Vomiting", "NG suction", "Diuretics", "Excess bicarbonate"],
    }
    return {
        "primary": primary,
        "acid_base": acidbase,
        "compensation": compensation,
        "problems": problems,
        "causes": common_causes.get(primary, []),
        "disclaimer": "Educational interpretation only. Always correlate with the clinical picture and confirm with the medical team.",
    }


@api.get("/ventilator/topics")
async def ventilator_topics():
    return {"topics": VENTILATOR_TOPICS}


@api.get("/skills")
async def list_skills(category: Optional[str] = None):
    ss = SKILLS if not category else [s for s in SKILLS if s["category"] == category]
    return {"skills": [{"id": s["id"], "title": s["title"], "category": s["category"], "duration": s["duration"]} for s in ss]}


@api.get("/skills/{skill_id}")
async def get_skill(skill_id: str):
    s = next((x for x in SKILLS if x["id"] == skill_id), None)
    if not s:
        raise HTTPException(404, "Skill not found")
    return {"skill": s}


@api.get("/emergency/topics")
async def emergency_topics():
    return {"topics": EMERGENCY_TOPICS}


@api.get("/cases")
async def list_cases(level: Optional[str] = None):
    cs = SIM_CASES if not level else [c for c in SIM_CASES if c["level"] == level]
    return {"cases": [{"id": c["id"], "title": c["title"], "level": c["level"], "category": c["category"], "patient_age": c["patient"]["age"]} for c in cs]}


@api.get("/cases/{case_id}")
async def get_case(case_id: str, user: dict = Depends(current_user)):
    c = next((x for x in SIM_CASES if x["id"] == case_id), None)
    if not c:
        raise HTTPException(404, "Case not found")
    steps_public = [{"n": s["n"], "prompt": s["prompt"], "options": [{"text": o["text"]} for o in s["options"]]} for s in c["steps"]]
    return {"case": {**{k: v for k, v in c.items() if k != "steps"}, "steps": steps_public}}


class CaseAttempt(BaseModel):
    case_id: str
    step_n: int
    option_index: int = Field(ge=0)


@api.post("/cases/attempt")
async def submit_case_attempt(body: CaseAttempt, user: dict = Depends(current_user)):
    c = next((x for x in SIM_CASES if x["id"] == body.case_id), None)
    if not c:
        raise HTTPException(404, "Case not found")
    step = next((s for s in c["steps"] if s["n"] == body.step_n), None)
    if not step or body.option_index >= len(step["options"]):
        raise HTTPException(400, "Invalid step or option")
    opt = step["options"][body.option_index]
    await db.case_attempts.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "case_id": body.case_id,
        "step_n": body.step_n, "option_index": body.option_index, "correct": opt["correct"],
        "created_at": datetime.now(timezone.utc),
    })
    # Gamification: award XP
    if opt["correct"]:
        await _grant_xp(user["id"], 10, "case_correct")
    return {"correct": opt["correct"], "why": opt["why"], "priority": step["priority"]}


class DiagnosisBody(BaseModel):
    scenario: str = Field(min_length=10, max_length=4000)


@api.post("/nursing-diagnosis")
async def nursing_diagnosis(body: DiagnosisBody, user: dict = Depends(current_user)):
    require_ai()
    prompt = (
        "You are an educational nursing assistant. For the clinical scenario below, respond ONLY with a compact JSON object with these keys: "
        "diagnoses (array of {label, related_factors (array of str), supporting_findings (array of str)}), goals (array of str), "
        "interventions (array of {action, rationale}), evaluation (array of str), disclaimer (string).\n\n"
        f"Scenario: {body.scenario}\n\n"
        "Rules: use recognised NANDA-I-like language, keep to 3–5 diagnoses, 3–6 interventions, 2–3 goals. Return ONLY JSON, no prose."
    )
    try:
        data = await llm_json(prompt, "diag")
    except Exception:
        logger.exception("nursing diagnosis generation failed")
        raise HTTPException(502, "The AI service is unavailable right now. Please try again.")
    if not data:
        raise HTTPException(502, "The AI returned an unexpected response. Please try again.")
    data.setdefault("disclaimer", "Educational suggestions only. Not a substitute for professional clinical assessment.")
    return {**data, "scenario": body.scenario}


class CarePlanBody(BaseModel):
    condition: str = Field(min_length=1, max_length=300)
    assessment: Optional[str] = Field("", max_length=5000)
    diagnosis: Optional[str] = Field("", max_length=5000)
    goals: Optional[str] = Field("", max_length=5000)
    interventions: Optional[str] = Field("", max_length=5000)
    rationales: Optional[str] = Field("", max_length=5000)
    evaluation: Optional[str] = Field("", max_length=5000)
    ai_generate: Optional[bool] = False


CARE_PLAN_FIELDS = ("diagnosis", "goals", "interventions", "rationales", "evaluation")


def _as_bullets(v) -> str:
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return "\n".join(f"• {x}" for x in v)
    return str(v)


@api.post("/care-plans")
async def create_care_plan(body: CarePlanBody, user: dict = Depends(current_user)):
    data = body.model_dump(exclude={"ai_generate"})
    data["condition"] = data["condition"].strip()
    if not data["condition"]:
        raise HTTPException(400, "Condition is required")
    if body.ai_generate:
        require_ai()
        prompt = (
            f"Draft a nursing care plan for: {data['condition']}\n"
            f"Assessment findings: {body.assessment or 'not provided'}\n\n"
            "Return JSON with fields: diagnosis, goals, interventions (array), rationales (array), evaluation. Keep concise (5–8 items each)."
        )
        try:
            gen = await llm_json(prompt, "cp")
        except Exception:
            logger.exception("care plan generation failed")
            raise HTTPException(502, "The AI service is unavailable right now. Please try again.")
        if not gen:
            raise HTTPException(502, "The AI returned an unexpected response. Please try again.")
        for k in CARE_PLAN_FIELDS:
            if not data.get(k) and gen.get(k):
                data[k] = _as_bullets(gen[k])
    plan = {"id": str(uuid.uuid4()), "user_id": user["id"], **data, "created_at": datetime.now(timezone.utc)}
    await db.care_plans.insert_one(plan)
    plan.pop("_id", None)
    plan["created_at"] = plan["created_at"].isoformat()
    return {"plan": plan}


@api.get("/care-plans")
async def list_care_plans(user: dict = Depends(current_user)):
    out = []
    async for p in db.care_plans.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1):
        p["created_at"] = iso(p.get("created_at"))
        out.append(p)
    return {"plans": out}


@api.delete("/care-plans/{plan_id}")
async def delete_care_plan(plan_id: str, user: dict = Depends(current_user)):
    r = await db.care_plans.delete_one({"id": plan_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---------------------------- Gamification ----------------------------
BADGES_ALL = [
    {"id": "streak-7", "name": "7-Day Streak", "icon": "🔥", "criteria": "7 consecutive days of activity"},
    {"id": "mcq-100", "name": "100 MCQs Completed", "icon": "💯", "criteria": "100 attempted"},
    {"id": "ecg-beginner", "name": "ECG Beginner", "icon": "🫀", "criteria": "Complete 3 ECG cases"},
    {"id": "case-explorer", "name": "Critical Care Explorer", "icon": "🏥", "criteria": "Complete 3 clinical cases"},
    {"id": "pharma-master", "name": "Pharmacology Master", "icon": "💊", "criteria": "Read 5 drug entries"},
]


async def _grant_xp(user_id: str, xp: int, source: str):
    today = datetime.now(timezone.utc).date()
    doc = await db.gamification.find_one({"user_id": user_id}, {"_id": 0, "streak": 1, "last_day": 1}) or {}
    streak = int(doc.get("streak") or 0)
    ops: dict = {"$inc": {"xp": xp}}
    last = doc.get("last_day")
    if last != today.isoformat():
        try:
            gap = (today - date.fromisoformat(last)).days if last else None
        except ValueError:
            gap = None
        streak = streak + 1 if gap == 1 else 1
        ops["$set"] = {"streak": streak, "last_day": today.isoformat()}
    if streak >= 7:
        ops["$addToSet"] = {"badges": "streak-7"}
    # $inc keeps concurrent grants from overwriting each other's XP
    await db.gamification.update_one({"user_id": user_id}, ops, upsert=True)


@api.get("/gamification")
async def gamification(user: dict = Depends(current_user)):
    doc = await db.gamification.find_one({"user_id": user["id"]}, {"_id": 0}) or {"xp": 0, "streak": 0, "badges": []}
    attempts_today = await db.attempts.count_documents({
        "user_id": user["id"],
        "created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)},
    })
    level = 1 + int(doc.get("xp", 0)) // 200
    return {
        "xp": doc.get("xp", 0),
        "streak": doc.get("streak", 0),
        "level": level,
        "badges": [b for b in BADGES_ALL if b["id"] in doc.get("badges", [])],
        "all_badges": BADGES_ALL,
        "daily_goal": 10,
        "daily_progress": attempts_today,
    }


XP_ACTIONS = {"mcq_correct": 5, "lesson_read": 8, "case_correct": 10, "chapter_read": 5, "care_plan_saved": 12}


class GamificationActionBody(BaseModel):
    action: Literal["mcq_correct", "lesson_read", "case_correct", "chapter_read", "care_plan_saved"]


@api.post("/gamification/action")
async def gamification_action(body: GamificationActionBody, user: dict = Depends(current_user)):
    xp = XP_ACTIONS[body.action]
    await _grant_xp(user["id"], xp, body.action)
    doc = await db.gamification.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"xp": doc.get("xp", 0), "streak": doc.get("streak", 0), "gained": xp}


# ---------------------------- Learning Plan ----------------------------
class LearningPlanBody(BaseModel):
    focus: Optional[str] = Field(None, max_length=200)


def _fallback_plan(focus: str) -> dict:
    return {"topic": focus, "days": [f"Day {i + 1}: {focus} — module {i + 1}" for i in range(7)]}


@api.post("/learning-plan/generate")
async def generate_plan(body: LearningPlanBody, user: dict = Depends(current_user)):
    focus = (body.focus or "").strip() or (user.get("focus_areas") or ["Nursing Fundamentals"])[0]
    if not EMERGENT_LLM_KEY:
        return _fallback_plan(focus)
    prompt = (
        f"Create a 7-day study plan for a {user.get('user_type') or user.get('role') or 'nursing student'} focused on {focus}. "
        "Return JSON with keys: topic (string), days (array of exactly 7 strings, each one line, concrete daily goal)."
    )
    try:
        data = await llm_json(prompt, "plan")
    except Exception:
        logger.exception("learning plan generation failed")
        data = None
    raw_days = (data or {}).get("days")
    days = [str(d) for d in raw_days if d] if isinstance(raw_days, list) else []
    if not days:
        return _fallback_plan(focus)
    return {"topic": str(data.get("topic") or focus), "days": days[:7]}


# ---------------------------- My Nursing Journey (Pillar 1) ----------------------------
JOURNEY_YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Clinical Specialties"]
# Onboarding stores the year as "1st Year" … "Postgraduate"; the curriculum groups subjects as "Year 1" …
PROFILE_YEAR_TO_JOURNEY = {"1st Year": "Year 1", "2nd Year": "Year 2", "3rd Year": "Year 3", "4th Year": "Year 4", "Postgraduate": "Clinical Specialties"}
JOURNEY_TO_PROFILE_YEAR = {v: k for k, v in PROFILE_YEAR_TO_JOURNEY.items()}
LESSON_SUBJECT = {l["id"]: s["id"] for s in SUBJECTS for l in subject_lessons(s["id"])}
SUBJECTS_WITH_MCQS = {q["subject_id"] for q in QUESTIONS}
MASTERY_MIN_ATTEMPTS = 3  # MCQ answers needed before a subject's accuracy can flag it as weak
STATUS_PRIORITY = {"needs_work": 0, "in_progress": 1, "not_started": 2, "completed": 3}
PLAN_LESSONS_PER_DAY = 2
# Rotated through the study days so the week also touches the other pillars
PLAN_SUPPORT_TASKS = [
    {"kind": "skills", "label": "Practise one OSCE station in the Skills Lab", "route": "/osce"},
    {"kind": "sim", "label": "Work through a clinical case simulation", "route": "/cases"},
    {"kind": "drug", "label": "Review 3 medicines in the Drug Guide", "route": "/drug-guide"},
    {"kind": "library", "label": "Read one chapter in the Nursing Library", "route": "/library"},
    {"kind": "skills", "label": "Revise one procedure checklist", "route": "/procedures"},
    {"kind": "logbook", "label": "Log a clinical experience or reflection", "route": "/logbook/new"},
]


class JourneyYearBody(BaseModel):
    year: Literal["Year 1", "Year 2", "Year 3", "Year 4", "Clinical Specialties"]


def _journey_year(user: dict) -> str:
    y = user.get("year") or ""
    return y if y in JOURNEY_YEARS else PROFILE_YEAR_TO_JOURNEY.get(y, "Year 1")


async def _journey_state(user_id: str) -> Tuple[List[dict], set]:
    """Per-subject lesson + MCQ progress for every curriculum subject, and the set of completed lesson ids."""
    done_lessons = set()
    async for p in db.lesson_progress.find({"user_id": user_id}, {"_id": 0, "lesson_id": 1}):
        if p["lesson_id"] in LESSON_SUBJECT:
            done_lessons.add(p["lesson_id"])

    mcq = {}  # subject_id -> [attempted, correct]
    async for a in db.attempts.find({"user_id": user_id}, {"_id": 0, "question_id": 1, "subject_id": 1, "correct": 1}):
        sid = a.get("subject_id") or QUESTION_BY_ID.get(a.get("question_id"), {}).get("subject_id")
        if sid:
            st = mcq.setdefault(sid, [0, 0])
            st[0] += 1
            st[1] += 1 if a.get("correct") else 0

    subjects = []
    for s in SUBJECTS:
        lessons = subject_lessons(s["id"])
        done = [l for l in lessons if l["id"] in done_lessons]
        attempted, correct = mcq.get(s["id"], (0, 0))
        if attempted >= MASTERY_MIN_ATTEMPTS and correct / attempted < WEAK_TOPIC_ACCURACY:
            status_val = "needs_work"
        elif len(done) == len(lessons):
            status_val = "completed"
        elif done or attempted:
            status_val = "in_progress"
        else:
            status_val = "not_started"
        nxt = next((l for l in lessons if l["id"] not in done_lessons), None)
        subjects.append({
            "id": s["id"], "name": s["name"], "year": s["year"], "color": s["color"],
            "lessons_total": len(lessons), "lessons_done": len(done),
            "progress": round(len(done) / len(lessons) * 100) if lessons else 0,
            "mcq_attempted": attempted,
            "mcq_accuracy": round(correct / attempted * 100) if attempted else None,
            "has_mcqs": s["id"] in SUBJECTS_WITH_MCQS,
            "status": status_val,
            "next_lesson": {"id": nxt["id"], "title": nxt["title"]} if nxt else None,
        })
    return subjects, done_lessons


def _prioritised(subjects: List[dict]) -> List[dict]:
    """Most urgent first: weak subjects (lowest accuracy first), then in progress, then not started, in curriculum order."""
    return sorted(subjects, key=lambda s: (STATUS_PRIORITY[s["status"]], s["mcq_accuracy"] if s["status"] == "needs_work" else 0))


def _next_up(year_subjects: List[dict]) -> Optional[dict]:
    for s in _prioritised(year_subjects):
        if s["status"] == "needs_work":
            reason = f"Your MCQ accuracy in {s['name']} is {s['mcq_accuracy']}%. Strengthen it before moving on."
        elif s["status"] == "in_progress":
            reason = f"Pick up where you left off in {s['name']}."
        elif s["status"] == "not_started":
            reason = f"Start {s['name']}, next in your {s['year']} curriculum."
        else:
            continue
        base = {"subject_id": s["id"], "subject_name": s["name"], "reason": reason}
        if s["next_lesson"]:
            return {**base, "action": "lesson", "lesson_id": s["next_lesson"]["id"], "title": s["next_lesson"]["title"], "route": f"/lesson/{s['id']}"}
        # Every lesson is read but the MCQs are still weak: practise instead
        return {**base, "action": "quiz", "title": f"{s['name']} practice questions", "route": f"/quiz/{s['id']}"}
    return None


def _build_journey_plan(year_subjects: List[dict], done_lessons: set) -> List[dict]:
    """7-day plan from the student's real curriculum state: six study days rotating through their most urgent subjects, then a weekly review."""
    queue = [s for s in _prioritised(year_subjects) if s["status"] != "completed"] or year_subjects
    pending = {s["id"]: [l for l in subject_lessons(s["id"]) if l["id"] not in done_lessons] for s in queue}
    days = []
    for n in range(1, 7):
        s = queue[(n - 1) % len(queue)]
        tasks = []
        for l in pending[s["id"]][:PLAN_LESSONS_PER_DAY]:
            tasks.append({"kind": "lesson", "label": f"Read: {l['title']}", "route": f"/lesson/{s['id']}", "lesson_id": l["id"]})
        pending[s["id"]] = pending[s["id"]][PLAN_LESSONS_PER_DAY:]
        if not tasks:
            tasks.append({"kind": "review", "label": f"Revise your notes on {s['name']}", "route": f"/lesson/{s['id']}"})
        if s["has_mcqs"]:
            tasks.append({"kind": "quiz", "label": f"Answer {s['name']} practice questions", "route": f"/quiz/{s['id']}"})
        else:
            tasks.append({"kind": "ai", "label": f"Ask Orbit AI Tutor to quiz you on {s['name']}", "route": "/(tabs)/ai-tab"})
        tasks.append(dict(PLAN_SUPPORT_TASKS[(n - 1) % len(PLAN_SUPPORT_TASKS)]))
        days.append({"day": n, "title": s["name"], "subject_id": s["id"], "tasks": tasks})
    days.append({"day": 7, "title": "Weekly review", "subject_id": None, "tasks": [
        {"kind": "quiz", "label": "Mixed 10-question practice quiz", "route": "/quiz/practice"},
        {"kind": "ai", "label": "Ask Orbit AI to explain this week's toughest concept", "route": "/(tabs)/ai-tab"},
        {"kind": "wellbeing", "label": "Do your wellbeing check-in before next week", "route": "/health"},
    ]})
    for d in days:
        for i, t in enumerate(d["tasks"], 1):
            t["id"] = f"d{d['day']}-t{i}"
    return days


def _hydrate_plan(plan: dict, done_lessons: set) -> dict:
    """Lesson tasks are done when the lesson is marked complete anywhere in the app; other tasks are ticked on the plan."""
    ticked = set(plan.get("done_tasks") or [])
    days = []
    for d in plan["days"]:
        tasks = [{**t, "done": t.get("lesson_id") in done_lessons if t["kind"] == "lesson" else t["id"] in ticked} for t in d["tasks"]]
        days.append({**d, "tasks": tasks, "done": all(t["done"] for t in tasks)})
    total = sum(len(d["tasks"]) for d in days)
    finished = sum(1 for d in days for t in d["tasks"] if t["done"])
    return {
        "id": plan["id"], "year": plan["year"], "created_at": iso(plan.get("created_at")),
        "days": days, "tasks_total": total, "tasks_done": finished,
        "progress": round(finished / total * 100) if total else 0,
    }


async def _journey_payload(user: dict) -> dict:
    subjects, done_lessons = await _journey_state(user["id"])
    current = _journey_year(user)
    years = []
    for y in JOURNEY_YEARS:
        subs = [s for s in subjects if s["year"] == y]
        total = sum(s["lessons_total"] for s in subs)
        done = sum(s["lessons_done"] for s in subs)
        years.append({
            "year": y, "is_current": y == current, "subjects": subs,
            "lessons_total": total, "lessons_done": done,
            "progress": round(done / total * 100) if total else 0,
        })
    all_total = sum(s["lessons_total"] for s in subjects)
    weak = sorted((s for s in subjects if s["status"] == "needs_work"), key=lambda s: s["mcq_accuracy"])
    plan = await db.journey_plans.find_one({"user_id": user["id"], "year": current}, {"_id": 0}, sort=[("created_at", -1)])
    return {
        "current_year": current,
        "years": years,
        "overall": {
            "lessons_total": all_total, "lessons_done": len(done_lessons),
            "progress": round(len(done_lessons) / all_total * 100) if all_total else 0,
        },
        "next_up": _next_up([s for s in subjects if s["year"] == current]),
        "focus_subjects": [{"id": s["id"], "name": s["name"], "year": s["year"], "mcq_accuracy": s["mcq_accuracy"], "mcq_attempted": s["mcq_attempted"]} for s in weak[:3]],
        "plan": _hydrate_plan(plan, done_lessons) if plan else None,
    }


@api.get("/journey")
async def my_journey(user: dict = Depends(current_user)):
    return await _journey_payload(user)


@api.put("/journey/year")
async def set_journey_year(body: JourneyYearBody, user: dict = Depends(current_user)):
    # Saved in the onboarding format so the rest of the app (home header, AI persona) reads it unchanged
    profile_year = JOURNEY_TO_PROFILE_YEAR[body.year]
    await db.users.update_one({"id": user["id"]}, {"$set": {"year": profile_year}})
    return await _journey_payload({**user, "year": profile_year})


@api.get("/journey/subjects/{subject_id}")
async def journey_subject_progress(subject_id: str, user: dict = Depends(current_user)):
    if subject_id not in SUBJECT_NAME_BY_ID:
        raise HTTPException(404, "Subject not found")
    lesson_ids = [l["id"] for l in subject_lessons(subject_id)]
    done = {p["lesson_id"] async for p in db.lesson_progress.find({"user_id": user["id"], "lesson_id": {"$in": lesson_ids}}, {"_id": 0, "lesson_id": 1})}
    return {"subject_id": subject_id, "completed_lesson_ids": [lid for lid in lesson_ids if lid in done], "lessons_total": len(lesson_ids)}


async def _mark_lesson(user_id: str, lesson_id: str, completed: bool) -> int:
    """Set a lesson's completion; returns the XP granted (only the first completion earns XP)."""
    if not completed:
        await db.lesson_progress.delete_one({"user_id": user_id, "lesson_id": lesson_id})
        return 0
    try:
        r = await db.lesson_progress.update_one(
            {"user_id": user_id, "lesson_id": lesson_id},
            {"$setOnInsert": {"subject_id": LESSON_SUBJECT[lesson_id], "completed_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    except DuplicateKeyError:
        return 0  # a concurrent request completed it first
    if r.upserted_id is None:
        return 0
    xp = XP_ACTIONS["lesson_read"]
    await _grant_xp(user_id, xp, "lesson_read")
    return xp


@api.post("/journey/lessons/{lesson_id}/complete")
async def complete_lesson(lesson_id: str, user: dict = Depends(current_user)):
    if lesson_id not in LESSON_SUBJECT:
        raise HTTPException(404, "Lesson not found")
    xp = await _mark_lesson(user["id"], lesson_id, True)
    return {"lesson_id": lesson_id, "completed": True, "xp_gained": xp}


@api.delete("/journey/lessons/{lesson_id}/complete")
async def uncomplete_lesson(lesson_id: str, user: dict = Depends(current_user)):
    if lesson_id not in LESSON_SUBJECT:
        raise HTTPException(404, "Lesson not found")
    await _mark_lesson(user["id"], lesson_id, False)
    return {"lesson_id": lesson_id, "completed": False, "xp_gained": 0}


@api.post("/journey/plan")
async def build_journey_plan(user: dict = Depends(current_user)):
    subjects, done_lessons = await _journey_state(user["id"])
    year = _journey_year(user)
    year_subjects = [s for s in subjects if s["year"] == year]
    await db.journey_plans.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "year": year,
        "days": _build_journey_plan(year_subjects, done_lessons), "done_tasks": [],
        "created_at": datetime.now(timezone.utc),
    })
    return await _journey_payload(user)


@api.post("/journey/plan/{plan_id}/tasks/{task_id}/toggle")
async def toggle_journey_task(plan_id: str, task_id: str, user: dict = Depends(current_user)):
    plan = await db.journey_plans.find_one({"id": plan_id, "user_id": user["id"]}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")
    task = next((t for d in plan["days"] for t in d["tasks"] if t["id"] == task_id), None)
    if not task:
        raise HTTPException(404, "Task not found")
    if task["kind"] == "lesson":
        done = await db.lesson_progress.find_one({"user_id": user["id"], "lesson_id": task["lesson_id"]}, {"_id": 1})
        await _mark_lesson(user["id"], task["lesson_id"], not done)
    else:
        op = "$pull" if task_id in (plan.get("done_tasks") or []) else "$addToSet"
        await db.journey_plans.update_one({"id": plan_id, "user_id": user["id"]}, {op: {"done_tasks": task_id}})
    return await _journey_payload(user)


# ---------------------------- Notifications ----------------------------
@api.get("/notifications")
async def notifications(user: dict = Depends(current_user)):
    out = []
    now = datetime.now(timezone.utc).date()
    async for d in db.documents.find({"user_id": user["id"]}, {"_id": 0}):
        exp = d.get("expiry_date")
        if not exp:
            continue
        try:
            expd = datetime.fromisoformat(exp).date()
            days = (expd - now).days
            if 0 <= days <= 60:
                out.append({"id": f"exp-{d['id']}", "title": f"Your {d['name']} expires in {days} days.", "type": "expiry", "date": exp})
            elif days < 0:
                out.append({"id": f"exp-{d['id']}", "title": f"Your {d['name']} is EXPIRED.", "type": "expired", "date": exp})
        except Exception:
            continue

    total_cme = 0.0
    async for c in db.cme.find({"user_id": user["id"]}, {"_id": 0}):
        total_cme += float(c.get("hours") or 0)
    out.append({"id": "cme-progress", "title": f"Your CME progress is {int(total_cme/40*100)}% complete.", "type": "cme"})

    return {"notifications": out}


# ---------------------------- Library ----------------------------
async def admin_only(user: dict = Depends(current_user)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(403, "Admin access required")
    return user


async def _bootstrap_library():
    if await db.lib_categories.count_documents({}) == 0:
        await db.lib_categories.insert_many([{**c} for c in LIB_CATS])
    if await db.lib_books.count_documents({}) == 0:
        await db.lib_books.insert_many([{**b, "created_at": datetime.now(timezone.utc)} for b in LIB_BOOKS])


def _book_summary(b: dict) -> dict:
    return {
        "id": b["id"], "category_id": b["category_id"], "title": b["title"], "author": b["author"],
        "edition": b.get("edition"), "isbn": b.get("isbn"), "publication_year": b.get("publication_year"),
        "description": b.get("description"), "cover_image": b.get("cover_image"),
        "page_count": b.get("page_count"), "chapter_count": b.get("chapter_count"),
        "tags": b.get("tags", []), "license": b.get("license"),
        "has_file": bool(b.get("storage_path")),
    }


@api.get("/library/categories")
async def library_categories():
    out = []
    async for c in db.lib_categories.find({}, {"_id": 0}):
        c["book_count"] = await db.lib_books.count_documents({"category_id": c["id"]})
        out.append(c)
    return {"categories": out}


BOOK_SUMMARY_PROJECTION = {"_id": 0, "chapters": 0}  # chapter bodies are large; summaries don't need them


@api.get("/library/books")
async def library_books(category_id: Optional[str] = None, q: Optional[str] = Query(None, max_length=200), limit: int = Query(50, ge=1, le=200)):
    query: dict = {}
    if category_id:
        query["category_id"] = category_id
    q = (q or "").strip()
    if q:
        pattern = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"title": pattern}, {"author": pattern}, {"tags": pattern}]
    books = []
    async for b in db.lib_books.find(query, BOOK_SUMMARY_PROJECTION).limit(limit):
        books.append(_book_summary(b))
    return {"books": books}


@api.get("/library/featured")
async def library_featured(user: dict = Depends(current_user)):
    # Featured = first 6 by chapter_count desc
    featured = []
    async for b in db.lib_books.find({}, BOOK_SUMMARY_PROJECTION).sort("chapter_count", -1).limit(6):
        featured.append(_book_summary(b))
    # Recent = last 6 created_at desc
    recent = []
    async for b in db.lib_books.find({}, BOOK_SUMMARY_PROJECTION).sort("created_at", -1).limit(6):
        recent.append(_book_summary(b))
    # Continue reading = user progress
    continue_reading = []
    async for p in db.lib_progress.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).limit(6):
        b = await db.lib_books.find_one({"id": p["book_id"]}, BOOK_SUMMARY_PROJECTION)
        if b:
            s = _book_summary(b)
            s["progress"] = p.get("percentage", 0)
            s["current_chapter"] = p.get("current_chapter", 1)
            continue_reading.append(s)
    # Bookmarked
    bookmarked = []
    seen = set()
    async for bm in db.lib_bookmarks.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1):
        if bm["book_id"] in seen:
            continue
        seen.add(bm["book_id"])
        b = await db.lib_books.find_one({"id": bm["book_id"]}, BOOK_SUMMARY_PROJECTION)
        if b:
            bookmarked.append(_book_summary(b))
        if len(bookmarked) >= 6:
            break
    return {"featured": featured, "recent": recent, "continue_reading": continue_reading, "bookmarked": bookmarked}


@api.get("/library/books/{book_id}")
async def library_book_detail(book_id: str, user: dict = Depends(current_user)):
    b = await db.lib_books.find_one({"id": book_id}, {"_id": 0, "chapters.content": 0})
    if not b:
        raise HTTPException(404, "Book not found")
    prog = await db.lib_progress.find_one({"user_id": user["id"], "book_id": book_id}, {"_id": 0})
    bm_count = await db.lib_bookmarks.count_documents({"user_id": user["id"], "book_id": book_id})
    return {
        "book": {
            **_book_summary(b),
            "chapters": [{"number": c["number"], "title": c["title"]} for c in b.get("chapters", [])],
        },
        "progress": prog or {"current_chapter": 1, "percentage": 0},
        "bookmark_count": bm_count,
        "is_bookmarked": bm_count > 0,
    }


@api.get("/library/books/{book_id}/chapter/{chapter_n}")
async def library_chapter(book_id: str, chapter_n: int, user: dict = Depends(current_user)):
    b = await db.lib_books.find_one({"id": book_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Book not found")
    chapters = b.get("chapters", [])
    pos = next((i for i, c in enumerate(chapters) if c["number"] == chapter_n), None)
    if pos is None:
        raise HTTPException(404, "Chapter not found")
    ch = chapters[pos]
    total = len(chapters)
    # Position-based, so books whose chapter numbers have gaps still reach 100%
    percentage = round((pos + 1) / total * 100)
    await db.lib_progress.update_one(
        {"user_id": user["id"], "book_id": book_id},
        {"$set": {"current_chapter": chapter_n, "percentage": percentage, "updated_at": datetime.now(timezone.utc)},
         "$setOnInsert": {"user_id": user["id"], "book_id": book_id, "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    is_bookmarked = await db.lib_bookmarks.find_one({"user_id": user["id"], "book_id": book_id, "chapter": chapter_n})
    notes = []
    async for n in db.lib_notes.find({"user_id": user["id"], "book_id": book_id, "chapter": chapter_n}, {"_id": 0}).sort("created_at", -1):
        n["created_at"] = iso(n.get("created_at"))
        notes.append(n)
    return {
        "chapter": ch,
        "book_title": b["title"],
        "author": b["author"],
        "total_chapters": total,
        "percentage": percentage,
        "is_bookmarked": bool(is_bookmarked),
        "notes": notes,
    }


class BookmarkBody(BaseModel):
    book_id: str
    chapter: int


async def _require_chapter(book_id: str, chapter: int) -> None:
    b = await db.lib_books.find_one({"id": book_id}, {"_id": 0, "chapters.number": 1})
    if not b:
        raise HTTPException(404, "Book not found")
    if not any(c.get("number") == chapter for c in b.get("chapters", [])):
        raise HTTPException(404, "Chapter not found")


@api.post("/library/bookmarks/toggle")
async def library_bookmark_toggle(body: BookmarkBody, user: dict = Depends(current_user)):
    await _require_chapter(body.book_id, body.chapter)
    q = {"user_id": user["id"], "book_id": body.book_id, "chapter": body.chapter}
    r = await db.lib_bookmarks.delete_many(q)
    if r.deleted_count:
        return {"bookmarked": False}
    await db.lib_bookmarks.insert_one({**q, "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc)})
    return {"bookmarked": True}


@api.get("/library/bookmarks")
async def library_bookmarks(user: dict = Depends(current_user)):
    out = []
    async for bm in db.lib_bookmarks.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1):
        b = await db.lib_books.find_one({"id": bm["book_id"]}, BOOK_SUMMARY_PROJECTION)
        if not b:
            continue
        out.append({
            "book_id": bm["book_id"], "chapter": bm["chapter"],
            "book_title": b["title"], "author": b["author"], "cover_image": b.get("cover_image"),
            "created_at": iso(bm.get("created_at")),
        })
    return {"bookmarks": out}


class NoteBody(BaseModel):
    book_id: str
    chapter: int
    text: str = Field(min_length=1, max_length=2000)


@api.post("/library/notes")
async def library_add_note(body: NoteBody, user: dict = Depends(current_user)):
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Note text is required")
    await _require_chapter(body.book_id, body.chapter)
    note = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "book_id": body.book_id,
        "chapter": body.chapter,
        "text": text,
        "created_at": datetime.now(timezone.utc),
    }
    await db.lib_notes.insert_one(note)
    note["created_at"] = note["created_at"].isoformat()
    note.pop("_id", None)
    return {"note": note}


@api.delete("/library/notes/{note_id}")
async def library_delete_note(note_id: str, user: dict = Depends(current_user)):
    r = await db.lib_notes.delete_one({"id": note_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.get("/library/search")
async def library_search(q: str = Query(..., max_length=200), limit: int = Query(20, ge=1, le=100), user: dict = Depends(current_user)):
    query = q.strip().lower()
    if len(query) < 2:
        return {"results": []}
    results: list[dict] = []
    async for b in db.lib_books.find({}, {"_id": 0}):
        hits: list[dict] = []
        # Book-level match
        if query in b["title"].lower() or query in b["author"].lower() or any(query in t.lower() for t in b.get("tags", [])) or query in (b.get("description") or "").lower():
            hits.append({"type": "book", "title": b["title"], "snippet": (b.get("description") or "")[:180]})
        # Chapter search
        for ch in b.get("chapters", []):
            content = ch.get("content", "")
            title = ch.get("title", "")
            hay = (title + " " + content).lower()
            idx = hay.find(query)
            if idx >= 0:
                snippet = (content if idx >= len(title) else title + " — " + content)
                # get snippet from original casing
                original = (title + " — " + content)
                oidx = original.lower().find(query)
                if oidx >= 0:
                    s = max(0, oidx - 80); e = min(len(original), oidx + 160)
                    snippet = ("..." if s > 0 else "") + original[s:e].strip() + ("..." if e < len(original) else "")
                hits.append({"type": "chapter", "chapter": ch["number"], "title": ch["title"], "snippet": snippet[:260]})
                if len(hits) >= 4:
                    break
        if hits:
            results.append({
                "book_id": b["id"], "book_title": b["title"], "author": b["author"],
                "cover_image": b.get("cover_image"), "category_id": b["category_id"],
                "hits": hits[:4],
            })
        if len(results) >= limit:
            break
    return {"results": results}


# ---- AI-Library search helper (called from /ai/chat) ----
async def _library_matches_async(question: str, max_books: int = 3) -> list[dict]:
    q = (question or "").lower()
    if len(q) < 3:
        return []
    stop = {"the","and","for","are","with","that","this","have","what","which","when","where","how","from","your","you","can","does","should"}
    tokens = [t for t in re.findall(r"[a-zA-Z]{4,}", q) if t not in stop]
    if not tokens:
        return []
    scored: list[tuple[int, dict, list[dict]]] = []
    async for b in db.lib_books.find({}, {"_id": 0}):
        chapters_hit: list[dict] = []
        score = 0
        title_l = (b.get("title") or "").lower()
        tags_l = [t.lower() for t in (b.get("tags") or [])]
        for tk in tokens:
            if tk in title_l or any(tk in t for t in tags_l):
                score += 3
        for ch in b.get("chapters", []):
            ch_title_l = (ch.get("title") or "").lower()
            ch_content_l = (ch.get("content") or "").lower()
            ch_score = 0
            for tk in tokens:
                if tk in ch_title_l:
                    ch_score += 2
                elif tk in ch_content_l:
                    ch_score += 1
            if ch_score >= 2:
                chapters_hit.append({"number": ch["number"], "title": ch["title"], "score": ch_score, "content": ch["content"]})
                score += ch_score
        if score >= 2:
            chapters_hit.sort(key=lambda c: -c["score"])
            scored.append((score, b, chapters_hit[:2]))
    scored.sort(key=lambda t: -t[0])
    return [{"book": s[1], "chapters": s[2]} for s in scored[:max_books]]


# ---- Admin ----
class ChapterIn(BaseModel):
    number: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=300)
    content: str = Field(min_length=1, max_length=200_000)


class AdminBookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    author: Optional[str] = Field(None, min_length=1, max_length=300)
    category_id: Optional[str] = None
    description: Optional[str] = Field(None, max_length=5000)
    edition: Optional[str] = Field(None, max_length=100)
    isbn: Optional[str] = Field(None, max_length=40)
    publication_year: Optional[int] = Field(None, ge=1800, le=2100)
    cover_image: Optional[str] = Field(None, max_length=2000)
    tags: Optional[List[str]] = Field(None, max_length=50)
    chapters: Optional[List[ChapterIn]] = Field(None, max_length=500)
    license: Optional[str] = Field(None, max_length=500)


class AdminBookCreate(AdminBookUpdate):
    title: str = Field(min_length=1, max_length=300)
    author: str = Field(min_length=1, max_length=300)
    category_id: str
    license: Optional[str] = Field("User-uploaded — ensure you have rights to distribute this content.", max_length=500)


def _book_fields(data: dict) -> dict:
    """Normalise admin input: trimmed text, clean tags, chapters sorted with derived counts."""
    for k in ("title", "author", "description", "edition", "isbn", "cover_image"):
        if isinstance(data.get(k), str):
            data[k] = data[k].strip()
    for k in ("title", "author"):
        if k in data and not data[k]:
            raise HTTPException(400, f"{k} cannot be blank")
    if data.get("tags") is not None:
        data["tags"] = [t.strip() for t in data["tags"] if t.strip()]
    if data.get("chapters") is not None:
        chapters = sorted(data["chapters"], key=lambda c: c["number"])
        if len({c["number"] for c in chapters}) != len(chapters):
            raise HTTPException(400, "Chapter numbers must be unique")
        data["chapters"] = chapters
        data["chapter_count"] = len(chapters)
        data["page_count"] = sum(len(c["content"]) // 1800 + 1 for c in chapters) or 1
    return data


async def _require_category(category_id: str) -> None:
    if not await db.lib_categories.find_one({"id": category_id}, {"_id": 1}):
        raise HTTPException(400, f"Unknown category_id '{category_id}'")


@api.post("/library/admin/books")
async def admin_add_book(body: AdminBookCreate, admin: dict = Depends(admin_only)):
    await _require_category(body.category_id)
    data = _book_fields(body.model_dump())
    doc = {
        "id": f"bk-adm-{uuid.uuid4().hex[:8]}",
        "category_id": data["category_id"],
        "title": data["title"],
        "author": data["author"],
        "edition": data["edition"] or "",
        "isbn": data["isbn"] or "",
        "publication_year": data["publication_year"],
        "description": data["description"] or "",
        "cover_image": data["cover_image"] or "",
        "language": "English",
        "license": data["license"],
        "tags": data["tags"] or [],
        "chapters": data.get("chapters") or [],
        "page_count": data.get("page_count", 1),
        "chapter_count": data.get("chapter_count", 0),
        "created_at": datetime.now(timezone.utc),
        "created_by": admin["id"],
    }
    await db.lib_books.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return {"book": doc}


@api.put("/library/admin/books/{book_id}")
async def admin_edit_book(book_id: str, body: AdminBookUpdate, admin: dict = Depends(admin_only)):
    # Only fields present in the request are changed; omitted ones keep their stored value.
    upd = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not upd:
        raise HTTPException(400, "No fields to update")
    if "category_id" in upd:
        await _require_category(upd["category_id"])
    upd = _book_fields(upd)
    upd["updated_at"] = datetime.now(timezone.utc)
    r = await db.lib_books.update_one({"id": book_id}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Book not found")
    return {"ok": True}


@api.delete("/library/admin/books/{book_id}")
async def admin_delete_book(book_id: str, admin: dict = Depends(admin_only)):
    r = await db.lib_books.delete_one({"id": book_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Book not found")
    return {"ok": True}


@api.post("/library/admin/books/{book_id}/upload")
async def admin_upload_book_file(book_id: str, file: UploadFile = File(...), admin: dict = Depends(admin_only)):
    if not await db.lib_books.find_one({"id": book_id}, {"_id": 1}):
        raise HTTPException(404, "Book not found")
    contents = await read_upload(file)
    file_type = file.content_type or "application/pdf"
    path = f"{APP_NAME}/library/{book_id}.{safe_ext(file.filename, 'pdf')}"
    await store_file(path, contents, file_type)
    await db.lib_books.update_one({"id": book_id}, {"$set": {"storage_path": path, "file_type": file_type}})
    return {"ok": True}


@api.get("/library/books/{book_id}/file")
async def library_download_file(book_id: str, token: Optional[str] = None, authorization: Optional[str] = Header(None)):
    await user_id_from_token(token, authorization)
    b = await db.lib_books.find_one({"id": book_id}, {"_id": 0, "storage_path": 1, "file_type": 1})
    if not b or not b.get("storage_path"):
        raise HTTPException(404, "No file")
    content, ctype = await fetch_file(b["storage_path"])
    return Response(content=content, media_type=b.get("file_type") or ctype)


# ---------------------------- Calendar / Shifts / Leave ----------------------------
EVENT_TYPES = Literal["shift", "cme", "appointment", "task", "note", "leave", "class"]
SHIFT_TYPES = Literal["morning", "evening", "night", "off"]
SHIFT_HOURS = {"morning": 8, "evening": 8, "night": 12, "off": 0}
WORKING_SHIFTS = ("morning", "evening", "night")
MAX_LEAVE_RANGE_DAYS = 366


def _hhmm_or_none(v: Optional[str]) -> Optional[str]:
    """'' -> None; '9:05' / '09:05' -> '09:05'; anything else is rejected."""
    if v is None or not v.strip():
        return None
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", v.strip())
    if not m or int(m.group(1)) > 23 or int(m.group(2)) > 59:
        raise ValueError("must be a time in HH:MM format")
    return f"{int(m.group(1)):02d}:{m.group(2)}"


def _iso_datetime_or_none(v: Optional[str]) -> Optional[str]:
    if v is None or not v.strip():
        return None
    try:
        datetime.fromisoformat(v.strip().replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("must be an ISO date-time, e.g. 2026-05-01T09:00")
    return v.strip()


class LeaveConfigBody(BaseModel):
    al_rate_per_month: float = Field(1.5, ge=0, le=10)    # AL days accrued per completed month
    sick_rate_per_year: float = Field(15.0, ge=0, le=365)  # sick days per year
    work_start_date: str                                   # YYYY-MM-DD
    al_carry_over: float = Field(0.0, ge=0, le=365)        # any AL brought forward at start
    sick_carry_over: float = Field(0.0, ge=0, le=365)
    country: Optional[str] = Field(None, max_length=100)   # for holiday lookups later
    home_airport: Optional[str] = Field(None, max_length=4)  # IATA, for flight compare

    @field_validator("work_start_date")
    @classmethod
    def _check_start(cls, v: str) -> str:
        v = iso_date_or_none(v)
        if not v:
            raise ValueError("is required")
        return v


class EventPatch(BaseModel):
    date: Optional[str] = None
    type: Optional[EVENT_TYPES] = None
    shift_type: Optional[SHIFT_TYPES] = None
    leave_kind: Optional[Literal["AL", "SICK"]] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    notes: Optional[str] = Field(None, max_length=2000)
    hours: Optional[float] = Field(None, ge=0, le=24)
    start_time: Optional[str] = None  # HH:MM
    end_time: Optional[str] = None
    reminder_at: Optional[str] = None  # ISO datetime
    completed: Optional[bool] = None

    @field_validator("date")
    @classmethod
    def _check_date(cls, v):
        return iso_date_or_none(v)

    @field_validator("start_time", "end_time")
    @classmethod
    def _check_time(cls, v):
        return _hhmm_or_none(v)

    @field_validator("reminder_at")
    @classmethod
    def _check_reminder(cls, v):
        return _iso_datetime_or_none(v)


class EventBody(EventPatch):
    date: str
    type: EVENT_TYPES
    title: str = Field(min_length=1, max_length=200)
    notes: Optional[str] = Field("", max_length=2000)
    completed: Optional[bool] = False

    @field_validator("date")
    @classmethod
    def _check_date(cls, v):
        v = iso_date_or_none(v)
        if not v:
            raise ValueError("is required")
        return v


class PatternBody(BaseModel):
    start_date: str                                        # YYYY-MM-DD
    pattern: List[str] = Field(min_length=1, max_length=60)  # e.g. ["morning","morning","off","night","off"]
    cycles: int = Field(4, ge=1, le=52)                    # how many times to repeat the pattern


class LeavePreviewBody(BaseModel):
    start_date: str   # YYYY-MM-DD (inclusive)
    end_date: str     # YYYY-MM-DD (inclusive)
    leave_kind: Literal["AL", "SICK"] = "AL"

    @field_validator("leave_kind", mode="before")
    @classmethod
    def _upper_kind(cls, v):
        return v.upper() if isinstance(v, str) else v


def _iso_today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


async def _get_leave_config(user_id: str) -> dict:
    cfg = await db.leave_configs.find_one({"user_id": user_id}, {"_id": 0})
    if not cfg:
        cfg = {
            "user_id": user_id,
            "al_rate_per_month": 1.5,
            "sick_rate_per_year": 15.0,
            "work_start_date": _iso_today(),
            "al_carry_over": 0.0,
            "sick_carry_over": 0.0,
            "country": None,
            "home_airport": None,
            "created_at": datetime.now(timezone.utc),
        }
        await db.leave_configs.insert_one({**cfg})
        cfg.pop("_id", None)
    return cfg


def _months_between(start_date, end_date) -> float:
    """Completed months between two dates (fractional not counted)."""
    if end_date < start_date:
        return 0.0
    years = end_date.year - start_date.year
    months = end_date.month - start_date.month
    total = years * 12 + months
    if end_date.day < start_date.day:
        total -= 1
    return max(0, total)


@api.get("/calendar/leave-config")
async def get_leave_config(user: dict = Depends(current_user)):
    return await _get_leave_config(user["id"])


@api.put("/calendar/leave-config")
async def put_leave_config(body: LeaveConfigBody, user: dict = Depends(current_user)):
    data = body.model_dump()
    data.update({"user_id": user["id"], "updated_at": datetime.now(timezone.utc)})
    await db.leave_configs.update_one({"user_id": user["id"]}, {"$set": data}, upsert=True)
    return {"ok": True, "config": {**data}}


@api.get("/calendar/events")
async def list_events(from_date: str, to_date: str, user: dict = Depends(current_user)):
    if parse_date(to_date, "to_date") < parse_date(from_date, "from_date"):
        raise HTTPException(400, "to_date cannot be before from_date")
    docs = []
    async for d in db.calendar_events.find(
        {"user_id": user["id"], "date": {"$gte": from_date, "$lte": to_date}}, {"_id": 0}
    ).sort([("date", 1), ("start_time", 1)]):
        docs.append(d)
    return {"events": docs}


def _check_event_consistency(ev: dict) -> None:
    if ev.get("type") == "shift" and not ev.get("shift_type"):
        raise HTTPException(400, "shift_type is required for shift events")
    if ev.get("type") == "leave" and not ev.get("leave_kind"):
        raise HTTPException(400, "leave_kind is required for leave events")
    if ev.get("start_time") and ev.get("end_time") and ev["end_time"] <= ev["start_time"] and ev.get("type") != "shift":
        raise HTTPException(400, "end_time must be after start_time")  # night shifts may cross midnight


@api.post("/calendar/events")
async def create_event(body: EventBody, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc["title"] = doc["title"].strip() or "Event"
    if doc["type"] == "shift" and doc.get("hours") is None and doc.get("shift_type"):
        doc["hours"] = SHIFT_HOURS[doc["shift_type"]]
    _check_event_consistency(doc)
    doc.update({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    })
    await db.calendar_events.insert_one({**doc})
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@api.patch("/calendar/events/{event_id}")
async def update_event(event_id: str, body: EventPatch, user: dict = Depends(current_user)):
    # Only fields sent in the request are changed; explicit nulls clear optional fields.
    upd = body.model_dump(exclude_unset=True)
    for required in ("date", "type", "title"):
        if required in upd and upd[required] is None:
            raise HTTPException(400, f"{required} cannot be empty")
    if not upd:
        raise HTTPException(400, "No valid fields")
    existing = await db.calendar_events.find_one({"id": event_id, "user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Event not found")
    _check_event_consistency({**existing, **upd})
    await db.calendar_events.update_one({"id": event_id, "user_id": user["id"]}, {"$set": upd})
    doc = await db.calendar_events.find_one({"id": event_id, "user_id": user["id"]}, {"_id": 0})
    doc["created_at"] = iso(doc.get("created_at"))
    return doc


@api.delete("/calendar/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(current_user)):
    r = await db.calendar_events.delete_one({"id": event_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Event not found")
    return {"ok": True}


@api.post("/calendar/pattern")
async def generate_pattern(body: PatternBody, user: dict = Depends(current_user)):
    """Generate shifts by repeating a pattern of tokens.

    Tokens accepted: morning | evening | night | off (any casing).
    Off days are stored so the calendar can show them; you can hide off if you want.
    Existing shifts in the covered range are replaced, so re-running a pattern doesn't duplicate days.
    Days already converted to leave are left as they are.
    """
    start = parse_date(body.start_date, "start_date")
    tokens = [t.lower().strip() for t in body.pattern]
    for t in tokens:
        if t not in SHIFT_HOURS:
            raise HTTPException(400, f"Invalid shift token: {t}")
    total_days = len(tokens) * body.cycles
    end = start + timedelta(days=total_days - 1)
    leave_days = {
        d["date"] async for d in db.calendar_events.find(
            {"user_id": user["id"], "type": "leave", "date": {"$gte": start.isoformat(), "$lte": end.isoformat()}},
            {"_id": 0, "date": 1},
        )
    }
    now = datetime.now(timezone.utc)
    docs = []
    for i in range(total_days):
        d = (start + timedelta(days=i)).isoformat()
        if d in leave_days:
            continue
        tok = tokens[i % len(tokens)]
        docs.append({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "date": d,
            "type": "shift",
            "shift_type": tok,
            "title": tok.capitalize() + " shift" if tok != "off" else "Off day",
            "notes": "",
            "hours": SHIFT_HOURS[tok],
            "created_at": now,
        })
    removed = await db.calendar_events.delete_many(
        {"user_id": user["id"], "type": "shift", "date": {"$gte": start.isoformat(), "$lte": end.isoformat()}}
    )
    if docs:
        await db.calendar_events.insert_many([{**d} for d in docs])
    for d in docs:
        d["created_at"] = now.isoformat()
    return {"created": len(docs), "replaced": removed.deleted_count, "events": docs}


@api.post("/calendar/leave/preview")
async def preview_leave(body: LeavePreviewBody, user: dict = Depends(current_user)):
    """Given a range, compute how many WORKING days fall in it (cost in AL/sick)."""
    s = parse_date(body.start_date, "start_date")
    e = parse_date(body.end_date, "end_date")
    if e < s:
        raise HTTPException(400, "end_date before start_date")
    if (e - s).days >= MAX_LEAVE_RANGE_DAYS:
        raise HTTPException(400, f"Leave range cannot exceed {MAX_LEAVE_RANGE_DAYS} days")
    dates = [d.isoformat() for d in _daterange(s, e)]
    events_in_range = []
    async for d in db.calendar_events.find(
        {"user_id": user["id"], "date": {"$in": dates}, "type": "shift"}, {"_id": 0}
    ):
        events_in_range.append(d)
    by_date = {}
    for ev in events_in_range:
        by_date.setdefault(ev["date"], []).append(ev)

    working_days = 0
    off_days = 0
    unknown_days = 0
    detail = []
    for d in dates:
        evs = by_date.get(d, [])
        if not evs:
            unknown_days += 1
            detail.append({"date": d, "status": "no_shift_set", "counts_as_leave": False})
        elif any(x.get("shift_type") in WORKING_SHIFTS for x in evs):
            working_days += 1
            detail.append({"date": d, "status": "working", "counts_as_leave": True,
                           "shift_type": next((x["shift_type"] for x in evs if x.get("shift_type") in WORKING_SHIFTS), None)})
        else:
            off_days += 1
            detail.append({"date": d, "status": "off", "counts_as_leave": False})

    summary = await _leave_summary(user["id"])
    kind = body.leave_kind
    available = summary["al_remaining"] if kind == "AL" else summary["sick_remaining"]
    return {
        "total_days_in_range": len(dates),
        "working_days": working_days,
        "off_days": off_days,
        "unknown_days": unknown_days,
        "leave_cost": working_days,   # only working days count
        "leave_kind": kind,
        "available_balance": available,
        "can_apply": working_days <= available,
        "detail": detail,
    }


@api.post("/calendar/leave/apply")
async def apply_leave(body: LeavePreviewBody, user: dict = Depends(current_user)):
    """Marks all working days in the range as leave; unknown days remain untouched."""
    prev = await preview_leave(body, user)
    if not prev["can_apply"]:
        raise HTTPException(400, f"Not enough {prev['leave_kind']} balance (needs {prev['leave_cost']}, have {prev['available_balance']})")
    kind = body.leave_kind
    created = 0
    for row in prev["detail"]:
        if not row["counts_as_leave"]:
            continue
        # Convert existing shift on that date to a "leave" event, keep the original shift_type note
        await db.calendar_events.update_many(
            {"user_id": user["id"], "date": row["date"], "type": "shift"},
            {"$set": {"type": "leave", "leave_kind": kind,
                      "title": f"{'Annual' if kind == 'AL' else 'Sick'} leave",
                      "notes": f"Replaced {row.get('shift_type') or 'shift'}"}}
        )
        created += 1
    return {"applied_days": created, "leave_kind": kind, "range": [body.start_date, body.end_date]}


async def _leave_summary(user_id: str) -> dict:
    cfg = await _get_leave_config(user_id)
    today = datetime.now(timezone.utc).date()
    # Configs saved before validation existed may hold a bad date; treat it as "started today".
    work_start = date.fromisoformat(cfg["work_start_date"]) if is_iso_date(cfg.get("work_start_date")) else today
    months = _months_between(work_start, today)
    al_accrued = round(cfg.get("al_carry_over", 0) + months * cfg["al_rate_per_month"], 2)
    # simple pro-rata sick: (days_since_start / 365) * annual rate
    days_since = max(0, (today - work_start).days)
    sick_accrued = round(cfg.get("sick_carry_over", 0) + (days_since / 365.0) * cfg["sick_rate_per_year"], 2)

    # Days of leave taken (distinct dates, so two leave events on one day cost one day)
    al_days, sick_days = set(), set()
    async for d in db.calendar_events.find(
        {"user_id": user_id, "type": "leave"}, {"_id": 0, "leave_kind": 1, "date": 1}
    ):
        (sick_days if d.get("leave_kind") == "SICK" else al_days).add(d.get("date"))
    al_taken, sick_taken = len(al_days), len(sick_days)

    # night shifts last 6 months
    six_ago = (today - timedelta(days=180)).isoformat()
    night_shifts = await db.calendar_events.count_documents({
        "user_id": user_id, "type": "shift", "shift_type": "night",
        "date": {"$gte": six_ago, "$lte": today.isoformat()},
    })

    # CME hours total & YTD
    cme_ytd = 0.0
    cme_total = 0.0
    ytd_start = f"{today.year}-01-01"
    async for d in db.calendar_events.find(
        {"user_id": user_id, "type": {"$in": ["cme", "class"]}}, {"_id": 0, "hours": 1, "date": 1}
    ):
        h = float(d.get("hours") or 0)
        cme_total += h
        if d.get("date", "") >= ytd_start:
            cme_ytd += h

    return {
        "al_rate_per_month": cfg["al_rate_per_month"],
        "sick_rate_per_year": cfg["sick_rate_per_year"],
        "work_start_date": cfg["work_start_date"],
        "months_worked": months,
        "al_accrued": al_accrued,
        "al_taken": al_taken,
        "al_remaining": round(al_accrued - al_taken, 2),
        "sick_accrued": sick_accrued,
        "sick_taken": sick_taken,
        "sick_remaining": round(sick_accrued - sick_taken, 2),
        "night_shifts_6mo": night_shifts,
        "cme_hours_total": round(cme_total, 1),
        "cme_hours_ytd": round(cme_ytd, 1),
    }


@api.get("/calendar/summary")
async def calendar_summary(user: dict = Depends(current_user)):
    return await _leave_summary(user["id"])


@api.post("/calendar/leave/suggest-al")
async def suggest_al_window(user: dict = Depends(current_user), days: int = Query(14, ge=1, le=60)):
    """Suggest the earliest `days`-long windows whose working days the user can afford
    with their current AL balance."""
    summary = await _leave_summary(user["id"])
    budget = int(summary["al_remaining"])
    if budget <= 0:
        return {"budget": 0, "suggestions": [], "note": "No AL balance yet."}
    today = datetime.now(timezone.utc).date()
    horizon = today + timedelta(days=180)
    events = {}
    async for d in db.calendar_events.find(
        {"user_id": user["id"], "type": "shift", "date": {"$gte": today.isoformat(), "$lte": horizon.isoformat()}},
        {"_id": 0, "date": 1, "shift_type": 1},
    ):
        events[d["date"]] = d.get("shift_type")

    suggestions = []
    span = days
    d = today
    while d + timedelta(days=span - 1) <= horizon and len(suggestions) < 5:
        working = 0
        for i in range(span):
            k = (d + timedelta(days=i)).isoformat()
            if events.get(k) in ("morning", "evening", "night"):
                working += 1
        if 0 < working <= budget:
            suggestions.append({
                "start": d.isoformat(),
                "end": (d + timedelta(days=span - 1)).isoformat(),
                "working_days": working,
                "al_cost": working,
                "days_in_range": span,
            })
            d = d + timedelta(days=span)  # jump past this window to avoid overlaps
        else:
            d = d + timedelta(days=1)
    return {"budget": budget, "window_size_days": span, "suggestions": suggestions}


# ---------------------------- Health Monitor ----------------------------

class HealthProfileBody(BaseModel):
    height_cm: Optional[float] = Field(None, gt=30, le=280)
    weight_kg: Optional[float] = Field(None, gt=1, le=500)
    blood_group: Optional[str] = Field(None, max_length=10)
    allergies: Optional[str] = Field("", max_length=2000)
    conditions: Optional[str] = Field("", max_length=2000)
    resting_hr: Optional[int] = Field(None, ge=20, le=250)
    daily_step_goal: Optional[int] = Field(8000, ge=100, le=100_000)


# Plausible ranges per vital type; values outside them are almost certainly typos or unit mix-ups.
VITAL_RANGES = {
    "sugar": (10, 1000),   # mg/dL
    "hr": (20, 250),       # bpm
    "weight": (1, 500),    # kg
    "temp": (25, 45),      # °C
    "spo2": (50, 100),     # %
}


class VitalBody(BaseModel):
    type: Literal["bp", "sugar", "hr", "weight", "temp", "spo2"]
    systolic: Optional[float] = Field(None, ge=40, le=300)   # for bp
    diastolic: Optional[float] = Field(None, ge=20, le=200)  # for bp
    value: Optional[float] = None       # generic value for sugar/hr/weight/temp/spo2
    unit: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field("", max_length=1000)


class MedicationPatch(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    dose: Optional[str] = Field(None, min_length=1, max_length=100)  # "500 mg"
    schedule: Optional[List[str]] = Field(None, max_length=24)      # ["08:00", "14:00", "22:00"]
    frequency: Optional[Literal["daily", "weekly", "as_needed"]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    refill_date: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)
    active: Optional[bool] = None

    @field_validator("start_date", "end_date", "refill_date")
    @classmethod
    def _check_dates(cls, v):
        return iso_date_or_none(v)

    @field_validator("schedule")
    @classmethod
    def _check_schedule(cls, v):
        return None if v is None else [t for t in (_hhmm_or_none(s) for s in v) if t]


class MedicationBody(MedicationPatch):
    name: str = Field(min_length=1, max_length=200)
    dose: str = Field(min_length=1, max_length=100)
    schedule: List[str] = Field([], max_length=24)
    frequency: Literal["daily", "weekly", "as_needed"] = "daily"
    notes: Optional[str] = Field("", max_length=1000)
    active: Optional[bool] = True


class StepBody(BaseModel):
    steps: int = Field(le=200_000)
    source: Optional[str] = Field("manual", max_length=40)  # manual | walk_session | cycle_session | healthkit | googlefit
    activity: Optional[str] = Field(None, max_length=40)    # walk | cycle | run
    duration_min: Optional[float] = Field(None, ge=0, le=1440)
    at: Optional[str] = None           # ISO date "YYYY-MM-DD"; defaults to today

    @field_validator("at")
    @classmethod
    def _check_at(cls, v):
        return iso_date_or_none(v)


class MealBody(BaseModel):
    date: str                        # YYYY-MM-DD
    meal_type: Literal["breakfast", "lunch", "dinner", "snack", "meal"] = "meal"
    description: str = Field(min_length=1, max_length=1000)  # free text like "2 chapati + dal + salad"
    auto_estimate: bool = True       # ask Claude to estimate kcal/macros
    kcal: Optional[float] = Field(None, ge=0, le=20_000)
    protein_g: Optional[float] = Field(None, ge=0, le=2000)
    carbs_g: Optional[float] = Field(None, ge=0, le=2000)
    fat_g: Optional[float] = Field(None, ge=0, le=2000)

    @field_validator("date")
    @classmethod
    def _check_date(cls, v):
        v = iso_date_or_none(v)
        if not v:
            raise ValueError("is required")
        return v


async def _get_health_profile(user_id: str) -> dict:
    doc = await db.health_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        doc = {
            "user_id": user_id, "height_cm": None, "weight_kg": None,
            "blood_group": None, "allergies": "", "conditions": "",
            "resting_hr": None, "daily_step_goal": 8000,
            "created_at": datetime.now(timezone.utc),
        }
        await db.health_profiles.insert_one({**doc})
        doc.pop("_id", None)
    return doc


def _bmi(height_cm: Optional[float], weight_kg: Optional[float]):
    if not height_cm or not weight_kg or height_cm <= 0:
        return None
    m = height_cm / 100.0
    return round(weight_kg / (m * m), 1)


def _bmi_category(bmi: Optional[float]):
    if bmi is None: return None
    if bmi < 18.5: return "Underweight"
    if bmi < 25: return "Healthy"
    if bmi < 30: return "Overweight"
    return "Obese"


@api.get("/health/profile")
async def get_health_profile(user: dict = Depends(current_user)):
    doc = await _get_health_profile(user["id"])
    bmi = _bmi(doc.get("height_cm"), doc.get("weight_kg"))
    doc["bmi"] = bmi
    doc["bmi_category"] = _bmi_category(bmi)
    return doc


@api.put("/health/profile")
async def put_health_profile(body: HealthProfileBody, user: dict = Depends(current_user)):
    data = {k: v for k, v in body.model_dump().items() if v is not None or k in ("allergies", "conditions")}
    data["user_id"] = user["id"]
    data["updated_at"] = datetime.now(timezone.utc)
    await db.health_profiles.update_one({"user_id": user["id"]}, {"$set": data}, upsert=True)
    doc = await _get_health_profile(user["id"])
    bmi = _bmi(doc.get("height_cm"), doc.get("weight_kg"))
    doc["bmi"] = bmi
    doc["bmi_category"] = _bmi_category(bmi)
    return doc


@api.post("/health/vitals")
async def add_vital(body: VitalBody, user: dict = Depends(current_user)):
    if body.type == "bp":
        if body.systolic is None or body.diastolic is None:
            raise HTTPException(400, "systolic and diastolic are required for blood pressure")
        if body.diastolic >= body.systolic:
            raise HTTPException(400, "diastolic must be lower than systolic")
    else:
        lo, hi = VITAL_RANGES[body.type]
        if body.value is None:
            raise HTTPException(400, f"value is required for {body.type}")
        if not lo <= body.value <= hi:
            raise HTTPException(400, f"{body.type} value must be between {lo} and {hi}")
    doc = body.model_dump()
    doc.update({
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "at": datetime.now(timezone.utc),
    })
    if body.type == "weight":
        # auto-update the profile weight so BMI stays current
        await db.health_profiles.update_one(
            {"user_id": user["id"]},
            {"$set": {"weight_kg": body.value, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    await db.vitals.insert_one({**doc})
    doc.pop("_id", None)
    doc["at"] = doc["at"].isoformat()
    return doc


@api.get("/health/vitals")
async def list_vitals(type: Optional[str] = None, limit: int = Query(90, ge=1, le=500), user: dict = Depends(current_user)):
    q = {"user_id": user["id"]}
    if type:
        q["type"] = type
    out = []
    async for d in db.vitals.find(q, {"_id": 0}).sort("at", -1).limit(limit):
        d["at"] = iso(d.get("at"))
        out.append(d)
    return {"vitals": out}


@api.delete("/health/vitals/{vital_id}")
async def delete_vital(vital_id: str, user: dict = Depends(current_user)):
    r = await db.vitals.delete_one({"id": vital_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.get("/health/medications")
async def list_medications(user: dict = Depends(current_user)):
    out = []
    async for d in db.medications.find({"user_id": user["id"]}, {"_id": 0}).sort("active", -1):
        d["created_at"] = iso(d.get("created_at"))
        out.append(d)
    return {"medications": out}


def _check_med_dates(med: dict) -> None:
    if med.get("start_date") and med.get("end_date") and med["end_date"] < med["start_date"]:
        raise HTTPException(400, "end_date cannot be before start_date")


@api.post("/health/medications")
async def add_medication(body: MedicationBody, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc["name"], doc["dose"] = doc["name"].strip(), doc["dose"].strip()
    if not doc["name"] or not doc["dose"]:
        raise HTTPException(400, "name and dose are required")
    _check_med_dates(doc)
    doc.update({
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    })
    await db.medications.insert_one({**doc})
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@api.patch("/health/medications/{med_id}")
async def update_medication(med_id: str, body: MedicationPatch, user: dict = Depends(current_user)):
    upd = body.model_dump(exclude_unset=True)
    for required in ("name", "dose", "frequency", "schedule", "active"):
        if required in upd and upd[required] is None:
            raise HTTPException(400, f"{required} cannot be empty")
    if not upd:
        raise HTTPException(400, "No fields")
    existing = await db.medications.find_one({"id": med_id, "user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Not found")
    _check_med_dates({**existing, **upd})
    await db.medications.update_one({"id": med_id, "user_id": user["id"]}, {"$set": upd})
    doc = await db.medications.find_one({"id": med_id, "user_id": user["id"]}, {"_id": 0})
    doc["created_at"] = iso(doc.get("created_at"))
    return doc


@api.delete("/health/medications/{med_id}")
async def delete_medication(med_id: str, user: dict = Depends(current_user)):
    r = await db.medications.delete_one({"id": med_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.post("/health/steps")
async def add_steps(body: StepBody, user: dict = Depends(current_user)):
    if body.steps <= 0:
        raise HTTPException(400, "steps must be > 0")
    today = datetime.now(timezone.utc).date().isoformat()
    day = body.at or today
    if day > today:
        raise HTTPException(400, "Cannot log steps for a future date")
    entry = {
        "id": str(uuid.uuid4()), "user_id": user["id"], "date": day,
        "steps": int(body.steps), "source": body.source or "manual",
        "activity": body.activity, "duration_min": body.duration_min,
        "at": datetime.now(timezone.utc),
    }
    await db.step_entries.insert_one({**entry})

    # Compute new totals
    today_total = 0
    month_total = 0
    month_prefix = day[:7]
    async for d in db.step_entries.find(
        {"user_id": user["id"], "date": {"$gte": month_prefix + "-01", "$lte": month_prefix + "-31"}},
        {"_id": 0, "steps": 1, "date": 1},
    ):
        month_total += int(d["steps"])
        if d["date"] == day:
            today_total += int(d["steps"])
    return {"ok": True, "date": day, "today_total": today_total, "month_total": month_total}


@api.get("/health/steps/today")
async def steps_today(user: dict = Depends(current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    month_prefix = today[:7]
    today_total = 0
    month_total = 0
    days = {}
    async for d in db.step_entries.find(
        {"user_id": user["id"], "date": {"$gte": month_prefix + "-01", "$lte": month_prefix + "-31"}},
        {"_id": 0, "steps": 1, "date": 1},
    ):
        month_total += int(d["steps"])
        days[d["date"]] = days.get(d["date"], 0) + int(d["steps"])
        if d["date"] == today: today_total += int(d["steps"])
    prof = await _get_health_profile(user["id"])
    goal = int(prof.get("daily_step_goal") or 8000)
    # Only this month is loaded above, but the streak and 14-day series can reach back further.
    async for d in db.step_entries.find(
        {"user_id": user["id"], "date": {"$gte": (date.fromisoformat(today) - timedelta(days=400)).isoformat(), "$lt": month_prefix + "-01"}},
        {"_id": 0, "steps": 1, "date": 1},
    ):
        days[d["date"]] = days.get(d["date"], 0) + int(d["steps"])
    # streak: consecutive days ending today with steps >= goal
    streak = 0
    d = date.fromisoformat(today)
    while days.get(d.isoformat(), 0) >= goal:
        streak += 1
        d -= timedelta(days=1)
    # last 14 days series
    series = []
    d = date.fromisoformat(today)
    for _ in range(14):
        series.append({"date": d.isoformat(), "steps": days.get(d.isoformat(), 0)})
        d -= timedelta(days=1)
    series.reverse()
    return {
        "today": today_total, "month": month_total, "goal": goal,
        "streak_days": streak, "series_14d": series,
    }


# ---- Rewards ----
STEP_TIERS = [
    {"steps": 100000, "reward": "10% off next month", "discount_pct": 10},
    {"steps": 200000, "reward": "25% off next month", "discount_pct": 25},
    {"steps": 300000, "reward": "1 free month", "discount_pct": 100},
]


@api.get("/health/rewards")
async def rewards(user: dict = Depends(current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    month_prefix = today[:7]
    month_total = 0
    async for d in db.step_entries.find(
        {"user_id": user["id"], "date": {"$gte": month_prefix + "-01", "$lte": month_prefix + "-31"}},
        {"_id": 0, "steps": 1},
    ):
        month_total += int(d["steps"])
    # highest tier reached
    current_tier = None
    for t in STEP_TIERS:
        if month_total >= t["steps"]:
            current_tier = t
    next_tier = next((t for t in STEP_TIERS if t["steps"] > month_total), None)
    return {
        "month": month_prefix,
        "month_steps": month_total,
        "tiers": STEP_TIERS,
        "current_tier": current_tier,
        "next_tier": next_tier,
        "steps_to_next": (next_tier["steps"] - month_total) if next_tier else 0,
        "note": "Rewards apply at your next subscription renewal.",
    }


# ---- Meals + AI parser ----
MEAL_ESTIMATE_PROMPT = (
    "You are a nutrition estimator. Given the meal description, respond with ONLY a JSON object "
    "of the form {\"kcal\": <number>, \"protein_g\": <number>, \"carbs_g\": <number>, \"fat_g\": <number>, \"assumptions\": \"<one short line>\"}. "
    "Estimate assuming typical Indian/global home-style portion sizes when quantity is missing. Do not include markdown fences."
)


@api.post("/health/meals")
async def add_meal(body: MealBody, user: dict = Depends(current_user)):
    description = body.description.strip()
    if not description:
        raise HTTPException(400, "description is required")
    kcal, protein, carbs, fat = body.kcal, body.protein_g, body.carbs_g, body.fat_g
    parsed_by = "manual"
    if body.auto_estimate and kcal is None and EMERGENT_LLM_KEY:
        # Best effort: if estimation fails the meal is still saved without numbers.
        try:
            from emergentintegrations.llm.chat import UserMessage
            chat = new_llm_chat(f"meal-{user['id']}-{uuid.uuid4()}", MEAL_ESTIMATE_PROMPT)
            data = extract_json(await chat.send_message(UserMessage(text=description)))
            if data:
                kcal = max(0.0, float(data.get("kcal") or 0))
                protein = max(0.0, float(data.get("protein_g") or 0))
                carbs = max(0.0, float(data.get("carbs_g") or 0))
                fat = max(0.0, float(data.get("fat_g") or 0))
                parsed_by = "ai"
        except Exception as e:
            logger.warning("meal ai parse failed: %s", e)

    doc = {
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "date": body.date, "meal_type": body.meal_type,
        "description": description,
        "kcal": kcal, "protein_g": protein, "carbs_g": carbs, "fat_g": fat,
        "parsed_by": parsed_by,
        "at": datetime.now(timezone.utc),
    }
    await db.meals.insert_one({**doc})
    doc.pop("_id", None)
    doc["at"] = doc["at"].isoformat()
    return doc


@api.get("/health/meals")
async def list_meals(date: Optional[str] = None, user: dict = Depends(current_user)):
    q = {"user_id": user["id"]}
    if date:
        parse_date(date)
        q["date"] = date
    out = []
    async for d in db.meals.find(q, {"_id": 0}).sort("at", -1).limit(200):
        d["at"] = iso(d.get("at"))
        out.append(d)
    totals = {"kcal": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
    for m in out:
        for k in totals:
            totals[k] += float(m.get(k) or 0)
    return {"meals": out, "totals": {k: round(v, 1) for k, v in totals.items()}}


@api.delete("/health/meals/{meal_id}")
async def delete_meal(meal_id: str, user: dict = Depends(current_user)):
    r = await db.meals.delete_one({"id": meal_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---- Labs (PDF/image upload to object storage, reuse passport helpers) ----
@api.post("/health/labs/upload")
async def upload_lab(
    file: UploadFile = File(...),
    doc_name: str = Form(..., max_length=200),
    lab_date: Optional[str] = Form(None),
    notes: Optional[str] = Form("", max_length=2000),
    user: dict = Depends(current_user),
):
    doc_name = doc_name.strip()
    if not doc_name:
        raise HTTPException(400, "doc_name is required")
    lab_date = (lab_date or "").strip() or None
    if lab_date:
        parse_date(lab_date, "lab_date")
    content = await read_upload(file)
    lab_id = str(uuid.uuid4())
    content_type = file.content_type or "application/octet-stream"
    path = f"{APP_NAME}/labs/{user['id']}/{lab_id}.{safe_ext(file.filename, 'bin')}"
    await store_file(path, content, content_type)
    doc = {
        "id": lab_id, "user_id": user["id"],
        "doc_name": doc_name, "lab_date": lab_date, "notes": (notes or "").strip(),
        "storage_path": path, "file_name": file.filename, "content_type": content_type,
        "size": len(content), "created_at": datetime.now(timezone.utc),
    }
    await db.labs.insert_one({**doc})
    doc.pop("_id", None)
    doc.pop("storage_path", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@api.get("/health/labs")
async def list_labs(user: dict = Depends(current_user)):
    out = []
    async for d in db.labs.find({"user_id": user["id"]}, {"_id": 0, "storage_path": 0}).sort("created_at", -1):
        d["created_at"] = iso(d.get("created_at"))
        out.append(d)
    return {"labs": out}


@api.get("/health/labs/{lab_id}/file")
async def lab_file(lab_id: str, token: Optional[str] = None, authorization: Optional[str] = Header(None)):
    # Token may come in the query string so the in-app viewer can load it directly
    uid = await user_id_from_token(token, authorization)
    doc = await db.labs.find_one({"id": lab_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    if not doc.get("storage_path"):
        raise HTTPException(404, "No file attached")
    content, ctype = await fetch_file(doc["storage_path"])
    return Response(content=content, media_type=doc.get("content_type") or ctype)


@api.delete("/health/labs/{lab_id}")
async def delete_lab(lab_id: str, user: dict = Depends(current_user)):
    r = await db.labs.delete_one({"id": lab_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---- Wellbeing check-in: sleep, stress, mood (Pillar 9) ----
WELLBEING_WINDOW_DAYS = 7
WELLBEING_MIN_ENTRIES = 3  # check-ins needed in the window before we comment on trends
RECOMMENDED_SLEEP_HOURS = 7
HIGH_STRESS_AVG = 3.5
LOW_MOOD_MAX = 2  # mood score at or below this counts as a low day
LOW_MOOD_DAYS = 3


class WellbeingBody(BaseModel):
    date: Optional[str] = None
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    stress: Optional[int] = Field(None, ge=1, le=5)  # 1 calm … 5 overwhelmed
    mood: Optional[int] = Field(None, ge=1, le=5)    # 1 very low … 5 great
    note: Optional[str] = Field(None, max_length=300)

    @field_validator("date")
    @classmethod
    def _check_date(cls, v):
        return iso_date_or_none(v)


def _avg(values: List[float]) -> Optional[float]:
    return round(sum(values) / len(values), 1) if values else None


def _wellbeing_insights(entries: List[dict]) -> List[dict]:
    if len(entries) < WELLBEING_MIN_ENTRIES:
        return []
    out = []
    sleep = _avg([e["sleep_hours"] for e in entries if e.get("sleep_hours") is not None])
    stress = _avg([e["stress"] for e in entries if e.get("stress") is not None])
    low_days = sum(1 for e in entries if e.get("mood") is not None and e["mood"] <= LOW_MOOD_MAX)
    if sleep is not None and sleep < RECOMMENDED_SLEEP_HOURS:
        out.append({"kind": "sleep", "text": f"You've averaged {sleep} h of sleep this week. Most adults need 7–9 h; after night shifts, protect a dark, quiet sleep window."})
    if stress is not None and stress >= HIGH_STRESS_AVG:
        out.append({"kind": "stress", "text": "Your stress has been high this week. Try a 5-minute breathing break between study blocks, and talk to your mentor or tutor if placement or exams feel heavy."})
    if low_days >= LOW_MOOD_DAYS:
        out.append({"kind": "mood", "text": "Your mood has been low on several days. You don't have to handle this alone: reach out to someone you trust or your university's student support or counselling service."})
    if not out:
        out.append({"kind": "positive", "text": "Sleep, stress and mood look steady this week. Keep protecting that balance."})
    return out


async def _wellbeing_summary(user_id: str) -> dict:
    today = datetime.now(timezone.utc).date()
    since = (today - timedelta(days=13)).isoformat()
    entries = [e async for e in db.wellbeing.find({"user_id": user_id, "date": {"$gte": since}}, {"_id": 0, "user_id": 0}).sort("date", -1)]
    for e in entries:
        e["updated_at"] = iso(e.get("updated_at"))
    week_start = (today - timedelta(days=WELLBEING_WINDOW_DAYS - 1)).isoformat()
    week = [e for e in entries if e["date"] >= week_start]
    # Consecutive days with a check-in, counting back from today (or yesterday if today isn't logged yet)
    logged = {e["date"] for e in entries}
    d = today if today.isoformat() in logged else today - timedelta(days=1)
    streak = 0
    while d.isoformat() in logged:
        streak += 1
        d -= timedelta(days=1)
    return {
        "today": next((e for e in entries if e["date"] == today.isoformat()), None),
        "entries": entries,
        "week": {
            "check_ins": len(week),
            "avg_sleep_hours": _avg([e["sleep_hours"] for e in week if e.get("sleep_hours") is not None]),
            "avg_stress": _avg([e["stress"] for e in week if e.get("stress") is not None]),
            "avg_mood": _avg([e["mood"] for e in week if e.get("mood") is not None]),
        },
        "streak_days": streak,
        "insights": _wellbeing_insights(week),
    }


@api.get("/health/wellbeing")
async def get_wellbeing(user: dict = Depends(current_user)):
    return await _wellbeing_summary(user["id"])


@api.post("/health/wellbeing")
async def save_wellbeing(body: WellbeingBody, user: dict = Depends(current_user)):
    fields = {k: v for k, v in body.model_dump(exclude={"date"}).items() if v is not None}
    if not any(k in fields for k in ("sleep_hours", "stress", "mood")):
        raise HTTPException(400, "Log at least one of sleep, stress or mood")
    today = datetime.now(timezone.utc).date().isoformat()
    day = body.date or today
    if day > today:
        raise HTTPException(400, "Cannot check in for a future date")
    # One check-in per day: saving again updates it
    try:
        await db.wellbeing.update_one(
            {"user_id": user["id"], "date": day},
            {"$set": {**fields, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    except DuplicateKeyError:
        await db.wellbeing.update_one({"user_id": user["id"], "date": day}, {"$set": {**fields, "updated_at": datetime.now(timezone.utc)}})
    return await _wellbeing_summary(user["id"])


# ---------------------------- Nursing Scope & Trends ----------------------------

@api.get("/clinical-sims")
async def clinical_sims_list():
    lite = [{"id": s["id"], "title": s["title"], "category": s["category"], "difficulty": s["difficulty"], "emoji": s.get("emoji", "🩺"), "vignette": s["vignette"], "steps_count": len(s["steps"])} for s in CLINICAL_SIMS]
    return {"sims": lite}


@api.get("/clinical-sims/{sim_id}")
async def clinical_sim_detail(sim_id: str):
    s = next((x for x in CLINICAL_SIMS if x["id"] == sim_id), None)
    if not s: raise HTTPException(404, "Not found")
    return s


@api.get("/procedures")
async def procedures_list():
    return {"years": list(NURSING_PROCEDURES.keys()),
            "procedures": {yr: [{"id": p["id"], "name": p["name"], "purpose": p.get("purpose")} for p in procs] for yr, procs in NURSING_PROCEDURES.items()}}


@api.get("/procedures/{proc_id}")
async def procedure_detail(proc_id: str):
    for procs in NURSING_PROCEDURES.values():
        for p in procs:
            if p["id"] == proc_id:
                return p
    raise HTTPException(404, "Not found")


@api.get("/abnormal-deliveries")
async def abnormal_deliveries_list():
    return {"conditions": ABNORMAL_DELIVERIES, "count": len(ABNORMAL_DELIVERIES)}


@api.get("/abnormal-deliveries/{cond_id}")
async def abnormal_delivery_detail(cond_id: str):
    c = next((x for x in ABNORMAL_DELIVERIES if x["id"] == cond_id), None)
    if not c: raise HTTPException(404, "Not found")
    return c


@api.get("/nursing-scope")
async def nursing_scope_list(category: Optional[str] = None):
    scopes = NURSING_SCOPES
    if category:
        scopes = [s for s in scopes if s.get("category") == category]
    cats = sorted({s["category"] for s in NURSING_SCOPES}, key=lambda c: (CATEGORIES_ORDER.index(c) if c in CATEGORIES_ORDER else 99))
    lite = [{
        "id": s["id"], "name": s["name"], "emoji": s["emoji"],
        "category": s["category"], "short_desc": s["short_desc"],
        "trend": s.get("trend"),
    } for s in scopes]
    return {"scopes": lite, "categories": cats}


@api.get("/nursing-scope/{scope_id}")
async def nursing_scope_detail(scope_id: str):
    s = next((x for x in NURSING_SCOPES if x["id"] == scope_id), None)
    if not s:
        raise HTTPException(404, "Not found")
    return s


@api.get("/nursing-trends")
async def nursing_trends_list():
    return {"trends": NURSING_TRENDS}


# ---------------------------- Pediatric (Broselow + weight-based calc) ----------------------------


class PediatricCalcBody(BaseModel):
    drug_id: str
    weight_kg: float
    # Override of the drug's default concentration, in the drug's dose unit per mL (mg/mL, or mcg/mL for mcg drugs)
    concentration_mg_per_ml: Optional[float] = Field(None, gt=0, le=10_000)


class PediatricFluidsBody(BaseModel):
    weight_kg: float


class PediatricBSABody(BaseModel):
    height_cm: float
    weight_kg: float


class PediatricDripBody(BaseModel):
    volume_ml: float
    time_hr: float
    drop_factor: int = Field(20, ge=1, le=100)   # drops per mL (macro=15/20, micro=60)


@api.get("/pediatric/broselow")
async def pediatric_broselow(weight_kg: Optional[float] = None):
    if weight_kg is not None and weight_kg > 0:
        z = broselow_zone_for(weight_kg)
        return {"zones": BROSELOW_ZONES, "matched": z}
    return {"zones": BROSELOW_ZONES, "matched": None}


@api.get("/pediatric/drugs")
async def pediatric_drug_list(category: Optional[str] = None):
    drugs = PEDIATRIC_DRUGS
    if category:
        drugs = [d for d in drugs if d.get("category", "").lower() == category.lower()]
    categories = sorted({d.get("category", "Other") for d in PEDIATRIC_DRUGS})
    return {"drugs": drugs, "categories": categories}


@api.post("/pediatric/calc")
async def pediatric_calc(body: PediatricCalcBody):
    if body.weight_kg <= 0 or body.weight_kg > 150:
        raise HTTPException(400, "weight_kg out of range")
    drug = next((d for d in PEDIATRIC_DRUGS if d["id"] == body.drug_id), None)
    if not drug:
        raise HTTPException(404, "Drug not found")

    unit = "mg"
    per_kg = drug.get("dose_mg_per_kg")
    if per_kg is None and drug.get("dose_mcg_per_kg") is not None:
        per_kg = drug["dose_mcg_per_kg"]; unit = "mcg"
    if per_kg is None and drug.get("dose_ml_per_kg") is not None:
        per_kg = drug["dose_ml_per_kg"]; unit = "mL"
    if per_kg is None and drug.get("dose_units_per_kg_per_hr") is not None:
        per_kg = drug["dose_units_per_kg_per_hr"]; unit = "U/hr"
    if per_kg is None:
        raise HTTPException(400, "Drug has no weight-based dose")

    dose = round(per_kg * body.weight_kg, 3)
    max_key = {"mg": "max_single_dose_mg", "mcg": "max_single_dose_mcg",
               "mL": "max_single_dose_ml", "U/hr": "max_single_dose_units"}[unit]
    max_dose = drug.get(max_key)
    capped = False
    final_dose = dose
    if max_dose is not None and dose > max_dose:
        final_dose = max_dose
        capped = True

    conc = body.concentration_mg_per_ml or drug.get("common_concentration_mg_per_ml") \
           or drug.get("common_concentration_mcg_per_ml")
    volume_ml = round(final_dose / conc, 3) if conc and unit in ("mg", "mcg") else None

    return {
        "drug": drug,
        "weight_kg": body.weight_kg,
        "calculated_dose": dose,
        "final_dose": final_dose,
        "dose_unit": unit,
        "capped_at_max": capped,
        "max_single_dose": max_dose,
        "concentration_used_mg_per_ml": conc,
        "volume_ml": volume_ml,
        "disclaimer": "Educational reference only. Verify with prescriber and institutional protocol before administering.",
    }


@api.post("/pediatric/fluids")
async def pediatric_fluids(body: PediatricFluidsBody):
    """Holliday-Segar 4-2-1 rule for maintenance IV fluids."""
    w = body.weight_kg
    if w <= 0 or w > 150:
        raise HTTPException(400, "weight_kg out of range")
    # Per hour
    hr = 0.0
    if w <= 10:
        hr = 4 * w
    elif w <= 20:
        hr = 40 + 2 * (w - 10)
    else:
        hr = 60 + 1 * (w - 20)
    day = hr * 24
    # Bolus reference (20 mL/kg)
    bolus = 20 * w
    return {
        "weight_kg": w,
        "maintenance_ml_per_hr": round(hr, 1),
        "maintenance_ml_per_day": round(day, 1),
        "recommended_bolus_ml": round(bolus, 0),
        "rule": "Holliday-Segar 4-2-1 (4 mL/kg/hr first 10 kg, 2 mL/kg/hr next 10 kg, 1 mL/kg/hr thereafter). Bolus 20 mL/kg NS.",
        "disclaimer": "Reduce to 10 mL/kg boluses in DKA / cardiogenic shock. Adjust for burns, cardiac, renal or hepatic disease.",
    }


@api.post("/pediatric/bsa")
async def pediatric_bsa(body: PediatricBSABody):
    h, w = body.height_cm, body.weight_kg
    if h <= 0 or w <= 0 or h > 250 or w > 200:
        raise HTTPException(400, "height/weight out of range")
    bsa = math.sqrt((h * w) / 3600.0)
    return {
        "height_cm": h, "weight_kg": w,
        "bsa_m2": round(bsa, 3),
        "formula": "Mosteller: BSA (m²) = √((height cm × weight kg) / 3600)",
    }


@api.post("/pediatric/drip")
async def pediatric_drip(body: PediatricDripBody):
    if body.volume_ml <= 0 or body.time_hr <= 0:
        raise HTTPException(400, "volume/time must be > 0")
    ml_per_hr = body.volume_ml / body.time_hr
    minutes = body.time_hr * 60
    drops_per_min = (body.volume_ml * body.drop_factor) / minutes
    return {
        "volume_ml": body.volume_ml,
        "time_hr": body.time_hr,
        "drop_factor": body.drop_factor,
        "ml_per_hr": round(ml_per_hr, 2),
        "drops_per_min": round(drops_per_min, 1),
        "formula": "Drops/min = (Volume mL × Drop factor) / (Time in min). Macro drip 15 or 20 gtt/mL, Micro drip 60 gtt/mL.",
    }


# ---------------------------- Translator (LLM + TTS) ----------------------------

# Common nurse-relevant languages. Value is BCP-47-ish label; keep list short but usable.
TRANSLATOR_LANGUAGES = [
    "English", "Hindi", "Malayalam", "Tamil", "Telugu", "Kannada", "Bengali", "Marathi", "Gujarati", "Punjabi", "Urdu",
    "Arabic", "Farsi", "Turkish", "Hebrew",
    "German", "French", "Spanish", "Portuguese", "Italian", "Dutch", "Russian", "Polish", "Swedish", "Norwegian", "Finnish", "Danish", "Greek",
    "Chinese (Simplified)", "Chinese (Traditional)", "Japanese", "Korean", "Vietnamese", "Thai", "Indonesian", "Malay", "Filipino",
    "Swahili", "Amharic", "Yoruba", "Zulu", "Hausa", "Somali",
    "Ukrainian", "Romanian", "Czech", "Hungarian", "Bulgarian", "Serbian", "Croatian", "Slovak", "Slovenian",
    "Nepali", "Sinhala", "Sindhi", "Pashto",
]


class TranslateBody(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    target_language: str = Field(min_length=1, max_length=50)
    source_language: Optional[str] = Field(None, max_length=50)
    mode: Optional[Literal["patient", "medical", "casual"]] = "patient"


class TTSBody(BaseModel):
    text: str = Field(min_length=1, max_length=10_000)
    voice: Optional[Literal["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"]] = "nova"
    speed: Optional[float] = Field(1.0, ge=0.25, le=4.0)
    model: Optional[Literal["tts-1", "tts-1-hd"]] = "tts-1"


@api.get("/translate/languages")
async def translator_languages():
    return {"languages": TRANSLATOR_LANGUAGES}


def _translate_system_prompt(mode: str, target: str, source: Optional[str]) -> str:
    src = source or "auto-detect the source language"
    base = (
        f"You are Nurse Orbit's medical translator. Translate faithfully from {src} to {target}. "
        "Keep clinical accuracy. Preserve drug names, dosages, units, lab values, and abbreviations exactly. "
        "Do not add commentary, disclaimers or extra content. Return ONLY the translated text."
    )
    if mode == "patient":
        base += (
            " Use warm, respectful, culturally-appropriate phrasing that a patient with no medical background can understand. "
            "Where a technical term is unavoidable, briefly note the plain-language meaning in parentheses."
        )
    elif mode == "medical":
        base += (
            " Preserve full medical register. Do not simplify. Keep the structure (headings, bullets) if the input has any."
        )
    elif mode == "casual":
        base += " Use natural, conversational tone as spoken in everyday life."
    return base


@api.post("/translate")
async def translate(body: TranslateBody, user: dict = Depends(current_user)):
    require_ai()
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "text is required")
    target = body.target_language.strip()
    source = (body.source_language or "").strip() or None
    if source and source == target:
        raise HTTPException(400, "Source and target languages are the same")
    # Languages outside TRANSLATOR_LANGUAGES are still attempted; the list is what the app offers.
    system = _translate_system_prompt(body.mode or "patient", target, source)
    try:
        from emergentintegrations.llm.chat import UserMessage
        chat = new_llm_chat(f"tx-{user['id']}-{uuid.uuid4()}", system)
        translated = (await chat.send_message(UserMessage(text=text)) or "").strip()
    except Exception:
        logger.exception("translation failed")
        raise HTTPException(502, "Translation failed. Please try again.")
    if not translated:
        raise HTTPException(502, "Translation came back empty. Please try again.")

    # Save history (last 50)
    await db.translations.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "source_language": source, "target_language": target,
        "mode": body.mode or "patient",
        "input": text, "output": translated,
        "at": datetime.now(timezone.utc),
    })
    return {
        "input": text,
        "output": translated,
        "target_language": target,
        "source_language": source,
        "mode": body.mode or "patient",
    }


@api.get("/translate/history")
async def translate_history(limit: int = Query(20, ge=1, le=100), user: dict = Depends(current_user)):
    out = []
    async for d in db.translations.find({"user_id": user["id"]}, {"_id": 0}).sort("at", -1).limit(limit):
        d["at"] = iso(d.get("at"))
        out.append(d)
    return {"history": out}


def _clean_for_tts(text: str) -> str:
    t = re.sub(r"https?://\S+", "", text or "")
    t = re.sub(r"`{1,3}[^`]*`{1,3}", "", t)
    t = re.sub(r"[*_#>~|]", "", t)
    # strip common emoji ranges
    t = re.sub(r"[\U0001F300-\U0001FAFF\U00002600-\U000027BF]", "", t)
    return re.sub(r"\s+", " ", t).strip()


@api.post("/translate/tts")
async def translate_tts(body: TTSBody, user: dict = Depends(current_user)):
    require_ai()
    text = _clean_for_tts(body.text)
    if not text:
        raise HTTPException(400, "text is required")
    text = text[:4000]
    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio = await tts.generate_speech(
            text=text,
            model=body.model or "tts-1",
            voice=body.voice or "nova",
            speed=body.speed or 1.0,
            response_format="mp3",
        )
    except Exception:
        logger.exception("TTS failed")
        raise HTTPException(502, "Text-to-speech failed. Please try again.")
    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )


# ---------------------------- OSCE (Skills Lab) ----------------------------

@api.get("/osce/stations")
async def osce_list_stations(
    category: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    user: dict = Depends(current_user),
):
    """Return OSCE stations, optionally filtered by category and/or difficulty."""
    stations = OSCE_STATIONS
    if category:
        stations = [s for s in stations if s["category"].lower() == category.lower()]
    if difficulty:
        stations = [s for s in stations if s["difficulty"].lower() == difficulty.lower()]
    # Return summary view (no full checklist to keep response small)
    return [
        {
            "id": s["id"],
            "category": s["category"],
            "title": s["title"],
            "duration_minutes": s["duration_minutes"],
            "difficulty": s["difficulty"],
            "total_marks": s["total_marks"],
            "pass_mark": s["pass_mark"],
        }
        for s in stations
    ]


@api.get("/osce/stations/{station_id}")
async def osce_get_station(station_id: str, user: dict = Depends(current_user)):
    """Return full OSCE station detail including scenario, checklist, tips."""
    station = next((s for s in OSCE_STATIONS if s["id"] == station_id), None)
    if not station:
        raise HTTPException(404, "OSCE station not found")
    return station


@api.post("/osce/attempt")
async def osce_attempt(
    body: OsceAttemptBody,
    user: dict = Depends(current_user),
):
    """Record an OSCE self-assessment attempt.  Awards 20 XP on pass, 5 XP on attempt."""
    station = next((s for s in OSCE_STATIONS if s["id"] == body.station_id), None)
    if not station:
        raise HTTPException(404, "OSCE station not found")

    checklist = station["checklist"]
    step_nums = {item["step"] for item in checklist}

    # Calculate marks based on ticked steps
    scored_marks = sum(
        item["marks"] for item in checklist if item["step"] in body.checked_steps
    )
    total_marks = station["total_marks"]
    pass_mark = station["pass_mark"]
    passed = scored_marks >= pass_mark
    percentage = round((scored_marks / total_marks) * 100, 1) if total_marks else 0

    # Missed steps
    missed_steps = [
        {"step": item["step"], "action": item["action"], "marks": item["marks"]}
        for item in checklist
        if item["step"] not in body.checked_steps
    ]

    xp_awarded = 20 if passed else 5
    await _grant_xp(user["id"], xp_awarded, "osce_attempt")

    attempt_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "station_id": body.station_id,
        "station_title": station["title"],
        "station_category": station["category"],
        "checked_steps": body.checked_steps,
        "scored_marks": scored_marks,
        "total_marks": total_marks,
        "pass_mark": pass_mark,
        "percentage": percentage,
        "passed": passed,
        "missed_steps": missed_steps,
        "time_spent_seconds": body.time_spent_seconds,
        "self_notes": (body.self_notes or "").strip(),
        "xp_awarded": xp_awarded,
        "created_at": datetime.now(timezone.utc),
    }
    await db.osce_attempts.insert_one(attempt_doc)

    return {
        "station_id": body.station_id,
        "score": scored_marks,
        "scored_marks": scored_marks,
        "total_marks": total_marks,
        "pass_mark": pass_mark,
        "percentage": percentage,
        "passed": passed,
        "missed_steps": missed_steps,
        "xp_awarded": xp_awarded,
        "attempt_id": attempt_doc["id"],
    }


@api.post("/osce/ai-examiner")
async def osce_ai_examiner(
    body: OsceExaminerBody,
    user: dict = Depends(current_user),
):
    """Stream AI examiner feedback on the student's OSCE checklist performance."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI service not configured")

    station = next((s for s in OSCE_STATIONS if s["id"] == body.station_id), None)
    if not station:
        raise HTTPException(404, "OSCE station not found")

    checklist = station["checklist"]
    scored_marks = sum(
        item["marks"] for item in checklist if item["step"] in body.checked_steps
    )
    missed_steps = [
        f"Step {item['step']}: {item['action']} ({item['marks']} mark{'s' if item['marks'] != 1 else ''})"
        for item in checklist
        if item["step"] not in body.checked_steps
    ]
    achieved_steps = [
        f"Step {item['step']}: {item['action']}"
        for item in checklist
        if item["step"] in body.checked_steps
    ]
    passed = scored_marks >= station["pass_mark"]
    notes_section = f"\n\nStudent's self-notes: {body.self_notes}" if body.self_notes and body.self_notes.strip() else ""

    prompt = (
        f"You are an expert OSCE clinical examiner for nursing students. "
        f"A student has just completed the '{station['title']}' OSCE station "
        f"(Category: {station['category']}, Duration: {station['duration_minutes']} minutes).\n\n"
        f"Station scenario: {station['scenario']}\n\n"
        f"Student scored {scored_marks}/{station['total_marks']} "
        f"(Pass mark: {station['pass_mark']}). "
        f"Result: {'PASSED ✅' if passed else 'FAILED ❌'}\n\n"
        f"Steps ACHIEVED ({len(achieved_steps)}):\n" + "\n".join(f"- {s}" for s in achieved_steps) +
        (f"\n\nSteps MISSED ({len(missed_steps)}):\n" + "\n".join(f"- {s}" for s in missed_steps) if missed_steps else "\n\nNo steps were missed — excellent!") +
        notes_section +
        "\n\nProvide structured, encouraging examiner feedback in the following format:\n"
        "1. **Overall Performance** (2-3 sentences on how the student did overall)\n"
        "2. **Strengths** (bullet points — what they did well)\n"
        "3. **Areas for Improvement** (for each missed step, give a specific clinical reason why it matters)\n"
        "4. **Key Clinical Tip** (one memorable take-away tip related to this station)\n"
        "5. **Next Steps** (recommended practice or study focus)\n\n"
        "Be specific, clinical, and constructive. Use encouraging language even when pointing out missed steps."
    )

    async def event_generator():
        try:
            from emergent_llm import AnthropicLLM, SystemMessage as SysMsg, UserMessage as UsrMsg, TextDelta as TDelta, StreamDone as SDone  # type: ignore
        except ImportError:
            yield f"data: {json.dumps({'error': 'AI service not available'})}\n\n"
            return
        try:
            llm = AnthropicLLM(api_key=EMERGENT_LLM_KEY, model=LLM_MODEL)
            async for event in llm.stream_message(
                UsrMsg(text=prompt),
                system=SysMsg(text="You are an expert OSCE nursing clinical examiner. Provide detailed, constructive, specific feedback based on the student's performance."),
            ):
                if isinstance(event, TDelta):
                    yield f"data: {json.dumps({'delta': event.content})}\n\n"
                elif isinstance(event, SDone):
                    break
        except Exception:
            logger.exception("OSCE AI examiner stream error")
            yield f"data: {json.dumps({'error': 'AI examiner unavailable. Please try again.'})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api.get("/osce/history")
async def osce_history(user: dict = Depends(current_user)):
    """List OSCE attempts for the current user, most recent first."""
    attempts = []
    async for doc in db.osce_attempts.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(50):
        doc["created_at"] = iso(doc.get("created_at"))
        attempts.append(doc)
    return attempts


# ---------------------------- Health ----------------------------
@api.get("/")
async def root():
    return {"app": "Nurse Orbit API", "status": "ok"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    # Auth is a bearer token, not cookies; credentials only matter with an explicit origin list.
    allow_credentials=CORS_ORIGINS != ["*"],
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
