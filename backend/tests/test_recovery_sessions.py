"""Automated tests for Teach Me From My Mistakes recovery session feature.

Covers:
1. GET /api/questions/recovery-candidates:
   - Identifies topics with > 2 misses in last 30 days.
   - Filters out attempts older than 30 days.
   - Returns {topic, missed_count, last_missed_at, accuracy}.
   - Sorted by missed_count descending, limited to 5.
2. POST /api/recovery/session:
   - Calls LLM to generate 6-step mini-curriculum.
   - Persists session in db.recovery_sessions.
   - Returns session_data + session_id.
3. POST /api/recovery/session/{session_id}/complete:
   - Marks session completed in MongoDB.
   - Awards 50 XP to the user.
   - Returns {"completed": true, "xp_awarded": 50}.
   - 404 on invalid session ID.
4. GET /api/recovery/sessions:
   - Returns last 10 recovery sessions for the user: {id, topic, created_at, completed}.
5. Auth guards across all recovery endpoints.
6. Index creation for recovery_sessions.
"""
import pytest
import uuid
import json
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
import mongomock_motor

import server
from server import app, db, make_token


@pytest.fixture(autouse=True)
def mock_mongo(monkeypatch):
    """Provide an isolated in-memory Mongo database for every test."""
    mock_client = mongomock_motor.AsyncMongoMockClient()
    test_db = mock_client["test_nurseorbit"]
    monkeypatch.setattr(server, "db", test_db)
    return test_db


@pytest.fixture
def test_user():
    return {
        "id": "user-" + uuid.uuid4().hex[:8],
        "email": "student@nurseorbit.app",
        "name": "Nurse Recovery Student",
        "onboarded": True,
        "is_admin": False,
    }


@pytest.fixture
def auth_headers(test_user):
    app.dependency_overrides[server.current_user] = lambda: test_user
    token = make_token(test_user["id"])
    yield {"Authorization": f"Bearer {token}"}
    app.dependency_overrides.pop(server.current_user, None)


@pytest.mark.asyncio
async def test_recovery_candidates_empty(auth_headers):
    """GET /api/questions/recovery-candidates returns empty list when no misses exist."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/questions/recovery-candidates", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "candidates" in data
        assert data["candidates"] == []


@pytest.mark.asyncio
async def test_recovery_candidates_threshold_and_dates(auth_headers, test_user):
    """Identifies topics with > 2 misses in last 30 days and ignores older attempts."""
    now = datetime.now(timezone.utc)
    uid = test_user["id"]

    # Topic A: 1 miss 35 days ago (outside 30-day window) + 2 misses in last 5 days
    # Total in 30 days = 2 misses (<= 2, so NOT a candidate yet)
    await server.db.attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "topic": "Pediatric Vitals",
        "correct": False,
        "created_at": now - timedelta(days=35),
    })
    await server.db.attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "topic": "Pediatric Vitals",
        "correct": False,
        "created_at": now - timedelta(days=5),
    })
    await server.db.attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "topic": "Pediatric Vitals",
        "correct": False,
        "created_at": now - timedelta(days=2),
    })

    # Topic B: 4 misses and 1 correct in last 30 days (total 5, accuracy = 0.20)
    for i in range(4):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "topic": "Cardiovascular Drugs",
            "correct": False,
            "created_at": now - timedelta(days=10 - i),
        })
    await server.db.attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "topic": "Cardiovascular Drugs",
        "correct": True,
        "created_at": now - timedelta(days=1),
    })

    # Topic C: 3 misses in last 30 days (qualifies!)
    for i in range(3):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "topic": "Infection Control",
            "correct": False,
            "created_at": now - timedelta(days=8 - i),
        })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/questions/recovery-candidates", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        candidates = data["candidates"]

        # Topic B (4 misses) and Topic C (3 misses) qualify; Topic A (2 in window) does NOT
        topics = [c["topic"] for c in candidates]
        assert "Cardiovascular Drugs" in topics
        assert "Infection Control" in topics
        assert "Pediatric Vitals" not in topics

        # Sorted by missed_count descending: Cardiovascular Drugs (4) before Infection Control (3)
        assert candidates[0]["topic"] == "Cardiovascular Drugs"
        assert candidates[0]["missed_count"] == 4
        assert candidates[0]["accuracy"] == 0.2
        assert "last_missed_at" in candidates[0]

        assert candidates[1]["topic"] == "Infection Control"
        assert candidates[1]["missed_count"] == 3
        assert candidates[1]["accuracy"] == 0.0


@pytest.mark.asyncio
async def test_create_recovery_session_with_mock_llm(auth_headers, test_user, monkeypatch):
    """POST /api/recovery/session invokes LLM and stores session in MongoDB."""
    monkeypatch.setattr(server, "EMERGENT_LLM_KEY", "mock-emergent-key")

    mock_curriculum = {
        "topic": "Cardiovascular Drugs",
        "step1_explanation": "In-depth 350-word clinical review on ACE inhibitors, Beta-Blockers, and CCBs...",
        "step2_visual": "Pathology -> RAAS Activation -> Vasoconstriction -> Administer ACEi -> Vasodilation",
        "step3_mini_case": "A 58-year-old male with hypertension reports sudden cough and throat irritation.",
        "step4_mcqs": [
            {"question": f"MCQ {i}?", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "Rationale"}
            for i in range(1, 6)
        ],
        "step5_clinical_scenario": "Prioritize nursing action when patient exhibits angioedema post-administration.",
        "step6_assessment": [
            {"question": f"Assessment {i}?", "options": ["A", "B", "C", "D"], "correct_index": 0}
            for i in range(1, 4)
        ],
    }

    class MockChat:
        async def send_message(self, user_message):
            return json.dumps(mock_curriculum)

    monkeypatch.setattr(server, "new_llm_chat", lambda session_id, system_message, history=None: MockChat())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {"topic": "Cardiovascular Drugs"}
        res = await ac.post("/api/recovery/session", json=payload, headers=auth_headers)
        assert res.status_code == 200, res.text
        data = res.json()

        assert "session_id" in data
        session_id = data["session_id"]
        assert data["topic"] == "Cardiovascular Drugs"
        assert data["step1_explanation"] == mock_curriculum["step1_explanation"]
        assert data["step2_visual"] == mock_curriculum["step2_visual"]
        assert data["step3_mini_case"] == mock_curriculum["step3_mini_case"]
        assert len(data["step4_mcqs"]) == 5
        assert data["step5_clinical_scenario"] == mock_curriculum["step5_clinical_scenario"]
        assert len(data["step6_assessment"]) == 3

        # Verify MongoDB storage in recovery_sessions collection
        doc = await server.db.recovery_sessions.find_one({"id": session_id})
        assert doc is not None
        assert doc["user_id"] == test_user["id"]
        assert doc["topic"] == "Cardiovascular Drugs"
        assert doc["completed"] is False
        assert doc["session_data"]["step1_explanation"] == mock_curriculum["step1_explanation"]


@pytest.mark.asyncio
async def test_complete_recovery_session(auth_headers, test_user):
    """POST /api/recovery/session/{session_id}/complete marks completed and awards 50 XP."""
    session_id = str(uuid.uuid4())
    await server.db.recovery_sessions.insert_one({
        "id": session_id,
        "user_id": test_user["id"],
        "topic": "Anticoagulants",
        "created_at": datetime.now(timezone.utc),
        "completed": False,
        "session_data": {},
    })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Invalid session returns 404
        r_404 = await ac.post(f"/api/recovery/session/{uuid.uuid4()}/complete", headers=auth_headers)
        assert r_404.status_code == 404

        # Valid session completion
        res = await ac.post(f"/api/recovery/session/{session_id}/complete", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["completed"] is True
        assert data["xp_awarded"] == 50

        # Verify in DB
        doc = await server.db.recovery_sessions.find_one({"id": session_id})
        assert doc["completed"] is True
        assert "completed_at" in doc

        # Verify XP awarded in gamification
        gam = await server.db.gamification.find_one({"user_id": test_user["id"]})
        assert gam is not None
        assert gam.get("xp") == 50


@pytest.mark.asyncio
async def test_list_recovery_sessions(auth_headers, test_user):
    """GET /api/recovery/sessions returns the last 10 sessions for the user."""
    now = datetime.now(timezone.utc)
    # Insert 12 sessions
    for i in range(12):
        await server.db.recovery_sessions.insert_one({
            "id": f"sess-{i}",
            "user_id": test_user["id"],
            "topic": f"Topic {i}",
            "created_at": now - timedelta(hours=12 - i),
            "completed": (i % 2 == 0),
            "session_data": {},
        })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/recovery/sessions", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "sessions" in data
        sessions = data["sessions"]

        # Only last 10
        assert len(sessions) == 10
        # Ordered by created_at descending (sess-11 first)
        assert sessions[0]["id"] == "sess-11"
        assert sessions[0]["topic"] == "Topic 11"
        assert "created_at" in sessions[0]
        assert "completed" in sessions[0]


@pytest.mark.asyncio
async def test_recovery_auth_guards():
    """All recovery endpoints reject unauthenticated requests."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r1 = await ac.get("/api/questions/recovery-candidates")
        assert r1.status_code in (401, 403)

        r2 = await ac.post("/api/recovery/session", json={"topic": "Cardiovascular Drugs"})
        assert r2.status_code in (401, 403)

        r3 = await ac.post(f"/api/recovery/session/{uuid.uuid4()}/complete")
        assert r3.status_code in (401, 403)

        r4 = await ac.get("/api/recovery/sessions")
        assert r4.status_code in (401, 403)


@pytest.mark.asyncio
async def test_recovery_sessions_index():
    """_ensure_indexes creates the recovery_sessions index without error."""
    await server._ensure_indexes()
