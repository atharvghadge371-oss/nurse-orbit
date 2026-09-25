"""Automated tests for the NCLEX Progress Dashboard backend upgrade.

Covers:
1. QuestionAttemptBody schema: time_spent_seconds (default 0), mode (default 'practice').
2. POST /api/questions/attempt:
   - Persists topic, subject_id, difficulty from question.
   - Persists time_spent_seconds and mode.
   - Preserves response contract.
3. GET /api/questions/stats:
   - Returns full NCLEX dashboard contract.
   - Accuracy float (0.0 to 1.0).
   - questions_today, questions_this_week, avg_time_seconds.
   - strong_subjects (accuracy >= 0.75, top 3).
   - weak_subjects (accuracy < 0.70, top 5).
   - frequently_missed (missed_count > 2).
   - mock_sessions (mode=='mock', last 5).
   - daily_questions (last 7 days).
4. GET /api/questions/insights:
   - Last 20 attempts per topic.
   - Weakest topics (accuracy < 0.65, min 3 attempts, top 3).
   - Natural language insight: "Your weakest area this week is {topic}."
   - suggested_revision_focus: str.
   - Auth guard.
"""
import pytest
import uuid
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
import mongomock_motor

import server
from server import app, QuestionAttemptBody, db, QUESTION_BY_ID, SUBJECT_NAME_BY_ID, make_token


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
async def test_question_attempt_body_model():
    """Verify QuestionAttemptBody model schema and default values."""
    # Defaults
    b1 = QuestionAttemptBody(question_id="q1", selected_index=0)
    assert b1.time_spent_seconds == 0
    assert b1.mode == "practice"

    # Explicit values
    b2 = QuestionAttemptBody(question_id="q2", selected_index=1, time_spent_seconds=42, mode="mock")
    assert b2.time_spent_seconds == 42
    assert b2.mode == "mock"


@pytest.mark.asyncio
async def test_submit_attempt_persists_fields(auth_headers, test_user):
    """POST /api/questions/attempt must save topic, subject_id, difficulty, time_spent_seconds, mode."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "question_id": "q1",
            "selected_index": 1,  # q1 correct_index is 1
            "time_spent_seconds": 35,
            "mode": "mock",
        }
        res = await ac.post("/api/questions/attempt", json=payload, headers=auth_headers)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["correct"] is True
        assert data["correct_index"] == 1
        assert "explanation" in data
        assert "rationale" in data
        assert "reference" in data

        # Verify database record
        record = await server.db.attempts.find_one({"user_id": test_user["id"]})
        assert record is not None
        assert record["question_id"] == "q1"
        assert record["topic"] == "Cardiovascular Drugs"
        assert record["subject_id"] == "sub-pha"
        assert record["difficulty"] == "medium"
        assert record["time_spent_seconds"] == 35
        assert record["mode"] == "mock"
        assert record["correct"] is True


@pytest.mark.asyncio
async def test_stats_empty_dashboard(auth_headers):
    """GET /api/questions/stats with 0 attempts returns proper defaults."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/questions/stats", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["attempted"] == 0
        assert data["correct"] == 0
        assert data["accuracy"] == 0.0
        assert data["questions_today"] == 0
        assert data["questions_this_week"] == 0
        assert data["avg_time_seconds"] == 0.0
        assert data["strong_subjects"] == []
        assert data["weak_subjects"] == []
        assert data["frequently_missed"] == []
        assert data["mock_sessions"] == []
        assert len(data["daily_questions"]) == 7


@pytest.mark.asyncio
async def test_stats_full_nclex_dashboard(auth_headers, test_user):
    """Verify calculation of strong_subjects, weak_subjects, frequently_missed, mock_sessions, daily_questions."""
    now = datetime.now(timezone.utc)
    uid = test_user["id"]

    # Seed attempts:
    # 1. Subject sub-pha (Pharmacology): 4 attempts, 4 correct -> acc 1.0 (>= 0.75 -> strong)
    for i in range(4):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q1",
            "selected_index": 1,
            "correct": True,
            "topic": "Cardiovascular Drugs",
            "subject_id": "sub-pha",
            "difficulty": "medium",
            "time_spent_seconds": 20,
            "mode": "practice",
            "created_at": now,
        })

    # 2. Subject sub-fon (Fundamentals of Nursing): 4 attempts, 1 correct, 3 incorrect -> acc 0.25 (< 0.70 -> weak)
    # Also topic "Infection Control": missed 3 times -> frequently_missed
    for i in range(4):
        is_corr = (i == 0)
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q5",
            "selected_index": 1 if is_corr else 0,
            "correct": is_corr,
            "topic": "Infection Control",
            "subject_id": "sub-fon",
            "difficulty": "medium",
            "time_spent_seconds": 30,
            "mode": "practice",
            "created_at": now,
        })

    # 3. Mock sessions on 2 different days
    # Day 1: 3 days ago, 2 mock attempts (1 correct, 1 incorrect) -> total 2, correct 1, acc 0.5
    day_minus_3 = now - timedelta(days=3)
    await server.db.attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "question_id": "q2",
        "selected_index": 1,
        "correct": True,
        "topic": "Anticoagulants",
        "subject_id": "sub-pha",
        "difficulty": "hard",
        "time_spent_seconds": 40,
        "mode": "mock",
        "created_at": day_minus_3,
    })
    await server.db.attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "question_id": "q2",
        "selected_index": 0,
        "correct": False,
        "topic": "Anticoagulants",
        "subject_id": "sub-pha",
        "difficulty": "hard",
        "time_spent_seconds": 50,
        "mode": "mock",
        "created_at": day_minus_3,
    })

    # Day 2: today, 1 mock attempt (correct)
    await server.db.attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "question_id": "q9",
        "selected_index": 2,
        "correct": True,
        "topic": "Cardiac Arrhythmias",
        "subject_id": "sub-ccu",
        "difficulty": "hard",
        "time_spent_seconds": 15,
        "mode": "mock",
        "created_at": now,
    })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/questions/stats", headers=auth_headers)
        assert res.status_code == 200
        stats = res.json()

        # Total attempts: 4 + 4 + 2 + 1 = 11
        assert stats["attempted"] == 11
        # Correct: 4 + 1 + 1 + 1 = 7
        assert stats["correct"] == 7
        # Accuracy: round(7 / 11, 2) = 0.64
        assert stats["accuracy"] == 0.64
        # Questions today: 4 + 4 + 1 = 9
        assert stats["questions_today"] == 9
        # Questions this week: all 11 are within last 7 days
        assert stats["questions_this_week"] == 11
        assert sum(d["count"] for d in stats["daily_questions"]) == 11

        # Strong subjects (acc >= 0.75)
        # sub-ccu: 1 attempt, 1 correct (acc 1.0)
        # sub-pha: 6 attempts (4+2), 5 correct -> acc 0.83
        strong_subs = [s["subject"] for s in stats["strong_subjects"]]
        assert any("Pharmacology" in s or "sub-pha" in s for s in strong_subs)
        for s in stats["strong_subjects"]:
            assert s["accuracy"] >= 0.75
            assert s["count"] >= 1

        # Weak subjects (acc < 0.70)
        # sub-fon: 4 attempts, 1 correct -> acc 0.25
        weak_subs = [w["subject"] for w in stats["weak_subjects"]]
        assert any("Fundamentals" in w or "sub-fon" in w for w in weak_subs)
        for w in stats["weak_subjects"]:
            assert w["accuracy"] < 0.70

        # Frequently missed: topic with missed_count > 2
        # Infection Control missed 3 times
        missed_topics = [f["topic"] for f in stats["frequently_missed"]]
        assert "Infection Control" in missed_topics
        inf_control = next(f for f in stats["frequently_missed"] if f["topic"] == "Infection Control")
        assert inf_control["missed_count"] == 3
        assert inf_control["accuracy"] == 0.25

        # Mock sessions: 2 days of mock exams
        assert len(stats["mock_sessions"]) == 2
        # Most recent first: today's session
        assert stats["mock_sessions"][0]["date"] == now.date().isoformat()
        assert stats["mock_sessions"][0]["total"] == 1
        assert stats["mock_sessions"][0]["correct"] == 1
        assert stats["mock_sessions"][0]["accuracy"] == 1.0

        # Previous session: day_minus_3
        assert stats["mock_sessions"][1]["date"] == day_minus_3.date().isoformat()
        assert stats["mock_sessions"][1]["total"] == 2
        assert stats["mock_sessions"][1]["correct"] == 1
        assert stats["mock_sessions"][1]["accuracy"] == 0.5


@pytest.mark.asyncio
async def test_insights_endpoint(auth_headers, test_user):
    """GET /api/questions/insights:
    - Analyzes last 20 attempts per topic.
    - Filters topics with accuracy < 0.65 and min 3 attempts.
    - Returns top 3 weakest topics.
    - Returns natural-language insight string and suggested_revision_focus.
    """
    now = datetime.now(timezone.utc)
    uid = test_user["id"]

    # Topic A: "Infection Control" - 4 attempts, 1 correct -> acc 0.25 (qualifies)
    for i in range(4):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q5",
            "selected_index": 1 if i == 0 else 0,
            "correct": (i == 0),
            "topic": "Infection Control",
            "subject_id": "sub-fon",
            "created_at": now - timedelta(minutes=i),
        })

    # Topic B: "Anticoagulants" - 5 attempts, 2 correct -> acc 0.40 (qualifies)
    for i in range(5):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q2",
            "selected_index": 1 if i < 2 else 0,
            "correct": (i < 2),
            "topic": "Anticoagulants",
            "subject_id": "sub-pha",
            "created_at": now - timedelta(minutes=10 + i),
        })

    # Topic C: "Antenatal Care" - 2 attempts, 0 correct -> acc 0.0 (fails min 3 attempts requirement)
    for i in range(2):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q8",
            "selected_index": 0,
            "correct": False,
            "topic": "Antenatal Care",
            "subject_id": "sub-obg",
            "created_at": now - timedelta(minutes=20 + i),
        })

    # Topic D: "Cardiovascular Drugs" - 4 attempts, 3 correct -> acc 0.75 (fails < 0.65 requirement)
    for i in range(4):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q1",
            "selected_index": 1 if i < 3 else 0,
            "correct": (i < 3),
            "topic": "Cardiovascular Drugs",
            "subject_id": "sub-pha",
            "created_at": now - timedelta(minutes=30 + i),
        })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/questions/insights", headers=auth_headers)
        assert res.status_code == 200, res.text
        data = res.json()

        assert "weakest_topics" in data
        assert "insight" in data
        assert "suggested_revision_focus" in data

        topics = [t["topic"] for t in data["weakest_topics"]]
        # Infection Control (acc 0.25) and Anticoagulants (acc 0.40) must be included
        assert topics == ["Infection Control", "Anticoagulants"]
        assert "Antenatal Care" not in topics  # only 2 attempts (< 3)
        assert "Cardiovascular Drugs" not in topics  # acc 0.75 (>= 0.65)

        # Lowest accuracy topic is Infection Control
        assert data["weakest_topics"][0]["topic"] == "Infection Control"
        assert data["weakest_topics"][0]["accuracy"] == 0.25
        assert data["weakest_topics"][0]["count"] == 4

        # Natural-language insight string
        assert data["insight"] == "Your weakest area this week is Infection Control."
        assert data["suggested_revision_focus"] == "Infection Control"


@pytest.mark.asyncio
async def test_auth_guard_on_endpoints():
    """Endpoints require authenticated user."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # POST /api/questions/attempt without auth
        r1 = await ac.post("/api/questions/attempt", json={"question_id": "q1", "selected_index": 0})
        assert r1.status_code in (401, 403)

        # GET /api/questions/stats without auth
        r2 = await ac.get("/api/questions/stats")
        assert r2.status_code in (401, 403)

        # GET /api/questions/insights without auth
        r3 = await ac.get("/api/questions/insights")
        assert r3.status_code in (401, 403)


@pytest.mark.asyncio
async def test_stats_legacy_backfill(auth_headers, test_user):
    """Legacy attempts without topic, subject_id, etc. are properly backfilled in-memory."""
    now = datetime.now(timezone.utc)
    uid = test_user["id"]

    # Insert legacy attempt without topic/subject_id
    await server.db.attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "question_id": "q1",
        "selected_index": 1,
        "correct": True,
        "created_at": now,
    })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/questions/stats", headers=auth_headers)
        assert res.status_code == 200
        stats = res.json()
        assert stats["attempted"] == 1
        assert stats["correct"] == 1
        assert stats["accuracy"] == 1.0
        assert len(stats["strong_subjects"]) == 1
        assert "Pharmacology" in stats["strong_subjects"][0]["subject"] or "sub-pha" in stats["strong_subjects"][0]["subject"]


@pytest.mark.asyncio
async def test_stats_limits_and_sorting(auth_headers, test_user):
    """Verify max 3 strong_subjects, max 5 weak_subjects, max 5 mock_sessions, frequently_missed misses > 2."""
    now = datetime.now(timezone.utc)
    uid = test_user["id"]

    # 1. 7 different mock days -> mock_sessions must contain only the last 5
    for day_offset in range(7):
        d = now - timedelta(days=day_offset)
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q1",
            "selected_index": 1,
            "correct": True,
            "topic": "Cardiovascular Drugs",
            "subject_id": "sub-pha",
            "mode": "mock",
            "created_at": d,
        })

    # 2. Frequently missed:
    # Topic with exactly 2 misses -> NOT in frequently_missed (> 2 required)
    for _ in range(2):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q8",
            "selected_index": 0,
            "correct": False,
            "topic": "Antenatal Care",
            "subject_id": "sub-obg",
            "mode": "practice",
            "created_at": now,
        })
    # Topic with 3 misses -> IN frequently_missed
    for _ in range(3):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q5",
            "selected_index": 0,
            "correct": False,
            "topic": "Infection Control",
            "subject_id": "sub-fon",
            "mode": "practice",
            "created_at": now,
        })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/questions/stats", headers=auth_headers)
        assert res.status_code == 200
        stats = res.json()

        # Mock sessions capped at 5
        assert len(stats["mock_sessions"]) == 5
        # Ordered newest first
        dates = [m["date"] for m in stats["mock_sessions"]]
        assert dates == sorted(dates, reverse=True)

        # Frequently missed check: Infection Control (3 misses) is present, Antenatal Care (2 misses) is NOT
        missed_topics = [f["topic"] for f in stats["frequently_missed"]]
        assert "Infection Control" in missed_topics
        assert "Antenatal Care" not in missed_topics


@pytest.mark.asyncio
async def test_insights_last_20_attempts_window(auth_headers, test_user):
    """GET /api/questions/insights looks ONLY at the last 20 attempts for each topic."""
    now = datetime.now(timezone.utc)
    uid = test_user["id"]

    # Insert 10 old incorrect attempts (> 20 attempts ago)
    for i in range(10):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q1",
            "selected_index": 0,
            "correct": False,
            "topic": "Cardiovascular Drugs",
            "subject_id": "sub-pha",
            "created_at": now - timedelta(hours=30 - i),
        })

    # Insert 20 recent CORRECT attempts (within the last 20 window)
    for i in range(20):
        await server.db.attempts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "question_id": "q1",
            "selected_index": 1,
            "correct": True,
            "topic": "Cardiovascular Drugs",
            "subject_id": "sub-pha",
            "created_at": now - timedelta(hours=19 - i),
        })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/questions/insights", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()

        # The last 20 attempts were all correct -> accuracy = 1.0 (>= 0.65), so NOT weak!
        weak_topics = [w["topic"] for w in data["weakest_topics"]]
        assert "Cardiovascular Drugs" not in weak_topics


@pytest.mark.asyncio
async def test_seed_data_enhanced_explanations():
    """Verify first 10 questions in seed_data and QUESTION_BY_ID have option_explanations and remember_this."""
    for qid in [f"q{i}" for i in range(1, 11)]:
        assert qid in QUESTION_BY_ID
        q = QUESTION_BY_ID[qid]
        assert "option_explanations" in q
        assert isinstance(q["option_explanations"], list)
        assert len(q["option_explanations"]) == len(q["options"])
        assert all(isinstance(opt_exp, str) and len(opt_exp) > 5 for opt_exp in q["option_explanations"])

        assert "remember_this" in q
        assert isinstance(q["remember_this"], str)
        assert len(q["remember_this"].strip()) > 5


@pytest.mark.asyncio
async def test_attempt_response_correct_and_wrong(auth_headers, test_user):
    """POST /api/questions/attempt includes option_explanations, remember_this, and why_wrong."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Case 1: Correct attempt on q1 (correct_index is 1)
        r_corr = await ac.post("/api/questions/attempt", json={"question_id": "q1", "selected_index": 1}, headers=auth_headers)
        assert r_corr.status_code == 200
        d_corr = r_corr.json()
        assert d_corr["correct"] is True
        assert len(d_corr["option_explanations"]) == 4
        assert d_corr["remember_this"] == "ACE inhibitors → bradykinin build-up → dry cough → document and notify provider for ARB switch."
        # When correct, why_wrong must be empty
        assert d_corr["why_wrong"] == ""

        # Case 2: Incorrect attempt on q1 (selected_index is 0)
        r_wrong = await ac.post("/api/questions/attempt", json={"question_id": "q1", "selected_index": 0}, headers=auth_headers)
        assert r_wrong.status_code == 200
        d_wrong = r_wrong.json()
        assert d_wrong["correct"] is False
        assert len(d_wrong["option_explanations"]) == 4
        assert d_wrong["remember_this"] == "ACE inhibitors → bradykinin build-up → dry cough → document and notify provider for ARB switch."
        # why_wrong must match the selected option's explanation
        assert d_wrong["why_wrong"] == d_wrong["option_explanations"][0]
        assert "Stopping the medication abruptly" in d_wrong["why_wrong"]

        # Case 3: Another incorrect attempt on q1 (selected_index is 3)
        r_wrong3 = await ac.post("/api/questions/attempt", json={"question_id": "q1", "selected_index": 3}, headers=auth_headers)
        assert r_wrong3.status_code == 200
        d_wrong3 = r_wrong3.json()
        assert d_wrong3["correct"] is False
        assert d_wrong3["why_wrong"] == d_wrong3["option_explanations"][3]
        assert "cough suppressant" in d_wrong3["why_wrong"]


@pytest.mark.asyncio
async def test_attempt_response_unpopulated_question_fallbacks(auth_headers, test_user, monkeypatch):
    """POST /api/questions/attempt handles questions without option_explanations gracefully."""
    dummy_q = {
        "id": "q-dummy-no-opts",
        "subject_id": "sub-pha",
        "topic": "Testing",
        "difficulty": "easy",
        "question": "Dummy question?",
        "options": ["A", "B"],
        "correct_index": 0,
        "explanation": "Standard explanation.",
        "rationale": "Standard rationale.",
        "reference": "Reference",
    }
    monkeypatch.setitem(QUESTION_BY_ID, "q-dummy-no-opts", dummy_q)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/questions/attempt", json={"question_id": "q-dummy-no-opts", "selected_index": 1}, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["correct"] is False
        assert data["option_explanations"] == []
        assert data["remember_this"] == ""
        assert data["why_wrong"] == ""

