# Nurse Orbit

A mobile-first learning and career app for nursing students and registered nurses.

> A university teaches the curriculum. Nurse Orbit helps the student learn, practise, simulate, prepare, track and build their career around it.

## Student Nurse area: the 10 pillars

| # | Pillar | In the app |
|---|---|---|
| 1 | My Nursing Journey | Year-wise curriculum progress, next-up suggestion, personalised 7-day plan |
| 2 | Orbit AI Tutor | Streaming AI chat with medical images, care plans, nursing diagnosis |
| 3 | Clinical Simulation | Clinical cases, Emergency / Code Blue, ECG, ABG & ventilator |
| 4 | Skills Lab | OSCE stations with AI examiner, procedures (Year 1–4), clinical skills |
| 5 | Drug & Medication Safety | Drug guide, weight-based dose calculator, pediatric tools |
| 6 | Nursing Library | Books, chapters, bookmarks, notes, search |
| 7 | Exams & MCQs | Question bank, timed mock exams, NCLEX dashboard, "Teach Me From My Mistakes" recovery sessions, revision plans |
| 8 | Languages | OET, IELTS and German for nurses |
| 9 | Health & Wellness | Sleep / stress / mood check-in, steps, nutrition, vitals, medications |
| 10 | Career & Professional Portfolio | Clinical logbook → auto-built portfolio, specialties, professional passport, work-abroad pathways |

Registered nurses also get a shift roster with leave calculations, CME tracking, jobs and news.

Practice questions and language materials are original educational content, not official exam items.

## Stack

- **Frontend:** Expo (SDK 57) + Expo Router, TypeScript, TanStack Query (`frontend/`)
- **Backend:** FastAPI + MongoDB (Motor), JWT auth (`backend/server.py`, content in `backend/*_data.py`)
- **AI and file storage:** Emergent LLM key (`emergentintegrations`). Without the key, AI and upload endpoints return 503 and everything else still works.

## Run locally

### Backend

Needs Python 3.9+ and a MongoDB instance.

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # set MONGO_URL, DB_NAME and JWT_SECRET
uvicorn server:app --host 0.0.0.0 --port 8001
```

`--host 0.0.0.0` lets a phone or emulator on your network reach the API.

### Frontend

```bash
cd frontend
yarn install
cp .env.example .env        # optional: EXPO_PUBLIC_BACKEND_URL=http://<your-LAN-IP>:8001
yarn start
```

If `EXPO_PUBLIC_BACKEND_URL` is empty, development builds call port 8001 on the machine running the Expo dev server.

## Tests

The tests that import `server` run in-process against an in-memory MongoDB, so no database is needed:

```bash
cd backend
pip install mongomock-motor pytest-asyncio httpx
python -m pytest tests/test_journey.py tests/test_wellbeing.py tests/test_logbook.py \
  tests/test_nclex_dashboard.py tests/test_osce.py tests/test_languages.py \
  tests/test_recovery_sessions.py tests/test_revision_plans.py
```

The other files in `backend/tests/` call a running server at `EXPO_PUBLIC_BACKEND_URL`.

Test