import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/src/api";
import { colors, minTouchTarget, spacing, radius } from "@/src/theme";
import { setLatestReport, QuizResultItem } from "@/src/quizStore";

export default function Quiz() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const mode = ["practice", "timed", "mock", "weak", "bookmarked", "incorrect"].includes(subjectId as string)
    ? (subjectId as string)
    : "practice";
  const subjectFilter = ["practice", "timed", "mock", "weak", "bookmarked", "incorrect"].includes(subjectId as string)
    ? undefined
    : subjectId;

  const isMock = mode === "mock";
  const isTimedMode = mode === "mock" || mode === "timed";
  // Mock exam: 2 hours (7200s), Timed Quick 10: 10 minutes (600s)
  const totalDurationSeconds = isMock ? 7200 : isTimedMode ? 600 : 0;
  const questionLimit = isMock ? 100 : 10;

  const [questions, setQuestions] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  // Timer & pause state
  const [secondsLeft, setSecondsLeft] = useState(totalDurationSeconds);
  const [isPaused, setIsPaused] = useState(false);

  const secondsLeftRef = useRef(totalDurationSeconds);
  const timerIntervalRef = useRef<any>(null);
  const questionStartTimeRef = useRef(0);
  const resultsRef = useRef<QuizResultItem[]>([]);
  const warnedRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  // Load questions
  useEffect(() => {
    api.questions({ subject_id: subjectFilter, mode, limit: questionLimit }).then((r) => {
      setQuestions(r.questions || []);
      setLoading(false);
      questionStartTimeRef.current = Date.now();
    });
  }, [subjectId, mode, questionLimit, subjectFilter]);

  // Finish exam function (handles normal completion and timer expiry)
  const finishExam = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (isTimedMode) {
      // Ensure all questions are represented even if timer ran out early
      const answeredIds = new Set(resultsRef.current.map((i) => i.question_id));
      questions.forEach((itemQ) => {
        if (!answeredIds.has(itemQ.id)) {
          resultsRef.current.push({
            question_id: itemQ.id,
            question: itemQ.question,
            options: itemQ.options,
            selected_index: null,
            correct_index: itemQ.correct_index ?? 0,
            correct: false,
            time_spent_seconds: 0,
            topic: itemQ.topic || "",
            subject_id: itemQ.subject_id || "",
            explanation: itemQ.explanation,
            rationale: itemQ.rationale,
            reference: itemQ.reference,
          });
        }
      });

      const totalTimeSpent = Math.max(1, totalDurationSeconds - Math.max(0, secondsLeftRef.current));
      const totalScore = resultsRef.current.filter((i) => i.correct).length;

      setLatestReport({
        mode,
        subjectId: subjectFilter,
        totalQuestions: questions.length,
        totalScore,
        timeSpentSeconds: totalTimeSpent,
        results: resultsRef.current,
        completedAt: new Date().toISOString(),
      });

      router.replace("/quiz/results" as any);
    } else {
      router.back();
    }
  }, [isTimedMode, questions, totalDurationSeconds, mode, subjectFilter, router]);

  // Timer countdown
  useEffect(() => {
    if (!isTimedMode || loading || questions.length === 0) return;

    if (isPaused) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      secondsLeftRef.current -= 1;
      const current = secondsLeftRef.current;
      setSecondsLeft(current);

      // Warning alert check: 10 mins (600s) for mock, 2 mins (120s) for timed
      const warningThreshold = isMock ? 600 : 120;
      if (!warnedRef.current && current <= warningThreshold && current > 0) {
        warnedRef.current = true;
        const mins = isMock ? 10 : 2;
        Alert.alert("Time Warning", `⏳ ${mins} minutes remaining in your exam!`);
      }

      // Auto-submit when time expires
      if (current <= 0) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (!autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          Alert.alert("Time's Up!", "The exam time has expired. Submitting your results now.", [
            { text: "View Results", onPress: () => finishExam() },
          ]);
          finishExam();
        }
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimedMode, isPaused, loading, questions.length, isMock, finishExam]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
        <Text style={{ marginTop: 12, color: colors.muted, fontSize: 14 }}>
          {isMock ? "Preparing 100 NCLEX questions…" : "Loading quiz…"}
        </Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40 }}>📝</Text>
        <Text style={styles.emptyTitle}>No questions available</Text>
        <Text style={styles.emptyText}>Try a different mode or subject.</Text>
        <Pressable style={styles.emptyBtn} onPress={() => router.back()} testID="empty-back-btn">
          <Text style={styles.emptyBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const q = questions[idx];

  // Submit answer
  const submit = async () => {
    if (selected === null) return;
    const start = questionStartTimeRef.current > 0 ? questionStartTimeRef.current : Date.now();
    const elapsed = Math.max(1, Math.round((Date.now() - start) / 1000));
    try {
      const r = await api.attempt(q.id, selected, elapsed, mode);
      setResult(r);

      resultsRef.current.push({
        question_id: q.id,
        question: q.question,
        options: q.options,
        selected_index: selected,
        correct_index: r.correct_index,
        correct: r.correct,
        time_spent_seconds: elapsed,
        topic: q.topic || "",
        subject_id: q.subject_id || "",
        explanation: r.explanation,
        rationale: r.rationale,
        reference: r.reference,
      });
    } catch {
      // Local fallback in case of network glitch
      const isCorrect = selected === q.correct_index;
      const fallbackResult = {
        correct: isCorrect,
        correct_index: q.correct_index,
        explanation: q.explanation,
        rationale: q.rationale,
        reference: q.reference,
      };
      setResult(fallbackResult);
      resultsRef.current.push({
        question_id: q.id,
        question: q.question,
        options: q.options,
        selected_index: selected,
        correct_index: q.correct_index,
        correct: isCorrect,
        time_spent_seconds: elapsed,
        topic: q.topic || "",
        subject_id: q.subject_id || "",
        explanation: q.explanation,
        rationale: q.rationale,
        reference: q.reference,
      });
    }
  };

  const nextQ = () => {
    setResult(null);
    setSelected(null);
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      questionStartTimeRef.current = Date.now();
    } else {
      finishExam();
    }
  };

  const toggleBookmark = async () => {
    const r = await api.bookmark(q.id);
    const next = new Set(bookmarked);
    if (r.bookmarked) next.add(q.id);
    else next.delete(q.id);
    setBookmarked(next);
  };

  // Format timer
  const formatTime = (secs: number) => {
    const clamped = Math.max(0, secs);
    const hrs = Math.floor(clamped / 3600);
    const mins = Math.floor((clamped % 3600) / 60);
    const s = clamped % 60;
    if (isMock || hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const isUnder10Percent = isTimedMode && secondsLeft <= totalDurationSeconds * 0.1;

  const handleBackPress = () => {
    if (isMock) {
      Alert.alert(
        "Quit Mock Exam?",
        "Your progress will be submitted as-is. Are you sure you want to exit?",
        [
          { text: "Stay", style: "cancel" },
          { text: "Submit & Exit", style: "destructive", onPress: () => finishExam() },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="quiz-back" onPress={handleBackPress} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        {/* Countdown Timer */}
        {isTimedMode && (
          <View
            style={[
              styles.timerPill,
              isUnder10Percent ? styles.timerPillUrgent : styles.timerPillNormal,
            ]}
            testID="exam-timer"
          >
            <Text style={[styles.timerIcon, isUnder10Percent && styles.timerUrgentText]}>
              {isUnder10Percent ? "🔥" : "⏱️"}
            </Text>
            <Text
              style={[
                styles.timerText,
                isUnder10Percent ? styles.timerUrgentText : styles.timerNormalText,
              ]}
            >
              {formatTime(secondsLeft)}
            </Text>
          </View>
        )}

        {/* Pause Button (Mock Only) or Right Spacer */}
        {isMock ? (
          <Pressable
            testID="pause-exam-btn"
            style={styles.pauseBtn}
            onPress={() => setIsPaused(true)}
          >
            <Text style={styles.pauseBtnText}>⏸ Pause</Text>
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Enhanced Progress Strip */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <Text style={styles.qCountHighlight}>
            Q {idx + 1} <Text style={{ color: colors.muted, fontWeight: "500" }}>/ {questions.length}</Text>
          </Text>
          {isMock && (
            <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>MOCK EXAM</Text>
            </View>
          )}
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((idx + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Question Content */}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 112 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.topic}>{q.topic}</Text>
        <Text style={styles.question}>{q.question}</Text>

        <View style={{ gap: 10, marginTop: 20 }}>
          {q.options.map((opt: string, i: number) => {
            const isSelected = selected === i;
            let bg = colors.surface;
            let border = colors.border;
            let fg = colors.onSurface;
            if (result) {
              if (i === result.correct_index) {
                bg = "#DCFCE7";
                border = colors.success;
                fg = "#15803D";
              } else if (isSelected) {
                bg = "#FEE2E2";
                border = colors.error;
                fg = "#B91C1C";
              }
            } else if (isSelected) {
              bg = colors.brandTertiary;
              border = colors.brandPrimary;
              fg = colors.brandPrimary;
            }
            return (
              <Pressable
                key={i}
                testID={`option-${i}`}
                disabled={!!result}
                style={[styles.opt, { backgroundColor: bg, borderColor: border }]}
                onPress={() => setSelected(i)}
              >
                <Text style={[styles.optLetter, { color: fg }]}>{String.fromCharCode(65 + i)}</Text>
                <Text style={[styles.optText, { color: fg }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        {result && (
          <View style={styles.expl} testID="explanation-box">
            <Text
              style={[
                styles.explTitle,
                { color: result.correct ? colors.success : colors.error },
              ]}
            >
              {result.correct ? "✓ Correct" : "✗ Incorrect"}
            </Text>
            {result.explanation && (
              <>
                <Text style={styles.h}>Explanation</Text>
                <Text style={styles.body}>{result.explanation}</Text>
              </>
            )}
            {result.rationale && (
              <>
                <Text style={styles.h}>Clinical Rationale</Text>
                <Text style={styles.body}>{result.rationale}</Text>
              </>
            )}
            {result.reference && (
              <Text style={styles.ref}>Reference: {result.reference}</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          testID="bookmark-btn"
          onPress={toggleBookmark}
          style={styles.bookmarkBtn}
        >
          <Text style={{ fontSize: 22 }}>{bookmarked.has(q.id) ? "🔖" : "🏷"}</Text>
        </Pressable>
        {!result ? (
          <Pressable
            testID="submit-btn"
            disabled={selected === null}
            style={[styles.primary, selected === null && { opacity: 0.4 }]}
            onPress={submit}
          >
            <Text style={styles.primaryText}>Submit</Text>
          </Pressable>
        ) : (
          <Pressable testID="next-btn" style={styles.primary} onPress={nextQ}>
            <Text style={styles.primaryText}>
              {idx < questions.length - 1 ? "Next Question" : "Finish"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Pause Modal (Mock Only) */}
      <Modal visible={isPaused} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseEmoji}>⏸️</Text>
            <Text style={styles.pauseTitle}>Exam Paused</Text>
            <Text style={styles.pauseSubtitle}>
              Timer is stopped. Take a deep breath before continuing.
            </Text>

            <View style={styles.pauseStats}>
              <View style={styles.pauseStatItem}>
                <Text style={styles.pauseStatLabel}>Current Progress</Text>
                <Text style={styles.pauseStatVal}>
                  Q {idx + 1} of {questions.length}
                </Text>
              </View>
              <View style={styles.pauseStatDivider} />
              <View style={styles.pauseStatItem}>
                <Text style={styles.pauseStatLabel}>Time Remaining</Text>
                <Text style={styles.pauseStatVal}>{formatTime(secondsLeft)}</Text>
              </View>
            </View>

            <Pressable
              testID="resume-exam-btn"
              style={styles.resumeBtn}
              onPress={() => setIsPaused(false)}
            >
              <Text style={styles.resumeBtnText}>▶ Resume Exam</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 34, color: colors.onSurface, lineHeight: 36 },

  // Timer pills
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1.5,
  },
  timerPillNormal: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  timerPillUrgent: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
  },
  timerIcon: { fontSize: 15 },
  timerText: { fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
  timerNormalText: { color: "#0F172A" },
  timerUrgentText: { color: "#DC2626" },

  // Pause button
  pauseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pauseBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
  },

  // Enhanced progress section
  progressContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: colors.surface,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  qCountHighlight: {
    color: colors.brandPrimary,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  mockBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mockBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#3730A3",
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.brandSecondary,
  },

  // Question content
  topic: {
    color: colors.brandPrimary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  question: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 25,
  },
  opt: {
    flexDirection: "row",
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 12,
    alignItems: "center",
  },
  optLetter: { fontSize: 15, fontWeight: "800", width: 20 },
  optText: { flex: 1, fontSize: 15, fontWeight: "500", lineHeight: 22 },
  expl: {
    marginTop: 20,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  explTitle: { fontSize: 16, fontWeight: "800" },
  h: {
    color: colors.brandPrimary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: { color: colors.onSurface, fontSize: 14, marginTop: 6, lineHeight: 21 },
  ref: { color: colors.muted, fontSize: 12, marginTop: 12, fontStyle: "italic" },

  // Footer
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  bookmarkBtn: {
    width: 52,
    minHeight: minTouchTarget,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    flex: 1,
    minHeight: minTouchTarget,
    justifyContent: "center",
    backgroundColor: colors.brandPrimary,
    padding: 12,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  // Empty state
  emptyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800", marginTop: 8 },
  emptyText: { color: colors.muted, fontSize: 14 },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  emptyBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  // Pause Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pauseCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  pauseEmoji: { fontSize: 44, marginBottom: 12 },
  pauseTitle: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  pauseSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  pauseStats: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: 14,
    marginVertical: 20,
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pauseStatItem: { alignItems: "center" },
  pauseStatLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  pauseStatVal: { fontSize: 16, fontWeight: "800", color: colors.onSurface, marginTop: 4 },
  pauseStatDivider: { width: 1, height: 28, backgroundColor: colors.border },
  resumeBtn: {
    width: "100%",
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  resumeBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
