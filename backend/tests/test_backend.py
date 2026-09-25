"""Comprehensive backend API tests for Nurse Orbit."""
import json
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://nurse-career-hub.preview.emergentagent.com").rstrip("/")


# -------------------- Health --------------------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# -------------------- Auth --------------------
class TestAuth:
    def test_signup_login_me(self, session, test_user):
        # login
        r = session.post(f"{BASE_URL}/api/auth/login", json={"email": test_user["email"], "password": test_user["password"]})
        assert r.status_code == 200
        tok = r.json()["access_token"]
        # me
        r = session.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200
        assert r.json()["user"]["email"] == test_user["email"]

    def test_duplicate_signup(self, session, test_user):
        r = session.post(f"{BASE_URL}/api/auth/signup", json={"email": test_user["email"], "password": "password123", "name": "dup"})
        assert r.status_code == 409

    def test_invalid_login(self, session, test_user):
        r = session.post(f"{BASE_URL}/api/auth/login", json={"email": test_user["email"], "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_no_token(self, session):
        r = session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_onboarding(self, session, auth_headers):
        r = session.post(f"{BASE_URL}/api/auth/onboarding", json={"role": "RN", "qualification": "BSN", "country": "India", "goal": "Germany"}, headers=auth_headers)
        assert r.status_code == 200
        user = r.json()["user"]
        assert user["onboarded"] is True
        assert user["goal"] == "Germany"


# -------------------- Home --------------------
class TestHome:
    def test_dashboard(self, session, onboarded_user, auth_headers):
        r = session.get(f"{BASE_URL}/api/home/dashboard", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ["credentials", "cme", "continue_learning", "career_goal"]:
            assert k in d, f"missing key: {k}"
        assert isinstance(d["credentials"], list) and len(d["credentials"]) >= 3
        assert "completed" in d["cme"] and "required" in d["cme"]
        assert d["career_goal"]["country"] == "Germany"  # derived from user.goal (migration target)


# -------------------- Study --------------------
class TestStudy:
    def test_subjects(self, session):
        r = session.get(f"{BASE_URL}/api/study/subjects")
        assert r.status_code == 200
        subjects = r.json()["subjects"]
        assert len(subjects) == 16, f"expected 16 subjects, got {len(subjects)}"

    def test_lessons(self, session):
        subjects = session.get(f"{BASE_URL}/api/study/subjects").json()["subjects"]
        sid = subjects[0]["id"]
        r = session.get(f"{BASE_URL}/api/study/subjects/{sid}/lessons")
        assert r.status_code == 200
        assert len(r.json()["lessons"]) > 0


# -------------------- Questions --------------------
class TestQuestions:
    def test_list_questions(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/questions?mode=practice&limit=5", headers=auth_headers)
        assert r.status_code == 200
        qs = r.json()["questions"]
        assert len(qs) > 0
        assert len(qs) <= 5

    def test_attempt_and_stats(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/questions?limit=1", headers=auth_headers)
        q = r.json()["questions"][0]
        qid = q["id"]
        # Submit an attempt
        r = session.post(f"{BASE_URL}/api/questions/attempt", json={"question_id": qid, "selected_index": 0}, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "correct" in data and "correct_index" in data and "explanation" in data

        # Stats
        r = session.get(f"{BASE_URL}/api/questions/stats", headers=auth_headers)
        assert r.status_code == 200
        s = r.json()
        assert s["attempted"] >= 1

    def test_bookmark_toggle(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/questions?limit=1", headers=auth_headers)
        qid = r.json()["questions"][0]["id"]
        r1 = session.post(f"{BASE_URL}/api/questions/{qid}/bookmark", headers=auth_headers)
        assert r1.status_code == 200
        b1 = r1.json()["bookmarked"]
        r2 = session.post(f"{BASE_URL}/api/questions/{qid}/bookmark", headers=auth_headers)
        b2 = r2.json()["bookmarked"]
        assert b1 != b2

    def test_attempt_bad_question(self, session, auth_headers):
        r = session.post(f"{BASE_URL}/api/questions/attempt", json={"question_id": "no-such-id", "selected_index": 0}, headers=auth_headers)
        assert r.status_code == 404


# -------------------- Exams --------------------
class TestExams:
    def test_list_exams(self, session):
        r = session.get(f"{BASE_URL}/api/exams")
        assert r.status_code == 200
        exams = r.json()["exams"]
        assert len(exams) == 10, f"expected 10 exams, got {len(exams)}"

    def test_get_exam(self, session):
        exams = session.get(f"{BASE_URL}/api/exams").json()["exams"]
        eid = exams[0]["id"]
        r = session.get(f"{BASE_URL}/api/exams/{eid}")
        assert r.status_code == 200
        assert r.json()["exam"]["id"] == eid

    def test_get_missing_exam(self, session):
        r = session.get(f"{BASE_URL}/api/exams/does-not-exist")
        assert r.status_code == 404


# -------------------- Abroad --------------------
class TestAbroad:
    def test_pathways(self, session):
        r = session.get(f"{BASE_URL}/api/abroad/pathways")
        assert r.status_code == 200
        p = r.json()["pathways"]
        assert len(p) == 7, f"expected 7 pathways, got {len(p)}"

    def test_pathway_detail_and_toggle(self, session, auth_headers):
        p = session.get(f"{BASE_URL}/api/abroad/pathways").json()["pathways"][0]
        pid = p["id"]
        r = session.get(f"{BASE_URL}/api/abroad/pathways/{pid}", headers=auth_headers)
        assert r.status_code == 200
        detail = r.json()
        assert "pathway" in detail and "completed" in detail
        # toggle step 1 on
        r1 = session.post(f"{BASE_URL}/api/abroad/pathways/{pid}/step/1/toggle", headers=auth_headers)
        assert r1.status_code == 200
        c1 = r1.json()["completed"]
        assert 1 in c1
        # toggle off
        r2 = session.post(f"{BASE_URL}/api/abroad/pathways/{pid}/step/1/toggle", headers=auth_headers)
        assert 1 not in r2.json()["completed"]


# -------------------- Passport --------------------
class TestPassport:
    def test_create_list_delete_document(self, session, auth_headers):
        # create with an expiring soon date (30 days from now) to test status logic
        from datetime import datetime, timedelta, timezone
        soon = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
        files = {}
        data = {
            "name": "TEST BLS Certificate",
            "category": "Certifications",
            "issuer": "AHA",
            "certificate_number": "TEST-123",
            "issue_date": "2025-01-01",
            "expiry_date": soon,
            "notes": "test doc",
        }
        headers = {"Authorization": auth_headers["Authorization"]}
        # Use a fresh session without json Content-Type header (multipart)
        r = requests.post(f"{BASE_URL}/api/passport/documents", data=data, headers=headers)
        assert r.status_code == 200, r.text
        doc = r.json()["document"]
        doc_id = doc["id"]
        # list
        r = session.get(f"{BASE_URL}/api/passport/documents", headers=auth_headers)
        assert r.status_code == 200
        docs = r.json()["documents"]
        found = next((d for d in docs if d["id"] == doc_id), None)
        assert found is not None
        assert found["status"] == "EXPIRING SOON", f"expected EXPIRING SOON, got {found['status']}"

        # delete
        r = session.delete(f"{BASE_URL}/api/passport/documents/{doc_id}", headers=auth_headers)
        assert r.status_code == 200

    def test_create_with_file(self, session, auth_headers):
        headers = {"Authorization": auth_headers["Authorization"]}
        data = {"name": "TEST License Doc", "category": "Licensing"}
        files = {"file": ("test.txt", b"Hello Nurse Orbit test", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/passport/documents", data=data, files=files, headers=headers)
        # Allow either success or upload failure (storage may be unavailable in dev:
        # 503 = storage not configured, 502 = storage rejected the upload)
        assert r.status_code in (200, 502, 503), r.text
        if r.status_code == 200:
            doc = r.json()["document"]
            # cleanup
            session.delete(f"{BASE_URL}/api/passport/documents/{doc['id']}", headers=auth_headers)
        else:
            pytest.skip(f"Storage upload not available: {r.text}")


# -------------------- CME --------------------
class TestCME:
    def test_add_and_list_cme(self, session, auth_headers):
        r = session.post(f"{BASE_URL}/api/cme", json={"title": "TEST BLS Course", "category": "Clinical", "hours": 5.0, "provider": "AHA", "date": "2025-06-01"}, headers=auth_headers)
        assert r.status_code == 200
        r = session.get(f"{BASE_URL}/api/cme", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 5.0
        assert d["required"] == 40


# -------------------- Jobs / News --------------------
class TestJobsNews:
    def test_jobs(self, session):
        r = session.get(f"{BASE_URL}/api/jobs")
        assert r.status_code == 200
        assert isinstance(r.json()["jobs"], list)

    def test_jobs_filter(self, session):
        # get any country
        jobs = session.get(f"{BASE_URL}/api/jobs").json()["jobs"]
        if jobs:
            c = jobs[0]["country"]
            r = session.get(f"{BASE_URL}/api/jobs", params={"country": c})
            assert r.status_code == 200
            for j in r.json()["jobs"]:
                assert j["country"].lower() == c.lower()

    def test_news(self, session):
        r = session.get(f"{BASE_URL}/api/news")
        assert r.status_code == 200
        assert isinstance(r.json()["news"], list)


# -------------------- Notifications --------------------
class TestNotifications:
    def test_notifications(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert r.status_code == 200
        assert "notifications" in r.json()


# -------------------- AI Nurse Streaming --------------------
class TestAI:
    def test_ai_chat_sse(self, session, auth_headers):
        sid = f"test-{uuid.uuid4().hex[:8]}"
        payload = {"session_id": sid, "message": "In one short sentence, what is BLS?"}
        headers = {**auth_headers, "Accept": "text/event-stream"}
        got_delta = False
        got_done = False
        got_error = None
        with requests.post(f"{BASE_URL}/api/ai/chat", json=payload, headers=headers, stream=True, timeout=90) as r:
            assert r.status_code == 200, r.text
            for raw in r.iter_lines():
                if not raw:
                    continue
                line = raw.decode("utf-8") if isinstance(raw, bytes) else raw
                if line.startswith("data: "):
                    try:
                        evt = json.loads(line[6:])
                    except Exception:
                        continue
                    if "delta" in evt:
                        got_delta = True
                    if "error" in evt:
                        got_error = evt["error"]
                    if evt.get("done"):
                        got_done = True
                        break
        assert got_done, f"stream never emitted done. error={got_error}"
        assert got_delta, f"no delta received. error={got_error}"

        # History
        time.sleep(0.5)
        r = session.get(f"{BASE_URL}/api/ai/chat/{sid}/history", headers=auth_headers)
        assert r.status_code == 200
        msgs = r.json()["messages"]
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles
