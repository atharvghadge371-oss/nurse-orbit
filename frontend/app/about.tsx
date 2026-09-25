import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/src/theme";

type Section = { emoji: string; title: string; points: string[] };

const SECTIONS: Section[] = [
  {
    emoji: "🤖",
    title: "AI Nurse Tutor",
    points: [
      "24/7 conversational tutor powered by Claude Sonnet 5.",
      "Five explain-levels: Simple, Student, Clinical, Exam, Quick.",
      "Cites chapters from your Nursing Library so answers are grounded.",
      "Auto-shows anatomy & clinical diagrams inline; tap to zoom.",
    ],
  },
  {
    emoji: "📚",
    title: "Digital Nursing Library",
    points: [
      "Full-quality original PDF viewer for uploaded textbooks.",
      "Chapter search, categories and full-text book search.",
      "Admins can add new books; AI reads the text for grounded answers.",
    ],
  },
  {
    emoji: "🩺",
    title: "Clinical Modules",
    points: [
      "Clinical case simulators with step-by-step decisions.",
      "ECG learning cases and rhythm interpretation.",
      "ABG interpreter with primary disorder + compensation.",
      "Ventilator basics, Emergency / Code Blue quick-reference.",
      "Clinical Skills library with procedure guides.",
    ],
  },
  {
    emoji: "💊",
    title: "Drug Intelligence",
    points: [
      "Drug guide with mechanism, dose, side-effects, nursing notes.",
      "Pediatric hub: Broselow cart (9 colour zones), weight-based dose calculator for 40+ drugs, IV fluid maintenance (Holliday-Segar), IV drip rate, BSA (Mosteller).",
      "Built-in safety guardrails: max-single-dose cap + reference mg/kg range.",
    ],
  },
  {
    emoji: "🗓️",
    title: "Shift Roster & Leave Planner",
    points: [
      "Colour-coded roster: Day / Evening / Night / Off at a glance.",
      "Shift-pattern generator (e.g. 4 duty / 4 off / 4 night / 4 off).",
      "Custom AL math: only working days consume balance.",
      "Live counters — AL & sick remaining, night shifts in last 6 months, CME hours YTD.",
      "Suggests earliest 2-week AL windows based on your balance.",
    ],
  },
  {
    emoji: "🌐",
    title: "Medical Translator",
    points: [
      "Translate patient-communication phrases into 50+ languages.",
      "Three tones: Patient, Medical, Casual — preserves drug names, dosages, units.",
      "Tap 🔊 Speak to hear the translation in the target language (OpenAI TTS).",
      "10 pre-loaded quick phrases for everyday nursing use.",
    ],
  },
  {
    emoji: "🎓",
    title: "Exam & NCLEX Prep",
    points: [
      "MCQ practice bank across pharmacology, med-surg, fundamentals, mental health, pediatrics, obstetrics, critical care, emergency.",
      "Timed mock exams for NCLEX-RN, HAAD, DHA, Prometric, OSCE.",
      "Personalized learning plans based on your focus areas.",
    ],
  },
  {
    emoji: "🛡",
    title: "Professional Passport",
    points: [
      "Secure vault for your licence, degree, CV, immunizations, offer letters.",
      "Cloud object storage with per-user isolation.",
      "One-tap share links for prospective employers.",
    ],
  },
  {
    emoji: "✈️",
    title: "Work Abroad Pathways",
    points: [
      "Step-by-step licensing pathways for UAE, UK, USA, Canada, Germany, KSA, Australia.",
      "Required documents, exam list, expected timeline and cost estimates.",
      "Curated nursing-job feed and news updates from major recruiters.",
    ],
  },
  {
    emoji: "🏆",
    title: "Gamification",
    points: [
      "XP, streaks, levels and badges as you learn.",
      "Daily study goal on the Home dashboard.",
      "Focus-area recommendations tuned to your role.",
    ],
  },
];

const STACK = [
  "Expo React Native (iOS + Android)",
  "FastAPI + MongoDB backend",
  "Claude Sonnet 5 · OpenAI TTS / Whisper",
  "Emergent Object Storage for PDFs & documents",
  "JWT auth · Argon2 password hashing",
];

export default function About() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="ab-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title}>About Nurse Orbit</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: 14 }}>
        <View style={styles.hero}>
          <Text style={styles.heroLogo}>🌐</Text>
          <Text style={styles.heroTitle}>Nurse Orbit</Text>
          <Text style={styles.heroTag}>Your AI Nursing Companion</Text>
          <Text style={styles.heroDesc}>
            One complete platform for nursing students, staff nurses and international nurses — learn, license, work and grow.
            Study smarter with an AI tutor that speaks your language, keep your career documents safe, plan shifts and leaves,
            look up drugs and pediatric doses in seconds, and prepare for exams anywhere in the world.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Languages" value="50+" />
          <Stat label="Pediatric drugs" value="40+" />
          <Stat label="Broselow zones" value="9" />
          <Stat label="Countries" value="7" />
        </View>

        <Text style={styles.sectionH}>What's inside</Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
              <Text style={styles.cardTitle}>{s.title}</Text>
            </View>
            {s.points.map((p, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{p}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.sectionH}>Built with</Text>
        <View style={styles.card}>
          {STACK.map((s) => (
            <View key={s} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>◆</Text>
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerH}>Educational use only</Text>
          <Text style={styles.disclaimerT}>
            Nurse Orbit is an educational companion. It does not replace professional clinical judgement,
            local institutional protocols or licensed healthcare advice. Always verify drug doses, care plans and
            protocols with your prescriber and workplace guidelines before administering to a patient.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤ for nurses worldwide</Text>
          <Pressable onPress={() => Linking.openURL("mailto:support@nurseorbit.app")}>
            <Text style={styles.link}>support@nurseorbit.app</Text>
          </Pressable>
          <Text style={styles.version}>Version 1.0 · June 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  hero: { alignItems: "center", padding: 20, backgroundColor: colors.brand, borderRadius: radius.lg, gap: 6 },
  heroLogo: { fontSize: 48 },
  heroTitle: { color: "#FFF", fontSize: 26, fontWeight: "900", letterSpacing: 0.5 },
  heroTag: { color: "#E0F2FE", fontSize: 13, fontWeight: "700" },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  statValue: { color: colors.brandPrimary, fontSize: 22, fontWeight: "900" },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 2, textAlign: "center" },
  sectionH: { color: colors.onSurface, fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 6 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bulletDot: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800", marginTop: 1 },
  bulletText: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19 },
  disclaimer: { padding: 14, borderRadius: radius.md, backgroundColor: "#FEF3C7" },
  disclaimerH: { color: "#78350F", fontSize: 13, fontWeight: "800", marginBottom: 4 },
  disclaimerT: { color: "#92400E", fontSize: 12, lineHeight: 18 },
  footer: { alignItems: "center", marginTop: 12, gap: 6 },
  footerText: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  link: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", textDecorationLine: "underline" },
  version: { color: colors.muted, fontSize: 11, marginTop: 4 },
});
