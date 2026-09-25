import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { colors, minTouchTarget, spacing, radius } from "@/src/theme";

type Step = {
  key: string;
  title: string;
  subtitle?: string;
  options: { label: string; icon?: string }[];
  multi?: boolean;
  optional?: boolean;
};

const STEPS: Step[] = [
  {
    key: "user_type",
    title: "What are you?",
    subtitle: "Choose your primary role — we'll personalize your content.",
    options: [
      { label: "Nursing Student", icon: "👩‍🎓" },
      { label: "Staff Nurse", icon: "👩‍⚕️" },
      { label: "ICU Nurse", icon: "🏥" },
      { label: "Emergency Nurse", icon: "🚨" },
      { label: "Critical Care Nurse", icon: "🫀" },
      { label: "Nurse Educator", icon: "🎓" },
      { label: "NCLEX Candidate", icon: "📝" },
      { label: "International Nurse", icon: "🌎" },
    ],
  },
  {
    key: "program",
    title: "What program are you studying?",
    subtitle: "Skip if not applicable.",
    optional: true,
    options: [
      { label: "ANM" }, { label: "GNM" }, { label: "B.Sc Nursing" },
      { label: "Post Basic B.Sc Nursing" }, { label: "M.Sc Nursing" }, { label: "Other" },
    ],
  },
  {
    key: "year",
    title: "What year are you in?",
    subtitle: "Skip if not applicable.",
    optional: true,
    options: [
      { label: "1st Year" }, { label: "2nd Year" }, { label: "3rd Year" },
      { label: "4th Year" }, { label: "Postgraduate" },
    ],
  },
  {
    key: "language",
    title: "Preferred language",
    subtitle: "English medical terminology is kept in every language.",
    options: [
      { label: "English", icon: "🇬🇧" },
      { label: "Hindi", icon: "🇮🇳" },
      { label: "Hinglish", icon: "🗣" },
    ],
  },
  {
    key: "country",
    title: "Where are you based?",
    subtitle: "Helps us surface relevant licensing pathways.",
    options: [
      { label: "India" }, { label: "UAE" }, { label: "Saudi Arabia" },
      { label: "Philippines" }, { label: "UK" }, { label: "USA" },
      { label: "Canada" }, { label: "Australia" }, { label: "Germany" }, { label: "Other" },
    ],
  },
  {
    key: "focus_areas",
    title: "What would you like to improve?",
    subtitle: "Choose multiple. We'll build your personal dashboard.",
    multi: true,
    options: [
      "Nursing Fundamentals", "Medical-Surgical Nursing", "Pharmacology",
      "Anatomy & Physiology", "Pathology", "Microbiology",
      "Community Health", "Pediatric Nursing", "Obstetric Nursing",
      "Mental Health", "Critical Care", "Emergency Nursing",
      "ECG", "ABG", "Ventilator",
      "Nursing Diagnosis", "Care Plans", "Clinical Skills",
      "MCQs", "NCLEX", "Prometric",
    ].map((label) => ({ label })),
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { saveOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({ focus_areas: [] });
  const [busy, setBusy] = useState(false);

  const current = STEPS[step];
  const value = answers[current.key];
  const isMulti = !!current.multi;
  const hasAnswer = isMulti ? (Array.isArray(value) && value.length > 0) : !!value;
  const canContinue = current.optional || hasAnswer;

  const toggle = (label: string) => {
    if (isMulti) {
      const cur: string[] = Array.isArray(value) ? value : [];
      setAnswers({ ...answers, [current.key]: cur.includes(label) ? cur.filter((v) => v !== label) : [...cur, label] });
    } else {
      setAnswers({ ...answers, [current.key]: label });
    }
  };

  const next = async () => {
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    setBusy(true);
    try {
      await saveOnboarding({ ...answers, goal: answers.focus_areas?.[0] || "Nursing Fundamentals" });
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} /></View>
        <Text style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 128 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{current.title}</Text>
        {current.subtitle && <Text style={styles.subtitle}>{current.subtitle}</Text>}

        <View style={styles.optWrap}>
          {current.options.map((opt) => {
            const active = isMulti ? (Array.isArray(value) && value.includes(opt.label)) : value === opt.label;
            const key = `${current.key}-${opt.label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
            return (
              <Pressable key={opt.label} testID={`opt-${key}`} onPress={() => toggle(opt.label)} style={[styles.option, active && styles.optionActive, isMulti && styles.optionMulti]}>
                {opt.icon && <Text style={styles.optIcon}>{opt.icon}</Text>}
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label}</Text>
                {active && <View style={styles.checkDot} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {step > 0 && (
          <Pressable testID="onb-back" onPress={() => setStep(step - 1)} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}
        {current.optional && !hasAnswer && (
          <Pressable testID="onb-skip" onPress={next} style={styles.backBtn}>
            <Text style={styles.backText}>Skip</Text>
          </Pressable>
        )}
        <Pressable
          testID="onb-next"
          disabled={!canContinue || busy}
          style={[styles.primary, (!canContinue || busy) && { opacity: 0.4 }]}
          onPress={next}
        >
          <Text style={styles.primaryText}>{step === STEPS.length - 1 ? (busy ? "Finishing..." : "Finish") : "Continue"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: 12, gap: 8 },
  progressBar: { height: 6, backgroundColor: colors.surfaceTertiary, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.brandSecondary },
  stepLabel: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  body: { padding: spacing.lg, paddingTop: spacing.md },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800", lineHeight: 32 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 6, lineHeight: 20 },
  optWrap: { gap: 10, marginTop: 24 },
  option: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, gap: 12 },
  optionMulti: { paddingVertical: 12 },
  optionActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  optIcon: { fontSize: 22 },
  optionText: { flex: 1, color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  optionTextActive: { color: colors.brandPrimary },
  checkDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brandSecondary },
  footer: { flexDirection: "row", gap: 12, padding: spacing.lg, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  backBtn: { minHeight: minTouchTarget, justifyContent: "center", paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.lg, backgroundColor: colors.surfaceTertiary },
  backText: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  primary: { flex: 1, minHeight: minTouchTarget, justifyContent: "center", backgroundColor: colors.brandPrimary, padding: 12, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
