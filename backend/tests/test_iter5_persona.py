"""
Iteration 5 — AI Nurse Tutor NICKNAME + TONE (persona) feature.

Covers:
  1. Login with demo credentials
  2. /auth/me returns ai_name + ai_tone (defaults)
  3. PUT /auth/profile updates ai_name/ai_tone
  4. POST /ai/chat SSE reply contains chosen nickname (persona injection works)
  5. Reply contains textbook-style formatting (## heading OR bullets)
  6. Switching persona to Buddy/strict is reflected in the next reply
"""
import json
import os
import re
import time
import requests
import pytest

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") or \
           os.environ.get("EXPO_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL (or EXPO_BACKEND_URL) must be set"

EMAIL = "demo@nurseorbit.app"
PASSWORD = "password123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- 1 & 2 ---
def test_login_and_me_has_persona_fields(auth):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth, timeout=15)
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    assert "ai_name" in user, "ai_name missing from public_user"
    assert "ai_tone" in user, "ai_tone missing from public_user"
    # Defaults documented in server.public_user
    # (allow prior test runs to have changed them, but they must be strings)
    assert isinstance(user["ai_name"], str) and user["ai_name"]
    assert isinstance(user["ai_tone"], str) and user["ai_tone"]


# --- 3 ---
def test_update_profile_persona_meera_funny(auth):
    r = requests.put(f"{BASE_URL}/api/auth/profile", headers=auth,
                     json={"ai_name": "Nurse Meera", "ai_tone": "funny"}, timeout=15)
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    assert user["ai_name"] == "Nurse Meera"
    assert user["ai_tone"] == "funny"

    # GET /me should reflect it
    r2 = requests.get(f"{BASE_URL}/api/auth/me", headers=auth, timeout=15)
    assert r2.status_code == 200
    u2 = r2.json()["user"]
    assert u2["ai_name"] == "Nurse Meera"
    assert u2["ai_tone"] == "funny"


def _read_sse_reply(url: str, headers: dict, payload: dict, timeout: int = 90) -> str:
    """POST SSE stream and assemble the full delta text."""
    full_parts = []
    with requests.post(url, headers=headers, json=payload, stream=True, timeout=timeout) as r:
        assert r.status_code == 200, f"chat failed: {r.status_code} {r.text[:400]}"
        for raw in r.iter_lines(decode_unicode=True):
            if not raw:
                continue
            if raw.startswith("data:"):
                blob = raw[5:].strip()
                if not blob:
                    continue
                try:
                    ev = json.loads(blob)
                except Exception:
                    continue
                if isinstance(ev, dict):
                    if "delta" in ev:
                        full_parts.append(ev["delta"])
                    if ev.get("done"):
                        break
                    if "error" in ev:
                        raise AssertionError(f"AI stream error: {ev['error']}")
    return "".join(full_parts)


# --- 4 & 5 ---
def test_ai_chat_reply_contains_meera_and_textbook_format(auth):
    # Ensure persona is Meera/funny (idempotent)
    requests.put(f"{BASE_URL}/api/auth/profile", headers=auth,
                 json={"ai_name": "Nurse Meera", "ai_tone": "funny"}, timeout=15)

    reply = _read_sse_reply(
        f"{BASE_URL}/api/ai/chat",
        headers=auth,
        payload={
            "session_id": f"nick-test-{int(time.time())}",
            "message": "Introduce yourself in one sentence.",
            "mode": "QUICK",
        },
    )
    assert reply.strip(), "empty reply from AI chat"
    print(f"\n[MEERA REPLY]\n{reply}\n")

    # (4) contains Meera (case-insensitive)
    assert re.search(r"meera", reply, re.IGNORECASE), \
        f"Persona injection failed — nickname 'Meera' not in reply. Full reply: {reply[:800]}"

    # NOTE: Textbook formatting is validated in a separate test below with a
    # substantive question. When the user explicitly asks for "one sentence"
    # (QUICK mode), the model correctly honors that override.


def test_ai_chat_textbook_formatting_on_substantive_question(auth):
    """Persona-injected system prompt must produce ## headings OR bullets on real questions."""
    requests.put(f"{BASE_URL}/api/auth/profile", headers=auth,
                 json={"ai_name": "Nurse Meera", "ai_tone": "funny"}, timeout=15)

    reply = _read_sse_reply(
        f"{BASE_URL}/api/ai/chat",
        headers=auth,
        payload={
            "session_id": f"nick-fmt-{int(time.time())}",
            "message": "Explain the pathophysiology, signs & symptoms and nursing management of pneumonia.",
            "mode": "STUDENT",
        },
    )
    assert reply.strip(), "empty reply"
    print(f"\n[FORMATTING REPLY snippet]\n{reply[:800]}\n")
    has_h2 = bool(re.search(r"(^|\n)#{2,3}\s+\S", reply))
    has_bullets = bool(re.search(r"(^|\n)[-•*]\s+\S", reply))
    assert has_h2 or has_bullets, \
        f"No textbook-style formatting in substantive answer: {reply[:500]}"
    # persona still holds
    assert re.search(r"meera", reply, re.IGNORECASE), \
        f"Persona 'Meera' missing in substantive answer: {reply[:400]}"


# --- 6 ---
def test_ai_chat_reply_switches_to_buddy_strict(auth):
    r = requests.put(f"{BASE_URL}/api/auth/profile", headers=auth,
                     json={"ai_name": "Buddy", "ai_tone": "strict"}, timeout=15)
    assert r.status_code == 200
    u = r.json()["user"]
    assert u["ai_name"] == "Buddy"
    assert u["ai_tone"] == "strict"

    reply = _read_sse_reply(
        f"{BASE_URL}/api/ai/chat",
        headers=auth,
        payload={
            "session_id": f"nick-test-buddy-{int(time.time())}",
            "message": "What is sepsis in one line? Introduce yourself first.",
            "mode": "QUICK",
        },
    )
    assert reply.strip(), "empty reply for Buddy test"
    print(f"\n[BUDDY REPLY]\n{reply}\n")
    assert re.search(r"buddy", reply, re.IGNORECASE), \
        f"Persona did not switch to 'Buddy'. Reply: {reply[:800]}"


# --- teardown: restore a sensible default so other tests aren't surprised ---
def test_zz_restore_default_persona(auth):
    r = requests.put(f"{BASE_URL}/api/auth/profile", headers=auth,
                     json={"ai_name": "Nurse AI", "ai_tone": "warm"}, timeout=15)
    assert r.status_code == 200
