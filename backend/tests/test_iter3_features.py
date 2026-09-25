"""Iteration 3 — AI Nursing Companion feature tests.

Covers: extended onboarding (user_type/program/year/language/focus_areas), is_admin,
drugs, ECG cases, ABG interpreter, ventilator topics, skills, emergency, simulation
cases (no answer leak), nursing-diagnosis (AI), care-plans CRUD (AI-assist), gamification,
AI chat modes (QUICK vs CLINICAL), AI Ross-and-Wilson references citation,
Library Ross-and-Wilson in cat-anp with 18 chapters.
"""
import json
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://nurse-career-hub.preview.emergentagent.com").rstrip("/")
ROSSWILSON_BOOK_ID = "bk-adm-b89cbd48"


# -------------------- Onboarding widened schema --------------------
class TestOnboardingWidened:
    def test_onboarding_new_fields(self, session, auth_headers):
        payload = {
            "user_type": "Nursing Student",
            "program": "B.Sc",
            "year": "2nd Year",
            "language": "Hinglish",
            "country": "India",
            "focus_areas": ["Pharmacology", "ECG", "ICU"],
        }
        r = session.post(f"{BASE_URL}/api/auth/onboarding", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["onboarded"] is True
        assert u["user_type"] == "Nursing Student"
        assert u["program"] == "B.Sc"
        assert u["year"] == "2nd Year"
        assert u["language"] == "Hinglish"
        assert u["focus_areas"] == ["Pharmacology", "ECG", "ICU"]

    def test_me_returns_onboarding_and_admin_flag(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        u = r.json()["user"]
        assert "is_admin" in u
        assert u["is_admin"] is False
        assert isinstance(u.get("focus_areas"), list)


# -------------------- Drugs --------------------
class TestDrugs:
    def test_list_drugs_10(self, session):
        r = session.get(f"{BASE_URL}/api/drugs")
        assert r.status_code == 200
        drugs = r.json()["drugs"]
        assert len(drugs) == 10, f"expected 10, got {len(drugs)}"
        for d in drugs:
            assert "id" in d and "name" in d and "class" in d and "indications" in d

    def test_drug_detail(self, session):
        drugs = session.get(f"{BASE_URL}/api/drugs").json()["drugs"]
        did = drugs[0]["id"]
        r = session.get(f"{BASE_URL}/api/drugs/{did}")
        assert r.status_code == 200
        body = r.json()
        assert "disclaimer" in body
        d = body["drug"]
        # 8 detail sections (excl. id/name/class)
        expected = ["indications", "moa", "common_effects", "serious_effects", "contraindications", "nursing", "monitoring", "education"]
        present = [k for k in expected if k in d]
        assert len(present) >= 7, f"expected >=7 sections, got {present}"


# -------------------- ECG --------------------
class TestECG:
    def test_list_ecg_cases(self, session):
        r = session.get(f"{BASE_URL}/api/ecg/cases")
        assert r.status_code == 200
        cases = r.json()["cases"]
        assert len(cases) >= 1
        assert all("id" in c and "title" in c for c in cases)

    def test_get_ecg_case(self, session):
        cid = session.get(f"{BASE_URL}/api/ecg/cases").json()["cases"][0]["id"]
        r = session.get(f"{BASE_URL}/api/ecg/cases/{cid}")
        assert r.status_code == 200
        c = r.json()["case"]
        assert "options" in c and ("answer" in c or "answer_index" in c)


# -------------------- ABG --------------------
class TestABG:
    def test_respiratory_acidosis(self, session):
        r = session.post(f"{BASE_URL}/api/abg/interpret", json={"pH": 7.28, "PaCO2": 60, "HCO3": 24})
        assert r.status_code == 200
        d = r.json()
        assert d["primary"] == "Respiratory Acidosis"
        assert "compensation" in d and "causes" in d and "disclaimer" in d
        assert len(d["causes"]) >= 3


# -------------------- Ventilator --------------------
class TestVentilator:
    def test_topics(self, session):
        r = session.get(f"{BASE_URL}/api/ventilator/topics")
        assert r.status_code == 200
        topics = r.json()["topics"]
        assert len(topics) == 3, f"expected 3, got {len(topics)}"


# -------------------- Skills --------------------
class TestSkills:
    def test_list_skills_5(self, session):
        r = session.get(f"{BASE_URL}/api/skills")
        assert r.status_code == 200
        skills = r.json()["skills"]
        assert len(skills) == 5

    def test_skill_detail(self, session):
        sid = session.get(f"{BASE_URL}/api/skills").json()["skills"][0]["id"]
        r = session.get(f"{BASE_URL}/api/skills/{sid}")
        assert r.status_code == 200
        s = r.json()["skill"]
        for key in ["indications", "equipment", "procedure"]:
            assert key in s, f"missing {key}"


# -------------------- Emergency --------------------
class TestEmergency:
    def test_emergency_topics_8(self, session):
        r = session.get(f"{BASE_URL}/api/emergency/topics")
        assert r.status_code == 200
        topics = r.json()["topics"]
        assert len(topics) == 8
        for t in topics:
            assert "key_points" in t


# -------------------- Cases --------------------
class TestCases:
    def test_list_cases_5(self, session):
        r = session.get(f"{BASE_URL}/api/cases")
        assert r.status_code == 200
        cases = r.json()["cases"]
        assert len(cases) == 5

    def test_case_detail_no_answer_leak(self, session, auth_headers):
        cid = session.get(f"{BASE_URL}/api/cases").json()["cases"][0]["id"]
        r = session.get(f"{BASE_URL}/api/cases/{cid}", headers=auth_headers)
        assert r.status_code == 200
        c = r.json()["case"]
        assert "steps" in c and len(c["steps"]) >= 1
        for step in c["steps"]:
            for opt in step["options"]:
                assert "correct" not in opt, "correct answer leaked!"
                assert "why" not in opt, "why leaked!"

    def test_case_attempt_evaluates(self, session, auth_headers):
        cid = session.get(f"{BASE_URL}/api/cases").json()["cases"][0]["id"]
        payload = {"case_id": cid, "step_n": 1, "option_index": 0}
        r = session.post(f"{BASE_URL}/api/cases/attempt", json=payload, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "correct" in d and "why" in d and "priority" in d


# -------------------- Nursing Diagnosis (AI) --------------------
class TestNursingDiagnosis:
    def test_nursing_diagnosis_ai(self, session, auth_headers):
        payload = {"scenario": "72 y/o with pneumonia, RR 28, SpO2 89% on RA, productive cough, febrile."}
        r = session.post(f"{BASE_URL}/api/nursing-diagnosis", json=payload, headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "diagnoses" in d and isinstance(d["diagnoses"], list) and len(d["diagnoses"]) >= 1
        assert "goals" in d
        assert "interventions" in d and isinstance(d["interventions"], list) and len(d["interventions"]) >= 1
        assert "evaluation" in d
        assert "disclaimer" in d
        first = d["interventions"][0]
        assert "rationale" in first or "action" in first


# -------------------- Care Plans --------------------
class TestCarePlans:
    def test_create_ai_generate_and_delete(self, session, auth_headers):
        payload = {"condition": "Type 2 Diabetes with poor glycaemic control", "assessment": "HbA1c 10.2, obese, sedentary", "ai_generate": True}
        r = session.post(f"{BASE_URL}/api/care-plans", json=payload, headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        plan = r.json()["plan"]
        assert plan["condition"] == payload["condition"]
        # AI should fill some missing fields
        filled = [k for k in ["diagnosis", "goals", "interventions", "rationales", "evaluation"] if plan.get(k)]
        assert len(filled) >= 2, f"AI filled too few fields: {filled}"

        # list
        r = session.get(f"{BASE_URL}/api/care-plans", headers=auth_headers)
        assert r.status_code == 200
        plans = r.json()["plans"]
        assert any(p["id"] == plan["id"] for p in plans)

        # delete
        r = session.delete(f"{BASE_URL}/api/care-plans/{plan['id']}", headers=auth_headers)
        assert r.status_code == 200


# -------------------- Gamification --------------------
class TestGamification:
    def test_status_and_action(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/gamification", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ["xp", "streak", "level", "badges", "daily_goal"]:
            assert k in d, f"missing {k}"
        before = d["xp"]

        # Trigger action
        r = session.post(f"{BASE_URL}/api/gamification/action", json={"action": "lesson_read"}, headers=auth_headers)
        assert r.status_code == 200
        after = r.json()["xp"]
        assert after > before, f"XP did not increment: {before} -> {after}"


# -------------------- AI Modes --------------------
class _SSECollector:
    @staticmethod
    def collect(url, payload, headers, timeout=90):
        deltas = []
        refs = []
        with requests.post(url, json=payload, headers=headers, stream=True, timeout=timeout) as r:
            assert r.status_code == 200, r.text
            for raw in r.iter_lines():
                if not raw:
                    continue
                line = raw.decode("utf-8") if isinstance(raw, bytes) else raw
                if not line.startswith("data: "):
                    continue
                try:
                    evt = json.loads(line[6:])
                except Exception:
                    continue
                if "delta" in evt:
                    deltas.append(evt["delta"])
                if "references" in evt:
                    refs = evt["references"]
                if evt.get("done"):
                    break
                if evt.get("error"):
                    return "".join(deltas), refs, evt["error"]
        return "".join(deltas), refs, None


class TestAIModes:
    def test_quick_shorter_than_clinical(self, session, auth_headers):
        headers = {**auth_headers, "Accept": "text/event-stream"}
        q_text, _, q_err = _SSECollector.collect(
            f"{BASE_URL}/api/ai/chat",
            {"session_id": f"t-quick-{uuid.uuid4().hex[:6]}", "message": "Explain hypertension management for a nursing student.", "mode": "QUICK"},
            headers,
        )
        c_text, _, c_err = _SSECollector.collect(
            f"{BASE_URL}/api/ai/chat",
            {"session_id": f"t-clin-{uuid.uuid4().hex[:6]}", "message": "Explain hypertension management for a nursing student.", "mode": "CLINICAL"},
            headers,
        )
        assert not q_err and not c_err, f"errors: quick={q_err} clinical={c_err}"
        assert len(q_text) > 0 and len(c_text) > 0
        # QUICK should be materially shorter
        assert len(q_text) < len(c_text), f"QUICK ({len(q_text)}) not shorter than CLINICAL ({len(c_text)})"


class TestAIRossWilson:
    def test_references_cite_ross_and_wilson(self, session, auth_headers):
        headers = {**auth_headers, "Accept": "text/event-stream"}
        text, refs, err = _SSECollector.collect(
            f"{BASE_URL}/api/ai/chat",
            {"session_id": f"t-rw-{uuid.uuid4().hex[:6]}", "message": "Explain heart anatomy from Ross and Wilson", "mode": "STUDENT"},
            headers,
            timeout=120,
        )
        assert not err, err
        assert len(text) > 0
        assert refs, "references event missing"
        assert any(r.get("book_id") == ROSSWILSON_BOOK_ID for r in refs), f"Ross and Wilson book not cited. refs={refs}"


# -------------------- Library Ross and Wilson --------------------
class TestLibraryRossWilson:
    def test_book_exists_and_has_18_chapters(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/library/books/{ROSSWILSON_BOOK_ID}", headers=auth_headers)
        assert r.status_code == 200, r.text
        book = r.json()["book"]
        assert len(book["chapters"]) == 18, f"expected 18 chapters, got {len(book['chapters'])}"

    def test_appears_in_cat_anp(self, session):
        r = session.get(f"{BASE_URL}/api/library/books", params={"category_id": "cat-anp"})
        assert r.status_code == 200
        books = r.json()["books"]
        ids = [b["id"] for b in books]
        assert ROSSWILSON_BOOK_ID in ids, f"Ross and Wilson not in cat-anp: {ids}"
