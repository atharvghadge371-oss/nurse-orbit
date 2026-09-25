"""
Interactive clinical simulation cases.
Each scenario is a stepwise decision tree — patient starts with a presentation and vitals,
the nurse picks an action at each step, gets feedback + rationale, and vitals evolve.

Educational only. Verify all doses and interventions with local protocols.
"""

CLINICAL_SIMS = [
    # ---------------- STROKE ----------------
    {
        "id": "stroke-ischemic",
        "title": "Suspected Ischemic Stroke",
        "category": "Neurology",
        "difficulty": "Medium",
        "emoji": "🧠",
        "vignette": (
            "62-year-old man brought to the ED by his wife. Sudden right-sided weakness and slurred speech that started "
            "45 minutes ago. Known hypertension on amlodipine, atrial fibrillation on warfarin (INR unknown)."
        ),
        "initial_vitals": {"BP": "168/94", "HR": "96 irregular", "RR": "18", "SpO2": "97% RA", "GCS": "14 (E4V4M6)", "BSL": "6.8 mmol/L"},
        "steps": [
            {
                "id": 1,
                "prompt": "The patient just rolled into the ED. What is your FIRST priority?",
                "options": [
                    {"label": "Call the physician and wait for orders", "correct": False, "feedback": "Time-critical — every minute costs 2 million neurones. Start assessment now."},
                    {"label": "Perform ABCD + FAST assessment and record last-known-well time", "correct": True, "feedback": "Correct. Last-known-well is the anchor for thrombolysis eligibility."},
                    {"label": "Send bloods and wait for the CT porter", "correct": False, "feedback": "Bloods matter but airway and stroke assessment come first."},
                    {"label": "Give aspirin 300 mg PO immediately", "correct": False, "feedback": "Not before imaging — could be haemorrhagic."},
                ],
                "vitals_after": None,
            },
            {
                "id": 2,
                "prompt": "FAST is positive (facial droop, arm drift, dysarthria). What time-target must be met?",
                "options": [
                    {"label": "Door-to-CT within 25 minutes; door-to-needle within 60 minutes", "correct": True, "feedback": "These are the AHA / NICE targets for acute-stroke care."},
                    {"label": "Door-to-CT within 2 hours", "correct": False, "feedback": "Too slow — thrombolysis window will close."},
                    {"label": "Transfer to stroke-unit within 24 hours", "correct": False, "feedback": "Admission is later; imaging is the immediate priority."},
                ],
                "vitals_after": None,
            },
            {
                "id": 3,
                "prompt": "BP is 210/110 before CT. What is the correct nursing action?",
                "options": [
                    {"label": "Notify the doctor — BP above 185/110 is a contraindication to thrombolysis; may need controlled reduction", "correct": True, "feedback": "Correct. IV labetalol / nicardipine per protocol to bring below 185/110."},
                    {"label": "Aggressively lower BP to 120/80 with sublingual nifedipine", "correct": False, "feedback": "Sharp drops worsen cerebral perfusion — never use sublingual nifedipine."},
                    {"label": "Leave the BP alone as elevated BP is protective", "correct": False, "feedback": "Only tolerated up to 185/110 for thrombolysis candidates."},
                ],
                "vitals_after": {"BP": "182/98", "HR": "88 irregular", "RR": "18", "SpO2": "98% RA", "GCS": "14"},
            },
            {
                "id": 4,
                "prompt": "CT shows no bleed. INR reported as 1.2. Weight 80 kg. Team decides to give alteplase (tPA). Total dose?",
                "options": [
                    {"label": "0.9 mg/kg (max 90 mg) — 10% bolus, rest over 60 min", "correct": True, "feedback": "Correct. 72 mg total: 7.2 mg bolus + 64.8 mg over 60 min."},
                    {"label": "1 mg/kg over 5 minutes", "correct": False, "feedback": "This is the myocardial-infarction dose, not stroke."},
                    {"label": "10 mg IV push then stop", "correct": False, "feedback": "Only the bolus — will not deliver enough drug."},
                ],
                "vitals_after": None,
            },
            {
                "id": 5,
                "prompt": "Post-tPA nursing priorities include:",
                "options": [
                    {"label": "Neuro checks + BP every 15 min for 2 h, then 30 min for 6 h; no arterial punctures for 24 h", "correct": True, "feedback": "Correct. Bleed surveillance is the top priority."},
                    {"label": "Give aspirin 300 mg immediately", "correct": False, "feedback": "Antiplatelets are held for 24 hours after thrombolysis."},
                    {"label": "Sit the patient upright immediately", "correct": False, "feedback": "Head-of-bed 0-15° in acute phase to maintain cerebral perfusion."},
                ],
                "vitals_after": {"BP": "168/90", "HR": "84", "RR": "16", "SpO2": "99%", "GCS": "15"},
            },
        ],
        "learning_points": [
            "Every minute of untreated stroke destroys ~1.9 million neurones.",
            "Thrombolysis window: 4.5 hours from LKW for eligible patients.",
            "BP goal for tPA: < 185/110 before; < 180/105 for 24 hours after.",
            "Hold antiplatelets/anticoagulants for 24 hours after tPA.",
        ],
    },

    # ---------------- MI ----------------
    {
        "id": "acute-mi",
        "title": "Acute Myocardial Infarction (STEMI)",
        "category": "Cardiac",
        "difficulty": "Medium",
        "emoji": "🫀",
        "vignette": (
            "58-year-old male presents with crushing central chest pain radiating to left arm and jaw, 40 minutes duration. "
            "Diaphoretic, nauseated. Known type-2 diabetic, smoker."
        ),
        "initial_vitals": {"BP": "142/88", "HR": "104 regular", "RR": "22", "SpO2": "94% RA", "Pain": "9/10"},
        "steps": [
            {
                "id": 1,
                "prompt": "First nursing intervention on arrival?",
                "options": [
                    {"label": "Sit the patient up, apply O2 if SpO2 <94%, obtain 12-lead ECG within 10 min, IV access ×2, put on cardiac monitor", "correct": True, "feedback": "Correct — the MONA framework starts with rapid assessment + ECG within 10 min."},
                    {"label": "Give aspirin and wait for the ECG", "correct": False, "feedback": "Aspirin is critical but simultaneous with ECG, not before rapid assessment."},
                    {"label": "Send troponin and wait for the result before intervening", "correct": False, "feedback": "STEMI is a clinical + ECG diagnosis — never wait for troponin."},
                ],
                "vitals_after": None,
            },
            {
                "id": 2,
                "prompt": "ECG shows ST elevation V1-V4. Which of the following meds now?",
                "options": [
                    {"label": "Aspirin 300 mg chewed + Clopidogrel/Ticagrelor loading dose + IV opioid for pain + GTN if BP OK", "correct": True, "feedback": "Correct — dual antiplatelet + analgesia. Statin can be given also."},
                    {"label": "Only aspirin — hold everything else until angiogram", "correct": False, "feedback": "Dual antiplatelet loading is standard-of-care before PCI."},
                    {"label": "IV thrombolysis immediately", "correct": False, "feedback": "Primary PCI is preferred if achievable within 120 min; thrombolysis only if PCI-delayed."},
                ],
                "vitals_after": {"BP": "128/78", "HR": "88", "RR": "18", "SpO2": "97% on 2L NC", "Pain": "5/10"},
            },
            {
                "id": 3,
                "prompt": "Cath lab is 90 minutes away. Door-to-balloon target?",
                "options": [
                    {"label": "≤ 90 minutes for primary PCI; if not feasible in 120 min, give thrombolysis within 30 min", "correct": True, "feedback": "Correct. Time = muscle."},
                    {"label": "≤ 24 hours", "correct": False, "feedback": "Every minute delayed = more infarcted myocardium."},
                ],
                "vitals_after": None,
            },
            {
                "id": 4,
                "prompt": "Patient suddenly develops VF. Immediate action?",
                "options": [
                    {"label": "Start CPR + prepare defibrillator + shock at 200 J biphasic (unsynchronised)", "correct": True, "feedback": "Correct — VF is a shockable rhythm; immediate defibrillation is priority."},
                    {"label": "Synchronised cardioversion at 100 J", "correct": False, "feedback": "Synchronised is for stable tachy-arrhythmias; VF has no R wave to sync to."},
                    {"label": "Give amiodarone 300 mg IV before shocking", "correct": False, "feedback": "Amiodarone is for shock-refractory VF, after the first shock(s)."},
                ],
                "vitals_after": {"Rhythm": "VF → sinus after 1 shock", "BP": "112/70", "HR": "76"},
            },
            {
                "id": 5,
                "prompt": "Post-PCI, nursing priorities include:",
                "options": [
                    {"label": "Cardiac monitor, groin/wrist site checks q15 min × 2 h, distal pulses, watch for retroperitoneal bleed, DAPT + statin + β-blocker + ACEi", "correct": True, "feedback": "Correct — bleeding at access site is the leading complication."},
                    {"label": "Ambulate within 1 hour of PCI", "correct": False, "feedback": "Bed rest 2-6 hours post-femoral access; radial can mobilise earlier."},
                ],
                "vitals_after": None,
            },
        ],
        "learning_points": [
            "STEMI = clinical diagnosis + ECG (ST elevation ≥1 mm in 2 contiguous leads).",
            "Door-to-ECG ≤ 10 min; door-to-balloon ≤ 90 min.",
            "MONA-BASH: Morphine, Oxygen (if hypoxic), Nitrates, Aspirin, Beta-blocker, ACEi, Statin, Heparin.",
            "VF/pulseless VT → immediate unsynchronised shock (200 J biphasic).",
        ],
    },

    # ---------------- BURNS ----------------
    {
        "id": "burns-fluids",
        "title": "Adult Burns — Parkland Fluid Resuscitation",
        "category": "Emergency",
        "difficulty": "Medium",
        "emoji": "🔥",
        "vignette": (
            "35-year-old man rescued from a house fire. Weight 70 kg. Burns to both arms (18%), anterior chest & abdomen (18%) — total ~36% TBSA, partial + full thickness. "
            "Time of burn: 2 hours ago. Alert, coughing black-tinged sputum, hoarse voice."
        ),
        "initial_vitals": {"BP": "108/68", "HR": "118", "RR": "24", "SpO2": "94% RA", "Temp": "36.4", "Pain": "9/10"},
        "steps": [
            {
                "id": 1,
                "prompt": "First priority?",
                "options": [
                    {"label": "Secure airway — hoarse voice + carbonaceous sputum = impending airway oedema; call anaesthesia for early intubation, high-flow O2", "correct": True, "feedback": "Correct — inhalation injury is the leading cause of early death in burns."},
                    {"label": "Cover burns with cold water compresses", "correct": False, "feedback": "Airway comes before wound care. Also risk of hypothermia."},
                    {"label": "Rush to burn unit before intervention", "correct": False, "feedback": "Stabilise airway + start fluids before transfer."},
                ],
                "vitals_after": None,
            },
            {
                "id": 2,
                "prompt": "Calculate the Parkland fluid requirement for the first 24 hours (from time of burn).",
                "options": [
                    {"label": "4 mL × 70 kg × 36% = 10,080 mL Ringer's lactate over 24 hours", "correct": True, "feedback": "Correct: 4 mL × kg × %TBSA. Give ½ in first 8 h from burn, ½ in next 16 h."},
                    {"label": "2 mL × 70 kg × 36% = 5,040 mL", "correct": False, "feedback": "That is the modified-Brooke / Consensus formula (2 mL/kg/%). Parkland is 4 mL."},
                    {"label": "50 mL/kg/hr fluid bolus", "correct": False, "feedback": "Bolus resuscitation is inappropriate in burns — controlled infusion is essential."},
                ],
                "vitals_after": None,
            },
            {
                "id": 3,
                "prompt": "How should you distribute the 10,080 mL? (Burn happened 2 hours ago; you are starting now.)",
                "options": [
                    {"label": "Half (5,040 mL) in the first 8 h from BURN TIME (so 5,040 mL over the NEXT 6 hours = ~840 mL/hr), remaining 5,040 mL over the following 16 h (~315 mL/hr)", "correct": True, "feedback": "Correct — always count from time of burn, not time of arrival."},
                    {"label": "Half over the first 8 hours from now, half over next 16 hours from now", "correct": False, "feedback": "This gives too little fluid in the crucial first-8-hour window."},
                    {"label": "10,080 mL as a rapid bolus", "correct": False, "feedback": "Would cause fluid overload and ARDS."},
                ],
                "vitals_after": {"BP": "112/70", "HR": "104", "RR": "22", "SpO2": "99% intubated", "UO": "starting"},
            },
            {
                "id": 4,
                "prompt": "What is the best marker for adequacy of fluid resuscitation?",
                "options": [
                    {"label": "Hourly urine output 0.5-1 mL/kg/hr (adults); 1 mL/kg/hr (children)", "correct": True, "feedback": "Correct — the single most important variable in burn resus."},
                    {"label": "Systolic BP > 120", "correct": False, "feedback": "BP can be preserved despite severe hypovolaemia."},
                    {"label": "Serum lactate every 6 hours only", "correct": False, "feedback": "Useful but too infrequent to titrate hourly."},
                ],
                "vitals_after": None,
            },
            {
                "id": 5,
                "prompt": "Additional burn-nursing priorities in the first 24 h?",
                "options": [
                    {"label": "Warm environment (hypothermia risk), tetanus booster, NG tube (ileus/decompression), analgesia + sedation, elevate limbs, watch compartments/eschar, escharotomy team ready", "correct": True, "feedback": "Correct — comprehensive early-burn care."},
                    {"label": "Prophylactic IV antibiotics for everyone", "correct": False, "feedback": "Prophylactic systemic antibiotics are NOT recommended — increases resistance."},
                    {"label": "Ice packs directly on burns", "correct": False, "feedback": "Causes further tissue injury; use cool (not ice) running water within first 20 min only."},
                ],
                "vitals_after": None,
            },
        ],
        "learning_points": [
            "Parkland: 4 mL × kg × %TBSA Ringer's over 24 h; ½ in first 8 h from BURN TIME.",
            "Titrate to urine output 0.5-1 mL/kg/hr adults; 1 mL/kg/hr children.",
            "Airway compromise is the leading cause of early death — hoarse voice / soot / face burns = intubate early.",
            "No prophylactic systemic antibiotics.",
        ],
    },

    # ---------------- UNCONSCIOUS PATIENT ----------------
    {
        "id": "unconscious",
        "title": "Unconscious Patient — Undifferentiated",
        "category": "Emergency",
        "difficulty": "Hard",
        "emoji": "😵",
        "vignette": (
            "45-year-old woman found unresponsive in her office. Colleagues report she 'slumped over' about 20 minutes ago. "
            "No known medical history available. No obvious trauma."
        ),
        "initial_vitals": {"BP": "94/58", "HR": "48", "RR": "8 shallow", "SpO2": "88% RA", "GCS": "6 (E1V2M3)", "BSL": "unknown"},
        "steps": [
            {
                "id": 1,
                "prompt": "Very first action?",
                "options": [
                    {"label": "Check responsiveness → shout for help → open airway (head-tilt / chin-lift or jaw-thrust) → look-listen-feel for breathing", "correct": True, "feedback": "Correct — ABC comes first, always."},
                    {"label": "Immediately start chest compressions", "correct": False, "feedback": "She is breathing (RR 8) — not cardiac arrest yet."},
                    {"label": "Send urgent bloods including toxicology", "correct": False, "feedback": "Bloods come after ABC stabilisation."},
                ],
                "vitals_after": None,
            },
            {
                "id": 2,
                "prompt": "Airway is patent with jaw-thrust. GCS 6 — what next?",
                "options": [
                    {"label": "GCS ≤ 8 = intubate. Give bag-valve-mask with 100% O2 while calling anaesthesia. Prepare RSI drugs", "correct": True, "feedback": "Correct — 'GCS 8, intubate'. Protects airway from aspiration."},
                    {"label": "OP airway is enough — no need to intubate", "correct": False, "feedback": "OP airway may help temporarily but doesn't protect against aspiration."},
                    {"label": "Wait for the patient to wake up", "correct": False, "feedback": "Waiting risks aspiration and hypoxic brain injury."},
                ],
                "vitals_after": {"SpO2": "100% BVM", "RR": "12 assisted"},
            },
            {
                "id": 3,
                "prompt": "The 'DEFG' after ABC — what is the FIRST reversible cause you must screen for in every unconscious patient?",
                "options": [
                    {"label": "Don't Ever Forget Glucose — capillary BSL first", "correct": True, "feedback": "Correct. Hypoglycaemia is the fastest reversible cause and easiest to miss."},
                    {"label": "CT head first", "correct": False, "feedback": "Important, but BSL is faster and can save the brain in seconds."},
                    {"label": "ABG first", "correct": False, "feedback": "ABG is useful but BSL is instantaneous."},
                ],
                "vitals_after": {"BSL": "1.8 mmol/L (32 mg/dL)"},
            },
            {
                "id": 4,
                "prompt": "BSL is 1.8 mmol/L. Correct treatment?",
                "options": [
                    {"label": "IV 25-50 mL of 50% dextrose (or 100-250 mL 10% dextrose); recheck BSL in 5-10 min", "correct": True, "feedback": "Correct. Add thiamine BEFORE dextrose in suspected alcoholism/malnutrition."},
                    {"label": "Oral sugar solution", "correct": False, "feedback": "Contraindicated — patient is unconscious, aspiration risk."},
                    {"label": "Wait and monitor", "correct": False, "feedback": "Neuroglycopenia causes permanent brain damage — treat immediately."},
                ],
                "vitals_after": {"GCS": "10 (E3V3M4)", "BSL": "5.8 mmol/L after treatment"},
            },
            {
                "id": 5,
                "prompt": "Patient improves but still drowsy. Colleague now recalls she had 'been low' recently. Naloxone trial gives no response, opioids ruled out. What toxidrome-screen should you also consider?",
                "options": [
                    {"label": "Consider antidepressant / benzodiazepine overdose, alcohol, CO poisoning; send tox screen + ECG (TCA-QRS widening) + ABG + CT head if no cause found", "correct": True, "feedback": "Correct — undifferentiated coma needs a systematic AEIOU-TIPS work-up."},
                    {"label": "Send home now that she's talking", "correct": False, "feedback": "Never — the cause has not been identified."},
                ],
                "vitals_after": None,
            },
        ],
        "learning_points": [
            "AEIOU-TIPS mnemonic: Alcohol, Epilepsy/Endocrine, Insulin, Overdose/Oxygen, Uraemia, Trauma, Infection, Psychiatric, Stroke.",
            "GCS ≤ 8 → intubate for airway protection.",
            "Don't Ever Forget Glucose — first & fastest reversible cause.",
            "Give thiamine BEFORE dextrose in suspected alcoholism/malnutrition (Wernicke prevention).",
        ],
    },
]
