"""Nurse Orbit Library — categories + original sample books.

All content is original educational text authored for Nurse Orbit,
suitable for open use inside the app.
"""

CATEGORIES = [
    {"id": "cat-fon", "name": "Fundamentals of Nursing", "icon": "🩺", "color": "#1E3A8A", "cover": "https://images.unsplash.com/photo-1587351021355-a479a299d2f9?w=600"},
    {"id": "cat-msn", "name": "Medical-Surgical Nursing", "icon": "🏥", "color": "#0D9488", "cover": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600"},
    {"id": "cat-ccn", "name": "Critical Care Nursing", "icon": "❤️‍🩹", "color": "#B91C1C", "cover": "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=600"},
    {"id": "cat-emn", "name": "Emergency Nursing", "icon": "🚑", "color": "#EA580C", "cover": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600"},
    {"id": "cat-ped", "name": "Pediatric Nursing", "icon": "🧸", "color": "#F59E0B", "cover": "https://images.unsplash.com/photo-1631815588090-d1bcbe9a8537?w=600"},
    {"id": "cat-mtn", "name": "Maternal & Newborn Nursing", "icon": "🤱", "color": "#EC4899", "cover": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600"},
    {"id": "cat-mhn", "name": "Mental Health Nursing", "icon": "🧠", "color": "#8B5CF6", "cover": "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=600"},
    {"id": "cat-chn", "name": "Community Health Nursing", "icon": "🌍", "color": "#10B981", "cover": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600"},
    {"id": "cat-ger", "name": "Geriatric Nursing", "icon": "👵", "color": "#0369A1", "cover": "https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=600"},
    {"id": "cat-anp", "name": "Anatomy & Physiology", "icon": "🫀", "color": "#DC2626", "cover": "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600"},
    {"id": "cat-pat", "name": "Pathophysiology", "icon": "🧬", "color": "#7C3AED", "cover": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600"},
    {"id": "cat-pha", "name": "Pharmacology", "icon": "💊", "color": "#0891B2", "cover": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600"},
    {"id": "cat-mic", "name": "Microbiology", "icon": "🦠", "color": "#059669", "cover": "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600"},
    {"id": "cat-nut", "name": "Nutrition", "icon": "🥗", "color": "#65A30D", "cover": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600"},
    {"id": "cat-pro", "name": "Nursing Procedures", "icon": "🩹", "color": "#1E3A8A", "cover": "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600"},
    {"id": "cat-ecg", "name": "ECG & Cardiac Nursing", "icon": "📈", "color": "#DC2626", "cover": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600"},
    {"id": "cat-lab", "name": "Laboratory & Diagnostic Tests", "icon": "🧪", "color": "#0369A1", "cover": "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600"},
    {"id": "cat-rad", "name": "Radiology & Imaging Basics", "icon": "🩻", "color": "#475569", "cover": "https://images.unsplash.com/photo-1631815588090-d1bcbe9a8537?w=600"},
    {"id": "cat-ipc", "name": "Infection Prevention & Control", "icon": "🧼", "color": "#0D9488", "cover": "https://images.unsplash.com/photo-1584744646610-dea11ae8ecb0?w=600"},
    {"id": "cat-res", "name": "Nursing Research", "icon": "🔬", "color": "#7C3AED", "cover": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600"},
    {"id": "cat-ldr", "name": "Nursing Leadership & Management", "icon": "🎯", "color": "#0F172A", "cover": "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600"},
    {"id": "cat-edu", "name": "Nursing Education", "icon": "🎓", "color": "#1E3A8A", "cover": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600"},
    {"id": "cat-ncx", "name": "NCLEX & Nursing Exam Preparation", "icon": "✍️", "color": "#0891B2", "cover": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600"},
    {"id": "cat-icu", "name": "Critical Care & ICU Resources", "icon": "🏨", "color": "#B91C1C", "cover": "https://images.unsplash.com/photo-1580281657527-47f249e8f4df?w=600"},
    {"id": "cat-tra", "name": "Emergency & Trauma Resources", "icon": "🩸", "color": "#EA580C", "cover": "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=600"},
    {"id": "cat-oth", "name": "Other Nursing Resources", "icon": "📚", "color": "#64748B", "cover": "https://images.unsplash.com/photo-1509909756405-be0199881695?w=600"},
]


def _mk_book(bid, cat, title, author, edition, isbn, year, desc, cover, chapters, tags):
    return {
        "id": bid, "category_id": cat, "title": title, "author": author,
        "edition": edition, "isbn": isbn, "publication_year": year,
        "description": desc, "cover_image": cover,
        "language": "English", "license": "Nurse Orbit Original Content · Open for in-app educational use",
        "tags": tags, "chapters": chapters,
        "page_count": sum(len(c["content"]) // 1800 + 1 for c in chapters),
        "chapter_count": len(chapters),
    }


# Sample chapters — realistic nursing educational text. Each chapter is a page in the reader.
FON_CH = [
    {"number": 1, "title": "History and Scope of Nursing Practice", "content": (
        "Nursing is a health profession dedicated to the promotion of health, prevention of illness, "
        "restoration of health, and alleviation of suffering. Its scope stretches from the earliest days of "
        "organised care by religious orders and community caregivers to the present global profession shaped "
        "by evidence-based practice.\n\n"
        "Florence Nightingale established the foundation of modern nursing during the Crimean War (1854–1856) "
        "by demonstrating that sanitation, ventilation, and disciplined observation reduced mortality dramatically. "
        "Her seminal work, 'Notes on Nursing' (1859), remains the philosophical origin of contemporary practice.\n\n"
        "The four defining features of a profession — a specialised body of knowledge, a service orientation, "
        "professional autonomy, and a code of ethics — are all clearly demonstrated by modern nursing. Registered "
        "Nurses (RNs) practise under legal frameworks that vary by country, but common threads include licensure, "
        "scope-of-practice statutes, and mandatory continuing education.\n\n"
        "Contemporary practice roles include staff nurse, charge nurse, clinical educator, nurse practitioner, "
        "clinical nurse specialist, nurse anaesthetist, and nurse researcher. Advanced-practice pathways require "
        "post-graduate education and, in many jurisdictions, a separate certification exam."
    )},
    {"number": 2, "title": "The Nursing Process", "content": (
        "The nursing process is a systematic problem-solving framework consisting of five phases: Assessment, "
        "Diagnosis, Planning, Implementation, and Evaluation (ADPIE).\n\n"
        "**Assessment** collects subjective and objective data through interview, physical examination, chart review, "
        "and communication with the interdisciplinary team. Both cue-based and comprehensive assessments are used.\n\n"
        "**Diagnosis** uses standardised nursing diagnostic language (NANDA-I) to describe actual or potential "
        "health problems the nurse is licensed and competent to treat. Diagnoses are prioritised using frameworks "
        "such as Maslow's hierarchy or the ABC (Airway, Breathing, Circulation) approach.\n\n"
        "**Planning** sets SMART goals (Specific, Measurable, Achievable, Realistic, Time-bound) and selects "
        "evidence-based interventions.\n\n"
        "**Implementation** delivers care, documents actions, and communicates handover.\n\n"
        "**Evaluation** compares outcomes to expected goals and revises the plan iteratively.\n\n"
        "The nursing process is cyclical and dynamic; nurses continuously re-assess as the patient's condition changes."
    )},
    {"number": 3, "title": "Vital Signs and Health Assessment", "content": (
        "Vital signs — temperature, pulse, respirations, blood pressure, oxygen saturation, and pain — provide "
        "objective, quantitative data about a patient's physiological status.\n\n"
        "Normal adult ranges: temperature 36.5–37.5 °C (97.7–99.5 °F), pulse 60–100 bpm, respirations 12–20 breaths "
        "per minute, systolic BP 100–130 mm Hg, diastolic 60–85 mm Hg, SpO2 ≥ 95 %.\n\n"
        "Head-to-toe assessment follows the sequence Inspection → Palpation → Percussion → Auscultation, except for "
        "the abdomen where auscultation precedes palpation to preserve bowel-sound integrity.\n\n"
        "Neurological screening includes level of consciousness (Glasgow Coma Scale), pupillary response, and motor "
        "function. Pain is assessed using validated tools such as the Numeric Rating Scale (0–10) or the Wong–Baker "
        "FACES scale for children."
    )},
    {"number": 4, "title": "Documentation and Communication", "content": (
        "Accurate, timely documentation is a legal, professional, and clinical necessity. The mantra is: 'If it is "
        "not documented, it was not done.'\n\n"
        "Formats include narrative charting, SOAP (Subjective, Objective, Assessment, Plan), SOAPIE, PIE, focus "
        "charting, and charting by exception. Electronic Health Records (EHRs) are now the dominant medium.\n\n"
        "Handover communication uses structured tools such as SBAR — Situation, Background, Assessment, "
        "Recommendation — to reduce the risk of information loss between shifts and providers.\n\n"
        "Confidentiality of health information is protected by HIPAA (USA), GDPR (EU), and equivalent laws "
        "world-wide. Access to records must be documented and limited to the care team."
    )},
    {"number": 5, "title": "Safety, Ethics and Professional Practice", "content": (
        "Patient safety is the paramount concern of every nurse. The Six Rights of medication administration — "
        "right patient, right drug, right dose, right route, right time, right documentation — are the minimum "
        "safety standard.\n\n"
        "Ethical practice is anchored on autonomy, beneficence, non-maleficence, justice, and fidelity. Ethical "
        "dilemmas are discussed with the team and, when needed, referred to the institutional ethics committee.\n\n"
        "Cultural competence recognises the influence of language, spirituality, and traditions on health choices. "
        "Nurses respect patient preferences within the limits of safe practice.\n\n"
        "Professional development is a lifelong obligation, achieved through continuing education, certification, "
        "reflective practice, and participation in professional associations."
    )},
]

PHARMA_CH = [
    {"number": 1, "title": "Principles of Pharmacology", "content": (
        "Pharmacology is the science of how drugs interact with living systems. Two central branches govern the "
        "field: pharmacokinetics — what the body does to the drug — and pharmacodynamics — what the drug does to "
        "the body.\n\n"
        "**Pharmacokinetics** comprises Absorption, Distribution, Metabolism and Excretion (ADME). Bioavailability "
        "quantifies the fraction of an administered dose that reaches systemic circulation unchanged. First-pass "
        "metabolism in the liver reduces oral bioavailability for many drugs.\n\n"
        "**Pharmacodynamics** describes drug–receptor interactions. Agonists activate receptors; antagonists block "
        "them. Efficacy is the maximum response a drug can produce; potency is the dose required to produce a given "
        "effect.\n\n"
        "The **therapeutic index** is the ratio between the toxic dose and the effective dose. Drugs with narrow "
        "therapeutic indices (e.g., digoxin, lithium, warfarin) require blood-level monitoring."
    )},
    {"number": 2, "title": "Cardiovascular Drugs", "content": (
        "**ACE inhibitors** (-pril suffix: enalapril, lisinopril, ramipril) reduce the conversion of angiotensin I "
        "to angiotensin II, lowering vasoconstriction and aldosterone secretion. Common adverse effects include "
        "hyperkalaemia and a persistent dry cough due to bradykinin accumulation.\n\n"
        "**ARBs** (-sartan: losartan, valsartan) block the angiotensin II receptor directly and avoid the cough.\n\n"
        "**Beta-blockers** (-olol: metoprolol, carvedilol, propranolol) reduce heart rate and myocardial contractility. "
        "They should not be stopped abruptly because of the risk of rebound tachycardia, hypertension or ischaemia.\n\n"
        "**Calcium-channel blockers** are divided into dihydropyridines (amlodipine, nifedipine — mostly vascular) "
        "and non-dihydropyridines (diltiazem, verapamil — cardiac).\n\n"
        "**Diuretics** are grouped as thiazides, loop, potassium-sparing, and osmotic. Monitor electrolytes, "
        "particularly potassium and sodium.\n\n"
        "**Antiplatelets and anticoagulants** prevent clot formation. Heparin (monitored by aPTT) and warfarin "
        "(monitored by INR) are the classical agents; direct oral anticoagulants (DOACs) such as apixaban and "
        "rivaroxaban require no routine monitoring but need renal-function adjustment."
    )},
    {"number": 3, "title": "Antimicrobial Therapy", "content": (
        "Antimicrobials are classified by target: antibacterials, antivirals, antifungals, and antiparasitics.\n\n"
        "**Penicillins** and **cephalosporins** are β-lactams that disrupt cell-wall synthesis. Screen for allergy "
        "and cross-reactivity.\n\n"
        "**Aminoglycosides** (gentamicin, amikacin) are potent Gram-negative agents that carry ototoxicity and "
        "nephrotoxicity risks; monitor trough and peak levels.\n\n"
        "**Fluoroquinolones** (ciprofloxacin, levofloxacin) require caution because of tendinitis risk and QT "
        "prolongation.\n\n"
        "Antimicrobial stewardship — using the narrowest effective spectrum for the shortest necessary time — is a "
        "core nursing responsibility to combat resistance."
    )},
    {"number": 4, "title": "Analgesics and Sedation", "content": (
        "**Non-opioid analgesics**: paracetamol, NSAIDs (ibuprofen, ketorolac, naproxen). Watch for hepatotoxicity "
        "with paracetamol overdose and GI bleeding with NSAIDs.\n\n"
        "**Opioids**: morphine, fentanyl, oxycodone, hydromorphone. Monitor respiratory rate, sedation score, and "
        "have naloxone available for reversal.\n\n"
        "**Sedatives and anxiolytics**: benzodiazepines (lorazepam, midazolam) — flumazenil is the reversal agent.\n\n"
        "Balanced analgesia (multimodal therapy) reduces total opioid consumption and adverse effects."
    )},
]

MSN_CH = [
    {"number": 1, "title": "Cardiovascular Nursing Care", "content": (
        "Cardiovascular assessment begins with a focused history: chest pain characteristics, dyspnoea, palpitations, "
        "syncope, and functional class (NYHA I–IV). Cardiac risk factors include age, hypertension, dyslipidaemia, "
        "diabetes, smoking, obesity, and family history.\n\n"
        "**Coronary artery disease (CAD)** presents as stable angina, unstable angina, or myocardial infarction. Time "
        "is muscle — door-to-balloon times under 90 minutes are the standard for ST-elevation MI (STEMI).\n\n"
        "**Heart failure** may be preserved (HFpEF) or reduced ejection fraction (HFrEF). Nursing priorities include "
        "daily weight monitoring, strict intake/output, low-sodium diet counselling, and titration of guideline-directed "
        "medical therapy in collaboration with the medical team.\n\n"
        "**Arrhythmias** — the nurse must recognise sinus, atrial, junctional and ventricular rhythms and their "
        "clinical significance. Ventricular fibrillation and pulseless ventricular tachycardia are the two shockable "
        "cardiac-arrest rhythms per ACLS guidelines."
    )},
    {"number": 2, "title": "Respiratory Nursing Care", "content": (
        "The respiratory assessment includes inspection of thoracic shape, symmetry, use of accessory muscles, and "
        "measurement of oxygen saturation. Auscultate for normal (vesicular, bronchovesicular, bronchial) and adventitious "
        "sounds (crackles, wheezes, rhonchi, stridor).\n\n"
        "**COPD** is characterised by chronic bronchitis and emphysema. Nursing care emphasises pursed-lip breathing, "
        "controlled oxygen delivery (target SpO2 88–92 %), smoking cessation, and pneumonia prevention.\n\n"
        "**Asthma** management follows the stepwise GINA approach. Teach inhaler technique with a spacer and encourage a "
        "written asthma action plan.\n\n"
        "**Pneumonia** treatment involves antimicrobials, hydration, positioning, and airway clearance. Ventilator-"
        "associated pneumonia prevention bundles include head-of-bed elevation 30–45°, daily sedation vacation and oral "
        "care with chlorhexidine."
    )},
    {"number": 3, "title": "Gastrointestinal Nursing Care", "content": (
        "Common GI presentations include abdominal pain, nausea, vomiting, diarrhoea, constipation, and GI bleeding.\n\n"
        "For **peptic ulcer disease** treatment focuses on H. pylori eradication (triple therapy: PPI + amoxicillin + "
        "clarithromycin), proton-pump inhibition, and lifestyle modification.\n\n"
        "**Liver cirrhosis** care includes monitoring for portal hypertension complications: variceal bleeding, ascites, "
        "hepatic encephalopathy, and hepatorenal syndrome.\n\n"
        "**Inflammatory bowel disease** (Crohn's and ulcerative colitis) requires nutrition support, steroid or biologic "
        "therapy, and psychological support during flares."
    )},
]

CRIT_CH = [
    {"number": 1, "title": "ICU Admission and Prioritisation", "content": (
        "The intensive care unit provides continuous monitoring and life-support to patients with actual or potential "
        "life-threatening conditions. Admission criteria differ by unit type (medical, surgical, cardiac, neurological, "
        "trauma) but share the need for invasive monitoring or mechanical support.\n\n"
        "Initial priorities follow the ABCDE approach: Airway patency, Breathing adequacy, Circulation, Disability "
        "(neurological status), and Exposure/Environmental control.\n\n"
        "The Sequential Organ Failure Assessment (SOFA) score quantifies organ dysfunction across six systems and helps "
        "predict mortality risk."
    )},
    {"number": 2, "title": "Mechanical Ventilation", "content": (
        "Mechanical ventilation supports patients unable to maintain adequate gas exchange. Common modes include volume "
        "control (VC), pressure control (PC), pressure support (PS), and SIMV.\n\n"
        "**Key parameters**: tidal volume 6–8 mL/kg predicted body weight, PEEP typically 5 cm H2O baseline, FiO2 titrated "
        "for target SpO2, respiratory rate 12–20 /min.\n\n"
        "Nursing priorities include endotracheal-tube care, cuff-pressure monitoring, suctioning as clinically indicated, "
        "sedation scoring (RASS), delirium screening (CAM-ICU) and ventilator-associated event prevention.\n\n"
        "Daily spontaneous awakening trials (SAT) and spontaneous breathing trials (SBT) shorten ventilation duration and "
        "ICU length of stay."
    )},
    {"number": 3, "title": "Haemodynamic Monitoring", "content": (
        "Invasive haemodynamic monitoring provides continuous data on cardiovascular status. Common devices include "
        "arterial lines, central venous catheters, pulmonary-artery catheters, and non-invasive cardiac-output monitors.\n\n"
        "Normal values (adults): CVP 2–8 mm Hg, MAP > 65 mm Hg, cardiac index 2.5–4.0 L/min/m2, PCWP 6–12 mm Hg, "
        "SvO2 60–80 %.\n\n"
        "The nurse must zero the transducer at the phlebostatic axis, verify the arterial waveform, and correlate numerical "
        "values with the patient's clinical picture. Trends matter more than isolated values."
    )},
    {"number": 4, "title": "Sepsis Recognition and Bundled Care", "content": (
        "Sepsis is life-threatening organ dysfunction caused by a dysregulated host response to infection. Septic shock "
        "adds persistent hypotension requiring vasopressors to maintain MAP ≥ 65 mm Hg and a serum lactate > 2 mmol/L "
        "despite adequate volume resuscitation.\n\n"
        "The Hour-1 sepsis bundle: measure lactate, obtain blood cultures before antibiotics, administer broad-spectrum "
        "antibiotics, begin 30 mL/kg crystalloid for hypotension or lactate ≥ 4 mmol/L, and start vasopressors if "
        "hypotension persists.\n\n"
        "Nursing priorities: source control, continuous haemodynamic monitoring, hourly urine output, glucose control, "
        "and thromboembolism prophylaxis."
    )},
]

EMG_CH = [
    {"number": 1, "title": "Triage Principles", "content": (
        "Triage sorts arriving patients by severity so the sickest are treated first. Common systems include Emergency "
        "Severity Index (ESI, five levels), the Manchester Triage System, and the Australasian Triage Scale.\n\n"
        "**ESI levels**: 1 immediate — resuscitation; 2 emergent — high-risk; 3 urgent — multiple resources; 4 less-urgent "
        "— one resource; 5 non-urgent — no resources.\n\n"
        "Re-triage is essential — patients can deteriorate in the waiting area. Vital signs, mental status, and pain must "
        "be re-checked at intervals defined by local protocol."
    )},
    {"number": 2, "title": "Trauma Primary and Secondary Survey", "content": (
        "The primary survey follows the ABCDE approach and identifies immediately life-threatening injuries. Any deficit "
        "is corrected before moving to the next letter.\n\n"
        "**A – Airway** with cervical-spine protection. **B – Breathing** and ventilation (tension pneumothorax, flail "
        "chest, open pneumothorax must be excluded). **C – Circulation** with haemorrhage control. **D – Disability** using "
        "the GCS. **E – Exposure** while preventing hypothermia.\n\n"
        "The secondary survey is a head-to-toe examination with focused history (AMPLE: Allergies, Medications, Past "
        "history, Last meal, Events)."
    )},
    {"number": 3, "title": "Cardiac Arrest and Basic Life Support", "content": (
        "For every cardiac arrest: recognise, call for help, start compressions, attach a defibrillator/AED, ventilate.\n\n"
        "High-quality CPR delivers a rate of 100–120 compressions/min, depth 5–6 cm, complete recoil, minimal interruptions, "
        "and one breath every 6 seconds when an advanced airway is in place.\n\n"
        "Shockable rhythms — VF and pulseless VT — receive prompt defibrillation. Non-shockable rhythms — asystole and PEA — "
        "receive CPR and epinephrine every 3–5 minutes while reversible causes (5 H's and 5 T's) are treated."
    )},
]

ANP_CH = [
    {"number": 1, "title": "Cardiovascular System", "content": (
        "The heart is a four-chambered muscular pump that circulates approximately 5 L of blood per minute at rest. The "
        "right side receives deoxygenated blood from the systemic circulation and pumps it to the lungs; the left side "
        "receives oxygenated blood from the lungs and delivers it to the body.\n\n"
        "The cardiac cycle comprises systole (contraction) and diastole (relaxation). Electrical conduction proceeds from "
        "the sinoatrial node → atrioventricular node → bundle of His → right and left bundle branches → Purkinje fibres.\n\n"
        "Cardiac output = stroke volume × heart rate. Stroke volume is influenced by preload, afterload, and contractility."
    )},
    {"number": 2, "title": "Respiratory System", "content": (
        "The respiratory system provides gas exchange between the atmosphere and the blood. Upper airways condition the "
        "inspired air; lower airways deliver it to the alveoli where diffusion occurs.\n\n"
        "Alveolar–capillary gas exchange is driven by partial-pressure gradients: O2 moves from alveolus (~ 100 mm Hg) to "
        "blood (~ 40 mm Hg), while CO2 moves in the opposite direction.\n\n"
        "Control of breathing is governed by chemoreceptors sensitive to arterial pCO2 and pH, with peripheral chemoreceptors "
        "responding to hypoxaemia."
    )},
    {"number": 3, "title": "Renal System", "content": (
        "Each kidney contains approximately one million nephrons, the functional unit responsible for filtration, "
        "reabsorption, secretion, and excretion. Normal glomerular filtration rate (GFR) is 90–120 mL/min/1.73 m2.\n\n"
        "The kidneys regulate fluid volume, electrolyte balance, acid–base status, blood pressure (via renin), and "
        "erythropoiesis (via erythropoietin)."
    )},
]

ECG_CH = [
    {"number": 1, "title": "ECG Basics and Lead Placement", "content": (
        "The 12-lead electrocardiogram records the electrical activity of the heart from twelve different vantage points. "
        "Six limb leads (I, II, III, aVR, aVL, aVF) view the heart in the frontal plane and six precordial leads (V1–V6) "
        "in the horizontal plane.\n\n"
        "Standard paper speed is 25 mm/sec: one small square = 0.04 sec, one large square = 0.20 sec. Amplitude: one small "
        "square = 0.1 mV.\n\n"
        "Correct lead placement is critical. RA — right arm, LA — left arm, RL — right leg (ground), LL — left leg. V1 — 4th "
        "intercostal space right sternal border; V2 — 4th ICS left sternal border; V3 — between V2 and V4; V4 — 5th ICS "
        "mid-clavicular line; V5 — anterior axillary line same level as V4; V6 — mid-axillary line same level as V4."
    )},
    {"number": 2, "title": "Rhythm Interpretation Method", "content": (
        "A systematic five-step approach avoids missed diagnoses:\n\n"
        "1. **Rate** — count QRS complexes in a 6-second strip and multiply by 10, or use 300/large-squares-between-R-waves.\n"
        "2. **Rhythm** — regular or irregular? Regularly irregular or irregularly irregular?\n"
        "3. **P waves** — present, upright in II, one before each QRS?\n"
        "4. **PR interval** — 0.12–0.20 sec (3–5 small squares)?\n"
        "5. **QRS width** — < 0.12 sec is narrow (supraventricular origin); ≥ 0.12 sec is wide (ventricular or aberrant "
        "conduction).\n\n"
        "Normal sinus rhythm: rate 60–100, regular, P before every QRS, PR 0.12–0.20 sec, QRS < 0.12 sec."
    )},
    {"number": 3, "title": "Life-Threatening Arrhythmias", "content": (
        "**Ventricular fibrillation (VF)** — chaotic, irregular, no discernible QRS. Treatment: unsynchronised defibrillation "
        "+ high-quality CPR + epinephrine.\n\n"
        "**Ventricular tachycardia (VT)** — wide QRS, rate 100–250. If pulseless: defibrillate. If stable: consider amiodarone. "
        "If unstable with pulse: synchronised cardioversion.\n\n"
        "**Complete (third-degree) AV block** — atria and ventricles beat independently. Definitive treatment: pacing.\n\n"
        "**Torsades de pointes** — polymorphic VT associated with prolonged QT. Treatment: IV magnesium sulphate, correction "
        "of electrolytes, avoidance of QT-prolonging drugs."
    )},
]

PED_CH = [
    {"number": 1, "title": "Growth and Development", "content": (
        "Paediatric assessment must incorporate age-appropriate developmental milestones. Erik Erikson's psychosocial stages, "
        "Jean Piaget's cognitive stages and Freud's psychosexual stages provide complementary frameworks.\n\n"
        "**Normal vital-sign ranges vary with age.** Infant (0–1 y): HR 100–160, RR 30–60. Toddler (1–3 y): HR 90–140, RR 24–40. "
        "Pre-schooler (3–5 y): HR 80–120, RR 22–34. School age (6–12 y): HR 70–110, RR 18–30. Adolescent: adult ranges.\n\n"
        "Weight-based dosing is standard practice; nurses double-check calculations independently."
    )},
    {"number": 2, "title": "Immunisation Schedules", "content": (
        "National immunisation schedules protect children from vaccine-preventable diseases. Common vaccines include BCG, "
        "hepatitis B, DTaP, polio, Hib, pneumococcal, rotavirus, MMR, varicella, hepatitis A, and HPV.\n\n"
        "Nurses must screen for contraindications (severe immunosuppression, previous anaphylaxis), obtain informed consent, "
        "administer accurately, and document the site, batch and expiry."
    )},
    {"number": 3, "title": "Common Paediatric Emergencies", "content": (
        "**Bronchiolitis** — RSV is the most common cause in infants. Treatment is supportive: oxygen, nasal suction, "
        "hydration.\n\n"
        "**Croup (laryngotracheobronchitis)** — barking cough, stridor. Treat with dexamethasone; nebulised epinephrine for "
        "moderate–severe cases.\n\n"
        "**Febrile seizure** — usually generalised, brief, in a child 6 months–5 years with fever. Parental reassurance and "
        "fever control are the mainstays."
    )},
]

MHN_CH = [
    {"number": 1, "title": "Therapeutic Communication", "content": (
        "Therapeutic communication is a purposeful, patient-centred exchange aimed at understanding and support. Techniques "
        "include active listening, open-ended questions, reflection, silence, and empathy.\n\n"
        "Non-therapeutic patterns — false reassurance, giving advice, defensiveness, minimisation — undermine trust and "
        "should be replaced with exploratory statements ('Tell me more about that...')."
    )},
    {"number": 2, "title": "Mood and Anxiety Disorders", "content": (
        "**Major depressive disorder** presents with persistent low mood, anhedonia, sleep and appetite disturbance, guilt "
        "and suicidal ideation. Screen every patient with the PHQ-9. Ensure a suicide-risk assessment is completed and "
        "a safety plan documented for at-risk patients.\n\n"
        "**Generalised anxiety disorder** produces persistent worry with restlessness, fatigue, muscle tension. SSRI/SNRI "
        "combined with cognitive behavioural therapy is first-line."
    )},
    {"number": 3, "title": "Crisis Intervention", "content": (
        "Crisis intervention aims to stabilise the individual, ensure safety, and connect them to ongoing care. Elements "
        "include establishing rapport, assessing lethality, exploring alternatives, formalising a plan, and follow-up.\n\n"
        "For acute agitation, verbal de-escalation is always attempted first. Restraint is a last resort and must comply with "
        "local law and institutional policy."
    )},
]

NCLEX_CH = [
    {"number": 1, "title": "Test Plan Overview", "content": (
        "The NCLEX-RN is a computerised adaptive test (CAT) administered by the NCSBN. The test plan is organised into four "
        "Client Needs categories: Safe and Effective Care Environment, Health Promotion and Maintenance, Psychosocial "
        "Integrity, and Physiological Integrity.\n\n"
        "Length varies from 75 to 145 items; the exam ends when the algorithm is confident about pass/fail. Question "
        "formats include multiple-choice, multiple-response, fill-in-the-blank, hot spot, drag-and-drop, and Next Generation "
        "NCLEX case studies with clinical judgement measurement model items."
    )},
    {"number": 2, "title": "Study Strategies", "content": (
        "Effective preparation combines content review, active recall, and high-volume practice questions with rigorous review "
        "of rationales. Target 2,500–3,000 practice questions over the study period.\n\n"
        "Use the ABC framework for prioritisation questions; recognise that safety and infection control are frequently correct "
        "answers when in doubt. Read each stem carefully and identify what the question is actually asking (e.g., 'first', "
        "'best', 'except')."
    )},
    {"number": 3, "title": "Sample Practice Set", "content": (
        "1. The nurse is caring for a patient receiving IV heparin. Which laboratory value is monitored?\n"
        "   Answer: aPTT (target 1.5–2.5× control).\n\n"
        "2. A patient reports chest pain 8/10. Which action is FIRST?\n"
        "   Answer: Assess the patient (vital signs, ECG) before administering nitroglycerin.\n\n"
        "3. The nurse recognises which rhythm as shockable during a cardiac arrest?\n"
        "   Answer: Ventricular fibrillation.\n\n"
        "Always review the rationale even when the answer is correct — it consolidates learning."
    )},
]

IPC_CH = [
    {"number": 1, "title": "Standard Precautions", "content": (
        "Standard precautions are applied to every patient regardless of diagnosis. Core components: hand hygiene before "
        "and after every patient contact, use of personal protective equipment when contact with blood or body fluids is "
        "anticipated, safe injection practices, respiratory hygiene/cough etiquette, and safe handling of contaminated "
        "equipment and linen.\n\n"
        "Hand hygiene is the single most effective infection-prevention intervention. Use alcohol-based hand rub unless "
        "hands are visibly soiled, in which case soap and water are required."
    )},
    {"number": 2, "title": "Transmission-Based Precautions", "content": (
        "In addition to standard precautions, three categories address specific transmission routes:\n\n"
        "**Contact** (MRSA, VRE, C. difficile) — gloves and gown; dedicated equipment; C. difficile requires soap-and-water "
        "hand washing.\n\n"
        "**Droplet** (influenza, pertussis, meningococcal meningitis) — surgical mask within 1 m of the patient; single room.\n\n"
        "**Airborne** (tuberculosis, measles, varicella) — N95 respirator (fit-tested); negative-pressure isolation room."
    )},
    {"number": 3, "title": "CAUTI, CLABSI, SSI Bundles", "content": (
        "Central-line-associated bloodstream infection (CLABSI) prevention uses full-barrier precautions on insertion, "
        "chlorhexidine skin preparation, avoidance of femoral sites in adults, and daily necessity assessment.\n\n"
        "Catheter-associated urinary tract infection (CAUTI) prevention: insert only when indicated, aseptic technique, "
        "closed drainage system, remove as early as possible.\n\n"
        "Surgical site infection (SSI) bundles: appropriate antimicrobial prophylaxis, glucose control, normothermia, "
        "clipper (not razor) hair removal."
    )},
]

BOOKS = [
    # Fundamentals
    _mk_book("bk-fon-01", "cat-fon", "Foundations of Modern Nursing Practice", "Dr. Ayesha Rahman, RN, PhD",
             "3rd Edition", "978-1-0000-0001-2", 2025,
             "A concise, exam-oriented handbook covering the philosophy, scope, and daily practice of the modern nurse.",
             "https://images.unsplash.com/photo-1587351021355-a479a299d2f9?w=600", FON_CH,
             ["fundamentals", "nursing process", "vital signs", "documentation", "ethics"]),
    _mk_book("bk-fon-02", "cat-fon", "Nursing Skills Companion", "Emily Carter, MSN, RN",
             "2nd Edition", "978-1-0000-0002-9", 2024,
             "Step-by-step reference for bedside skills — from bed making to central-line care — with rationale.",
             "https://images.unsplash.com/photo-1584744646610-dea11ae8ecb0?w=600", FON_CH[:3],
             ["skills", "procedures", "bedside care"]),
    # Med-Surg
    _mk_book("bk-msn-01", "cat-msn", "Adult Medical-Surgical Nursing", "Priya Menon, MSN, RN-BC",
             "4th Edition", "978-1-0000-0010-4", 2025,
             "Comprehensive review of body-system disorders, pathophysiology and evidence-based nursing management.",
             "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600", MSN_CH,
             ["med-surg", "cardiovascular", "respiratory", "gastrointestinal"]),
    # Critical Care
    _mk_book("bk-ccn-01", "cat-ccn", "Critical Care Nursing Essentials", "Dr. Marcus Weber, RN, PhD",
             "2nd Edition", "978-1-0000-0020-3", 2025,
             "The nurse's quick reference for ICU care — from admission priorities to advanced haemodynamics.",
             "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=600", CRIT_CH,
             ["critical care", "icu", "sepsis", "ventilator", "haemodynamics"]),
    # Emergency
    _mk_book("bk-emn-01", "cat-emn", "Emergency Nursing Handbook", "Sarah Nguyen, RN, CEN",
             "3rd Edition", "978-1-0000-0030-2", 2025,
             "Triage, primary survey, trauma, cardiac arrest, and everyday emergency-department priorities.",
             "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600", EMG_CH,
             ["emergency", "triage", "trauma", "acls", "cpr"]),
    # Paediatric
    _mk_book("bk-ped-01", "cat-ped", "Paediatric Nursing: Growth to Adolescence", "Dr. Anita Kumar, RN, DNP",
             "2nd Edition", "978-1-0000-0040-1", 2024,
             "Age-specific assessment, immunisation schedules, and common paediatric emergencies.",
             "https://images.unsplash.com/photo-1631815588090-d1bcbe9a8537?w=600", PED_CH,
             ["paediatric", "growth", "immunisation", "bronchiolitis", "croup"]),
    # Mental Health
    _mk_book("bk-mhn-01", "cat-mhn", "Mental Health Nursing in Practice", "Ravi Sharma, RN, MSN",
             "1st Edition", "978-1-0000-0050-0", 2025,
             "Therapeutic communication, mood and anxiety disorders, and crisis intervention.",
             "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=600", MHN_CH,
             ["mental health", "communication", "depression", "anxiety", "crisis"]),
    # Pharmacology
    _mk_book("bk-pha-01", "cat-pha", "Pharmacology for Nurses", "Dr. Elena Souza, PharmD, RN",
             "5th Edition", "978-1-0000-0060-9", 2025,
             "Drug classes, mechanisms and nursing implications — the pocket pharmacology every nurse needs.",
             "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600", PHARMA_CH,
             ["pharmacology", "drugs", "cardiovascular drugs", "antibiotics", "analgesia"]),
    # Anatomy
    _mk_book("bk-anp-01", "cat-anp", "Human Anatomy & Physiology for Nurses", "Ivan Petrov, MSc, RN",
             "3rd Edition", "978-1-0000-0070-8", 2024,
             "System-by-system review of structure and function tailored for nursing practice.",
             "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600", ANP_CH,
             ["anatomy", "physiology", "cardiovascular", "respiratory", "renal"]),
    # ECG
    _mk_book("bk-ecg-01", "cat-ecg", "ECG Interpretation Made Simple", "Dr. Karim Al-Farsi, MD, RN",
             "2nd Edition", "978-1-0000-0080-7", 2025,
             "A step-by-step approach to reading twelve-lead ECGs and recognising life-threatening arrhythmias.",
             "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600", ECG_CH,
             ["ecg", "arrhythmia", "cardiac", "vf", "vt"]),
    # NCLEX
    _mk_book("bk-ncx-01", "cat-ncx", "NCLEX-RN Rapid Review", "Michelle O'Connor, RN, MSN",
             "6th Edition", "978-1-0000-0090-6", 2025,
             "Content review, exam-taking strategies, and 200+ high-yield practice questions with rationale.",
             "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600", NCLEX_CH,
             ["nclex", "exam", "practice questions", "test strategy"]),
    # IPC
    _mk_book("bk-ipc-01", "cat-ipc", "Infection Prevention and Control", "Dr. Fatimah Yusuf, RN, MPH",
             "2nd Edition", "978-1-0000-0100-2", 2025,
             "Standard and transmission-based precautions, device-related infection bundles, and outbreak management.",
             "https://images.unsplash.com/photo-1584744646610-dea11ae8ecb0?w=600", IPC_CH,
             ["infection control", "ppe", "hand hygiene", "clabsi", "cauti"]),
    # Community Health
    _mk_book("bk-chn-01", "cat-chn", "Community Health Nursing Practice", "Dr. Adaeze Nwosu, RN, DrPH",
             "1st Edition", "978-1-0000-0110-1", 2024,
             "Primary healthcare, health promotion, epidemiology essentials, and home-visit skills.",
             "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600", FON_CH[:2],
             ["community health", "primary care", "epidemiology"]),
    # Maternal
    _mk_book("bk-mtn-01", "cat-mtn", "Maternal & Newborn Nursing Care", "Dr. Grace Owusu, RN, PhD",
             "3rd Edition", "978-1-0000-0120-0", 2025,
             "Antenatal, intrapartum, postpartum and newborn care, plus common maternal complications.",
             "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600", PED_CH[:2],
             ["maternal", "newborn", "antenatal", "labour", "postpartum"]),
    # Geriatric
    _mk_book("bk-ger-01", "cat-ger", "Geriatric Nursing Handbook", "Dr. Rosa Alvarez, RN, PhD",
             "1st Edition", "978-1-0000-0130-9", 2024,
             "Age-related changes, geriatric syndromes, polypharmacy, and end-of-life care.",
             "https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=600", FON_CH[:2],
             ["geriatric", "elderly", "polypharmacy", "falls"]),
    # Nutrition
    _mk_book("bk-nut-01", "cat-nut", "Clinical Nutrition for Nurses", "Dr. Hana Kim, RD, RN",
             "2nd Edition", "978-1-0000-0140-8", 2025,
             "Nutritional assessment, therapeutic diets, and enteral/parenteral nutrition support.",
             "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600", FON_CH[:2],
             ["nutrition", "diet", "enteral", "parenteral"]),
    # Procedures
    _mk_book("bk-pro-01", "cat-pro", "Nursing Procedures Atlas", "Louise Bernard, RN, MSN",
             "3rd Edition", "978-1-0000-0150-7", 2025,
             "Step-by-step procedures with illustrations, safety checks, and post-procedure care.",
             "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600", FON_CH[:3],
             ["procedures", "skills", "catheter", "iv access"]),
]


def _kw_index(book):
    text = " ".join([book["title"], book["author"], book["description"], " ".join(book.get("tags", []))])
    for ch in book["chapters"]:
        text += " " + ch["title"] + " " + ch["content"]
    return text.lower()


def build_search_index(books):
    return [{"id": b["id"], "text": _kw_index(b), "title": b["title"], "author": b["author"]} for b in books]
