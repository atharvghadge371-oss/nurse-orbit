"""Automated tests for the Smart 7-Day Revision Plan feature.

Covers:
1. POST /api/revision/generate-plan:
   - Generates plan when explicit topic provided.
   - Auto-detects weakest topic when topic is None/empty.
   - Returns 400 when no weak areas detected and no topic provided.
   - Calls Claude to return structured 7-day plan.
   - Persists in MongoDB "revision_plans" collection.
   - Returns plan_data + plan_id.
2. GET /api/revision/plans:
   - Returns last 5 revision plans for the authenticated user.
3. GET /api/revision/plans/{plan_id}:
   - Returns full plan data.
   - Returns 404 on non-existent plan ID.
4. Auth guards across all revision endpoints.
5. Index creation for revision_plans.
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
        "email": "revision_student@nurseorbit.app",
        "name": "Revision Student",
        "onboarded": True,
        "is_admin": False,
    }


@pytest.fixture
def auth_headers(test_user):
    app.dependency_overrides[server.current_user] = lambda: test_user
    token = make_token(test_user["id"])
    yield {"Authorization": f"Bearer {token}"}
    app.dependency_overrides.pop(server.current_user, None)


def _sample_7day_plan(topic: str) -> dict:
    return {
        "topic": topic,
        "rationale": f"Mastering {topic} is critical for preventing common clinical errors on the NCLEX.",
        "days": [
            {
                "day": i,
                "title": f"Day {i}: Core Concept Drill",
                "focus": f"Sub-topic focus for day {i}",
                "tasks": [
                    f"Read high-yield summary for {topic} part {i}",
                    "Complete 10 targeted MCQs",
                    "Synthesize notes on drug contraindications",
                ],
                "ai_prompt": f"Explain key complications and nursing priorities for {topic} day {i}."
            }
            for i in range(1, 8)
        ],
    }


@pytest.mark.asyncio
async def test_generate_plan_explicit_topic(auth_headers, test_user, monkeypatch):
    """POST /api/revision/generate-plan with explicit topic generates and persists 7-day plan."""
    monkeypatch.setattr(server, "EMERGENT_LLM_KEY", "mock-emergent-key")

    plan_content = _sample_7day_plan("Cardiovascular Drugs")

    class MockChat:
        async def send_message(self, user_message):
            return json.dumps(plan_content)

    monkeypatch.setattr(server, "new_llm_chat", lambda session_id, system_message, history=None: MockChat())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {"topic": "Cardiovascular Drugs"}
        res = await ac.post("/api/revision/generate-plan", json=payload, headers=auth_headers)
        assert res.status_code == 200, res.text
        data = res.json()

        assert "plan_id" in data
        plan_id = data["plan_id"]
        assert data["topic"] == "Cardiovascular Drugs"
        assert len(data["days"]) == 7
        assert data["days"][0]["day"] == 1
        assert "ai_prompt" in data["days"][0]
        assert len(data["days"][0]["tasks"]) >= 3

        # Verify DB record
        doc = await server.db.revision_plans.find_one({"id": plan_id})
        assert doc is not None
        assert doc["user_id"] == test_user["id"]
        assert doc["topic"] == "Cardiovascular Drugs"
        assert len(doc["plan_data"]["days"]) == 7


@pytest.mark.asyncio
async def test_generate_plan_auto_detect_weak_topic(auth_headers, test_user, monkeypatch):
    """When topic is omitted, auto-detects weakest topic from mistake history."""
    monkeypatch.setattr(server, "EMERGENT_LLM_KEY", "mock-emergent-key")

    now = datetime.now(timezone.utc)
    uid = test_user["id"]

    # Insert 4 attempts for "Anticoagulants": 3 incorrect, 1 correct (acc = 0.25 < 0.65, count >= 3)
    for i in range(3):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "topic": "Anticoagulants",
            "correct": False,
            "created_at": now - timedelta(hours=4 - i),
        })
    await server.db.attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "topic": "Anticoagulants",
        "correct": True,
        "created_at": now - timedelta(hours=1),
    })

    plan_content = _sample_7day_plan("Anticoagulants")

    class MockChat:
        async def send_message(self, user_message):
            return json.dumps(plan_content)

    monkeypatch.setattr(server, "new_llm_chat", lambda session_id, system_message, history=None: MockChat())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Call without topic (empty body)
        res = await ac.post("/api/revision/generate-plan", json={}, headers=auth_headers)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["topic"] == "Anticoagulants"
        assert len(data["days"]) == 7


@pytest.mark.asyncio
async def test_generate_plan_no_weak_topic_returns_400(auth_headers):
    """When topic is omitted and user has no qualifying weak areas, returns 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/revision/generate-plan", json={}, headers=auth_headers)
        assert res.status_code == 400
        assert res.json()["detail"] == "No weak areas detected yet. Complete more questions first."


@pytest.mark.asyncio
async def test_list_revision_plans(auth_headers, test_user):
    """GET /api/revision/plans returns last 5 revision plans."""
    now = datetime.now(timezone.utc)
    for i in range(7):
        await server.db.revision_plans.insert_one({
            "id": f"plan-{i}",
            "user_id": test_user["id"],
            "topic": f"Topic {i}",
            "created_at": now - timedelta(days=7 - i),
            "plan_data": {},
        })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/revision/plans", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "plans" in data
        plans = data["plans"]
        assert len(plans) == 5
        # Most recent first (plan-6)
        assert plans[0]["id"] == "plan-6"
        assert plans[0]["topic"] == "Topic 6"
        assert "created_at" in plans[0]


@pytest.mark.asyncio
async def test_get_revision_plan_detail(auth_headers, test_user):
    """GET /api/revision/plans/{plan_id} returns full plan or 404."""
    plan_content = _sample_7day_plan("Infection Control")
    plan_id = str(uuid.uuid4())
    await server.db.revision_plans.insert_one({
        "id": plan_id,
        "user_id": test_user["id"],
        "topic": "Infection Control",
        "created_at": datetime.now(timezone.utc),
        "plan_data": plan_content,
    })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Invalid plan -> 404
        r_404 = await ac.get(f"/api/revision/plans/{uuid.uuid4()}", headers=auth_headers)
        assert r_404.status_code == 404

        # Valid plan -> 200 with full details
        res = await ac.get(f"/api/revision/plans/{plan_id}", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == plan_id
        assert data["topic"] == "Infection Control"
        assert len(data["days"]) == 7
        assert data["days"][0]["day"] == 1


@pytest.mark.asyncio
async def test_revision_plans_auth_guards():
    """All revision endpoints reject unauthenticated access."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r1 = await ac.post("/api/revision/generate-plan", json={"topic": "Triage"})
        assert r1.status_code in (401, 403)

        r2 = await ac.get("/api/revision/plans")
        assert r2.status_code in (401, 403)

        r3 = await ac.get(f"/api/revision/plans/{uuid.uuid4()}")
        assert r3.status_code in (401, 403)


@pytest.mark.asyncio
async def test_revision_plans_index():
    """_ensure_indexes creates the revision_plans index without error."""
    await server._ensure_indexes()
