import json
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
import mongomock_motor
import server
from server import app, make_token
from language_data import OET_SECTIONS, IELTS_SECTIONS, GERMAN_LESSONS


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
async def test_get_oet_sections():
    """GET /api/languages/oet returns all 4 OET sub-tests with nursing tips."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/languages/oet")
        assert res.status_code == 200
        sections = res.json()
        assert isinstance(sections, list)
        assert len(sections) == 4

        section_ids = [s["id"] for s in sections]
        assert "oet-listening" in section_ids
        assert "oet-reading" in section_ids
        assert "oet-writing" in section_ids
        assert "oet-speaking" in section_ids

        for s in sections:
            assert "name" in s
            assert "icon" in s
            assert "desc" in s
            assert "tips" in s
            assert len(s["tips"]) >= 5


@pytest.mark.asyncio
async def test_get_ielts_sections():
    """GET /api/languages/ielts returns all 4 IELTS modules."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/languages/ielts")
        assert res.status_code == 200
        sections = res.json()
        assert isinstance(sections, list)
        assert len(sections) == 4

        section_ids = [s["id"] for s in sections]
        assert "ielts-listening" in section_ids
        assert "ielts-reading" in section_ids
        assert "ielts-writing" in section_ids
        assert "ielts-speaking" in section_ids


@pytest.mark.asyncio
async def test_get_german_lessons_and_level_filter():
    """GET /api/languages/german returns all lessons or filters by CEFR level."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. All lessons
        res = await ac.get("/api/languages/german")
        assert res.status_code == 200
        all_lessons = res.json()
        assert len(all_lessons) == 6

        # 2. Filter A1
        res_a1 = await ac.get("/api/languages/german?level=A1")
        assert res_a1.status_code == 200
        a1_lessons = res_a1.json()
        assert len(a1_lessons) == 2
        for l in a1_lessons:
            assert l["level"] == "A1"

        # 3. Filter A2
        res_a2 = await ac.get("/api/languages/german?level=A2")
        assert res_a2.status_code == 200
        a2_lessons = res_a2.json()
        assert len(a2_lessons) == 2
        for l in a2_lessons:
            assert l["level"] == "A2"

        # 4. Filter B1
        res_b1 = await ac.get("/api/languages/german?level=b1")  # case insensitive
        assert res_b1.status_code == 200
        b1_lessons = res_b1.json()
        assert len(b1_lessons) == 2
        for l in b1_lessons:
            assert l["level"] == "B1"


@pytest.mark.asyncio
async def test_get_single_german_lesson():
    """GET /api/languages/german/{lesson_id} returns detail or 404."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Existing lesson
        res = await ac.get("/api/languages/german/de-greetings")
        assert res.status_code == 200
        lesson = res.json()
        assert lesson["id"] == "de-greetings"
        assert lesson["title"] == "Hospital Greetings & Introductions"
        assert len(lesson["vocab"]) > 0
        assert "de" in lesson["vocab"][0]
        assert "en" in lesson["vocab"][0]
        assert "used_in" in lesson["vocab"][0]
        assert len(lesson["phrases"]) > 0
        assert "practice_dialogue" in lesson

        # Non-existent lesson
        res_404 = await ac.get("/api/languages/german/non-existent-lesson")
        assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_oet_writing_feedback(auth_headers, monkeypatch):
    """POST /api/languages/oet/writing-feedback assesses referral letter with Claude."""
    mock_feedback_response = {
        "grade": "B",
        "feedback": "Well-structured referral letter with clear clinical purpose, appropriate formal register, and comprehensive patient summary.",
        "strengths": [
            "Clear immediate purpose stated in the opening paragraph.",
            "Accurate chronological summary of wound care and vital signs.",
            "Appropriate formal clinical tone throughout."
        ],
        "improvements": [
            "Condense social history to avoid minor non-essential details.",
            "Specify the exact wound dressing change frequency in the discharge recommendation."
        ]
    }

    class MockChat:
        async def send_message(self, msg):
            return json.dumps(mock_feedback_response)

    monkeypatch.setattr(server, "new_llm_chat", lambda session_id, system: MockChat())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        letter_sample = (
            "Dear Community Nurse,\n\n"
            "Re: Mr. Arthur Pendelton, DOB: 14/05/1958\n\n"
            "I am writing to refer Mr. Pendelton, a 68-year-old retired engineer, who was admitted on 12th September "
            "with an infected diabetic foot ulcer on his left heel. He is being discharged today following successful IV antibiotic therapy."
        )
        res = await ac.post(
            "/api/languages/oet/writing-feedback",
            json={"letter_text": letter_sample},
            headers=auth_headers
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["grade"] == "B"
        assert "feedback" in data
        assert len(data["strengths"]) == 3
        assert len(data["improvements"]) == 2


@pytest.mark.asyncio
async def test_languages_auth_guard():
    """Language endpoints require authenticated user."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_no_auth = await ac.post("/api/languages/oet/writing-feedback", json={"letter_text": "Sample text"})
        assert res_no_auth.status_code in (401, 403)

        res_practice_no_auth = await ac.post(
            "/api/languages/practice",
            json={"type": "oet_speaking", "user_input": "Hello", "context": "None"}
        )
        assert res_practice_no_auth.status_code in (401, 403)


@pytest.mark.asyncio
async def test_oet_writing_feedback_validation(auth_headers):
    """POST /api/languages/oet/writing-feedback validates input."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Blank validation
        res_blank = await ac.post(
            "/api/languages/oet/writing-feedback",
            json={"letter_text": "   "},
            headers=auth_headers
        )
        assert res_blank.status_code == 422


@pytest.mark.asyncio
async def test_language_practice_stream(auth_headers, monkeypatch):
    """POST /api/languages/practice streams language assessment via SSE."""
    class MockDelta:
        def __init__(self, content):
            self.content = content

    class MockStreamDone:
        pass

    class MockStreamChat:
        async def stream_message(self, msg):
            yield MockDelta("Hello Nurse, ")
            yield MockDelta("I have been feeling dizzy since this morning.")
            yield MockStreamDone()

    monkeypatch.setattr(server, "new_llm_chat", lambda session_id, system: MockStreamChat())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "type": "oet_speaking",
            "user_input": "Good morning Mr. Jones, how are you feeling today?",
            "context": "Patient post-op Day 1 complaining of dizziness"
        }
        res = await ac.post("/api/languages/practice", json=payload, headers=auth_headers)
        assert res.status_code == 200
        assert "text/event-stream" in res.headers.get("content-type", "")

        body_text = res.text
        assert "data:" in body_text
        assert "dizzy" in body_text
        assert '"done": true' in body_text.lower()
