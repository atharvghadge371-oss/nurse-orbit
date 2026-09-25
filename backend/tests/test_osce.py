import json
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
import mongomock_motor
import server
from server import app, make_token
from osce_data import OSCE_STATIONS


@pytest.fixture(autouse=True)
def mock_mongo(monkeypatch):
    """Provide an isolated in-memory Mongo database for every test."""
    mock_client = mongomock_motor.AsyncMongoMockClient()
    test_db = mock_client["test_nurseorbit"]
    monkeypatch.setattr(server, "db", test_db)
    monkeypatch.setattr(server, "EMERGENT_LLM_KEY", "mock-key")
    return test_db


@pytest.fixture
def test_user():
    return {
        "id": "user-" + uuid.uuid4().hex[:8],
        "email": "student@nurseorbit.app",
        "name": "Nurse Student",
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
async def test_get_osce_stations(auth_headers):
    """GET /api/osce/stations returns all stations with metadata."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/osce/stations", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == len(OSCE_STATIONS)
        assert len(data) >= 8

        first = data[0]
        assert "id" in first
        assert "title" in first
        assert "category" in first
        assert "difficulty" in first
        assert "duration_minutes" in first
        assert "pass_mark" in first
        assert "total_marks" in first


@pytest.mark.asyncio
async def test_filter_osce_stations_by_category(auth_headers):
    """GET /api/osce/stations?category=Fundamentals filters properly."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/osce/stations?category=Fundamentals", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) > 0
        for s in data:
            assert s["category"] == "Fundamentals"


@pytest.mark.asyncio
async def test_filter_osce_stations_by_difficulty(auth_headers):
    """GET /api/osce/stations?difficulty=easy filters properly."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/osce/stations?difficulty=easy", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) > 0
        for s in data:
            assert s["difficulty"] == "easy"


@pytest.mark.asyncio
async def test_get_single_osce_station(auth_headers):
    """GET /api/osce/stations/{station_id} returns full checklist and scenario."""
    target_id = OSCE_STATIONS[0]["id"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get(f"/api/osce/stations/{target_id}", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == target_id
        assert "checklist" in data
        assert isinstance(data["checklist"], list)
        assert len(data["checklist"]) >= 8
        assert "scenario" in data
        assert "key_points" in data
        assert "common_mistakes" in data


@pytest.mark.asyncio
async def test_get_single_osce_station_not_found(auth_headers):
    """GET /api/osce/stations/non-existent returns 404."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/osce/stations/non-existent-station", headers=auth_headers)
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_submit_osce_attempt_pass(auth_headers, test_user, mock_mongo):
    """POST /api/osce/attempt calculates score, marks passed, awards XP, and stores attempt."""
    station = OSCE_STATIONS[0]
    # Check all steps
    checked_steps = [item["step"] for item in station["checklist"]]

    payload = {
        "station_id": station["id"],
        "checked_steps": checked_steps,
        "time_spent_seconds": 180,
        "notes": "Followed all standard procedures perfectly.",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/osce/attempt", json=payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["station_id"] == station["id"]
        assert data["score"] == station["total_marks"]
        assert data["total_marks"] == station["total_marks"]
        assert data["percentage"] == 100
        assert data["passed"] is True
        assert data["xp_awarded"] == 20
        assert data["missed_steps"] == []

        # Verify saved in db
        saved = await mock_mongo.osce_attempts.find_one({"user_id": test_user["id"]})
        assert saved is not None
        assert saved["station_id"] == station["id"]
        assert saved["passed"] is True


@pytest.mark.asyncio
async def test_submit_osce_attempt_fail(auth_headers, test_user, mock_mongo):
    """POST /api/osce/attempt marks fail when score < pass_mark, awards 5 XP."""
    station = OSCE_STATIONS[0]
    # Check only the first step
    checked_steps = [station["checklist"][0]["step"]]

    payload = {
        "station_id": station["id"],
        "checked_steps": checked_steps,
        "time_spent_seconds": 60,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/osce/attempt", json=payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["score"] < station["pass_mark"]
        assert data["passed"] is False
        assert data["xp_awarded"] == 5
        assert len(data["missed_steps"]) > 0


@pytest.mark.asyncio
async def test_get_osce_history(auth_headers, test_user, mock_mongo):
    """GET /api/osce/history returns past attempts in reverse chronological order."""
    station = OSCE_STATIONS[0]
    # Insert 2 attempts
    await mock_mongo.osce_attempts.insert_many([
        {
            "id": "attempt-1",
            "user_id": test_user["id"],
            "station_id": station["id"],
            "station_title": station["title"],
            "station_category": station["category"],
            "score": 14,
            "total_marks": 15,
            "pass_mark": 10,
            "percentage": 93,
            "passed": True,
            "time_spent_seconds": 200,
            "xp_awarded": 20,
            "created_at": "2026-09-22T10:00:00Z",
        },
        {
            "id": "attempt-2",
            "user_id": test_user["id"],
            "station_id": station["id"],
            "station_title": station["title"],
            "station_category": station["category"],
            "score": 8,
            "total_marks": 15,
            "pass_mark": 10,
            "percentage": 53,
            "passed": False,
            "time_spent_seconds": 120,
            "xp_awarded": 5,
            "created_at": "2026-09-22T11:00:00Z",
        },
    ])

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/osce/history", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2
        # attempt-2 is more recent
        assert data[0]["id"] == "attempt-2"
        assert data[1]["id"] == "attempt-1"
