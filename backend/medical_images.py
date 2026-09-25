"""
Curated medical / anatomy image library.
Maps common nursing / medical keywords to high-quality open images (Wikimedia Commons,
public domain / CC-licensed) so the AI Nurse Tutor can show relevant visuals inline.

detect_medical_images(text) scans free text for known topics and returns a de-duplicated
list of images with url + title + caption. Safe: returns [] when nothing matches.
"""
from __future__ import annotations
import re
from typing import List, Dict


# Each entry: canonical topic -> { url, title, caption, keywords }
# Keywords are lower-case; use word-boundary matching.
MEDICAL_IMAGE_CATALOG: List[Dict] = [
    # ---- CARDIOVASCULAR ----
    {
        "id": "heart_anatomy",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Diagram_of_the_human_heart_%28cropped%29.svg/800px-Diagram_of_the_human_heart_%28cropped%29.svg.png",
        "title": "Human heart anatomy",
        "caption": "Chambers, valves and great vessels of the human heart.",
        "keywords": ["heart", "cardiac", "myocard", "ventricle", "atrium", "atria", "mitral", "tricuspid", "aortic valve", "cardiovascular"],
    },
    {
        "id": "ecg_normal",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/SinusRhythmLabels.svg/800px-SinusRhythmLabels.svg.png",
        "title": "Normal sinus rhythm ECG",
        "caption": "P wave, QRS complex, T wave and intervals on a normal ECG.",
        "keywords": ["ecg", "ekg", "sinus rhythm", "qrs", "p wave", "t wave", "st segment", "electrocardiogram", "12-lead", "12 lead"],
    },
    {
        "id": "coronary_arteries",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Coronary_arteries.svg/800px-Coronary_arteries.svg.png",
        "title": "Coronary arteries",
        "caption": "Left and right coronary artery distribution supplying the myocardium.",
        "keywords": ["coronary", "lad", "rca", "circumflex", "mi", "myocardial infarction", "stemi", "nstemi", "angina"],
    },
    {
        "id": "circulation",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Circulatory_System_en.svg/500px-Circulatory_System_en.svg.png",
        "title": "Circulatory system",
        "caption": "Systemic and pulmonary circulation — oxygenated (red) and deoxygenated (blue) blood flow.",
        "keywords": ["circulation", "circulatory", "systemic", "pulmonary circulation", "blood flow"],
    },

    # ---- RESPIRATORY ----
    {
        "id": "lungs_anatomy",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Illu_bronchi_lungs.jpg/800px-Illu_bronchi_lungs.jpg",
        "title": "Lungs & bronchial tree",
        "caption": "Trachea, main bronchi, lobar bronchi and lung lobes.",
        "keywords": ["lung", "lungs", "bronchi", "bronchial", "trachea", "alveoli", "alveolus", "respiratory", "pulmonary", "pneumonia", "copd", "asthma", "ards"],
    },
    {
        "id": "alveoli",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/2308_The_Bronchioles_and_Alveoli_in_the_Lungs.jpg/800px-2308_The_Bronchioles_and_Alveoli_in_the_Lungs.jpg",
        "title": "Bronchioles & alveoli",
        "caption": "Gas-exchange units of the lung — capillary network around alveolar sacs.",
        "keywords": ["alveoli", "alveolar", "gas exchange", "bronchiole", "surfactant"],
    },

    # ---- NERVOUS SYSTEM ----
    {
        "id": "brain_anatomy",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Skull_and_brain_normal_human.svg/800px-Skull_and_brain_normal_human.svg.png",
        "title": "Human brain anatomy",
        "caption": "Cerebrum, cerebellum, brainstem and major lobes.",
        "keywords": ["brain", "cerebral", "cerebrum", "cerebellum", "brainstem", "frontal lobe", "temporal lobe", "parietal lobe", "occipital", "cns", "stroke", "cva"],
    },
    {
        "id": "neuron",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Blausen_0657_MultipolarNeuron.png/800px-Blausen_0657_MultipolarNeuron.png",
        "title": "Neuron structure",
        "caption": "Dendrites, cell body, axon and synaptic terminals.",
        "keywords": ["neuron", "axon", "dendrite", "synapse", "myelin", "nerve cell", "action potential"],
    },
    {
        "id": "spinal_cord",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/1319_Spinal_Nerves.jpg/600px-1319_Spinal_Nerves.jpg",
        "title": "Spinal cord & nerves",
        "caption": "Cervical, thoracic, lumbar and sacral spinal nerve distribution.",
        "keywords": ["spinal cord", "spine", "vertebra", "spinal nerve", "dermatome", "cauda equina"],
    },

    # ---- RENAL / URINARY ----
    {
        "id": "kidney_anatomy",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Kidney_PioM.svg/800px-Kidney_PioM.svg.png",
        "title": "Kidney cross-section",
        "caption": "Cortex, medulla, pyramids, calyces and renal pelvis.",
        "keywords": ["kidney", "kidneys", "renal", "cortex", "medulla", "renal pelvis", "aki", "ckd", "dialysis"],
    },
    {
        "id": "nephron",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Kidney_nephron.png/800px-Kidney_nephron.png",
        "title": "Nephron",
        "caption": "Functional unit of the kidney — glomerulus, tubules and collecting duct.",
        "keywords": ["nephron", "glomerulus", "bowman", "loop of henle", "tubule", "collecting duct", "gfr"],
    },
    {
        "id": "urinary_system",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Urinary_system.svg/500px-Urinary_system.svg.png",
        "title": "Urinary system",
        "caption": "Kidneys, ureters, bladder and urethra.",
        "keywords": ["urinary", "bladder", "ureter", "urethra", "urine"],
    },

    # ---- DIGESTIVE ----
    {
        "id": "digestive_system",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Digestive_system_diagram_en.svg/800px-Digestive_system_diagram_en.svg.png",
        "title": "Digestive system",
        "caption": "Mouth, esophagus, stomach, small and large intestine, and accessory organs.",
        "keywords": ["digestive", "digestion", "gi tract", "gastrointestinal", "esophagus", "intestine", "colon", "bowel"],
    },
    {
        "id": "stomach",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Stomach_diagram.svg/800px-Stomach_diagram.svg.png",
        "title": "Stomach anatomy",
        "caption": "Fundus, body, antrum, pylorus and sphincters.",
        "keywords": ["stomach", "gastric", "pylorus", "fundus", "peptic ulcer", "gastritis"],
    },
    {
        "id": "liver",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Liver_and_gallbladder.jpg/800px-Liver_and_gallbladder.jpg",
        "title": "Liver & gallbladder",
        "caption": "Lobes of the liver, gallbladder and biliary ducts.",
        "keywords": ["liver", "hepatic", "cirrhosis", "hepatitis", "gallbladder", "bile", "biliary"],
    },
    {
        "id": "pancreas",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Illu_pancrease.svg/800px-Illu_pancrease.svg.png",
        "title": "Pancreas",
        "caption": "Head, body, tail of pancreas with duct anatomy.",
        "keywords": ["pancreas", "pancreatic", "pancreatitis", "islet", "insulin"],
    },

    # ---- MUSCULOSKELETAL ----
    {
        "id": "skeleton",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Human_skeleton_front_no-text-2.svg/400px-Human_skeleton_front_no-text-2.svg.png",
        "title": "Human skeleton",
        "caption": "Axial and appendicular skeleton, anterior view.",
        "keywords": ["skeleton", "bone", "bones", "skeletal", "fracture", "osteoporosis"],
    },
    {
        "id": "muscles",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/1105_Anterior_and_Posterior_Views_of_Muscles.jpg/600px-1105_Anterior_and_Posterior_Views_of_Muscles.jpg",
        "title": "Muscular system",
        "caption": "Major skeletal muscles — anterior and posterior views.",
        "keywords": ["muscle", "muscular", "skeletal muscle", "biceps", "triceps", "quadriceps"],
    },

    # ---- ENDOCRINE ----
    {
        "id": "endocrine",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/1801_The_Endocrine_System.jpg/600px-1801_The_Endocrine_System.jpg",
        "title": "Endocrine system",
        "caption": "Pituitary, thyroid, parathyroid, adrenals, pancreas and gonads.",
        "keywords": ["endocrine", "hormone", "pituitary", "adrenal", "gland"],
    },
    {
        "id": "thyroid",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Illu_thyroid_parathyroid.jpg/800px-Illu_thyroid_parathyroid.jpg",
        "title": "Thyroid & parathyroid",
        "caption": "Thyroid lobes and posterior parathyroid glands.",
        "keywords": ["thyroid", "parathyroid", "hyperthyroid", "hypothyroid", "goiter", "graves", "hashimoto"],
    },

    # ---- REPRODUCTIVE ----
    {
        "id": "female_reproductive",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Scheme_female_reproductive_system-en.svg/500px-Scheme_female_reproductive_system-en.svg.png",
        "title": "Female reproductive system",
        "caption": "Ovaries, fallopian tubes, uterus, cervix and vagina.",
        "keywords": ["female reproductive", "uterus", "ovary", "ovaries", "fallopian", "cervix", "vagina", "menstrual", "pregnancy"],
    },
    {
        "id": "male_reproductive",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Male_anatomy_en.svg/500px-Male_anatomy_en.svg.png",
        "title": "Male reproductive system",
        "caption": "Testis, epididymis, vas deferens, prostate and urethra.",
        "keywords": ["male reproductive", "testis", "prostate", "penis", "epididymis", "vas deferens"],
    },

    # ---- SENSES / SKIN ----
    {
        "id": "eye",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Schematic_diagram_of_the_human_eye_en.svg/800px-Schematic_diagram_of_the_human_eye_en.svg.png",
        "title": "Human eye",
        "caption": "Cornea, iris, lens, retina and optic nerve.",
        "keywords": ["eye", "cornea", "retina", "lens", "iris", "optic nerve", "glaucoma", "cataract"],
    },
    {
        "id": "ear",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Anatomy_of_the_Human_Ear.svg/800px-Anatomy_of_the_Human_Ear.svg.png",
        "title": "Human ear",
        "caption": "External, middle and inner ear including cochlea and vestibular apparatus.",
        "keywords": ["ear", "cochlea", "tympanic", "eardrum", "vestibular", "otitis"],
    },
    {
        "id": "skin",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/HumanSkinDiagram.jpg/800px-HumanSkinDiagram.jpg",
        "title": "Skin layers",
        "caption": "Epidermis, dermis and hypodermis with adnexal structures.",
        "keywords": ["skin", "epidermis", "dermis", "integumentary", "pressure ulcer", "burn"],
    },

    # ---- CELL / MICRO ----
    {
        "id": "cell",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Animal_cell_structure_en.svg/800px-Animal_cell_structure_en.svg.png",
        "title": "Animal cell structure",
        "caption": "Nucleus, mitochondria, endoplasmic reticulum and other organelles.",
        "keywords": ["cell", "organelle", "nucleus", "mitochondria", "endoplasmic reticulum", "cytoplasm"],
    },
    {
        "id": "dna",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/DNA_Structure%2BKey%2BLabelled.pn_NoBB.png/800px-DNA_Structure%2BKey%2BLabelled.pn_NoBB.png",
        "title": "DNA double helix",
        "caption": "Base pairs, sugar-phosphate backbone and antiparallel strands.",
        "keywords": ["dna", "genetic", "chromosome", "double helix", "base pair", "nucleotide"],
    },
    {
        "id": "blood_cells",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Redbloodcells.jpg/800px-Redbloodcells.jpg",
        "title": "Red blood cells",
        "caption": "Scanning electron micrograph of erythrocytes.",
        "keywords": ["blood cell", "red blood cell", "erythrocyte", "rbc", "hemoglobin", "anemia"],
    },
    {
        "id": "immune",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Lymphatic_system.svg/500px-Lymphatic_system.svg.png",
        "title": "Lymphatic & immune system",
        "caption": "Lymph nodes, thymus, spleen and lymphatic vessels.",
        "keywords": ["lymphatic", "lymph node", "immune", "spleen", "thymus", "wbc", "white blood cell"],
    },

    # ---- CLINICAL / EMERGENCY ----
    {
        "id": "cpr",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/CPR_training-04.jpg/800px-CPR_training-04.jpg",
        "title": "CPR compression technique",
        "caption": "Correct hand position and depth for high-quality chest compressions.",
        "keywords": ["cpr", "chest compression", "resuscitation", "bls", "acls", "cardiac arrest"],
    },
    {
        "id": "iv_cannula",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Intravenous_therapy_2007-SEP-13.jpg/800px-Intravenous_therapy_2007-SEP-13.jpg",
        "title": "IV cannulation",
        "caption": "Peripheral intravenous cannula placement.",
        "keywords": ["iv", "cannula", "cannulation", "peripheral line", "intravenous"],
    },
    {
        "id": "abg_map",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Davenport_diagram.svg/800px-Davenport_diagram.svg.png",
        "title": "Acid-base (Davenport diagram)",
        "caption": "Interpreting ABG — respiratory vs metabolic acidosis and alkalosis.",
        "keywords": ["abg", "acid-base", "acid base", "acidosis", "alkalosis", "ph", "bicarbonate", "hco3", "paco2"],
    },
]


# Pre-compile regex for each keyword once
def _compile():
    for entry in MEDICAL_IMAGE_CATALOG:
        entry["_patterns"] = [
            re.compile(rf"\b{re.escape(k)}\b", re.IGNORECASE) for k in entry["keywords"]
        ]
_compile()


def detect_medical_images(text: str, max_images: int = 3) -> List[Dict]:
    """Scan free-form text and return up to `max_images` matching medical images.

    Ranks images by number of keyword hits so the most relevant image comes first.
    """
    if not text or not isinstance(text, str):
        return []
    scores: List[tuple] = []  # (hits, index, entry)
    for i, entry in enumerate(MEDICAL_IMAGE_CATALOG):
        hits = 0
        for pat in entry["_patterns"]:
            if pat.search(text):
                hits += 1
        if hits > 0:
            scores.append((hits, i, entry))
    if not scores:
        return []
    # Higher hits first; stable by original order for tie-breaks
    scores.sort(key=lambda x: (-x[0], x[1]))
    out = []
    for _, _, e in scores[:max_images]:
        out.append({
            "id": e["id"],
            "url": e["url"],
            "title": e["title"],
            "caption": e["caption"],
        })
    return out
