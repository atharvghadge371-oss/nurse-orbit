"""Tests for Pillar 9 — wellbeing check-in (sleep, stress, mood) under /api/health/wellbeing."""
import uuid
from datetime import datetime, timedelta, timezone

import mongomock_motor
import pytest
from httpx import AsyncClient, ASGITransport

import server
from server import app


@pytest.fixture(autouse=True)
def mock_mongo(monkeypatch):
    test_db = mongomock_motor.AsyncMongoMockClient()["test_nurseorbit"]
    monkeypatch.setattr(server, "db", test_db)
    return test_db


@pytest.fixture
def client():
    user = {"id": "user-" + uuid.uuid4().hex[:8], "email": "wellbeing@nurseorbit.app", "name": "Student Nurse"}
    app.dependency_overrides[server.current_user] = lambda: user
    yield AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    app.dependency_overrides.pop(server.current_user, None)


def _day(offset: int) -> str:
    return (datetime.now(timezone.utc).date() - timedelta(days=offset)).isoformat()


@pytest.mark.asyncio
async def test_empty_summary(client):
    async with client as ac:
        r = await ac.get("/api/health/wellbeing")
    assert r.status_code == 200
    s = r.json()
    assert s["today"] is None and s["entries"] == [] and s["insights"] == []
    assert s["week"]["check_ins"] == 0 and s["week"]["avg_sleep_hours"] is None
    assert s["streak_days"] == 0


@pytest.mark.asyncio
async def test_check_in_and_update_same_day(client):
    async with client as ac:
        s = (await ac.post("/api/health/wellbeing", json={"sleep_hours": 6.5, "stress": 3, "mood": 4})).json()
        assert s["today"]["sleep_hours"] == 6.5 and s["today"]["stress"] == 3 and s["today"]["mood"] == 4
        # A second save the same day updates the entry instead of adding one, keeping unsent fields
        s = (await ac.post("/api/health/wellbeing", json={"mood": 2, "note": "Long placement day"})).json()
    assert len(s["entries"]) == 1
    assert s["today"]["mood"] == 2 and s["today"]["sleep_hours"] == 6.5 and s["today"]["note"] == "Long placement day"
    assert s["streak_days"] == 1


@pytest.mark.asyncio
async def test_validation(client):
    async with client as ac:
        assert (await ac.post("/api/health/wellbeing", json={})).status_code == 400
        assert (await ac.post("/api/health/wellbeing", json={"note": "only a note"})).status_code == 400
        assert (await ac.post("/api/health/wellbeing", json={"stress": 6})).status_code == 422
        assert (await ac.post("/api/health/wellbeing", json={"mood": 0})).status_code == 422
        assert (await ac.post("/api/health/wellbeing", json={"sleep_hours": 25})).status_code == 422
        assert (await ac.post("/api/health/wellbeing", json={"mood": 3, "date": "25-09-2026"})).status_code == 422
        assert (await ac.post("/api/health/wellbeing", json={"mood": 3, "date": _day(-1)})).status_code == 400


@pytest.mark.asyncio
async def test_insights_flag_poor_sleep_high_stress_low_mood(client):
    async with client as ac:
        for i in range(3):
            s = (await ac.post("/api/health/wellbeing", json={"date": _day(i), "sleep_hours": 5, "stress": 4, "mood": 2})).json()
    assert {i["kind"] for i in s["insights"]} == {"sleep", "stress", "mood"}
    assert s["week"] == {"check_ins": 3, "avg_sleep_hours": 5.0, "avg_stress": 4.0, "avg_mood": 2.0}
    assert s["streak_days"] == 3
    assert [e["date"] for e in s["entries"]] == [_day(0), _day(1), _day(2)]


@pytest.mark.asyncio
async def test_balanced_week_gets_positive_insight(client):
    async with client as ac:
        for i in range(3):
            s = (await ac.post("/api/health/wellbeing", json={"date": _day(i), "sleep_hours": 8, "stress": 2, "mood": 4})).json()
    assert [i["kind"] for i in s["insights"]] == ["positive"]


@pytest.mark.asyncio
async def test_no_insights_until_enough_check_ins(client):
    async with client as ac:
        s = (await ac.post("/api/health/wellbeing", json={"sleep_hours": 4, "stress": 5, "mood": 1})).json()
    assert s["insights"] == []


@pytest.mark.asyncio
async def test_streak_counts_from_yesterday_and_window_excludes_old_entries(client):
    async with client as ac:
        await ac.post("/api/health/wellbeing", json={"date": _day(1), "mood": 4})
        await ac.post("/api/health/wellbeing", json={"date": _day(2), "mood": 4})
        await ac.post("/api/health/wellbeing", json={"date": _day(10), "mood": 1})
        s = (await ac.get("/api/health/wellbeing")).json()
    assert s["today"] is None
    assert s["streak_days"] == 2
    assert s["week"]["check_ins"] == 2 and s["week"]["avg_mood"] == 4.0
    assert len(s["entries"]) == 3


@pytest.mark.asyncio
async def test_auth_required():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        assert (await ac.get("/api/health/wellbeing")).status_code == 401
        assert (await ac.post("/api/health/wellbeing", json={"mood": 3})).status_code == 401
