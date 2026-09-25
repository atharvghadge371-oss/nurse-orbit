# Nurse Orbit — PRD

## Vision
Nurse Orbit (branded internally as GLOBAL NURSE) is a premium mobile-first nursing education and international career platform. Tagline: **Learn. License. Work. Grow.**

Target users: nursing students, registered nurses, internationally educated nurses, healthcare professionals studying, preparing for licensing exams, and pursuing international nursing careers.

## MVP delivered (v1)

### Auth & Onboarding
- Email/password signup + login (Argon2, JWT via expo-secure-store).
- 4-step onboarding: role, qualification, country, main career goal → drives personalization.

### Bottom navigation (5 tabs)
1. **Home** — personalized dashboard: greeting, Professional Status card (License/BLS/ACLS with ACTIVE/EXPIRING SOON/EXPIRED/MISSING statuses), CME circular progress, Quick Actions grid, Continue Learning, Career Goal readiness, Upcoming Expiry.
2. **Study** — Nursing Academy: 7 categories (Year 1–4, Post Basic, MSc, Clinical Specialties), 16 seeded subjects with topic/lesson counts, drill into lessons (Fundamentals, Pharmacology, Med-Surg etc.) with learning objectives, key concepts, clinical notes, references.
3. **Exams** — two tabs:
   - Question Bank: 6 modes (Practice, Timed Test, Mock Exam, Weak Areas, Bookmarked, Incorrect), full MCQ UI with A/B/C/D options, submit → explanation + clinical rationale + reference + bookmark. Stats card (attempted/accuracy/correct).
   - Exam Center: DOH, DHA, MOHAP, SCFHS, QCHP, OMSB, NMC (UK), NCLEX-RN (US/Canada), AHPRA (AU) with overview, eligibility, education, documents, process, renewal, official link, "Last Reviewed" label.
4. **Abroad** — country pathway list (UAE, Germany, UK, USA, Canada, Australia, Saudi Arabia) with demand indicator, language, step count. Detail screen: vertical roadmap stepper with progress %, tap-to-toggle steps; e.g. Germany 10 steps (eligibility → docs → German A1→B2 → recognition → employer → visa → arrival).
5. **Passport** — Professional Passport document vault: grouped by category (Identity/Education/Licensing/Certifications/Experience/Language/CME/Career), status badges (ACTIVE/EXPIRING SOON/EXPIRED/MISSING) computed from expiry dates, Expiring alerts section, FAB to add.
   - Upload modal supports PDF and image via Emergent Managed Object Storage; ownership enforced on download.

### Extra screens (accessible via Home Quick Actions & Profile)
- **AI Nurse** — streaming chat backed by Claude Sonnet 5 (Emergent LLM key). Suggested prompts, educational disclaimer, chat history saved per session.
- **CME / CPD** — circular ring progress, required/completed/remaining, add-CME modal with categories, records list.
- **Jobs** — nursing job marketplace with salary, specialty, employer, save/apply buttons.
- **News** — Global Nursing News feed with categories, source, publication date.
- **Notifications** — expiry alerts derived from documents + CME progress reminder.
- **Profile** — user card, menu with links to Passport, CME, Jobs, News, AI Nurse, Notifications, Subscription, Security, Privacy, Help, About, Logout.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor). Argon2 password hashing (pwdlib), JWT auth, Emergent Object Storage for document files, Emergent LLM key with `emergentintegrations` for AI Nurse (Claude Sonnet 5 SSE streaming).
- **Frontend**: Expo Router (SDK 57) + React Query. Auth guard in `_layout`. Theme tokens in `src/theme.ts` (deep navy `#0A1931`, royal `#1E3A8A`, teal accent `#0D9488`, semantic success/warning/error).
- Endpoints under `/api/*`: `/auth/*`, `/home/dashboard`, `/study/*`, `/questions*`, `/exams*`, `/abroad/pathways*`, `/passport/documents*`, `/cme`, `/jobs`, `/news`, `/notifications`, `/ai/chat`.

## Content database (seeded)
- 16 subjects across 5 year groups + specialties.
- 10 sample MCQs across pharmacology, med-surg, fundamentals, mental health, pediatrics, obstetrics, critical care, emergency.
- 10 international licensing exams.
- 7 country career pathways (UAE, Germany, UK, USA, Canada, Australia, Saudi Arabia).
- 5 global nursing news items, 5 sample jobs.

## Design system
- Follows `/app/design_guidelines.json`: iOS-Native Clean, generous spacing, rounded cards (12–20 radius), soft shadows, Plus Jakarta Sans, glassmorphism-friendly, status colour semantics.

## Testing
- Auth flow, onboarding, and Home dashboard verified via curl + screenshot end-to-end.
- Demo credentials in `/app/memory/test_credentials.md`.

## AI Medical Images (Iteration 5)
- AI Nurse Tutor now auto-detects anatomy / medical keywords in every question + answer and streams a `images` SSE event with up to 3 curated Wikimedia images (URL, title, caption).
- Images render inline inside the assistant bubble; tap opens a fullscreen zoomable viewer (`/image-viewer`) with pinch, pan and double-tap zoom via `react-native-gesture-handler` + `reanimated`.
- Catalog lives in `/app/backend/medical_images.py` (30+ topics: heart, ECG, lungs, brain, nephron, ABG, cell, DNA, CPR, IV, etc.). Free / open-licensed images — no copyright risk, no LLM cost.
- Chat records persist images alongside references for history restore.
- Also fixed the AI-tab QUICK chip clipping (moved fixed row height to wrapper).

## Shift Calendar Module (Iteration 5)
- New 6th bottom tab **Calendar** (between Practice and Profile).
- Backend `/api/calendar/*` endpoints: events CRUD, shift-pattern generator, leave-config, leave preview + apply, 6-month summary and AL-window suggestions.
- Custom AL math: 1.5 days accrued / completed month (configurable) + only **working days** (morning/evening/night) in an applied window consume balance — off days are free.
- Sick leave prorated per day (annual rate / 365).
- Live counters: night-shifts in last 6 months, CME hours YTD & all-time.
- Screens: `calendar.tsx` (month view + summary), `calendar/add.tsx` (multi-type event modal), `calendar/pattern.tsx` (preset + custom cycle builder), `calendar/apply-leave.tsx` (preview cost + AL-window suggestions), `calendar/settings.tsx` (leave config + home airport), `calendar/summary.tsx` (dashboard), `calendar/day/[date].tsx` (per-day view with mark-done / delete).
- Event types: shift (morning/evening/night/off), cme, class, appointment, task, note, leave (AL/SICK).
- Uses `react-native-calendars` with multi-dot markers coloured by event type.
- Stage 2 (upcoming): SerpAPI Google Flights integration for holiday-window flight compare, Emergent Google Auth for Gmail / Calendar sync, PDF roster import.

## Iteration 6 — Massive feature drop
Backend additions to `server.py` + new data files:
- **Translator**: `/api/translate`, `/api/translate/tts` (Claude Sonnet 5 + OpenAI TTS via Emergent LLM Key). 50+ languages, 3 modes (Patient/Medical/Casual), voice playback.
- **Pediatric Intelligence** (`pediatric_data.py`): Broselow cart with 9 colour zones, 40+ pediatric drugs, weight-based dose calc with max-single-dose cap + auto volume-in-mL, Holliday-Segar 4-2-1 IV maintenance, IV drip-rate, Mosteller BSA.
- **Nursing Scope & Trends** (`nursing_scope_data.py`): 16 career specializations (Informatics, Educator, Quality, IPC, Wound care, CRN, Critical Care, ER, NP, NICU, Oncology, Dialysis, OR, Mental Health, Midwife, Public Health) with how-to-become + accepted countries + salary + 8 current global trends.
- **Health Monitor** (already-live endpoints): `/api/health/profile|vitals|medications|steps|meals|labs|rewards` — BMI trend, step tracking with 100k/200k/300k monthly reward tiers, medication schedule, AI meal-parser, lab-PDF vault.
- **Medical images auto-attach** in AI Nurse Tutor via `/backend/medical_images.py` (30+ open-license Wikimedia diagrams).

Frontend additions:
- New tab **Roster** (6th) — colour-coded shift grid with pattern generator, AL/sick math and dashboard.
- New screens: `tools/translator.tsx`, `pediatric/{index,broselow,dose,fluids,bsa}.tsx`, `nursing-scope/{index,[id]}.tsx`, `health/index.tsx`, `career/index.tsx`, `about.tsx`, `image-viewer.tsx` (pinch-zoom).
- Home Explore grid restructured: added Career Development, Shift Calendar, Professional Passport, Work Abroad Pathways, Nursing Jobs; removed NCLEX/Prometric (moved into Practice tab), removed Care Plans / MCQs / Nursing Diagnosis / Exam Prep duplicates.
- Drug Guide now shows a prominent Pediatric Intelligence entry at the top.
- Profile menu streamlined: My Health, Career Development, Translator, Library, Notifications, About.

## Iteration 7 — AI Persona + big-content drop
- **AI Nickname & Tone** (bug fix, verified 17/17 by testing_agent):
  - Users can name their AI (e.g. "Nurse Meera", "Buddy") and pick tone (Warm / Funny / Strict / Neutral).
  - New screen `/tools/ai-persona.tsx` accessible from AI tab header (🤖 Name) and Profile menu.
  - Backend `PUT /api/auth/profile` + `public_user` now include `ai_name` / `ai_tone`. AI chat system-prompt now injects persona + textbook-style formatting instruction.
- **AI Image Generation** endpoint `/api/ai/generate_image` — Gemini Nano Banana via Emergent LLM Key; stores generated PNG in Object Storage.
- **Clinical Simulator** (`/app/backend/clinical_sims.py`) — 4 step-by-step cases: Stroke, STEMI, Burns (Parkland fluid resus), Unconscious patient (AEIOU-TIPS). Endpoints `/api/clinical-sims` + `/{id}`.
- **Nursing Procedures** (`/app/backend/procedures_data.py`) — 22 procedures across BSc Years 1-4 (handwash, bed-making, vitals, IM injection, catheterisation, NG tube, IV cannulation, blood transfusion, wound dressing, oxygen therapy, suctioning, ECG, immunisation, growth monitoring, ORS, restraints, seizure management, antenatal check, partograph, normal delivery, episiotomy). Endpoints `/api/procedures` + `/{id}`.
- **30 Abnormal Delivery Conditions** — Shoulder dystocia, cord prolapse, atonic/traumatic PPH, retained placenta, uterine inversion/rupture, obstructed labour, breech/transverse/face/brow/compound presentations, persistent OP, severe pre-eclampsia/eclampsia, abruption, praevia, accreta, vasa praevia, PPROM, chorioamnionitis, AFE, preterm labour, IUFD, meconium, GDM, HELLP, scar dehiscence, locked twins, anaemia. Endpoints `/api/abnormal-deliveries` + `/{id}`.

## Queued for next iteration (user-requested)
- Role-based access sections (Student / Registered / All) with area-focused procedure sets (Emergency & Critical Care, OT, etc.).
- Area-specific procedures: Intubation/RSI, trauma DCAP-BTLS, OT equipment.
- Nursing journals auto-feed.
- LinkedIn integration in Nursing Jobs (for RNs).
- SerpAPI Flight Compare on Roster.
- Voice mic + Photo OCR for Translator.
- Full My Health sub-screens.
- PDF export of AI answer + Save to Passport.
- Frontend UI for Clinical Simulator, Procedures library and Abnormal Deliveries.

## Student Nurse area: 10 pillars (from "Nurse Orbit: Student Nurse Developer Intro")
- **Student access screen** (`access/student.tsx`) is now grouped into the 10 numbered pillars (Journey, AI Tutor, Simulation, Skills Lab, Drug Safety, Library, Exams & MCQs, Languages, Health & Wellness, Career & Portfolio). `AccessGrid` takes `sections` for this; the RN screen still uses flat `tiles`.
- **Pillar 1: My Nursing Journey** (`journey/index.tsx`, `/api/journey*`):
  - Current year comes from the onboarding `year` ("2nd Year" → "Year 2"); `PUT /journey/year` changes it and writes back in onboarding format.
  - Per-subject status from lesson completion + MCQ accuracy: `needs_work` (≥3 answers, <70%), `in_progress`, `not_started`, `completed`. Year and overall progress, a "next up" suggestion, focus areas.
  - Lessons are marked complete on the lesson screen (`POST/DELETE /journey/lessons/{id}/complete`, 8 XP on first completion only).
  - `POST /journey/plan` builds a rule-based 7-day plan (no LLM needed): six study days rotating through the most urgent subjects (lessons + MCQs + one Skills/Sim/Drug/Library/Logbook task), then a weekly review. Lesson tasks tick themselves when the lesson is completed anywhere. Plans are scoped to the year they were built for.
- **Pillar 9: wellbeing check-in** (`src/components/WellbeingCard.tsx` on My Health, `/api/health/wellbeing`): daily sleep hours, stress 1–5 and mood 1–5 (one entry per day, upserted), 7-day averages, check-in streak, and supportive insights once there are ≥3 check-ins (short sleep, high stress, several low-mood days → student support).
- Tests: `backend/tests/test_journey.py`, `backend/tests/test_wellbeing.py` (in-process, mongomock).
- Remaining gaps against the PDF: CV builder (Pillar 10), UI for the 4 `clinical-sims` (Pillar 3), adult dosage-calculation practice (Pillar 5), and the question bank has only 10 MCQs across the 9 NCLEX content areas (Pillar 7).
