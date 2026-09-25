import { AccessGrid, AccessSection } from "@/src/components/AccessGrid";
import { colors } from "@/src/theme";

// The Student Nurse area follows the 10 pillars from the Nurse Orbit student vision:
// the university teaches the curriculum; Nurse Orbit helps the student learn, practise,
// simulate, prepare, track and build their career around it.
const STUDENT_PILLARS: AccessSection[] = [
  {
    n: 1, title: "My Nursing Journey", desc: "Year-wise curriculum and personalised learning plan",
    tiles: [
      { key: "journey", label: "My Journey", icon: "🧭", color: "#0D9488", to: "/journey", testID: "s-journey", sub: "Progress · 7-day plan" },
      { key: "academy", label: "Nursing Academy", icon: "🎓", color: "#0369A1", to: "/academy", testID: "s-academy", sub: "Year 1-4 subjects" },
    ],
  },
  {
    n: 2, title: "Orbit AI Tutor", desc: "Explanations, visual learning, care plans and clinical reasoning",
    tiles: [
      { key: "ai", label: "Orbit AI Tutor", icon: "🤖", color: "#1E3A8A", to: "/(tabs)/ai-tab", testID: "s-ai", sub: "Ask anything" },
      { key: "careplans", label: "Care Plans", icon: "📝", color: "#059669", to: "/care-plans", testID: "s-cp" },
      { key: "diagnosis", label: "Nursing Diagnosis", icon: "🧠", color: "#8B5CF6", to: "/nursing-diagnosis", testID: "s-diag" },
    ],
  },
  {
    n: 3, title: "Clinical Simulation", desc: "Virtual patients and emergency scenarios",
    tiles: [
      { key: "cases", label: "Clinical Cases", icon: "🩺", color: "#0D9488", to: "/cases", testID: "s-cases", sub: "Game sims" },
      { key: "emergency", label: "Emergency / Code Blue", icon: "🚨", color: "#B91C1C", to: "/emergency", testID: "s-emerg", sub: "ACLS drills" },
      { key: "ecg", label: "ECG Learning", icon: "🫀", color: "#DC2626", to: "/ecg-learning", testID: "s-ecg" },
      { key: "abg", label: "ABG & Vent", icon: "🫁", color: "#7C3AED", to: "/abg", testID: "s-abg" },
    ],
  },
  {
    n: 4, title: "Skills Lab", desc: "Procedures, videos, checklists and OSCE practice",
    tiles: [
      { key: "osce", label: "OSCE Practice", icon: "🩺", color: "#0F766E", to: "/osce", testID: "s-osce" },
      { key: "procedures", label: "Procedures", icon: "📋", color: "#0891B2", to: "/procedures", testID: "s-procedures", sub: "Year 1-4" },
      { key: "skills", label: "Clinical Skills", icon: "👩‍⚕️", color: "#0F172A", to: "/clinical-skills", testID: "s-skills" },
    ],
  },
  {
    n: 5, title: "Drug & Medication Safety", desc: "Drug learning and dosage calculations",
    tiles: [
      { key: "drugs", label: "Drug Guide", icon: "💊", color: "#F59E0B", to: "/drug-guide", testID: "s-drugs" },
      { key: "dose", label: "Dose Calculator", icon: "🧮", color: "#EC4899", to: "/pediatric/dose", testID: "s-dose", sub: "Weight-based" },
      { key: "pediatric", label: "Pediatric Tools", icon: "🧒", color: "#DB2777", to: "/pediatric", testID: "s-ped" },
    ],
  },
  {
    n: 6, title: "Nursing Library", desc: "Books, journals, guidelines and references",
    tiles: [
      { key: "library", label: "Nursing Library", icon: "📚", color: "#1E3A8A", to: "/library", testID: "s-library", sub: "Books · search" },
    ],
  },
  {
    n: 7, title: "Exams & MCQs", desc: "NCLEX, university exams and licensing preparation",
    tiles: [
      { key: "nclex", label: "NCLEX Dashboard", icon: "🎯", color: "#7C2D12", to: "/nclex", testID: "s-nclex", sub: "Progress · weak areas" },
      { key: "qbank", label: "Question Bank", icon: "✍️", color: "#1E3A8A", to: "/(tabs)/exams", testID: "s-qbank" },
      { key: "mock", label: "Mock Exam", icon: "📝", color: "#EA580C", to: "/quiz/mock", testID: "s-mock", sub: "Timed" },
      { key: "weak", label: "Weak Areas", icon: "🔁", color: "#8B5CF6", to: "/quiz/weak", testID: "s-weak" },
    ],
  },
  {
    n: 8, title: "Languages", desc: "OET, IELTS and German for nurses",
    tiles: [
      { key: "languages", label: "Languages", icon: "🌍", color: "#0891B2", to: "/languages", testID: "s-lang", sub: "OET · IELTS · German" },
    ],
  },
  {
    n: 9, title: "Health & Wellness", desc: "Sleep, stress, activity, nutrition and wellbeing tracking",
    tiles: [
      { key: "health", label: "My Health", icon: "🧘", color: "#10B981", to: "/health", testID: "s-health", sub: "Daily check-in" },
    ],
  },
  {
    n: 10, title: "Career & Professional Portfolio", desc: "Specialty selection, CV, certificates, clinical experience and international pathways",
    tiles: [
      { key: "logbook", label: "Clinical Logbook", icon: "📓", color: "#7C3AED", to: "/logbook", testID: "s-logbook", sub: "Log placements" },
      { key: "portfolio", label: "Nursing Portfolio", icon: "🗂", color: "#4F46E5", to: "/logbook/portfolio", testID: "s-portfolio", sub: "Built from logbook" },
      { key: "scope", label: "Specialties", icon: "🌟", color: "#0EA5E9", to: "/nursing-scope", testID: "s-scope" },
      { key: "passport", label: "Certificates", icon: "🛡", color: colors.success, to: "/passport-list", testID: "s-passport", sub: "Prof. Passport" },
      { key: "career", label: "Career Development", icon: "🚀", color: "#3B82F6", to: "/career", testID: "s-career", sub: "Abroad · jobs" },
    ],
  },
];

export default function StudentAccess() {
  return (
    <AccessGrid
      role="Student Nurse Access"
      tagline="Learn · Practise · Simulate · Prepare · Track · Build your career"
      gradient={["#0D9488", "#0369A1"]}
      emoji="🎓"
      sections={STUDENT_PILLARS}
    />
  );
}
