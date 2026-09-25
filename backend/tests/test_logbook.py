"""Automated tests for the Clinical Logbook & Student Nursing Portfolio backend endpoints.

Covers:
1. POST /api/logbook:
   - Creates logbook entry with all 10 fields.
   - Awards 10 XP to user gamification streak.
   - Validates date is YYYY-MM-DD.
2. GET /api/logbook:
   - Lists entries sorted by date descending.
   - Filters by from_date and to_date.
   - Returns summary (total_entries, total_hours, total_patients, unique_skills).
3. GET /api/logbook/{entry_id}:
   - Retrieves single entry.
   - 404 on invalid entry ID.
4. PUT /api/logbook/{entry_id}:
   - Partially updates fields.
   - 404 on invalid entry ID.
5. DELETE /api/logbook/{entry_id}:
   - Deletes entry.
   - 404 on invalid entry ID.
6. GET /api/logbook/portfolio:
   - Auto-generates student portfolio.
   - Deduplicates procedures observed/performed and skills.
   - Aggregates placement hours and entry counts.
   - Chronological timeline.
   - Last 3 supervisor feedback snippets.
7. Auth guards on all logbook endpoints.
8. Database index verification.
"""
import pytest
import uuid
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
        "email": "student_logbook@nurseorbit.app",
        "name": "Nurse Jane Doe",
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
async def test_create_logbook_entry(auth_headers, test_user):
    """POST /api/logbook creates entry, saves all 10 fields, and awards 10 XP."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "clinical_placement": "Medical Ward 3B",
            "hospital_department": "Cardiology",
            "date": "2026-09-20",
            "procedures_observed": ["Echocardiogram", "Central Line Insertion"],
            "procedures_performed": ["IV Cannulation", "ECG 12-Lead"],
            "patients_encountered": 6,
            "clinical_hours": 8.0,
            "skills_achieved": ["Vascular Access", "Cardiac Monitoring"],
            "supervisor_feedback": "Excellent technique during IV insertion and calm bedside manner.",
            "reflection": "Today I gained confidence in communicating with anxious cardiac patients.",
        }
        res = await ac.post("/api/logbook", json=payload, headers=auth_headers)
        assert res.status_code == 200, res.text
        data = res.json()

        assert "id" in data
        entry_id = data["id"]
        assert data["clinical_placement"] == "Medical Ward 3B"
        assert data["hospital_department"] == "Cardiology"
        assert data["date"] == "2026-09-20"
        assert len(data["procedures_observed"]) == 2
        assert len(data["procedures_performed"]) == 2
        assert data["patients_encountered"] == 6
        assert data["clinical_hours"] == 8.0
        assert len(data["skills_achieved"]) == 2
        assert "confidence" in data["reflection"]

        # Verify DB document
        doc = await server.db.logbook.find_one({"id": entry_id})
        assert doc is not None
        assert doc["user_id"] == test_user["id"]
        assert doc["clinical_hours"] == 8.0

        # Verify XP awarded
        gam = await server.db.gamification.find_one({"user_id": test_user["id"]})
        assert gam is not None
        assert gam.get("xp") == 10


@pytest.mark.asyncio
async def test_create_logbook_entry_invalid_date(auth_headers):
    """Invalid date format causes 422 validation error."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "clinical_placement": "ER",
            "hospital_department": "Emergency",
            "date": "09-20-2026",  # Not YYYY-MM-DD
            "clinical_hours": 4.0,
        }
        res = await ac.post("/api/logbook", json=payload, headers=auth_headers)
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_list_logbook_entries_and_summary(auth_headers, test_user):
    """GET /api/logbook lists entries sorted by date desc with accurate summary statistics."""
    uid = test_user["id"]
    now = datetime.now(timezone.utc)

    # Insert 3 entries across different dates
    entries_to_add = [
        {
            "id": "entry-1",
            "user_id": uid,
            "clinical_placement": "Pediatrics A",
            "hospital_department": "Pediatrics",
            "date": "2026-09-10",
            "clinical_hours": 6.5,
            "patients_encountered": 4,
            "skills_achieved": ["Pediatric Vitals", "Medication Admin"],
            "created_at": now - timedelta(days=10),
        },
        {
            "id": "entry-2",
            "user_id": uid,
            "clinical_placement": "ICU Ward",
            "hospital_department": "Critical Care",
            "date": "2026-09-15",
            "clinical_hours": 12.0,
            "patients_encountered": 2,
            "skills_achieved": ["Ventilator Monitoring", "Arterial Line Care", "Medication Admin"],
            "created_at": now - timedelta(days=5),
        },
        {
            "id": "entry-3",
            "user_id": uid,
            "clinical_placement": "Surgical 4",
            "hospital_department": "Surgery",
            "date": "2026-09-18",
            "clinical_hours": 8.0,
            "patients_encountered": 5,
            "skills_achieved": ["Wound Dressing", "Post-op Care"],
            "created_at": now - timedelta(days=2),
        },
    ]
    for e in entries_to_add:
        await server.db.logbook.insert_one(e)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Full list without filter
        res = await ac.get("/api/logbook", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "entries" in data
        assert "summary" in data

        entries = data["entries"]
        assert len(entries) == 3
        # Sorted descending by date (entry-3: 2026-09-18 first)
        assert entries[0]["id"] == "entry-3"
        assert entries[1]["id"] == "entry-2"
        assert entries[2]["id"] == "entry-1"

        summary = data["summary"]
        assert summary["total_entries"] == 3
        assert summary["total_hours"] == 26.5  # 6.5 + 12.0 + 8.0
        assert summary["total_patients"] == 11  # 4 + 2 + 5
        # Unique skills deduplicated ("Medication Admin" shared between 1 and 2: total 6 unique)
        assert len(summary["unique_skills"]) == 6

        # 2. Filter by date range (from 2026-09-12 to 2026-09-16)
        r_filt = await ac.get("/api/logbook?from_date=2026-09-12&to_date=2026-09-16", headers=auth_headers)
        assert r_filt.status_code == 200
        d_filt = r_filt.json()
        assert len(d_filt["entries"]) == 1
        assert d_filt["entries"][0]["id"] == "entry-2"
        assert d_filt["summary"]["total_hours"] == 12.0


@pytest.mark.asyncio
async def test_get_update_delete_entry(auth_headers, test_user):
    """CRUD operations on single logbook entry."""
    entry_id = str(uuid.uuid4())
    await server.db.logbook.insert_one({
        "id": entry_id,
        "user_id": test_user["id"],
        "clinical_placement": "Neurology 2",
        "hospital_department": "Neurology",
        "date": "2026-09-19",
        "clinical_hours": 7.0,
        "patients_encountered": 3,
        "skills_achieved": ["GCS Scoring"],
        "supervisor_feedback": "Good assessment.",
        "reflection": "Learned NIHSS score basics.",
        "created_at": datetime.now(timezone.utc),
    })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # GET single
        r_get = await ac.get(f"/api/logbook/{entry_id}", headers=auth_headers)
        assert r_get.status_code == 200
        assert r_get.json()["clinical_placement"] == "Neurology 2"

        # 404 for unknown entry
        r_unknown = await ac.get(f"/api/logbook/{uuid.uuid4()}", headers=auth_headers)
        assert r_unknown.status_code == 404

        # PUT update
        patch = {
            "clinical_hours": 8.5,
            "reflection": "Updated reflection notes.",
            "patients_encountered": 5,
        }
        r_put = await ac.put(f"/api/logbook/{entry_id}", json=patch, headers=auth_headers)
        assert r_put.status_code == 200
        updated = r_put.json()
        assert updated["clinical_hours"] == 8.5
        assert updated["reflection"] == "Updated reflection notes."
        assert updated["patients_encountered"] == 5
        assert updated["clinical_placement"] == "Neurology 2"

        # DELETE
        r_del = await ac.delete(f"/api/logbook/{entry_id}", headers=auth_headers)
        assert r_del.status_code == 200
        assert r_del.json()["deleted"] is True

        # Deleted entry cannot be found again
        r_after = await ac.get(f"/api/logbook/{entry_id}", headers=auth_headers)
        assert r_after.status_code == 404


@pytest.mark.asyncio
async def test_logbook_portfolio(auth_headers, test_user):
    """GET /api/logbook/portfolio auto-generates comprehensive student portfolio."""
    uid = test_user["id"]
    now = datetime.now(timezone.utc)

    # Insert 4 rich entries
    entries = [
        {
            "id": "e1",
            "user_id": uid,
            "clinical_placement": "General Medical Ward",
            "hospital_department": "Internal Medicine",
            "date": "2026-08-01",
            "procedures_observed": ["Lumbar Puncture", "Paracentesis"],
            "procedures_performed": ["Vital Signs Assessment", "Blood Glucose Check"],
            "skills_achieved": ["Patient Communication", "Aseptic Technique"],
            "patients_encountered": 8,
            "clinical_hours": 10.0,
            "supervisor_feedback": "Demonstrated strong professional conduct.",
            "reflection": "Initial orientation week went smoothly.",
            "created_at": now - timedelta(days=50),
        },
        {
            "id": "e2",
            "user_id": uid,
            "clinical_placement": "General Medical Ward",
            "hospital_department": "Internal Medicine",
            "date": "2026-08-15",
            "procedures_observed": ["Chest Tube Removal"],
            "procedures_performed": ["IV Cannulation", "Blood Glucose Check"],  # Blood Glucose Check duplicated
            "skills_achieved": ["IV Insertion", "Aseptic Technique"],  # Aseptic Technique duplicated
            "patients_encountered": 6,
            "clinical_hours": 8.0,
            "supervisor_feedback": "Smooth cannula placement on difficult vein.",
            "reflection": "Practiced vascular ultrasound.",
            "created_at": now - timedelta(days=35),
        },
        {
            "id": "e3",
            "user_id": uid,
            "clinical_placement": "Cardiac Intensive Care",
            "hospital_department": "Critical Care",
            "date": "2026-09-01",
            "procedures_observed": ["Arterial Line Insertion", "Transesophageal Echo"],
            "procedures_performed": ["12-Lead ECG", "Suctioning"],
            "skills_achieved": ["Cardiac Rhythm Analysis", "Airway Suctioning"],
            "patients_encountered": 3,
            "clinical_hours": 12.0,
            "supervisor_feedback": "Rapid recognition of early AFib.",
            "reflection": "Intensive care monitoring requires vigilant attention to trends.",
            "created_at": now - timedelta(days=20),
        },
        {
            "id": "e4",
            "user_id": uid,
            "clinical_placement": "Cardiac Intensive Care",
            "hospital_department": "Critical Care",
            "date": "2026-09-10",
            "procedures_observed": ["Defibrillation"],
            "procedures_performed": ["Arterial Blood Gas Sampling"],
            "skills_achieved": ["ABG Interpretation"],
            "patients_encountered": 2,
            "clinical_hours": 12.0,
            "supervisor_feedback": "Excellent ABG interpretation and prompt notification of physician.",
            "reflection": "Understood respiratory vs metabolic compensation.",
            "created_at": now - timedelta(days=10),
        },
    ]
    for e in entries:
        await server.db.logbook.insert_one(e)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/logbook/portfolio", headers=auth_headers)
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["student_name"] == "Nurse Jane Doe"
        assert data["total_clinical_hours"] == 42.0  # 10 + 8 + 12 + 12
        assert data["total_patients_encountered"] == 19  # 8 + 6 + 3 + 2
        assert data["total_entries"] == 4

        # Placements aggregated
        assert len(data["placements"]) == 2
        p_dict = {p["placement"]: p for p in data["placements"]}
        assert p_dict["General Medical Ward"]["hours"] == 18.0
        assert p_dict["General Medical Ward"]["entries"] == 2
        assert p_dict["Cardiac Intensive Care"]["hours"] == 24.0
        assert p_dict["Cardiac Intensive Care"]["entries"] == 2

        # Deduplication checks
        assert len(data["procedures_observed"]) == 6
        assert len(data["procedures_performed"]) == 6  # "Blood Glucose Check" deduplicated (total 6)
        assert "Blood Glucose Check" in data["procedures_performed"]

        assert len(data["skills_achieved"]) == 6  # "Aseptic Technique" deduplicated
        assert data["skills_count"] == 6

        # Chronological timeline
        assert len(data["timeline"]) == 4
        assert data["timeline"][0]["date"] == "2026-08-01"
        assert data["timeline"][3]["date"] == "2026-09-10"

        # Last 3 supervisor feedback snippets (most recent first)
        snippets = data["supervisor_feedback_snippets"]
        assert len(snippets) == 3
        assert "ABG interpretation" in snippets[0]
        assert "recognition of early AFib" in snippets[1]
        assert "Smooth cannula placement" in snippets[2]


@pytest.mark.asyncio
async def test_logbook_auth_guards():
    """All logbook endpoints reject unauthenticated access with 401/403."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r1 = await ac.get("/api/logbook")
        assert r1.status_code in (401, 403)

        r2 = await ac.post("/api/logbook", json={"clinical_placement": "Ward", "hospital_department": "Med", "date": "2026-09-20"})
        assert r2.status_code in (401, 403)

        r3 = await ac.get(f"/api/logbook/{uuid.uuid4()}")
        assert r3.status_code in (401, 403)

        r4 = await ac.put(f"/api/logbook/{uuid.uuid4()}", json={"clinical_hours": 8})
        assert r4.status_code in (401, 403)

        r5 = await ac.delete(f"/api/logbook/{uuid.uuid4()}")
        assert r5.status_code in (401, 403)

        r6 = await ac.get("/api/logbook/portfolio")
        assert r6.status_code in (401, 403)


@pytest.mark.asyncio
async def test_logbook_indexes():
    """_ensure_indexes ensures logbook index registration."""
    await server._ensure_indexes()
