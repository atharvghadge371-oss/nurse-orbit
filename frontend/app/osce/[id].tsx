import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

type ChecklistItem = {
  step: number;
  action: string;
  marks: number;
};

type Station = {
  id: string;
  category: string;
  title: string;
  duration_minutes: number;
  difficulty: "easy" | "medium" | "hard";
  examiner_instructions: string;
  scenario: string;
  checklist: ChecklistItem[];
  total_marks: number;
  pass_mark: number;
  key_points: string[];
  common_mistakes: string[];
  tips: string;
};

type AttemptResult = {
  scored_marks: number;
  total_marks: number;
  pass_mark: number;
  percentage: number;
  passed: boolean;
  missed_steps: ChecklistItem[];
  xp_awarded: number;
  attempt_id: string;
};

type Screen = "overview" | "checklist" | "result" | "ai-feedback";

const DIFFICULTY_COLORS = {
  easy: colors.success,
  medium: colors.warning,
  hard: colors.error,
};

export default function OsceStation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("overview");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [aiFeedback, setAiFeedback] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [expandedInfo, setExpandedInfo] = useState<"key_points" | "mistakes" | null>(null);
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    api.osceStation(id as string).then((data: Station) => {
      setStation(data);
      setLoading(false);
    }).catch((e: any) => {
      Alert.alert("Error", e.message || "Failed to load station");
      router.back();
    });
  }, [id]);

  const toggleStep = (step: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const currentMarks = station
    ? station.checklist.filter((i) => checked.has(i.step)).reduce((acc, i) => acc + i.marks, 0)
    : 0;

  const handleSubmit = async () => {
    if (!station) return;
    setSubmitting(true);
    try {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const res = await api.osceAttempt(
        station.id,
        Array.from(checked),
        elapsed,
        notes.trim()
      );
      setResult(res);
      setScreen("result");
      Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit attempt");
    } finally {
      setSubmitting(false);
    }
  };

  const startAiFeedback = useCallback(() => {
    if (!station || !result) return;
    setScreen("ai-feedback");
    setAiFeedback("");
    setAiError(null);
    setAiStreaming(true);
    api.osceAiExaminerStream(
      station.id,
      Array.from(checked),
      notes,
      (delta) => setAiFeedback((prev) => prev + delta),
      () => setAiStreaming(false),
      (err) => { setAiError(err); setAiStreaming(false); }
    );
  }, [station, result, checked, notes]);

  if (loading || !station) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
        <Text style={styles.loadingText}>Loading station…</Text>
      </View>
    );
  }

  const diffColor = DIFFICULTY_COLORS[station.difficulty] ?? colors.brandPrimary;

  // ─── Overview Screen ───────────────────────────────────────────────────────
  if (screen === "overview") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brandPrimary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="station-back">
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{station.title}</Text>
          <View style={[styles.diffBadge, { backgroundColor: `${diffColor}22` }]}>
            <Text style={[styles.diffBadgeText, { color: diffColor }]}>
              {station.difficulty.charAt(0).toUpperCase() + station.difficulty.slice(1)}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
          {/* Meta strip */}
          <View style={styles.metaStrip}>
            <View style={styles.metaPill}><Text style={styles.metaIcon}>⏱</Text><Text style={styles.metaLabel}>{station.duration_minutes} min</Text></View>
            <View style={styles.metaPill}><Text style={styles.metaIcon}>🏥</Text><Text style={styles.metaLabel}>{station.category}</Text></View>
            <View style={styles.metaPill}><Text style={styles.metaIcon}>🎯</Text><Text style={styles.metaLabel}>{station.pass_mark}/{station.total_marks} marks</Text></View>
            <View style={styles.metaPill}><Text style={styles.metaIcon}>✅</Text><Text style={styles.metaLabel}>{station.checklist.length} steps</Text></View>
          </View>

          {/* Scenario */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Clinical Scenario</Text>
            <View style={styles.scenarioCard}>
              <Text style={styles.scenarioText}>{station.scenario}</Text>
            </View>
          </View>

          {/* Examiner Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👁 Examiner Instructions</Text>
            <View style={styles.examinerCard}>
              <Text style={styles.examinerText}>{station.examiner_instructions}</Text>
            </View>
          </View>

          {/* Key Points */}
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setExpandedInfo(expandedInfo === "key_points" ? null : "key_points")}
            testID="toggle-key-points"
          >
            <Text style={styles.accordionTitle}>🔑 Key Points</Text>
            <Text style={styles.accordionChevron}>{expandedInfo === "key_points" ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          {expandedInfo === "key_points" && (
            <View style={styles.accordionBody}>
              {station.key_points.map((pt, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{pt}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Common Mistakes */}
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setExpandedInfo(expandedInfo === "mistakes" ? null : "mistakes")}
            testID="toggle-mistakes"
          >
            <Text style={styles.accordionTitle}>⚠️ Common Mistakes</Text>
            <Text style={styles.accordionChevron}>{expandedInfo === "mistakes" ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          {expandedInfo === "mistakes" && (
            <View style={styles.accordionBody}>
              {station.common_mistakes.map((m, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: colors.error }]}>✗</Text>
                  <Text style={styles.bulletText}>{m}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tips */}
          <View style={[styles.section, { marginTop: spacing.sm }]}>
            <View style={styles.tipsCard}>
              <Text style={styles.tipTitle}>💡 Exam Tip</Text>
              <Text style={styles.tipBody}>{station.tips}</Text>
            </View>
          </View>

          {/* Checklist preview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Checklist Preview ({station.checklist.length} steps)</Text>
            {station.checklist.slice(0, 4).map((item) => (
              <View key={item.step} style={styles.previewStep}>
                <View style={styles.previewStepNum}><Text style={styles.previewStepNumText}>{item.step}</Text></View>
                <Text style={styles.previewStepText} numberOfLines={1}>{item.action}</Text>
                <Text style={styles.previewStepMarks}>{item.marks}m</Text>
              </View>
            ))}
            {station.checklist.length > 4 && (
              <Text style={styles.previewMore}>+ {station.checklist.length - 4} more steps…</Text>
            )}
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => setScreen("checklist")}
            testID="start-checklist-btn"
          >
            <Text style={styles.startBtnText}>Start Checklist Practice →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Checklist Screen ──────────────────────────────────────────────────────
  if (screen === "checklist") {
    const pct = station.total_marks > 0 ? (currentMarks / station.total_marks) * 100 : 0;
    const passPct = (station.pass_mark / station.total_marks) * 100;
    const onTrack = currentMarks >= station.pass_mark;

    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brandPrimary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setScreen("overview")} testID="checklist-back">
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{station.title}</Text>
          <Text style={styles.headerMeta}>{station.checklist.length} steps</Text>
        </View>

        {/* Score bar */}
        <View style={styles.scoreBar}>
          <View style={styles.scoreBarInfo}>
            <Text style={styles.scoreText}>{currentMarks}/{station.total_marks} marks</Text>
            <Text style={[styles.scoreStatus, { color: onTrack ? colors.success : colors.error }]}>
              {onTrack ? "✓ Passing" : `Need ${station.pass_mark - currentMarks} more`}
            </Text>
          </View>
          <View style={styles.scoreProgress}>
            <View style={[styles.scoreProgressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: onTrack ? colors.success : colors.warning }]} />
            <View style={[styles.scorePassMark, { left: `${passPct}%` }]} />
          </View>
          <Text style={styles.scoreHelper}>Pass: {station.pass_mark}/{station.total_marks}</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.checklistInstruction}>
            Tick each step you performed correctly during your practice
          </Text>

          {station.checklist.map((item) => {
            const isChecked = checked.has(item.step);
            return (
              <TouchableOpacity
                key={item.step}
                style={[styles.checkRow, isChecked && styles.checkRowChecked]}
                onPress={() => toggleStep(item.step)}
                activeOpacity={0.75}
                testID={`step-${item.step}`}
              >
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <View style={styles.checkContent}>
                  <View style={styles.checkStepLabel}>
                    <Text style={styles.checkStepNum}>Step {item.step}</Text>
                    <View style={styles.marksBadge}>
                      <Text style={styles.marksBadgeText}>{item.marks} {item.marks === 1 ? "mark" : "marks"}</Text>
                    </View>
                  </View>
                  <Text style={[styles.checkAction, isChecked && styles.checkActionChecked]}>{item.action}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Self notes */}
          <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
            <Text style={styles.sectionTitle}>📝 Self-Reflection Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              placeholder="What went well? What did you struggle with? Any points to review…"
              placeholderTextColor={colors.muted}
              value={notes}
              onChangeText={setNotes}
              testID="notes-input"
            />
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.startBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
            testID="submit-checklist-btn"
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.startBtnText}>Submit & See Results →</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Result Screen ─────────────────────────────────────────────────────────
  if (screen === "result" && result) {
    const scale = scoreAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={result.passed ? "#059669" : "#B91C1C"} />
        <View style={[styles.header, { backgroundColor: result.passed ? "#059669" : "#B91C1C" }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/osce" as any)} testID="result-back">
            <Text style={styles.backBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Result</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          {/* Score hero */}
          <View style={[styles.resultHero, { backgroundColor: result.passed ? "#ECFDF5" : "#FEF2F2" }]}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <Text style={styles.resultEmoji}>{result.passed ? "✅" : "❌"}</Text>
              <Text style={styles.resultLabel}>{result.passed ? "PASSED" : "FAILED"}</Text>
              <Text style={styles.resultScore}>{result.scored_marks}/{result.total_marks}</Text>
              <Text style={styles.resultPct}>{result.percentage}%</Text>
            </Animated.View>
            <Text style={styles.resultPassmark}>Pass mark: {result.pass_mark}/{result.total_marks}</Text>
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>+{result.xp_awarded} XP earned!</Text>
            </View>
          </View>

          {/* Missed steps */}
          {result.missed_steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔍 Steps You Missed</Text>
              {result.missed_steps.map((ms) => (
                <View key={ms.step} style={styles.missedRow}>
                  <View style={styles.missedNum}><Text style={styles.missedNumText}>{ms.step}</Text></View>
                  <View style={styles.missedContent}>
                    <Text style={styles.missedAction}>{ms.action}</Text>
                    <Text style={styles.missedMarks}>{ms.marks} {ms.marks === 1 ? "mark" : "marks"} not scored</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {result.missed_steps.length === 0 && (
            <View style={styles.perfectCard}>
              <Text style={styles.perfectEmoji}>🌟</Text>
              <Text style={styles.perfectText}>Perfect score! You completed every step correctly.</Text>
            </View>
          )}

          {/* Tips recap */}
          <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
            <View style={styles.tipsCard}>
              <Text style={styles.tipTitle}>💡 Exam Tip</Text>
              <Text style={styles.tipBody}>{station.tips}</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={[styles.actionBtns, { paddingHorizontal: spacing.lg }]}>
            <TouchableOpacity
              style={styles.aiFeedbackBtn}
              onPress={startAiFeedback}
              testID="ai-feedback-btn"
            >
              <Text style={styles.aiFeedbackBtnText}>🤖 Get AI Examiner Feedback</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setChecked(new Set()); setNotes(""); setResult(null); setScreen("checklist"); }}
              testID="retry-btn"
            >
              <Text style={styles.retryBtnText}>🔄 Retry Station</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => router.push("/osce" as any)}
              testID="home-btn"
            >
              <Text style={styles.homeBtnText}>← All Stations</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── AI Feedback Screen ────────────────────────────────────────────────────
  if (screen === "ai-feedback") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceSecondary} />
        <View style={[styles.header, { backgroundColor: "#1E293B" }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setScreen("result")} testID="ai-back">
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Examiner Feedback</Text>
          {aiStreaming && <ActivityIndicator color="#fff" size="small" />}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          <View style={styles.aiFeedbackHeader}>
            <Text style={styles.aiFeedbackTitle}>🤖 Clinical Examiner Assessment</Text>
            <Text style={styles.aiFeedbackSubtitle}>{station.title} — {result?.scored_marks}/{result?.total_marks} marks</Text>
          </View>

          {aiError ? (
            <View style={styles.aiErrorCard}>
              <Text style={styles.aiErrorText}>⚠️ {aiError}</Text>
              <TouchableOpacity onPress={startAiFeedback} testID="retry-ai-btn">
                <Text style={styles.aiRetryText}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.feedbackCard}>
              {aiFeedback ? (
                <Text style={styles.feedbackText}>{aiFeedback}</Text>
              ) : (
                <View style={styles.aiLoadingState}>
                  <ActivityIndicator color={colors.brandPrimary} />
                  <Text style={styles.aiLoadingText}>Your AI examiner is reviewing your performance…</Text>
                </View>
              )}
              {aiStreaming && aiFeedback.length > 0 && (
                <View style={styles.streamingDot} />
              )}
            </View>
          )}

          {!aiStreaming && aiFeedback && (
            <View style={[styles.actionBtns, { paddingHorizontal: spacing.lg }]}>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setChecked(new Set()); setNotes(""); setResult(null); setScreen("checklist"); }} testID="ai-retry-btn">
                <Text style={styles.retryBtnText}>🔄 Retry Station</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.homeBtn} onPress={() => router.push("/osce" as any)} testID="ai-home-btn">
                <Text style={styles.homeBtnText}>← All Stations</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceSecondary },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  loadingText: { marginTop: spacing.md, color: colors.muted, fontSize: 14 },
  scroll: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  backBtn: { padding: 6 },
  backBtnText: { color: "#fff", fontSize: 22, fontWeight: "600" },
  headerTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "800" },
  headerMeta: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  diffBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  diffBadgeText: { fontSize: 12, fontWeight: "700" },

  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  metaIcon: { fontSize: 12 },
  metaLabel: { fontSize: 12, color: colors.onSurface, fontWeight: "600" },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.brandPrimary, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },

  scenarioCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.brandPrimary,
  },
  scenarioText: { fontSize: 14, color: colors.onSurface, lineHeight: 22 },

  examinerCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  examinerText: { fontSize: 13, color: colors.onSurface, lineHeight: 20 },

  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accordionTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.onSurface },
  accordionChevron: { color: colors.muted, fontSize: 13 },
  accordionBody: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    gap: 8,
  },
  bulletRow: { flexDirection: "row", gap: 8 },
  bulletDot: { fontSize: 14, color: colors.brandPrimary, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 13, color: colors.onSurface, lineHeight: 19 },

  tipsCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  tipTitle: { fontSize: 13, fontWeight: "800", color: "#92400E", marginBottom: 6 },
  tipBody: { fontSize: 13, color: "#78350F", lineHeight: 20 },

  previewStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewStepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  previewStepNumText: { color: colors.onBrandTertiary, fontSize: 11, fontWeight: "800" },
  previewStepText: { flex: 1, fontSize: 13, color: colors.onSurface },
  previewStepMarks: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  previewMore: { textAlign: "center", color: colors.muted, fontSize: 13, marginTop: 6, fontStyle: "italic" },

  bottomBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Checklist
  scoreBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scoreBarInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  scoreText: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  scoreStatus: { fontSize: 13, fontWeight: "700" },
  scoreProgress: {
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    overflow: "visible",
    position: "relative",
  },
  scoreProgressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
    minWidth: 8,
  },
  scorePassMark: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 14,
    backgroundColor: colors.brandPrimary,
    borderRadius: 1,
  },
  scoreHelper: { fontSize: 11, color: colors.muted, marginTop: 4, textAlign: "right" },

  checklistInstruction: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginVertical: spacing.lg,
    fontStyle: "italic",
    paddingHorizontal: spacing.lg,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: 8,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  checkRowChecked: { borderColor: colors.success, backgroundColor: "#F0FDF4" },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkboxTick: { color: "#fff", fontSize: 14, fontWeight: "900" },
  checkContent: { flex: 1 },
  checkStepLabel: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  checkStepNum: { fontSize: 11, color: colors.muted, fontWeight: "700", textTransform: "uppercase" },
  marksBadge: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  marksBadgeText: { fontSize: 10, color: colors.muted, fontWeight: "700" },
  checkAction: { fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  checkActionChecked: { color: "#065F46" },

  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 14,
    color: colors.onSurface,
    minHeight: 100,
    textAlignVertical: "top",
  },

  // Result
  resultHero: {
    margin: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultEmoji: { fontSize: 56, textAlign: "center" },
  resultLabel: { fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: spacing.sm, color: colors.onSurface },
  resultScore: { fontSize: 42, fontWeight: "900", textAlign: "center", color: colors.brandPrimary, marginTop: spacing.sm },
  resultPct: { fontSize: 18, fontWeight: "700", color: colors.muted, textAlign: "center" },
  resultPassmark: { fontSize: 13, color: colors.muted, marginTop: 8 },
  xpBadge: { marginTop: spacing.md, backgroundColor: "#FEF3C7", borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  xpText: { color: "#92400E", fontWeight: "800", fontSize: 14 },

  missedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    marginHorizontal: spacing.lg,
    marginBottom: 8,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  missedNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  missedNumText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  missedContent: { flex: 1 },
  missedAction: { fontSize: 13, color: "#7F1D1D", fontWeight: "600", marginBottom: 2 },
  missedMarks: { fontSize: 11, color: "#EF4444" },

  perfectCard: {
    margin: spacing.lg,
    backgroundColor: "#ECFDF5",
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  perfectEmoji: { fontSize: 40, marginBottom: spacing.sm },
  perfectText: { fontSize: 16, color: "#065F46", fontWeight: "700", textAlign: "center" },

  actionBtns: { gap: spacing.sm, marginTop: spacing.lg },
  aiFeedbackBtn: {
    backgroundColor: "#1E293B",
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  aiFeedbackBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  retryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
  },
  retryBtnText: { color: colors.brandPrimary, fontSize: 15, fontWeight: "700" },
  homeBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  homeBtnText: { color: colors.muted, fontSize: 14, fontWeight: "600" },

  // AI Feedback
  aiFeedbackHeader: {
    backgroundColor: "#1E293B",
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: radius.lg,
  },
  aiFeedbackTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  aiFeedbackSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  aiErrorCard: {
    margin: spacing.lg,
    backgroundColor: "#FEE2E2",
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  aiErrorText: { color: "#B91C1C", fontSize: 14, textAlign: "center", marginBottom: spacing.sm },
  aiRetryText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700" },
  feedbackCard: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedbackText: { fontSize: 14, color: colors.onSurface, lineHeight: 22 },
  aiLoadingState: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  aiLoadingText: { color: colors.muted, fontSize: 14, textAlign: "center" },
  streamingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandPrimary,
    marginTop: 8,
    alignSelf: "flex-start",
  },
});
