"""Nurse Orbit — Clinical content: drugs, ECG cases, clinical skills, simulator cases, emergency."""

DRUGS = [
    {"id": "drg-metoprolol", "name": "Metoprolol", "class": "Beta-blocker (β1-selective)",
     "indications": ["Hypertension", "Angina", "Heart failure (HFrEF)", "Post-MI", "Rate control in AF"],
     "moa": "Selective β1-adrenergic receptor antagonism reduces heart rate, contractility and myocardial oxygen demand.",
     "common_effects": ["Fatigue", "Bradycardia", "Dizziness", "Cold extremities"],
     "serious_effects": ["Severe bradycardia", "Heart block", "Hypotension", "Bronchospasm at high doses"],
     "contraindications": ["Second/third-degree AV block", "Severe bradycardia", "Cardiogenic shock", "Decompensated HF"],
     "nursing": ["Assess apical pulse before dose (hold if HR < 60)", "Monitor BP", "Do not stop abruptly — taper", "Educate on orthostatic precautions"],
     "monitoring": ["HR, BP, ECG", "Signs of heart failure", "Blood glucose in diabetics (masks hypoglycaemia)"],
     "education": ["Rise slowly to prevent dizziness", "Take at the same time daily", "Report weight gain > 1 kg/day"]},
    {"id": "drg-furosemide", "name": "Furosemide", "class": "Loop diuretic",
     "indications": ["Pulmonary oedema", "Heart failure", "Hypertension", "Oedema"],
     "moa": "Inhibits Na-K-2Cl transporter in the thick ascending limb of Henle, producing potent diuresis.",
     "common_effects": ["Hypokalaemia", "Hypomagnesaemia", "Dehydration", "Orthostatic hypotension"],
     "serious_effects": ["Ototoxicity (rapid IV push)", "Severe electrolyte disturbance", "Acute kidney injury"],
     "contraindications": ["Anuria", "Severe hypovolaemia", "Sulfa allergy (caution)"],
     "nursing": ["Administer IV push slowly (no faster than 20 mg/min)", "Weigh daily, strict I/O", "Monitor potassium, magnesium, creatinine"],
     "monitoring": ["Electrolytes, BUN/creatinine", "Weight and I/O", "Blood pressure"],
     "education": ["Take in morning to avoid nocturia", "Report muscle cramps or palpitations", "Eat potassium-rich foods unless restricted"]},
    {"id": "drg-heparin", "name": "Heparin (Unfractionated)", "class": "Anticoagulant",
     "indications": ["Acute coronary syndrome", "Venous thromboembolism", "AF with clot risk", "Extracorporeal circuits"],
     "moa": "Potentiates antithrombin III → inactivates factors IIa (thrombin) and Xa.",
     "common_effects": ["Bruising", "Minor bleeding", "Injection-site pain"],
     "serious_effects": ["Major haemorrhage", "Heparin-induced thrombocytopenia (HIT)", "Osteoporosis with long-term use"],
     "contraindications": ["Active bleeding", "Recent CNS surgery", "Severe thrombocytopenia", "HIT history"],
     "nursing": ["Monitor aPTT (target 1.5–2.5× control)", "Assess for bleeding (gums, urine, stool)", "Have protamine sulfate available for reversal"],
     "monitoring": ["aPTT, platelet count (baseline and q2–3 days)", "Hgb/Hct", "Signs of bleeding"],
     "education": ["Use soft toothbrush and electric razor", "Report bleeding, black stools, or new bruising"]},
    {"id": "drg-atorvastatin", "name": "Atorvastatin", "class": "HMG-CoA reductase inhibitor (statin)",
     "indications": ["Hyperlipidaemia", "Primary and secondary CV prevention"],
     "moa": "Inhibits HMG-CoA reductase, reducing cholesterol synthesis and up-regulating hepatic LDL receptors.",
     "common_effects": ["Myalgia", "GI upset", "Headache"],
     "serious_effects": ["Rhabdomyolysis", "Hepatotoxicity"],
     "contraindications": ["Active liver disease", "Pregnancy", "Breastfeeding"],
     "nursing": ["Baseline and periodic LFTs, CK if symptomatic", "Educate on muscle-pain reporting"],
     "monitoring": ["LFTs, lipid panel", "CK if muscle symptoms"],
     "education": ["Take in the evening (peak cholesterol synthesis)", "Avoid grapefruit juice"]},
    {"id": "drg-insulin", "name": "Regular Insulin", "class": "Short-acting insulin",
     "indications": ["Diabetes mellitus", "Diabetic ketoacidosis", "Hyperkalaemia (with dextrose)"],
     "moa": "Binds insulin receptor → glucose uptake and glycogen synthesis; promotes K+ shift into cells.",
     "common_effects": ["Hypoglycaemia", "Injection-site lipohypertrophy"],
     "serious_effects": ["Severe hypoglycaemia", "Hypokalaemia (in DKA treatment)"],
     "contraindications": ["Hypoglycaemia", "Hypersensitivity"],
     "nursing": ["Two-nurse independent double-check for IV insulin drips", "Onset 30 min / peak 2–3 h / duration 5–8 h", "Rotate injection sites"],
     "monitoring": ["Blood glucose", "Potassium (esp. DKA)"],
     "education": ["Recognise hypoglycaemia symptoms", "Carry fast-acting carbohydrate"]},
    {"id": "drg-morphine", "name": "Morphine", "class": "Opioid analgesic",
     "indications": ["Severe pain", "Acute pulmonary oedema (limited use)", "Palliative care"],
     "moa": "μ-opioid receptor agonist in CNS.",
     "common_effects": ["Sedation", "Constipation", "Nausea", "Pruritus"],
     "serious_effects": ["Respiratory depression", "Hypotension", "Dependence"],
     "contraindications": ["Severe respiratory depression", "Paralytic ileus", "Head injury with raised ICP"],
     "nursing": ["Assess RR before every dose (hold if RR < 10)", "Have naloxone available", "Bowel regimen from day 1"],
     "monitoring": ["Sedation score, RR, SpO2", "Pain score", "Bowel function"],
     "education": ["Do not drive", "Avoid alcohol", "Take with food if nauseated"]},
    {"id": "drg-amoxicillin", "name": "Amoxicillin", "class": "Aminopenicillin antibiotic",
     "indications": ["Respiratory tract infections", "UTI", "Otitis media", "H. pylori eradication"],
     "moa": "Inhibits bacterial cell-wall synthesis via PBP binding → cell lysis.",
     "common_effects": ["Diarrhoea", "Nausea", "Rash"],
     "serious_effects": ["Anaphylaxis", "C. difficile colitis", "Stevens–Johnson syndrome"],
     "contraindications": ["Penicillin/cephalosporin allergy", "Mononucleosis (rash)"],
     "nursing": ["Verify allergy history before first dose", "Culture before starting when possible"],
     "monitoring": ["Signs of allergy", "GI symptoms"],
     "education": ["Complete full course", "Report rash or difficulty breathing"]},
    {"id": "drg-salbutamol", "name": "Salbutamol (Albuterol)", "class": "Short-acting β2-agonist (SABA)",
     "indications": ["Acute bronchospasm", "Asthma exacerbation", "COPD exacerbation"],
     "moa": "β2-adrenergic stimulation relaxes bronchial smooth muscle.",
     "common_effects": ["Tachycardia", "Tremor", "Nervousness", "Hypokalaemia at high doses"],
     "serious_effects": ["Paradoxical bronchospasm", "Cardiac arrhythmia"],
     "contraindications": ["Hypersensitivity"],
     "nursing": ["Assess breath sounds, HR before/after", "Space doses correctly", "Teach inhaler technique"],
     "monitoring": ["HR, RR, SpO2, breath sounds", "Peak flow"],
     "education": ["Rinse mouth after use", "Use spacer if available"]},
    {"id": "drg-warfarin", "name": "Warfarin", "class": "Vitamin K antagonist",
     "indications": ["Atrial fibrillation", "Mechanical heart valves", "Recurrent VTE"],
     "moa": "Inhibits vitamin K epoxide reductase → decreased synthesis of factors II, VII, IX, X, protein C, S.",
     "common_effects": ["Bruising", "Minor bleeding"],
     "serious_effects": ["Major haemorrhage", "Warfarin-induced skin necrosis"],
     "contraindications": ["Active bleeding", "Pregnancy", "Recent CNS surgery"],
     "nursing": ["Monitor INR (target usually 2–3)", "Bleeding assessment", "Reversal: vitamin K, FFP, PCC"],
     "monitoring": ["INR, Hgb", "Signs of bleeding"],
     "education": ["Consistent vitamin-K intake", "Report bleeding, dark urine, black stools", "Avoid alcohol excess"]},
    {"id": "drg-omeprazole", "name": "Omeprazole", "class": "Proton pump inhibitor",
     "indications": ["GERD", "Peptic ulcer", "H. pylori eradication", "Zollinger-Ellison"],
     "moa": "Irreversibly inhibits the H+/K+ ATPase in gastric parietal cells.",
     "common_effects": ["Headache", "Diarrhoea", "Abdominal pain"],
     "serious_effects": ["C. difficile risk", "Long-term: fractures, hypomagnesaemia, B12 deficiency"],
     "contraindications": ["Hypersensitivity"],
     "nursing": ["Give 30 min before meals", "Review long-term need periodically"],
     "monitoring": ["Symptom relief", "Mg2+ and B12 if long-term"],
     "education": ["Swallow capsules whole"]},
]


ECG_CASES = [
    {"id": "ecg-01", "title": "Regular Narrow Complex, Rate 70", "difficulty": "Easy",
     "description": "12-lead ECG shows regular rhythm, rate 70, upright P waves in II, PR 0.16 s, QRS 0.08 s.",
     "options": ["Normal Sinus Rhythm", "Atrial Fibrillation", "First-degree AV block", "Sinus Bradycardia"],
     "answer": 0,
     "explanation": "All criteria for normal sinus rhythm are met: regular, rate 60–100, P before every QRS, PR 0.12–0.20 s, QRS < 0.12 s.",
     "image": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800"},
    {"id": "ecg-02", "title": "Irregularly Irregular, No P Waves", "difficulty": "Medium",
     "description": "Rhythm strip: no discernible P waves, irregularly irregular R-R intervals, rate 110.",
     "options": ["Atrial Flutter", "Atrial Fibrillation", "Multifocal Atrial Tachycardia", "Sinus Tachycardia"],
     "answer": 1,
     "explanation": "Atrial fibrillation is characterised by absent P waves and irregularly irregular ventricular response. Rate > 100 = rapid AF.",
     "image": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800"},
    {"id": "ecg-03", "title": "Wide Complex, Rate 180, Regular", "difficulty": "Hard",
     "description": "Monitor shows regular wide-complex tachycardia at 180 bpm. Patient hypotensive and diaphoretic.",
     "options": ["Ventricular Tachycardia", "SVT with aberrancy", "Atrial Flutter with 1:1 conduction", "Normal Sinus Rhythm"],
     "answer": 0,
     "explanation": "Assume any wide-complex tachycardia in a symptomatic adult is ventricular tachycardia until proven otherwise. Unstable VT with pulse → synchronised cardioversion.",
     "image": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800"},
    {"id": "ecg-04", "title": "ST Elevation V2-V4", "difficulty": "Medium",
     "description": "Chest-pain patient. ECG shows ST elevation 3 mm in V2-V4 with reciprocal changes.",
     "options": ["Anterior STEMI", "Pericarditis", "Early repolarisation", "Inferior STEMI"],
     "answer": 0,
     "explanation": "ST-elevation in V2-V4 indicates anterior wall STEMI (LAD territory). Time is muscle — activate the cath lab.",
     "image": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800"},
    {"id": "ecg-05", "title": "Chaotic, No QRS", "difficulty": "Easy",
     "description": "Pulseless patient. Monitor shows chaotic, irregular deflections with no organised QRS.",
     "options": ["Ventricular Fibrillation", "Asystole", "PEA", "Torsades de Pointes"],
     "answer": 0,
     "explanation": "VF is one of two shockable rhythms in ACLS. Deliver an unsynchronised shock, resume CPR immediately, give epinephrine.",
     "image": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800"},
]


SIM_CASES = [
    {"id": "sim-mi", "title": "Acute MI Chest Pain", "level": "Beginner", "category": "Cardiac",
     "patient": {"age": 65, "sex": "Male", "cc": "Crushing chest pain 45 min", "history": "HTN, T2DM, smoker"},
     "vitals": {"BP": "88/54", "HR": "124", "RR": "30", "SpO2": "88%", "Temp": "36.7°C"},
     "symptoms": ["Chest pain", "Diaphoresis", "Nausea", "Shortness of breath"],
     "steps": [
         {"n": 1, "prompt": "What is your FIRST action?",
          "options": [
              {"text": "Administer oral aspirin 300 mg", "correct": False, "why": "Aspirin is important but not first without oxygen and monitoring in place."},
              {"text": "Apply oxygen, cardiac monitor, IV access and 12-lead ECG", "correct": True, "why": "MONA + assessment first: oxygen if SpO2 < 90 %, cardiac monitor, IV access, and a 12-lead ECG within 10 min are the priority."},
              {"text": "Give sublingual nitroglycerin immediately", "correct": False, "why": "Nitroglycerin is contraindicated with SBP < 90 mm Hg."},
              {"text": "Call the cardiologist and wait", "correct": False, "why": "Assessment must precede consultation; do not delay basic interventions."}],
          "priority": "Airway/oxygenation and 12-lead ECG take priority in suspected ACS."},
         {"n": 2, "prompt": "12-lead ECG shows ST-elevation in V2-V5. Best next step?",
          "options": [
              {"text": "Repeat ECG in 30 minutes", "correct": False, "why": "Delaying reperfusion increases myocardial damage."},
              {"text": "Activate cath lab and prepare for PCI", "correct": True, "why": "Anterior STEMI requires immediate reperfusion. Door-to-balloon < 90 min is the standard."},
              {"text": "Give thrombolytic without further evaluation", "correct": False, "why": "PCI is preferred if available; check contraindications first."},
              {"text": "Send patient home with follow-up", "correct": False, "why": "STEMI is a medical emergency."}],
          "priority": "Time is muscle. Anterior STEMI → PCI within 90 min."}
     ],
     "resources": ["AHA/ACC STEMI Guideline", "Institution ACS protocol"]},

    {"id": "sim-sepsis", "title": "Suspected Sepsis", "level": "Intermediate", "category": "Critical Care",
     "patient": {"age": 72, "sex": "Female", "cc": "Confusion, fever", "history": "UTI 2 weeks ago"},
     "vitals": {"BP": "82/48", "HR": "128", "RR": "26", "SpO2": "92%", "Temp": "39.2°C"},
     "symptoms": ["Confusion", "Fever", "Warm flushed skin", "Oliguria"],
     "steps": [
         {"n": 1, "prompt": "Highest-priority action in the first hour?",
          "options": [
              {"text": "Draw lactate and blood cultures, then start broad-spectrum antibiotics", "correct": True, "why": "The Hour-1 bundle: measure lactate, blood cultures before antibiotics, administer antibiotics."},
              {"text": "Order urine culture only", "correct": False, "why": "Blood cultures × 2 and lactate must be drawn."},
              {"text": "Start vasopressor immediately", "correct": False, "why": "Fluid resuscitation is the initial treatment; vasopressors follow if hypotension persists."},
              {"text": "Give antipyretic and observe", "correct": False, "why": "Delay in antibiotics increases mortality."}],
          "priority": "Hour-1 sepsis bundle: lactate, cultures, antibiotics, 30 mL/kg fluids."},
         {"n": 2, "prompt": "After 30 mL/kg crystalloid, MAP remains 55 mm Hg. Next?",
          "options": [
              {"text": "Continue fluids at same rate", "correct": False, "why": "Excess fluid after adequate resuscitation causes harm."},
              {"text": "Start norepinephrine to maintain MAP ≥ 65 mm Hg", "correct": True, "why": "First-line vasopressor in septic shock is norepinephrine, titrated to MAP ≥ 65 mm Hg."},
              {"text": "Give a diuretic", "correct": False, "why": "Diuretics are inappropriate during undifferentiated shock."},
              {"text": "Wait 30 min and reassess", "correct": False, "why": "Hypotension in sepsis requires urgent intervention."}],
          "priority": "Vasopressor: norepinephrine first-line for MAP ≥ 65 mm Hg."}
     ],
     "resources": ["Surviving Sepsis Campaign Guidelines"]},

    {"id": "sim-anaphylaxis", "title": "Anaphylaxis in Ward", "level": "Beginner", "category": "Emergency",
     "patient": {"age": 34, "sex": "Female", "cc": "Sudden dyspnoea after IV antibiotic", "history": "Asthma"},
     "vitals": {"BP": "80/44", "HR": "132", "RR": "34", "SpO2": "89%", "Temp": "36.8°C"},
     "symptoms": ["Urticaria", "Angioedema", "Wheezing", "Hypotension"],
     "steps": [
         {"n": 1, "prompt": "First priority?",
          "options": [
              {"text": "Give IM epinephrine 0.3–0.5 mg in the mid-outer thigh", "correct": True, "why": "IM epinephrine is FIRST-LINE and should not be delayed by other steps."},
              {"text": "Give IV diphenhydramine", "correct": False, "why": "Antihistamines are adjuncts, not first-line."},
              {"text": "Start IV fluids only", "correct": False, "why": "Fluids are important but epinephrine takes priority."},
              {"text": "Give methylprednisolone IV", "correct": False, "why": "Steroids are adjunct therapy, delayed effect."}],
          "priority": "IM epinephrine is FIRST; repeat every 5–15 min if needed."}
     ],
     "resources": ["WAO Anaphylaxis Guidelines"]},

    {"id": "sim-stroke", "title": "Acute Ischaemic Stroke", "level": "Intermediate", "category": "Neuro",
     "patient": {"age": 68, "sex": "Male", "cc": "Right hemiparesis, aphasia 90 min ago", "history": "AF"},
     "vitals": {"BP": "192/104", "HR": "88", "RR": "18", "SpO2": "97%", "Temp": "36.9°C"},
     "symptoms": ["Right-sided weakness", "Aphasia", "Facial droop"],
     "steps": [
         {"n": 1, "prompt": "First step in the ED?",
          "options": [
              {"text": "Non-contrast CT head", "correct": True, "why": "CT differentiates ischaemic vs haemorrhagic stroke and is required before thrombolysis."},
              {"text": "Give aspirin now", "correct": False, "why": "Aspirin is deferred until haemorrhage is ruled out."},
              {"text": "Lower BP aggressively", "correct": False, "why": "Permissive hypertension until candidate assessed; aggressive lowering worsens outcomes."},
              {"text": "MRI first", "correct": False, "why": "CT is faster and standard first line."}],
          "priority": "Time is brain. NCCT within 25 min, treat within 60 min of arrival."}
     ],
     "resources": ["AHA/ASA Stroke Guidelines"]},

    {"id": "sim-dka", "title": "Diabetic Ketoacidosis", "level": "Intermediate", "category": "Endocrine",
     "patient": {"age": 22, "sex": "Female", "cc": "Vomiting, polyuria, confusion", "history": "T1DM, missed insulin"},
     "vitals": {"BP": "96/58", "HR": "126", "RR": "30 (Kussmaul)", "SpO2": "99%", "Temp": "37.1°C"},
     "symptoms": ["Dehydration", "Fruity breath", "Kussmaul respiration", "Confusion"],
     "steps": [
         {"n": 1, "prompt": "First priority?",
          "options": [
              {"text": "Start IV 0.9% NaCl bolus", "correct": True, "why": "Fluid resuscitation is first — patients are severely dehydrated. Insulin is started after initial fluids and potassium is verified."},
              {"text": "Give IV bolus of regular insulin", "correct": False, "why": "Do not bolus insulin; start after initial fluids, and only if K+ ≥ 3.3."},
              {"text": "Give bicarbonate", "correct": False, "why": "Bicarbonate is not routine; only for pH < 6.9."},
              {"text": "Give IV dextrose", "correct": False, "why": "Dextrose added only when glucose ≤ 200 mg/dL to prevent hypoglycaemia during insulin therapy."}],
          "priority": "Fluid → check potassium → insulin infusion (0.1 U/kg/hr)."}
     ],
     "resources": ["ADA DKA Protocol"]},
]


SKILLS = [
    {"id": "sk-hand", "title": "Hand Hygiene", "category": "Infection Prevention", "duration": "3 min",
     "indications": ["Before patient contact", "After body-fluid exposure", "After patient contact", "After contact with patient surroundings", "Before an aseptic task"],
     "equipment": ["Alcohol-based hand rub", "Soap and running water", "Paper towels"],
     "preparation": ["Remove watches and rings", "Roll up sleeves"],
     "procedure": ["Wet hands", "Apply enough soap", "Rub palm to palm", "Right palm over left dorsum with interlaced fingers, and vice versa", "Palm to palm with interlaced fingers", "Backs of fingers to opposing palms", "Rotational rubbing of thumbs", "Rotational rubbing of fingertips in opposing palm", "Rinse under running water", "Dry thoroughly with a single-use towel", "Use towel to close the tap"],
     "safety": ["Use soap and water if hands are visibly soiled or after C. difficile care"],
     "complications": ["Skin irritation with frequent washing"],
     "documentation": ["Not routinely documented unless as part of a bundle audit"],
     "mistakes": ["Skipping the thumbs", "Not drying properly", "Touching taps after washing"]},

    {"id": "sk-iv", "title": "IV Cannulation", "category": "Vascular Access", "duration": "10 min",
     "indications": ["IV medications", "Fluid therapy", "Blood sampling", "Contrast administration"],
     "equipment": ["Cannula (18–22 G)", "Alcohol swab", "Tourniquet", "Extension set", "Saline flush", "Adhesive dressing", "Gloves", "Sharps container"],
     "preparation": ["Verify order", "Verify patient (two identifiers)", "Explain procedure", "Perform hand hygiene", "Don gloves", "Select site (dorsum, forearm — avoid AC in ambulatory patients)"],
     "procedure": ["Apply tourniquet 4–6 inches above site", "Palpate a straight, palpable, resilient vein", "Clean with chlorhexidine, allow to dry", "Anchor vein with non-dominant thumb", "Insert cannula at 15–30° with bevel up", "Advance until flashback seen; lower angle, advance ~2 mm; slide catheter off stylet into vein", "Release tourniquet", "Occlude vein above the tip and remove stylet safely into sharps container", "Attach extension set and flush", "Secure with transparent dressing and label with date/size/initials"],
     "safety": ["Never re-cap needles", "Use safety-engineered cannula", "Discard sharps at point of use"],
     "complications": ["Haematoma", "Infiltration", "Phlebitis", "Nerve injury (avoid multiple attempts on same site)"],
     "documentation": ["Site, catheter size, number of attempts, date and time, patient tolerance"],
     "mistakes": ["Advancing after resistance", "Poor stabilisation causing dislodgement"]},

    {"id": "sk-foley", "title": "Foley Catheterization (Female)", "category": "Procedure", "duration": "15 min",
     "indications": ["Urinary retention", "Strict I/O in critically ill", "Peri-operative", "Pressure-ulcer management with incontinence"],
     "equipment": ["Foley catheter (14–16 Fr)", "Sterile catheter kit", "Sterile lubricant", "10 mL sterile water syringe", "Drainage bag", "Personal protective equipment"],
     "preparation": ["Verify order", "Verify patient", "Explain and provide privacy", "Position: dorsal recumbent with knees flexed", "Perform hand hygiene and set up sterile field"],
     "procedure": ["Apply sterile gloves", "Test balloon", "Cleanse labia and meatus in front-to-back strokes", "Lubricate catheter tip", "Separate labia with non-dominant hand (now contaminated)", "Insert catheter into meatus ~5–7 cm until urine flows", "Advance 2.5 cm more", "Inflate balloon with 10 mL sterile water", "Gently retract until resistance felt", "Attach drainage bag; secure to inner thigh"],
     "safety": ["Maintain aseptic technique throughout", "Never force insertion", "Balloon inflated only after urine return"],
     "complications": ["UTI/CAUTI", "Urethral trauma", "Balloon damage"],
     "documentation": ["Size, date/time, amount and character of urine, patient tolerance"],
     "mistakes": ["Inflating balloon before urine return (may traumatise urethra)"]},

    {"id": "sk-ngt", "title": "Nasogastric Tube Insertion", "category": "Procedure", "duration": "10 min",
     "indications": ["Gastric decompression", "Enteral feeding", "Medication administration when NPO", "Lavage"],
     "equipment": ["NG tube (14–16 Fr adult)", "Water-soluble lubricant", "60 mL syringe", "pH strips", "Adhesive tape", "Stethoscope"],
     "preparation": ["Verify order", "High-Fowler's position", "Measure tube from nose → earlobe → xiphoid"],
     "procedure": ["Lubricate tube", "Insert along the floor of the nasal passage", "At oropharynx have patient sip water and swallow", "Advance to measured length", "Confirm placement: aspirate gastric contents and check pH ≤ 5 (X-ray is the gold standard for feeding tubes)", "Secure tube to nose"],
     "safety": ["Never advance against strong resistance", "Confirm placement before any use", "Stop and pull back if coughing/cyanosis"],
     "complications": ["Epistaxis", "Aspiration if malpositioned", "Sinusitis if long-term"],
     "documentation": ["Type/size, external length at nose, placement verification method, tolerance"],
     "mistakes": ["Skipping placement verification", "Using auscultation alone"]},

    {"id": "sk-cpr", "title": "Adult Basic Life Support (CPR)", "category": "Emergency", "duration": "5 min",
     "indications": ["Cardiac arrest — unresponsive, no normal breathing, no pulse"],
     "equipment": ["AED", "Barrier device or bag-valve-mask", "Backboard if available"],
     "preparation": ["Ensure scene safety", "Check responsiveness", "Call for help and AED"],
     "procedure": ["Open airway (head-tilt/chin-lift)", "Check pulse ≤ 10 seconds", "Begin compressions at 100–120/min, depth 5–6 cm, full recoil, minimal interruptions", "Ratio 30:2 without advanced airway", "Attach AED as soon as available and follow prompts", "With advanced airway: continuous compressions, one breath every 6 s"],
     "safety": ["Rotate compressors every 2 minutes to avoid fatigue", "Confirm rhythm and pulse only briefly"],
     "complications": ["Rib fractures", "Gastric distension from over-ventilation"],
     "documentation": ["Time of arrest, interventions with times, rhythm interpretations, medications, outcome"],
     "mistakes": ["Shallow compressions", "Long pauses", "Over-ventilation"]},
]


EMERGENCY_TOPICS = [
    {"id": "em-bls", "title": "Basic Life Support", "icon": "❤️‍🩹", "color": "#DC2626",
     "summary": "Adult BLS chain: recognise, call, compress, defibrillate, transfer.",
     "key_points": [
         "Compression rate 100–120/min, depth 5–6 cm",
         "Ratio 30:2 without advanced airway; continuous with airway + 1 breath q6s",
         "Attach AED as soon as available"]},
    {"id": "em-acls", "title": "ACLS — Cardiac Arrest", "icon": "⚡", "color": "#EA580C",
     "summary": "Shockable rhythms (VF/pVT) get immediate defibrillation. Non-shockable (asystole/PEA) get CPR + epinephrine. Address 5H/5T.",
     "key_points": [
         "Epinephrine 1 mg IV q3–5 min",
         "Amiodarone 300 mg for refractory VF/pVT",
         "Reversible causes: Hypoxia, Hypovolaemia, H+, Hypo/Hyperkalaemia, Hypothermia; Toxins, Tamponade, Tension pneumothorax, Thrombosis (coronary/pulmonary), Trauma"]},
    {"id": "em-anaphy", "title": "Anaphylaxis", "icon": "🚨", "color": "#B91C1C",
     "summary": "IM epinephrine 0.3–0.5 mg in the mid-outer thigh is FIRST-LINE. Repeat every 5–15 min.",
     "key_points": ["Remove trigger", "Airway + oxygen + IV fluids", "Adjuncts: antihistamine, steroid, beta-agonist neb"]},
    {"id": "em-stroke", "title": "Acute Stroke", "icon": "🧠", "color": "#7C3AED",
     "summary": "Time is brain. Non-contrast CT within 25 min; alteplase within 60 min of arrival if eligible.",
     "key_points": ["Confirm last-known-well time", "NIH Stroke Scale", "Permissive hypertension unless thrombolysis planned"]},
    {"id": "em-sepsis", "title": "Sepsis / Septic Shock", "icon": "🦠", "color": "#0891B2",
     "summary": "Hour-1 bundle: lactate, blood cultures, antibiotics, 30 mL/kg fluids, vasopressors if MAP < 65 after fluids.",
     "key_points": ["Norepinephrine first-line vasopressor", "Source control", "Reassess perfusion continuously"]},
    {"id": "em-mi", "title": "Acute Coronary Syndrome", "icon": "🫀", "color": "#DC2626",
     "summary": "MONA (Morphine, Oxygen if SpO2 < 90, Nitrates, Aspirin) + 12-lead ECG within 10 min.",
     "key_points": ["Anti-platelet (aspirin 300 mg chewed)", "STEMI → PCI within 90 min", "Do not give nitrates if SBP < 90 or RV infarct"]},
    {"id": "em-airway", "title": "Airway Emergencies", "icon": "🫁", "color": "#0369A1",
     "summary": "Recognise stridor, drooling, tripod position, cyanosis. Escalate immediately.",
     "key_points": ["Call for airway team", "Position of comfort", "Prepare intubation kit and difficult-airway trolley"]},
    {"id": "em-shock", "title": "Shock — Recognition", "icon": "💉", "color": "#8B5CF6",
     "summary": "Types: hypovolaemic, cardiogenic, obstructive, distributive (septic/anaphylactic/neurogenic).",
     "key_points": ["Cool clammy skin = hypoperfusion", "Lactate rising", "Urine < 0.5 mL/kg/hr"]},
]


VENTILATOR_TOPICS = [
    {"id": "vt-modes", "title": "Common Ventilator Modes",
     "content": (
         "**Volume Control (VC)** — set tidal volume delivered every breath. Pressure varies.\n\n"
         "**Pressure Control (PC)** — set inspiratory pressure; volume varies with compliance.\n\n"
         "**Pressure Support (PS)** — patient triggers each breath; ventilator delivers set pressure.\n\n"
         "**SIMV** — synchronised intermittent mandatory ventilation combines mandatory breaths with patient-initiated breaths.\n\n"
         "**CPAP/BiPAP** — non-invasive support delivering continuous or bilevel positive airway pressure."
     )},
    {"id": "vt-settings", "title": "Basic Parameters",
     "content": (
         "**Tidal Volume (Vt)** — 6–8 mL/kg predicted body weight (lung-protective).\n\n"
         "**Respiratory Rate** — start 12–20 /min; adjust to pCO2.\n\n"
         "**FiO2** — start high, wean to lowest that maintains SpO2 ≥ 92 % (88–92 % in COPD).\n\n"
         "**PEEP** — baseline 5 cm H2O; titrate for oxygenation.\n\n"
         "**Inspiratory:Expiratory ratio** — usually 1:2 to 1:3; consider inverse ratio in ARDS."
     )},
    {"id": "vt-alarms", "title": "Alarm Troubleshooting",
     "content": (
         "**High-pressure alarm**: check for kinked tubing, biting on ET tube, mucus plug (needs suctioning), pneumothorax, bronchospasm.\n\n"
         "**Low-pressure/disconnect alarm**: check ventilator circuit for disconnection, cuff leak, extubation.\n\n"
         "**Apnoea alarm**: patient not triggering; reassess sedation, RR, mode.\n\n"
         "Always DOPES check: Displacement, Obstruction, Pneumothorax, Equipment failure, Stacked breaths."
     )},
]
