"""Tests for Pillar 1 — My Nursing Journey (year-wise curriculum progress + personalised 7-day plan).

Covers:
1. GET /api/journey: current year from the onboarding profile, per-year progress, next-up suggestion.
2. POST/DELETE /api/journey/lessons/{id}/complete: completion, XP only on first completion, 404s.
3. GET /api/journey/subjects/{id}: completed lesson ids for the lesson screen.
4. Weak subjects (MCQ accuracy) are flagged needs_work, prioritised in next-up and focus areas.
5. POST /api/journey/plan + task toggle: 7-day plan from real curriculum state, lesson tasks linked to lesson progress.
6. PUT /api/journey/year: stored in onboarding format; plans are scoped to their year.
7. Auth guards.
"""
import uuid
from datetime import datetime, timezone

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
def test_user():
    return {"id": "user-" + uuid.uuid4().hex[:8], "email": "journey@nurseorbit.app", "name": "Student Nurse", "onboarded": True}


@pytest.fixture
def client(test_user):
    app.dependency_overrides[server.current_user] = lambda: test_user
    yield AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    app.dependency_overrides.pop(server.current_user, None)


async def _add_attempts(db, user_id, subject_id, correct_flags):
    q = next(q for q in server.QUESTIONS if q["subject_id"] == subject_id)
    for ok in correct_flags:
        await db.attempts.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, "question_id": q["id"], "subject_id": subject_id,
            "correct": ok, "created_at": datetime.now(timezone.utc),
        })


def _subject(payload, subject_id):
    return next(s for y in payload["years"] for s in y["subjects"] if s["id"] == subject_id)


@pytest.mark.asyncio
async def test_fresh_journey_defaults_to_year_1(client):
    async with client as ac:
        r = await ac.get("/api/journey")
    assert r.status_code == 200
    j = r.json()
    assert j["current_year"] == "Year 1"
    assert [y["year"] for y in j["years"]] == server.JOURNEY_YEARS
    assert j["years"][0]["is_current"] and not j["years"][1]["is_current"]
    assert j["overall"]["lessons_done"] == 0 and j["overall"]["lessons_total"] > 0
    assert all(s["status"] == "not_started" for y in j["years"] for s in y["subjects"])
    # Next up is the first lesson of the first Year 1 subject
    assert j["next_up"]["subject_id"] == "sub-fon"
    assert j["next_up"]["action"] == "lesson"
    assert j["next_up"]["lesson_id"] == "sub-fon-l1"
    assert j["plan"] is None
    assert j["focus_subjects"] == []


@pytest.mark.asyncio
async def test_current_year_comes_from_onboarding_profile(client, test_user):
    test_user["year"] = "2nd Year"
    async with client as ac:
        j = (await ac.get("/api/journey")).json()
    assert j["current_year"] == "Year 2"
    # Pharmacology is the first Year 2 subject and has written lessons
    assert j["next_up"]["subject_id"] == "sub-pha"
    assert j["next_up"]["lesson_id"] == "les-pha-1"


@pytest.mark.asyncio
async def test_complete_and_uncomplete_lesson(client, mock_mongo, test_user):
    async with client as ac:
        r = await ac.post("/api/journey/lessons/les-pha-1/complete")
        assert r.status_code == 200
        assert r.json() == {"lesson_id": "les-pha-1", "completed": True, "xp_gained": server.XP_ACTIONS["lesson_read"]}

        # Completing again is idempotent and earns no extra XP
        r = await ac.post("/api/journey/lessons/les-pha-1/complete")
        assert r.json()["xp_gained"] == 0
        assert await mock_mongo.lesson_progress.count_documents({"user_id": test_user["id"]}) == 1
        gam = await mock_mongo.gamification.find_one({"user_id": test_user["id"]})
        assert gam["xp"] == server.XP_ACTIONS["lesson_read"]

        r = await ac.get("/api/journey/subjects/sub-pha")
        assert r.json()["completed_lesson_ids"] == ["les-pha-1"]
        assert r.json()["lessons_total"] == len(server.LESSONS["sub-pha"])

        pha = _subject((await ac.get("/api/journey")).json(), "sub-pha")
        assert pha["status"] == "in_progress"
        assert pha["lessons_done"] == 1
        assert pha["next_lesson"]["id"] == "les-pha-2"

        r = await ac.delete("/api/journey/lessons/les-pha-1/complete")
        assert r.json()["completed"] is False
        assert (await ac.get("/api/journey/subjects/sub-pha")).json()["completed_lesson_ids"] == []


@pytest.mark.asyncio
async def test_completing_every_lesson_marks_subject_completed(client):
    async with client as ac:
        for l in server.LESSONS["sub-msn"]:
            await ac.post(f"/api/journey/lessons/{l['id']}/complete")
        msn = _subject((await ac.get("/api/journey")).json(), "sub-msn")
    assert msn["status"] == "completed"
    assert msn["progress"] == 100
    assert msn["next_lesson"] is None


@pytest.mark.asyncio
async def test_unknown_lesson_and_subject_404(client):
    async with client as ac:
        assert (await ac.post("/api/journey/lessons/nope/complete")).status_code == 404
        assert (await ac.delete("/api/journey/lessons/nope/complete")).status_code == 404
        assert (await ac.get("/api/journey/subjects/nope")).status_code == 404


@pytest.mark.asyncio
async def test_weak_subject_is_prioritised(client, mock_mongo, test_user):
    test_user["year"] = "2nd Year"
    await _add_attempts(mock_mongo, test_user["id"], "sub-msn", [True, False, False, False])  # 25%
    async with client as ac:
        j = (await ac.get("/api/journey")).json()
    msn = _subject(j, "sub-msn")
    assert msn["status"] == "needs_work"
    assert msn["mcq_accuracy"] == 25
    # Weak Med-Surg jumps ahead of Pharmacology, which comes first in the curriculum
    assert j["next_up"]["subject_id"] == "sub-msn"
    assert "25%" in j["next_up"]["reason"]
    assert [f["id"] for f in j["focus_subjects"]] == ["sub-msn"]


@pytest.mark.asyncio
async def test_too_few_attempts_do_not_flag_weakness(client, mock_mongo, test_user):
    await _add_attempts(mock_mongo, test_user["id"], "sub-pha", [False, False])
    async with client as ac:
        pha = _subject((await ac.get("/api/journey")).json(), "sub-pha")
    assert pha["status"] == "in_progress"


@pytest.mark.asyncio
async def test_weak_subject_with_all_lessons_read_suggests_quiz(client, mock_mongo, test_user):
    test_user["year"] = "2nd Year"
    await _add_attempts(mock_mongo, test_user["id"], "sub-msn", [False, False, False])
    async with client as ac:
        for l in server.LESSONS["sub-msn"]:
            await ac.post(f"/api/journey/lessons/{l['id']}/complete")
        j = (await ac.get("/api/journey")).json()
    assert j["next_up"]["subject_id"] == "sub-msn"
    assert j["next_up"]["action"] == "quiz"
    assert j["next_up"]["route"] == "/quiz/sub-msn"


@pytest.mark.asyncio
async def test_build_plan_uses_curriculum_state(client, mock_mongo, test_user):
    test_user["year"] = "2nd Year"
    await _add_attempts(mock_mongo, test_user["id"], "sub-msn", [False, False, False])
    async with client as ac:
        r = await ac.post("/api/journey/plan")
    assert r.status_code == 200
    plan = r.json()["plan"]
    assert plan["year"] == "Year 2"
    assert [d["day"] for d in plan["days"]] == list(range(1, 8))
    assert plan["tasks_done"] == 0 and plan["tasks_total"] > 0
    # Day 1 targets the weak subject; the week ends with a review
    assert plan["days"][0]["subject_id"] == "sub-msn"
    assert plan["days"][6]["title"] == "Weekly review"
    lesson_tasks = [t for d in plan["days"] for t in d["tasks"] if t["kind"] == "lesson"]
    assert lesson_tasks and all(t["lesson_id"] in server.LESSON_SUBJECT for t in lesson_tasks)
    # No lesson is scheduled twice
    assert len({t["lesson_id"] for t in lesson_tasks}) == len(lesson_tasks)
    # Every task has a unique id and a route into the app
    ids = [t["id"] for d in plan["days"] for t in d["tasks"]]
    assert len(ids) == len(set(ids))
    assert all(t["route"].startswith("/") for d in plan["days"] for t in d["tasks"])


@pytest.mark.asyncio
async def test_plan_skips_completed_lessons(client):
    async with client as ac:
        await ac.post("/api/journey/lessons/sub-fon-l1/complete")
        plan = (await ac.post("/api/journey/plan")).json()["plan"]
    scheduled = {t.get("lesson_id") for d in plan["days"] for t in d["tasks"]}
    assert "sub-fon-l1" not in scheduled
    assert "sub-fon-l2" in scheduled


@pytest.mark.asyncio
async def test_toggle_plan_tasks(client, mock_mongo, test_user):
    async with client as ac:
        plan = (await ac.post("/api/journey/plan")).json()["plan"]
        other = next(t for t in plan["days"][0]["tasks"] if t["kind"] != "lesson")
        lesson = next(t for t in plan["days"][0]["tasks"] if t["kind"] == "lesson")

        j = (await ac.post(f"/api/journey/plan/{plan['id']}/tasks/{other['id']}/toggle")).json()
        assert next(t for t in j["plan"]["days"][0]["tasks"] if t["id"] == other["id"])["done"] is True
        assert j["plan"]["tasks_done"] == 1

        j = (await ac.post(f"/api/journey/plan/{plan['id']}/tasks/{other['id']}/toggle")).json()
        assert j["plan"]["tasks_done"] == 0

        # Ticking a lesson task marks the lesson itself complete
        j = (await ac.post(f"/api/journey/plan/{plan['id']}/tasks/{lesson['id']}/toggle")).json()
        assert next(t for t in j["plan"]["days"][0]["tasks"] if t["id"] == lesson["id"])["done"] is True
        done = (await ac.get(f"/api/journey/subjects/{plan['days'][0]['subject_id']}")).json()["completed_lesson_ids"]
        assert lesson["lesson_id"] in done

        # …and completing a lesson elsewhere ticks it on the plan
        await ac.delete(f"/api/journey/lessons/{lesson['lesson_id']}/complete")
        j = (await ac.get("/api/journey")).json()
        assert next(t for t in j["plan"]["days"][0]["tasks"] if t["id"] == lesson["id"])["done"] is False


@pytest.mark.asyncio
async def test_toggle_404s_and_ownership(client, mock_mongo):
    async with client as ac:
        plan = (await ac.post("/api/journey/plan")).json()["plan"]
        assert (await ac.post(f"/api/journey/plan/{plan['id']}/tasks/nope/toggle")).status_code == 404
        assert (await ac.post("/api/journey/plan/nope/tasks/d1-t1/toggle")).status_code == 404
        await mock_mongo.journey_plans.update_one({"id": plan["id"]}, {"$set": {"user_id": "someone-else"}})
        assert (await ac.post(f"/api/journey/plan/{plan['id']}/tasks/d1-t1/toggle")).status_code == 404


@pytest.mark.asyncio
async def test_set_year_and_plan_scoping(client, mock_mongo, test_user):
    await mock_mongo.users.insert_one({**test_user})
    async with client as ac:
        await ac.post("/api/journey/plan")  # Year 1 plan
        r = await ac.put("/api/journey/year", json={"year": "Year 3"})
        assert r.status_code == 200
        j = r.json()
        assert j["current_year"] == "Year 3"
        # The Year 1 plan does not show up as the Year 3 plan
        assert j["plan"] is None
        stored = await mock_mongo.users.find_one({"id": test_user["id"]})
        assert stored["year"] == "3rd Year"

        assert (await ac.put("/api/journey/year", json={"year": "Year 9"})).status_code == 422


@pytest.mark.asyncio
async def test_auth_required():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for method, path in [
            ("GET", "/api/journey"), ("PUT", "/api/journey/year"), ("GET", "/api/journey/subjects/sub-pha"),
            ("POST", "/api/journey/lessons/les-pha-1/complete"), ("POST", "/api/journey/plan"),
            ("POST", "/api/journey/plan/x/tasks/y/toggle"),
        ]:
            r = await ac.request(method, path, json={"year": "Year 1"} if method == "PUT" else None)
            assert r.status_code == 401, (method, path, r.status_code)
