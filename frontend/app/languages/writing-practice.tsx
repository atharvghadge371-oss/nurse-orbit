import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import {
  colors,
  minTouchTarget,
  screenContentBottomPadding,
  spacing,
  radius,
} from "@/src/theme";

type TaskType = "oet" | "ielts" | "german";

const TASKS = [
  { id: "oet" as TaskType, label: "OET Letter", icon: "🩺" },
  { id: "ielts" as TaskType, label: "IELTS Essay", icon: "🌐" },
  { id: "german" as TaskType, label: "German Writing", icon: "🇩🇪" },
];

const PROMPTS: Record<TaskType, { title: string; prompt: string; sample: string }> = {
  oet: {
    title: "OET Writing Task: Discharge Referral Letter",
    prompt:
      "Patient: Mr. Arthur Pendelton (DOB: 14/05/1958). Admitted with infected left diabetic heel ulcer. Completed 5-day IV Flucloxacillin. Wound clean, granulating. Vital signs stable. Blood glucose: 7.2 mmol/L. Needs daily saline dressings and glucose monitoring by the community health team.",
    sample:
      "Dear Community Nurse,\n\n" +
      "Re: Mr. Arthur Pendelton, DOB: 14/05/1958\n\n" +
      "I am writing to refer Mr. Pendelton, a 68-year-old retired engineer, who was admitted on 17th September with an infected diabetic ulcer on his left heel. He is being discharged today following successful antibiotic therapy and wound debridement.\n\n" +
      "During his admission, Mr. Pendelton completed a five-day course of intravenous Flucloxacillin. His wound now shows healthy granulation tissue without erythema or exudate. His vital signs remain within normal limits and his fasting blood glucose was recorded at 7.2 mmol/L this morning.\n\n" +
      "Could you please arrange daily visits to inspect the heel ulcer and apply a sterile hydrocolloid dressing? In addition, kindly monitor his blood glucose levels and reinforce adherence to his diabetic diet.\n\n" +
      "Yours sincerely,\n" +
      "Registered Nurse\nWard 4B, St. Jude's Hospital",
  },
  ielts: {
    title: "IELTS Academic Task 2: Healthcare Systems",
    prompt:
      "Some people believe healthcare should be completely free and state-funded for all citizens, while others believe individuals should carry private health insurance to fund high-cost treatments. Discuss both views and give your opinion.",
    sample:
      "The provision of healthcare is a cornerstone of any civilized society. While proponents of universal state-funded care emphasize equality of access, advocates of private health insurance argue that mixed systems alleviate the fiscal burden on public services. This essay will examine both perspectives before arguing that a hybrid model ensures both fairness and long-term sustainability.\n\n" +
      "On the one hand, state-funded healthcare prevents catastrophic poverty caused by medical emergencies. In systems like the UK NHS, patients receive emergency and oncology care regardless of income. This protects vulnerable demographics including geriatric and pediatric patients.\n\n" +
      "On the other hand, public budgets frequently face severe shortages. Private health insurance allows affluent patients to finance elective procedures, thereby freeing resources for critical public health priorities.\n\n" +
      "In conclusion, while basic and emergency medical treatments should remain universal and public, allowing supplemental private health insurance provides vital capacity to modern healthcare infrastructures.",
  },
  german: {
    title: "Pflegebericht: Post-operative Wund- & Mobilisationsdokumentation",
    prompt:
      "Patientin: Frau Erika Schmidt, 74 Jahre. Zustand nach HTEP rechts vor 2 Tagen. Vitalwerte stabil (RR 125/80, Puls 74, SpO2 97%). Wunde reizlos, Redon gezogen. Erste Gehversuche mit Rollator im Zimmer.",
    sample:
      "Pflegebericht (Frühdienst):\n\n" +
      "Pat. Frau Erika Schmidt (74 J.) ist wach, orientiert und in gutem Allgemeinzustand nach HTEP rechts am 18.09.\n\n" +
      "Vitalwerte um 08:00 Uhr: RR 125/80 mmHg, HF 74/min, SpO2 97% bei Raumluft, schmerzfrei in Ruhe (NRS 1/10). Bei Bewegung Schmerzen NRS 3/10; Bedarfsmedikation Paracetamol 1000mg p.o. mit gutem Effekt verabreicht.\n\n" +
      "Wundkontrolle: Verband trocken, reizlose Wundverhältnisse, kein Hämatom. Redondrainage wurde nach ärztlicher Anordnung schmerzarm gezogen.\n\n" +
      "Mobilisation: Mit Unterstützung der Physiotherapie und Pflegekraft erste Gehversuche mit Rollator im Zimmer unternommen. Kreislauf stabil.\n\n" +
      "Unterschrift: P. Müller, examinierte Pflegefachkraft",
  },
};

export default function WritingPracticeScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const initialTask: TaskType =
    params.type === "ielts" ? "ielts" : params.type === "german" ? "german" : "oet";
  const [activeTask, setActiveTask] = useState<TaskType>(initialTask);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<any | null>(null);

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const currentPrompt = PROMPTS[activeTask];

  const handleInsertSample = () => {
    setInputText(currentPrompt.sample);
    setFeedback(null);
  };

  const handleEvaluate = async () => {
    const text = inputText.trim();
    if (!text) {
      Alert.alert("Text required", "Please enter or paste your written draft before requesting assessment.");
      return;
    }
    if (text.length < 50) {
      Alert.alert("Draft too short", "Please provide a more complete draft (at least 50 characters) for meaningful clinical assessment.");
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.oetWritingFeedback(text);
      setFeedback(res);
    } catch (err: any) {
      Alert.alert("Evaluation Error", err.message || "Could not generate feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getGradeStyle = (grade: string) => {
    const g = (grade || "").toUpperCase();
    if (g.startsWith("A") || g.includes("BAND 8") || g.includes("BAND 9") || g.includes("SEHR GUT")) {
      return { bg: "#DCFCE7", text: "#166534", border: "#BBF7D0" };
    }
    if (g.startsWith("B") || g.includes("BAND 7") || g.includes("GUT")) {
      return { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" };
    }
    if (g.includes("C+") || g.includes("BAND 6.5")) {
      return { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" };
    }
    return { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="writing-practice-back-btn"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Clinical Writing Lab</Text>
          <Text style={styles.headerSub}>AI Assessment & Feedback</Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom:
            screenContentBottomPadding(insets.bottom) + minTouchTarget + spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Task Selector Tabs */}
        <View style={styles.taskSelector}>
          {TASKS.map((t) => {
            const isSelected = activeTask === t.id;
            return (
              <Pressable
                key={t.id}
                testID={`writing-tab-${t.id}`}
                onPress={() => {
                  setActiveTask(t.id);
                  setFeedback(null);
                }}
                style={[styles.taskTab, isSelected && styles.taskTabActive]}
              >
                <Text style={styles.taskTabEmoji}>{t.icon}</Text>
                <Text style={[styles.taskTabText, isSelected && styles.taskTabTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Prompt Card */}
        <View style={styles.promptCard}>
          <View style={styles.promptHeaderRow}>
            <Text style={styles.promptTitle}>{currentPrompt.title}</Text>
            <Pressable
              testID="writing-insert-sample-btn"
              onPress={handleInsertSample}
              style={styles.sampleBtn}
            >
              <Text style={styles.sampleBtnText}>+ Insert Sample</Text>
            </Pressable>
          </View>
          <Text style={styles.promptText}>{currentPrompt.prompt}</Text>
        </View>

        {/* Text Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputMetaRow}>
            <Text style={styles.inputLabel}>YOUR DRAFT</Text>
            <Text style={styles.inputCounters}>
              {wordCount} words · {inputText.length} characters
            </Text>
          </View>
          <TextInput
            testID="writing-draft-input"
            style={styles.textInput}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            placeholder="Type or paste your clinical referral letter, essay, or ward report here..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
          />
        </View>

        {/* Submit Action */}
        <Pressable
          testID="writing-evaluate-btn"
          onPress={handleEvaluate}
          disabled={loading || !inputText.trim()}
          style={({ pressed }) => [
            styles.submitBtn,
            (!inputText.trim() || loading) && styles.submitBtnDisabled,
            pressed && { opacity: 0.9 },
          ]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.submitBtnText}>Analyzing clinical register & grammar...</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Get AI Feedback →</Text>
          )}
        </Pressable>

        {/* AI Feedback Report */}
        {feedback && (
          <View style={styles.feedbackContainer}>
            <View style={styles.feedbackHeaderRow}>
              <View style={styles.feedbackTitleWrap}>
                <Text style={styles.feedbackTitle}>Assessment Result</Text>
                <Text style={styles.feedbackSubtitle}>Evaluated against clinical criteria</Text>
              </View>
              {feedback.grade ? (
                <View
                  style={[
                    styles.gradeBadge,
                    {
                      backgroundColor: getGradeStyle(feedback.grade).bg,
                      borderColor: getGradeStyle(feedback.grade).border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.gradeBadgeText,
                      { color: getGradeStyle(feedback.grade).text },
                    ]}
                  >
                    Grade {feedback.grade}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* General Feedback */}
            <Text style={styles.feedbackBodyText}>{feedback.feedback}</Text>

            {/* Strengths */}
            {Array.isArray(feedback.strengths) && feedback.strengths.length > 0 && (
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackSectionHeading}>CLINICAL STRENGTHS</Text>
                {feedback.strengths.map((str: string, idx: number) => (
                  <View key={idx} style={styles.feedbackRow}>
                    <Text style={styles.greenCheck}>✓</Text>
                    <Text style={styles.feedbackRowText}>{str}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Improvements */}
            {Array.isArray(feedback.improvements) && feedback.improvements.length > 0 && (
              <View style={styles.feedbackSection}>
                <Text style={[styles.feedbackSectionHeading, { color: "#D97706" }]}>
                  RECOMMENDED IMPROVEMENTS
                </Text>
                {feedback.improvements.map((imp: string, idx: number) => (
                  <View key={idx} style={styles.feedbackRow}>
                    <Text style={styles.amberAlert}>▲</Text>
                    <Text style={styles.feedbackRowText}>{imp}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 28,
    color: colors.brandPrimary,
    fontWeight: "600",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
  },
  headerSub: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
    marginTop: 1,
  },
  headerRightPlaceholder: {
    width: minTouchTarget,
  },
  taskSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.md,
  },
  taskTab: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskTabActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  taskTabEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  taskTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    textAlign: "center",
  },
  taskTabTextActive: {
    color: "#FFFFFF",
  },
  promptCard: {
    backgroundColor: "#F0F9FF",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    marginBottom: spacing.md,
  },
  promptHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  promptTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0369A1",
    flex: 1,
  },
  sampleBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  sampleBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284C7",
  },
  promptText: {
    fontSize: 12,
    color: "#0C4A6E",
    lineHeight: 17,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  inputMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  inputCounters: {
    fontSize: 11,
    color: colors.muted,
  },
  textInput: {
    minHeight: 180,
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
    fontFamily: undefined,
  },
  submitBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: minTouchTarget,
    marginBottom: spacing.xl,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  feedbackContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  feedbackHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  feedbackTitleWrap: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
  },
  feedbackSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  gradeBadgeText: {
    fontSize: 14,
    fontWeight: "900",
  },
  feedbackBodyText: {
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 19,
    marginBottom: 16,
  },
  feedbackSection: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 12,
  },
  feedbackSectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.success,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  greenCheck: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.success,
    marginRight: 6,
    marginTop: 1,
  },
  amberAlert: {
    fontSize: 10,
    color: "#D97706",
    marginRight: 6,
    marginTop: 3,
  },
  feedbackRowText: {
    fontSize: 12,
    color: colors.onSurface,
    lineHeight: 17,
    flex: 1,
  },
});
