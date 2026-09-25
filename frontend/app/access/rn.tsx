import { AccessGrid } from "@/src/components/AccessGrid";
import { colors } from "@/src/theme";

const RN_TILES = [
  // RN-specific first
  { key: "roster", label: "Duty Roster", icon: "🗓️", color: "#0EA5E9", to: "/(tabs)/calendar", testID: "r-roster", sub: "Shift Calendar" },
  { key: "jobs", label: "Nursing Jobs", icon: "💼", color: "#F59E0B", to: "/jobs", testID: "r-jobs" },
  { key: "abroad", label: "Work Abroad", icon: "✈️", color: "#EA580C", to: "/abroad-list", testID: "r-abroad", sub: "Pathways" },
  { key: "career", label: "Career Growth", icon: "🚀", color: "#3B82F6", to: "/career", testID: "r-career" },
  { key: "passport", label: "Prof. Passport", icon: "🛡", color: colors.success, to: "/passport-list", testID: "r-passport" },
  { key: "cme", label: "CME Log", icon: "🏆", color: "#7C2D12", to: "/cme", testID: "r-cme" },
  // Shared with Student
  { key: "cases", label: "Clinical Cases", icon: "🩺", color: "#0D9488", to: "/cases", testID: "r-cases", sub: "Game sims" },
  { key: "emergency", label: "Emergency / Code Blue", icon: "🚨", color: "#B91C1C", to: "/emergency", testID: "r-emerg" },
  { key: "ecg", label: "ECG", icon: "🫀", color: "#DC2626", to: "/ecg-learning", testID: "r-ecg" },
  { key: "abg", label: "ABG & Vent", icon: "🫁", color: "#7C3AED", to: "/abg", testID: "r-abg" },
  { key: "skills", label: "Clinical Skills", icon: "👩‍⚕️", color: "#0F172A", to: "/clinical-skills", testID: "r-skills" },
  { key: "procedures", label: "Procedures", icon: "📋", color: "#0891B2", to: "/procedures", testID: "r-procedures" },
  { key: "drugs", label: "Drug Guide", icon: "💊", color: colors.warning, to: "/drug-guide", testID: "r-drugs" },
  { key: "library", label: "Nursing Library", icon: "📚", color: "#1E3A8A", to: "/library", testID: "r-library" },
  { key: "pediatric", label: "Pediatric Tools", icon: "🧒", color: "#EC4899", to: "/pediatric", testID: "r-ped" },
  { key: "scope", label: "Nursing Scope", icon: "🌍", color: "#0EA5E9", to: "/nursing-scope", testID: "r-scope" },
];

export default function RNAccess() {
  return (
    <AccessGrid
      role="Registered Nurse Access"
      tagline="Duty · Career · Practice · Everything on one deck"
      gradient={["#1E3A8A", "#B91C1C"]}
      emoji="👩‍⚕️"
      tiles={RN_TILES}
    />
  );
}
