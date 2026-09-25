"""Seed data for Language preparation: OET, IELTS, and German for Nurses."""

OET_SECTIONS = [
    {
        "id": "oet-listening",
        "name": "Listening",
        "icon": "🎧",
        "desc": "Part A: Consultation. Part B: Short extracts. Part C: Presentation.",
        "tips": [
            "Part A: Anticipate missing information by reading headings and prompts during the 30-second prep time.",
            "Write exact clinical words heard from the audio; avoid unnecessary paraphrasing in Part A note completion.",
            "Part B: Focus on the communicative purpose and nursing action required rather than individual isolated words.",
            "Part C: Follow discourse signposts (e.g. 'furthermore', 'on the other hand') to track the speaker's line of argument.",
            "Maintain focus throughout clinical dialogues by taking quick shorthand notes of vital signs and symptoms."
        ]
    },
    {
        "id": "oet-reading",
        "name": "Reading",
        "icon": "📖",
        "desc": "Part A: 4 short texts, 20 questions in 15 mins. Part B & C: 45 mins.",
        "tips": [
            "Part A is a speed test: master rapid scanning for specific numerical data, drug dosages, and clinical guidelines.",
            "Do not read Part A texts sequentially; look at the question first and target the specific source text (A, B, C, or D).",
            "Part B: Identify the main purpose of nursing hospital policies, infection control memos, and incident guidelines.",
            "Part C: Read the questions carefully and eliminate options that contradict the author's nuanced medical opinion.",
            "Watch out for absolute quantifiers like 'always', 'never', 'solely' which are common distractor flags in Part C."
        ]
    },
    {
        "id": "oet-writing",
        "name": "Writing",
        "icon": "✍️",
        "desc": "Write a formal referral, transfer, or discharge letter from patient case notes.",
        "tips": [
            "Select only relevant case notes; including irrelevant historical details will reduce your score for Conciseness.",
            "Structure your letter logically: Opening purpose, Current clinical presentation, Relevant medical background, Discharge/Ongoing plan.",
            "Maintain a formal, professional clinical register throughout (avoid colloquialisms and ambiguous abbreviations).",
            "Clearly state patient demographics, provisional diagnosis, current medications, and urgent follow-up requirements in the opening paragraph.",
            "Proofread meticulously for verb tense consistency (e.g. past tense for historical events, present perfect for recent investigations)."
        ]
    },
    {
        "id": "oet-speaking",
        "name": "Speaking",
        "icon": "🗣",
        "desc": "Role-play as a registered nurse in 2 clinical consultations (5 minutes each).",
        "tips": [
            "Use the 3-minute preparation time to map your clinical communication strategy for each bullet point on the role-play card.",
            "Establish immediate rapport by introducing yourself warmly, confirming the patient's identity, and validating their emotions.",
            "Explain medical conditions and procedures using clear, non-technical lay terminology that the patient can easily understand.",
            "Demonstrate active listening and empathy using phrases like 'I understand this must be distressing for you, Mr. Smith'.",
            "Check for patient understanding periodically by asking 'Does that sound manageable for you?' or 'Would you like me to clarify anything?'"
        ]
    }
]

IELTS_SECTIONS = [
    {
        "id": "ielts-listening",
        "name": "Listening",
        "icon": "🎧",
        "desc": "4 sections with 40 questions covering social and educational conversations.",
        "tips": [
            "Check word count instructions strictly (e.g., 'NO MORE THAN TWO WORDS AND/OR A NUMBER').",
            "Pre-read questions to predict the grammatical form (noun, verb, adjective, number) needed in blank spaces.",
            "Pay close attention to plural endings (-s, -es) and correct spelling of standard medical terminology.",
            "Be alert to speaker self-corrections (e.g. 'We planned for 3 PM, but the doctor moved it to 4 PM').",
            "Transfer answers cleanly and double check punctuation during the final review period."
        ]
    },
    {
        "id": "ielts-reading",
        "name": "Reading",
        "icon": "📖",
        "desc": "3 long academic passages with 40 questions testing detailed comprehension.",
        "tips": [
            "Skim the title, subheadings, and first sentence of each paragraph to get the general gist in 60 seconds.",
            "For 'True / False / Not Given', remember: 'Not Given' means the text does not confirm or contradict the statement.",
            "Underline keywords in the questions and scan for their synonyms in the passage text.",
            "Manage time strictly: allocate roughly 18 minutes for Passage 1, 20 minutes for Passage 2, and 22 minutes for Passage 3.",
            "Never leave any answers blank; make an educated guess if running out of time."
        ]
    },
    {
        "id": "ielts-writing",
        "name": "Writing",
        "icon": "✍️",
        "desc": "Task 1 (150 words report on data/chart) & Task 2 (250 words academic essay).",
        "tips": [
            "Task 1: Always include a clear overview statement summarizing key trends or main features.",
            "Task 1: Group data logically into paragraphs rather than describing every single data point sequentially.",
            "Task 2: Plan your essay for 5 minutes: thesis statement, two main body arguments with clinical examples, and conclusion.",
            "Use formal transitional phrases (e.g. 'Furthermore', 'Consequently', 'In contrast') to enhance coherence.",
            "Meet the minimum word limits (150 words for Task 1, 250 words for Task 2) to avoid severe band penalties."
        ]
    },
    {
        "id": "ielts-speaking",
        "name": "Speaking",
        "icon": "🗣",
        "desc": "11-14 minute one-on-one interview with Part 1, Part 2 (Cue card), and Part 3 (Discussion).",
        "tips": [
            "Part 1: Answer questions smoothly with 2-3 sentences; avoid one-word replies.",
            "Part 2: Use the 1 minute prep time to jot down keywords for all 4 prompts on the cue card.",
            "Part 2: Keep speaking until the examiner stops you; expand with personal nursing anecdotes if helpful.",
            "Part 3: Give extended answers analyzing healthcare trends, societal viewpoints, and ethical considerations.",
            "Focus on fluency and clear pronunciation rather than trying to use overly complex vocabulary unnaturally."
        ]
    }
]

GERMAN_LESSONS = [
    {
        "id": "de-greetings",
        "level": "A1",
        "title": "Hospital Greetings & Introductions",
        "vocab": [
            {"de": "Guten Morgen", "en": "Good morning", "used_in": "Morning shift greeting"},
            {"de": "Guten Tag", "en": "Good day / Hello", "used_in": "General daytime greeting"},
            {"de": "Guten Abend", "en": "Good evening", "used_in": "Evening shift greeting"},
            {"de": "die Krankenschwester", "en": "the nurse (female)", "used_in": "Self-introduction"},
            {"de": "der Krankenpfleger", "en": "the nurse (male)", "used_in": "Self-introduction"},
            {"de": "die Station", "en": "the hospital ward", "used_in": "Ward orientation"},
            {"de": "der Patient / die Patientin", "en": "the patient (m/f)", "used_in": "Patient handover"},
            {"de": "Wie geht es Ihnen?", "en": "How are you? (formal)", "used_in": "Patient check-in"}
        ],
        "phrases": [
            "Guten Morgen! Mein Name ist Maria und ich bin heute Ihre Krankenschwester.",
            "Wie geht es Ihnen heute Morgen?",
            "Haben Sie gut geschlafen?",
            "Ich bin für Sie da, wenn Sie Hilfe brauchen.",
            "Drücken Sie einfach die Klingel, wenn Sie etwas benötigen."
        ],
        "practice_dialogue": "Nurse: Guten Morgen, Frau Müller! Mein Name ist Thomas. Ich bin heute Ihre Pflegefachkraft.\nPatient: Guten Morgen, Thomas. Schön Sie kennenzulernen.\nNurse: Wie haben Sie heute Nacht geschlafen? Haben Sie Schmerzen?\nPatient: Ich habe ganz gut geschlafen, aber mein Rücken schmerzt ein wenig.\nNurse: Ich verstehe. Ich messe zuerst Ihre Vitalwerte und gebe Ihnen dann Ihr Schmerzmittel."
    },
    {
        "id": "de-vitals",
        "level": "A1",
        "title": "Taking Vital Signs (Vitalwerte)",
        "vocab": [
            {"de": "der Blutdruck", "en": "blood pressure", "used_in": "Hemodynamic check"},
            {"de": "der Puls", "en": "pulse / heart rate", "used_in": "Cardiac assessment"},
            {"de": "die Temperatur", "en": "temperature", "used_in": "Fever check"},
            {"de": "die Sauerstoffsättigung", "en": "oxygen saturation (SpO2)", "used_in": "Respiratory check"},
            {"de": "die Manschette", "en": "cuff", "used_in": "BP measurement"},
            {"de": "der Blutzucker", "en": "blood glucose", "used_in": "Diabetes management"},
            {"de": "hoch / niedrig", "en": "high / low", "used_in": "Interpreting vital signs"},
            {"de": "die Schmerzen", "en": "pain", "used_in": "Pain scale assessment"}
        ],
        "phrases": [
            "Ich möchte jetzt Ihren Blutdruck und Puls messen.",
            "Bitte legen Sie Ihren Arm ganz locker auf das Bett.",
            "Die Manschette pumpt sich jetzt auf, das drückt ein wenig.",
            "Ihre Vitalwerte sind alle im Normalbereich.",
            "Auf einer Skala von 0 bis 10: Wie stark sind Ihre Schmerzen?"
        ],
        "practice_dialogue": "Nurse: Herr Weber, ich messe jetzt kurz Ihren Blutdruck und Ihre Sauerstoffsättigung.\nPatient: Ist mein Blutdruck wieder zu hoch?\nNurse: Ihr Blutdruck ist 125 zu 80 mmHg. Das ist ein hervorragender Wert!\nPatient: Und der Sauerstoff?\nNurse: 98 Prozent bei Raumluft, absolut perfekt. Wie ist Ihr Schmerzniveau auf der Skala von 0 bis 10?\nPatient: Ungefähr eine 2, kaum spürbar."
    },
    {
        "id": "de-medications",
        "level": "A2",
        "title": "Medication Administration (Medikamentengabe)",
        "vocab": [
            {"de": "das Medikament / das Arzneimittel", "en": "medication", "used_in": "Prescription dispensing"},
            {"de": "die Tablette", "en": "tablet / pill", "used_in": "Oral medication"},
            {"de": "die Infusion", "en": "IV infusion", "used_in": "Intravenous therapy"},
            {"de": "die Injektion / die Spritze", "en": "injection / syringe", "used_in": "Subcutaneous/IM injection"},
            {"de": "die Nebenwirkung", "en": "side effect", "used_in": "Patient education"},
            {"de": "die Dosierung", "en": "dosage", "used_in": "MAR chart check"},
            {"de": "vor / nach dem Essen", "en": "before / after meals", "used_in": "Administration timing"},
            {"de": "nüchtern", "en": "fasting / empty stomach", "used_in": "Pre-op & lab instructions"}
        ],
        "phrases": [
            "Hier sind Ihre Medikamente für den Vormittag.",
            "Bitte nehmen Sie diese Tablette mit einem großen Schluck Wasser ein.",
            "Haben Sie nach der Einnahme Übelkeit oder Schwindel verspürt?",
            "Dieses Medikament schützt Ihren Magen vor Reizungen.",
            "Die Infusion läuft langsam über die nächsten zwei Stunden."
        ],
        "practice_dialogue": "Nurse: Frau Schmidt, ich bringe Ihnen Ihre Morgentabletten.\nPatient: Welche ist das denn? Die weiße kenne ich gar nicht.\nNurse: Die kleine weiße Tablette ist Ihr Blutdrucksenker Ramipril, und die gelbe ist Pantoprazol für den Magenschutz.\nPatient: Soll ich die vor oder nach dem Frühstück nehmen?\nNurse: Bitte nehmen Sie das Pantoprazol etwa 30 Minuten vor dem Frühstück ein."
    },
    {
        "id": "de-patient-history",
        "level": "A2",
        "title": "Taking Patient History (Anamnese)",
        "vocab": [
            {"de": "die Allergie", "en": "allergy", "used_in": "Admission questionnaire"},
            {"de": "die Vorerkrankung", "en": "pre-existing condition", "used_in": "Medical history"},
            {"de": "die Operation (OP)", "en": "surgery / operation", "used_in": "Surgical history"},
            {"de": "die Atemnot", "en": "shortness of breath / dyspnea", "used_in": "Symptom check"},
            {"de": "der Schwindel", "en": "dizziness / vertigo", "used_in": "Neurological / cardiac check"},
            {"de": "die Übelkeit", "en": "nausea", "used_in": "GI symptom assessment"},
            {"de": "das Erbrechen", "en": "vomiting", "used_in": "GI symptom assessment"},
            {"de": "der Hausarzt", "en": "general practitioner (GP)", "used_in": "Records collection"}
        ],
        "phrases": [
            "Haben Sie bekannte Allergien gegen bestimmte Medikamente oder Pflaster?",
            "Nehmen Sie zu Hause regelmäßig Blutverdünner ein?",
            "Seit wann haben Sie diese Beschwerden?",
            "Hatten Sie schon einmal eine Operation am Herzen oder an den Gelenken?",
            "Gibt es in Ihrer Familie chronische Erkrankungen wie Diabetes?"
        ],
        "practice_dialogue": "Nurse: Guten Tag, Herr Becker. Zur Aufnahme stelle ich Ihnen ein paar Fragen zu Ihrer Vorgeschichte. Haben Sie Allergien?\nPatient: Ja, ich reagiere allergisch auf Penicillin. Da bekomme ich Ausschlag.\nNurse: Vielen Dank, das vermerke ich sofort rot in Ihrer Kurve. Nehmen Sie regelmäßig Medikamente ein?\nPatient: Ja, ASS 100 zur Blutverdünnung und Metformin für meinen Zucker.\nNurse: Wann haben Sie das ASS 100 zuletzt eingenommen?\nPatient: Gestern Abend um 20 Uhr."
    },
    {
        "id": "de-handover",
        "level": "B1",
        "title": "Nursing Handover (SBAR Übergabe)",
        "vocab": [
            {"de": "die Übergabe", "en": "shift handover", "used_in": "Shift change routine"},
            {"de": "der Zustand", "en": "condition / state", "used_in": "Patient acuity reporting"},
            {"de": "stabil / kritisch", "en": "stable / critical", "used_in": "Condition assessment"},
            {"de": "die Wundversorgung", "en": "wound care / dressing", "used_in": "Nursing tasks"},
            {"de": "die Drainage", "en": "surgical drain", "used_in": "Post-op monitoring"},
            {"de": "die Ausscheidung", "en": "urinary output / excretion", "used_in": "Fluid balance"},
            {"de": "die Mobilisation", "en": "mobility / ambulation", "used_in": "Rehab nursing"},
            {"de": "die Anordnung", "en": "physician order / directive", "used_in": "Care plan execution"}
        ],
        "phrases": [
            "In Zimmer 14 liegt Herr Schneider, 68 Jahre, am ersten postoperativen Tag nach Knie-TEP.",
            "Sein Zustand ist stabil, die Vitalwerte sind unauffällig.",
            "Die Redon-Drainage förderte heute 120 Milliliter serosanguinöse Flüssigkeit.",
            "Er benötigt Unterstützung bei der Mobilisation mit dem Gehwagen.",
            "Die ärztliche Anordnung lautet: Thromboseprophylaxe heute Abend um 20 Uhr s.c. verabreichen."
        ],
        "practice_dialogue": "Nurse 1: Kommen wir zu Zimmer 8B: Frau Sommer, 74 Jahre, Aufnahme wegen hypertensiver Entgleisung.\nNurse 2: Wie hat sich der Blutdruck im Spätdienst entwickelt?\nNurse 1: Um 14 Uhr lag er bei 180 zu 105 mmHg. Nach ärztlicher Anordnung erhielt sie 5 mg Amlodipin. Bei der Nachkontrolle um 17 Uhr war er auf 140 zu 85 mmHg gesunken.\nNurse 2: Prima. Wie sieht es mit der Diurese und Schmerzen aus?\nNurse 1: Bilanz positiv um 400 ml, keine kardialen Beschwerden oder Kopfschmerzen. Sie schläft jetzt ruhig."
    },
    {
        "id": "de-emergency",
        "level": "B1",
        "title": "Emergency Communication (Notfallsituationen)",
        "vocab": [
            {"de": "der Notfall", "en": "emergency", "used_in": "Acute event"},
            {"de": "das Reanimationsteam", "en": "code blue / cardiac arrest team", "used_in": "Arrest call"},
            {"de": "die Bewusstlosigkeit", "en": "unconsciousness", "used_in": "Neurological decline"},
            {"de": "die Herz-Lungen-Wiederbelebung (HLW)", "en": "CPR", "used_in": "Resuscitation protocol"},
            {"de": "der Defibrillator", "en": "defibrillator (AED)", "used_in": "Arrhythmia treatment"},
            {"de": "der Notarzt", "en": "emergency physician", "used_in": "Provider escalation"},
            {"de": "die Absaugung", "en": "suctioning", "used_in": "Airway clearance"},
            {"de": "der Venenzugang", "en": "IV venous access", "used_in": "Emergency line"}
        ],
        "phrases": [
            "Notruf Station 3: Patient in Zimmer 12 ist bewusstlos und nicht ansprechbar!",
            "Ich beginne sofort mit der Herzdruckmassage, bitte bringen Sie den Notfallwagen und den Defibrillator!",
            "Verständigen Sie sofort den diensthabenden Notarzt und das Reanimationsteam!",
            "Die Atemwege sind frei, wir beatmen mit dem Ambubeutel mit 100% Sauerstoff.",
            "Ein zweiter großlumiger peripherer Venenzugang wurde in die Vena cubitalis gelegt."
        ],
        "practice_dialogue": "Nurse 1: Markus, schnell! Herr Braun im Zimmer 4 reagiert nicht mehr, er hat keinen tastbaren Karotispuls!\nNurse 2: Ich setze sofort den internen Notruf für das Reanimationsteam ab und hole den Notfallwagen!\nNurse 1: Gut, ich starte sofort mit der Thoraxkompression. 30 zu 2.\nNurse 2: Der Notruf ist raus, Team ist in 2 Minuten hier. Defibrillator ist eingeschaltet, Elektroden sind angebracht.\nNurse 1: Analyse läuft... Kein Schock empfohlen, PEA. Wir fahren mit der Reanimation fort und ziehen 1 mg Adrenalin auf."
    }
]
