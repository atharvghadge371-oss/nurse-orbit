"""OSCE Station Seed Data for Nurse Orbit Skills Lab."""

OSCE_STATIONS = [
    {
        "id": "osce-hand-hygiene",
        "category": "Fundamentals",
        "title": "Hand Hygiene",
        "duration_minutes": 5,
        "difficulty": "easy",
        "examiner_instructions": (
            "Observe the candidate performing the WHO 6-step hand hygiene technique. "
            "Ensure that soap and water or alcohol-based hand rub are available. "
            "Assess each step in order and award marks only for steps performed correctly and in sequence."
        ),
        "scenario": (
            "You are a first-year nursing student on your first day on a medical ward. "
            "Before entering a patient's room, your senior nurse asks you to demonstrate the "
            "correct WHO 6-step hand hygiene technique using the hand-wash basin provided."
        ),
        "checklist": [
            {"step": 1, "action": "Wets hands thoroughly under running water before applying soap", "marks": 1},
            {"step": 2, "action": "Applies an adequate amount of soap or antiseptic to cover all surfaces", "marks": 1},
            {"step": 3, "action": "Rubs palms together — Step 1: palm to palm", "marks": 1},
            {"step": 4, "action": "Rubs right palm over left dorsum with interlaced fingers and vice versa — Step 2", "marks": 1},
            {"step": 5, "action": "Rubs palm to palm with fingers interlaced — Step 3", "marks": 2},
            {"step": 6, "action": "Rubs backs of fingers to opposing palms with fingers interlocked — Step 4", "marks": 2},
            {"step": 7, "action": "Rotational rubbing of left thumb clasped in right palm and vice versa — Step 5", "marks": 2},
            {"step": 8, "action": "Rotational rubbing, backwards and forwards with clasped fingers of right hand in left palm and vice versa — Step 6", "marks": 2},
            {"step": 9, "action": "Rinses hands under running water", "marks": 1},
            {"step": 10, "action": "Dries hands completely with a single-use towel", "marks": 1},
            {"step": 11, "action": "Uses towel to turn off tap without re-contaminating hands", "marks": 1},
        ],
        "total_marks": 15,
        "pass_mark": 10,
        "key_points": [
            "The entire procedure should last 40–60 seconds",
            "Each of the 6 WHO steps must be performed in the correct sequence",
            "Hands must be completely dry before patient contact to prevent chapping and infection spread",
            "Hand hygiene is the single most important action to prevent healthcare-associated infections",
        ],
        "common_mistakes": [
            "Skipping or rushing thumb rubbing (Step 5)",
            "Not interlocking fingers during Step 3",
            "Touching the tap with clean hands after rinsing",
            "Incomplete drying — leaving hands damp",
            "Using insufficient soap to cover all surfaces",
        ],
        "tips": "Remember the WHO mnemonic: 'How To Prevent Infections Really Rapidly' — Handrub/Handwash, Palms, Palm-over-Back, Interlaced, Rotational Thumb, Rotational Tips.",
    },
    {
        "id": "osce-blood-pressure",
        "category": "Fundamentals",
        "title": "Blood Pressure Measurement",
        "duration_minutes": 7,
        "difficulty": "easy",
        "examiner_instructions": (
            "Observe the candidate performing BP measurement using a manual sphygmomanometer on a manikin or standardised patient. "
            "Listen for accuracy in placing the cuff, finding Korotkoff sounds, and documenting results."
        ),
        "scenario": (
            "A 62-year-old male patient, Mr. Ahmed, has been admitted to the medical ward for hypertension monitoring. "
            "Your nurse-in-charge asks you to measure and record his blood pressure manually."
        ),
        "checklist": [
            {"step": 1, "action": "Explains procedure to patient and obtains verbal consent", "marks": 1},
            {"step": 2, "action": "Positions patient seated, arm at heart level, supported", "marks": 1},
            {"step": 3, "action": "Selects appropriate cuff size for patient's arm circumference", "marks": 1},
            {"step": 4, "action": "Applies cuff correctly — 2–3 cm above antecubital fossa, snugly", "marks": 2},
            {"step": 5, "action": "Palpates brachial or radial pulse before inflating cuff", "marks": 1},
            {"step": 6, "action": "Inflates cuff 20–30 mmHg above palpated systolic to estimate", "marks": 2},
            {"step": 7, "action": "Deflates cuff slowly at 2–3 mmHg per second", "marks": 2},
            {"step": 8, "action": "Correctly identifies Korotkoff Phase I (systolic) sound", "marks": 2},
            {"step": 9, "action": "Correctly identifies Korotkoff Phase V (diastolic) disappearance", "marks": 2},
            {"step": 10, "action": "Records BP accurately with correct units and arm used", "marks": 1},
        ],
        "total_marks": 15,
        "pass_mark": 11,
        "key_points": [
            "Cuff bladder should encircle at least 80% of arm circumference",
            "Patient should rest quietly for at least 5 minutes before measurement",
            "Arm must be bare and at heart level to avoid positional error",
            "Korotkoff Phase I = first sound (systolic); Phase V = disappearance (diastolic)",
        ],
        "common_mistakes": [
            "Applying the cuff over clothing",
            "Not deflating slowly — missing the Korotkoff sounds",
            "Rounding readings to nearest 5 or 10 mmHg",
            "Measuring BP immediately after patient walked in",
            "Using a cuff too small or too large for the arm",
        ],
        "tips": "Palpate for the brachial pulse before auscultating — this helps locate the artery and prevents unnecessary searching.",
    },
    {
        "id": "osce-iv-cannulation",
        "category": "Clinical Skills",
        "title": "IV Cannulation",
        "duration_minutes": 10,
        "difficulty": "medium",
        "examiner_instructions": (
            "Observe the candidate performing peripheral IV cannula insertion on a manikin or simulation arm. "
            "Assess aseptic technique, communication, correct catheter size selection, and securing of the cannula."
        ),
        "scenario": (
            "A 45-year-old female patient, Mrs. Patel, has been prescribed IV antibiotics and requires peripheral IV access. "
            "Insert a 20G IV cannula in the dorsum of her hand or antecubital fossa using a full aseptic technique."
        ),
        "checklist": [
            {"step": 1, "action": "Checks prescription chart and patient identity (name + DOB)", "marks": 1},
            {"step": 2, "action": "Explains procedure and obtains verbal consent", "marks": 1},
            {"step": 3, "action": "Gathers all required equipment before starting", "marks": 1},
            {"step": 4, "action": "Performs hand hygiene (WHO 6-step technique)", "marks": 1},
            {"step": 5, "action": "Applies tourniquet 10–15 cm above insertion site", "marks": 1},
            {"step": 6, "action": "Selects appropriate vein and cannula size (18–20G for most adults)", "marks": 2},
            {"step": 7, "action": "Cleans site with 2% chlorhexidine or 70% alcohol swab for 30 seconds and allows to dry", "marks": 2},
            {"step": 8, "action": "Inserts cannula at 15–30° bevel up; observes flashback of blood", "marks": 2},
            {"step": 9, "action": "Advances cannula off needle while stabilising needle", "marks": 2},
            {"step": 10, "action": "Removes tourniquet and needle simultaneously, applies digital pressure", "marks": 1},
            {"step": 11, "action": "Attaches needleless connector or bung; flushes with 5–10 mL normal saline", "marks": 1},
            {"step": 12, "action": "Secures cannula with transparent dressing; labels with date and gauge", "marks": 1},
            {"step": 13, "action": "Disposes of sharp in sharps bin immediately", "marks": 1},
            {"step": 14, "action": "Documents cannula insertion in patient notes", "marks": 1},
        ],
        "total_marks": 18,
        "pass_mark": 13,
        "key_points": [
            "Never re-sheath a used needle — dispose directly into sharps bin",
            "Flashback in the chamber confirms intravascular placement",
            "Flush with 10 mL 0.9% NaCl to confirm patency before medication administration",
            "Label every cannula with date of insertion and size",
            "Cannulae must be removed within 72–96 hours per hospital policy",
        ],
        "common_mistakes": [
            "Advancing the needle instead of the cannula after flashback",
            "Forgetting to release the tourniquet before flushing",
            "Not waiting for skin antiseptic to dry before inserting needle",
            "Failing to dispose of the sharp immediately after removal",
            "Inserting over a joint — cannulae flex and cause thrombophlebitis",
        ],
        "tips": "Anchor the vein with your non-dominant hand's thumb — this prevents the vein rolling during insertion.",
    },
    {
        "id": "osce-catheterisation",
        "category": "Clinical Skills",
        "title": "Urinary Catheterisation (Female)",
        "duration_minutes": 12,
        "difficulty": "hard",
        "examiner_instructions": (
            "Observe the candidate performing female urinary catheterisation on a pelvic manikin using strict aseptic non-touch technique (ANTT). "
            "Marks are awarded for maintaining sterility throughout and correct anatomical identification."
        ),
        "scenario": (
            "A 70-year-old female patient, Mrs. Jones, is post-operative day 1 following abdominal surgery. "
            "She is unable to pass urine and her bladder is palpable. The doctor has prescribed urinary catheterisation. "
            "Insert a size 14Fr Foley catheter using aseptic technique."
        ),
        "checklist": [
            {"step": 1, "action": "Confirms prescription and patient identity; obtains informed consent", "marks": 1},
            {"step": 2, "action": "Ensures privacy and maintains dignity throughout", "marks": 1},
            {"step": 3, "action": "Gathers full catheterisation pack and correct catheter size", "marks": 1},
            {"step": 4, "action": "Performs hand hygiene; opens sterile field without contaminating", "marks": 2},
            {"step": 5, "action": "Positions patient in dorsal recumbent position with knees flexed", "marks": 1},
            {"step": 6, "action": "Dons sterile gloves using open gloving technique without contamination", "marks": 2},
            {"step": 7, "action": "Uses dominant hand only for catheter insertion; non-dominant hand for all cleaning", "marks": 2},
            {"step": 8, "action": "Cleans labia minora and urethral meatus front-to-back using separate swabs", "marks": 2},
            {"step": 9, "action": "Inserts catheter 5–7 cm into urethra — does not force if resistance met", "marks": 2},
            {"step": 10, "action": "Waits for urine to drain before inflating balloon", "marks": 2},
            {"step": 11, "action": "Inflates balloon with correct volume of sterile water (per label)", "marks": 1},
            {"step": 12, "action": "Gently retracts catheter until resistance confirms correct positioning", "marks": 1},
            {"step": 13, "action": "Connects to drainage bag; secures catheter to inner thigh", "marks": 1},
            {"step": 14, "action": "Documents catheter size, batch number, date, balloon volume, and urine output", "marks": 1},
        ],
        "total_marks": 20,
        "pass_mark": 14,
        "key_points": [
            "Always wait for urine to flow before inflating the balloon — inflation in urethra causes rupture",
            "ANTT means the catheter tip and balloon port must never be touched directly",
            "Clean from front to back each time — never return a used swab to the sterile field",
            "Use only the prescribed sterile water for balloon inflation (never saline — it crystalises)",
        ],
        "common_mistakes": [
            "Inflating balloon before urine drainage is seen",
            "Contaminating the sterile field by reaching across it",
            "Using the same swab twice during cleaning",
            "Touching the catheter tip with a non-sterile surface",
            "Failing to secure the drainage bag below bladder level",
        ],
        "tips": "Visualise the urethral meatus carefully before inserting — common mistake is accidental vaginal insertion. If in doubt, leave catheter in place as a landmark and use a second one for the urethra.",
    },
    {
        "id": "osce-wound-dressing",
        "category": "Clinical Skills",
        "title": "Wound Dressing Change",
        "duration_minutes": 10,
        "difficulty": "medium",
        "examiner_instructions": (
            "Observe the candidate performing a surgical wound dressing change using ANTT on a manikin or simulated wound. "
            "Assess aseptic technique, wound assessment documentation, and patient communication."
        ),
        "scenario": (
            "Mr. Kumar, a 55-year-old patient, is day 3 post-laparotomy. His surgical wound dressing needs to be changed. "
            "The wound appears to be healing by primary intention. Perform the dressing change using aseptic technique "
            "and assess the wound."
        ),
        "checklist": [
            {"step": 1, "action": "Checks prescription; confirms patient identity; explains procedure and obtains consent", "marks": 1},
            {"step": 2, "action": "Ensures adequate lighting and patient positioned comfortably", "marks": 1},
            {"step": 3, "action": "Performs hand hygiene; assembles sterile dressing pack and required materials", "marks": 1},
            {"step": 4, "action": "Opens pack and additional supplies using ANTT (does not contaminate sterile field)", "marks": 2},
            {"step": 5, "action": "Removes old dressing using non-sterile gloves; inspects and describes exudate/soiling", "marks": 1},
            {"step": 6, "action": "Removes non-sterile gloves; performs hand hygiene; dons sterile gloves", "marks": 2},
            {"step": 7, "action": "Assesses wound systematically: size, edges, exudate, signs of infection (REEDA or TIME)", "marks": 2},
            {"step": 8, "action": "Cleans wound if required — centre outwards or top to bottom, using separate swabs", "marks": 2},
            {"step": 9, "action": "Applies appropriate primary dressing without contaminating the dressing surface", "marks": 2},
            {"step": 10, "action": "Secures dressing and labels with date, time, and nurse's initials", "marks": 1},
            {"step": 11, "action": "Disposes of waste correctly (clinical waste bag)", "marks": 1},
            {"step": 12, "action": "Performs hand hygiene after procedure; documents wound assessment in notes", "marks": 1},
        ],
        "total_marks": 17,
        "pass_mark": 12,
        "key_points": [
            "REEDA mnemonic: Redness, Edema, Ecchymosis, Discharge, Approximation",
            "Primary intention healing means wound edges are approximated — should be clean and dry",
            "Never clean a wound from dirty to clean areas — always clean to dirty",
            "Sterile field must be at waist height and must never be left unattended",
        ],
        "common_mistakes": [
            "Cleaning wound from outside to inside (dirty to clean direction)",
            "Using the same swab for more than one stroke",
            "Contaminating the sterile field with non-sterile objects",
            "Failing to document wound dimensions or appearance",
            "Not disposing of clinical waste correctly",
        ],
        "tips": "Use the TIME framework: Tissue, Infection, Moisture, Edge. It gives structure to your wound assessment and ensures you don't miss any key feature.",
    },
    {
        "id": "osce-medication-administration",
        "category": "Pharmacology",
        "title": "Oral Medication Administration",
        "duration_minutes": 8,
        "difficulty": "easy",
        "examiner_instructions": (
            "Observe candidate administering oral medication to a simulated patient. "
            "Assess the 10 Rights of medication administration, drug calculation, and patient education."
        ),
        "scenario": (
            "Mrs. Li, a 68-year-old patient with type 2 diabetes, is prescribed Metformin 500 mg oral tablet TDS. "
            "The medication cart contains Metformin 500 mg tablets. Administer the 8 am dose."
        ),
        "checklist": [
            {"step": 1, "action": "Performs hand hygiene before handling medication", "marks": 1},
            {"step": 2, "action": "Checks prescription chart — Right Drug, Right Dose, Right Time, Right Route, Right Patient", "marks": 3},
            {"step": 3, "action": "Checks medication expiry date on the packaging", "marks": 1},
            {"step": 4, "action": "Confirms patient identity using two identifiers (name + DOB or wristband)", "marks": 2},
            {"step": 5, "action": "Checks patient allergies before administration", "marks": 2},
            {"step": 6, "action": "Assesses patient is able to swallow oral medication safely", "marks": 1},
            {"step": 7, "action": "Pours correct dose without touching tablets (uses lid/cup)", "marks": 1},
            {"step": 8, "action": "Administers medication with adequate water; stays with patient until swallowed", "marks": 1},
            {"step": 9, "action": "Educates patient on medication purpose (controls blood sugar) and side effects (GI upset)", "marks": 1},
            {"step": 10, "action": "Documents administration immediately on prescription chart with signature", "marks": 1},
            {"step": 11, "action": "Reassesses patient after 30 minutes for intended effect or adverse reaction", "marks": 1},
        ],
        "total_marks": 15,
        "pass_mark": 11,
        "key_points": [
            "The 10 Rights: Right Patient, Drug, Dose, Route, Time, Reason, Response, Documentation, Right to Refuse, Right Education",
            "Never sign for a medication you have not personally administered",
            "Metformin should be given with food to reduce GI side effects",
            "Always assess swallowing ability, especially in elderly or neurological patients",
        ],
        "common_mistakes": [
            "Checking allergy status after preparing the medication rather than before",
            "Using only one patient identifier",
            "Leaving the medication at the bedside without confirming it was swallowed",
            "Signing the drug chart before administering the medication",
            "Not educating the patient on purpose and potential side effects",
        ],
        "tips": "Use the 'triple check' method: check the label when removing from the drawer, when preparing the dose, and when returning/discarding packaging.",
    },
    {
        "id": "osce-nasogastric-tube",
        "category": "Clinical Skills",
        "title": "Nasogastric Tube Insertion",
        "duration_minutes": 12,
        "difficulty": "hard",
        "examiner_instructions": (
            "Observe the candidate inserting a fine-bore nasogastric (NG) tube for enteral feeding on a manikin. "
            "Assess positioning technique, confirmation method, and documentation. "
            "Candidate must use only pH testing as the primary confirmation method — X-ray is gold standard but not performed here."
        ),
        "scenario": (
            "Mr. Singh, a 78-year-old patient who suffered a stroke 48 hours ago, is unable to swallow safely (assessed by SALT). "
            "The doctor has prescribed NG tube insertion for enteral feeding. Insert a fine-bore NG tube using the correct technique."
        ),
        "checklist": [
            {"step": 1, "action": "Checks prescription; explains procedure to patient/family; obtains consent", "marks": 1},
            {"step": 2, "action": "Positions patient sitting upright at 45–90° if possible", "marks": 1},
            {"step": 3, "action": "Performs hand hygiene; prepares sterile field with all required equipment", "marks": 1},
            {"step": 4, "action": "Measures tube length: nose to earlobe to xiphisternum (NEX measurement)", "marks": 2},
            {"step": 5, "action": "Checks nostril patency; lubricates tube tip with water-soluble lubricant", "marks": 1},
            {"step": 6, "action": "Inserts tube horizontally along floor of nostril; advances gently", "marks": 2},
            {"step": 7, "action": "Asks patient to swallow (sip water if able) as tube passes pharynx", "marks": 1},
            {"step": 8, "action": "Advances to pre-measured length; does NOT force if patient coughs repeatedly or desaturates", "marks": 2},
            {"step": 9, "action": "Secures tube temporarily to nose before confirmation", "marks": 1},
            {"step": 10, "action": "Aspirates gastric fluid using a syringe; tests on pH indicator strip", "marks": 2},
            {"step": 11, "action": "Confirms correct placement — pH ≤ 5.5 indicates gastric placement; accepts X-ray as gold standard", "marks": 2},
            {"step": 12, "action": "Secures tube to nose and cheek with appropriate tape; documents NEX measurement", "marks": 1},
            {"step": 13, "action": "Documents tube size, nostril used, pH reading, and confirmation method in nursing notes", "marks": 1},
        ],
        "total_marks": 18,
        "pass_mark": 13,
        "key_points": [
            "pH ≤ 5.5 confirms gastric placement — never use blue litmus paper alone",
            "Absence of distress is NOT confirmation of correct placement",
            "Do NOT use the auscultation (whoosh) test — it is unreliable and no longer recommended",
            "If unable to aspirate, reposition patient or advance tube 2–3 cm and retry",
            "Chest X-ray is the gold standard if pH testing is inconclusive (pH 5–6 zone)",
        ],
        "common_mistakes": [
            "Using auscultation as the primary or only confirmation method",
            "Not measuring the tube before insertion",
            "Forcing the tube when patient is coughing continuously",
            "Testing pH on blue litmus paper rather than a graded pH strip",
            "Documenting 'position confirmed' without evidence of acceptable pH or X-ray",
        ],
        "tips": "If the patient begins to cough vigorously or oxygen saturation drops, withdraw the tube immediately — it may have entered the trachea.",
    },
    {
        "id": "osce-cpr-bls",
        "category": "Emergency",
        "title": "Basic Life Support (BLS / CPR)",
        "duration_minutes": 8,
        "difficulty": "medium",
        "examiner_instructions": (
            "Observe the candidate performing adult BLS on a Resusci-Anne manikin or equivalent. "
            "Assess response check, calling for help, compression quality (depth, rate, recoil), and rescue breaths if applicable."
        ),
        "scenario": (
            "You are the nurse on duty on a general ward. You enter a side room and find Mr. Blake, a 55-year-old patient, "
            "collapsed on the floor unresponsive. Manage this situation according to the 2021 Resuscitation Council UK guidelines."
        ),
        "checklist": [
            {"step": 1, "action": "Ensures scene safety before approaching; calls out 'Are you okay?' and shakes shoulders", "marks": 1},
            {"step": 2, "action": "Shouts for help; activates crash team by pressing emergency call button or sending bystander", "marks": 2},
            {"step": 3, "action": "Opens airway using head-tilt chin-lift technique", "marks": 1},
            {"step": 4, "action": "Looks, listens, feels for normal breathing for no more than 10 seconds", "marks": 1},
            {"step": 5, "action": "Begins chest compressions immediately if no normal breathing", "marks": 1},
            {"step": 6, "action": "Places heel of hand on centre of chest (lower half of sternum)", "marks": 1},
            {"step": 7, "action": "Compresses to 5–6 cm depth at 100–120 compressions per minute", "marks": 3},
            {"step": 8, "action": "Allows full chest recoil between compressions without leaning", "marks": 2},
            {"step": 9, "action": "Delivers 30 compressions then 2 rescue breaths (30:2 ratio)", "marks": 1},
            {"step": 10, "action": "Maintains CPR until AED/defibrillator arrives or crash team takes over", "marks": 1},
            {"step": 11, "action": "Attaches AED pads correctly and follows voice prompts without pausing compressions unnecessarily", "marks": 1},
        ],
        "total_marks": 15,
        "pass_mark": 11,
        "key_points": [
            "Compression rate: 100–120/min; depth: 5–6 cm; allow full recoil",
            "Ratio: 30 compressions to 2 rescue breaths",
            "Minimise interruptions to compressions — maximum 5-second pause for defibrillation",
            "When the AED arrives, continue CPR while it is being set up",
            "If unsure about rescue breaths — continuous compressions alone are acceptable",
        ],
        "common_mistakes": [
            "Compressing too shallow (< 5 cm) or too slow (< 100/min)",
            "Leaning on the chest between compressions — prevents recoil",
            "Checking for pulse for too long (> 10 seconds) before starting CPR",
            "Stopping compressions to open airway — head-tilt is a one-hand technique",
            "Not delegating the call for help before starting CPR",
        ],
        "tips": "Practice to the beat of 'Stayin' Alive' by the Bee Gees — it is exactly 103 BPM and helps maintain the correct compression rate.",
    },
]

OSCE_CATEGORIES = list({s["category"] for s in OSCE_STATIONS})
