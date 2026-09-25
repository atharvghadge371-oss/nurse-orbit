import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";
import { colors, radius, minTouchTarget } from "@/src/theme";
import { getLatestReport, QuizResultItem } from "@/src/quizStore";

const SUBJECT_NAMES: Record<string, string> = {
  "sub-fon": "Fundamentals of Nursing",
  "sub-ana": "Anatomy",
  "sub-phy": "Physiology",
  "sub-bio": "Biochemistry",
  "sub-mic": "Microbiology",
  "sub-pha": "Pharmacology",
  "sub-pat": "Pathology",
  "sub-msn": "Medical-Surgical Nursing",
  "sub-chn": "Community Health Nursing",
  "sub-cch": "Child Health (Pediatrics)",
  "sub-mhn": "Mental Health Nursing",
  "sub-obg": "Obstetrics & Gynecology",
  "sub-res": "Nursing Research",
  "sub-adm": "Nursing Administration",
  "sub-ccu": "Critical Care Nursing",
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function MockExamResults() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const report = getLatestReport();

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [filterReview, setFilterReview] = useState<"all" | "incorrect" | "correct">("all");

  const results: QuizResultItem[] = useMemo(() => report?.results || [], [report]);
  const totalQuestions = report?.totalQuestions || results.length || 0;
  const totalScore = report?.totalScore ?? results.filter((r) => r.correct).length;
  const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
  const isPassed = accuracy >= 75;
  const isMock = report?.mode === "mock";

  // Time metrics
  const totalTime = report?.timeSpentSeconds || 0;
  const avgTimePerQ =
    results.length > 0 ? Math.round(totalTime / Math.max(1, results.length)) : 0;

  const { fastest, slowest } = useMemo(() => {
    let fast = { time: Infinity, idx: -1 };
    let slow = { time: 0, idx: -1 };
    results.forEach((r, i) => {
      if (r.time_spent_seconds > 0 && r.time_spent_seconds < fast.time) {
        fast = { time: r.time_spent_seconds, idx: i };
      }
      if (r.time_spent_seconds > slow.time) {
        slow = { time: r.time_spent_seconds, idx: i };
      }
    });
    return {
      fastest: fast.idx >= 0 ? fast : null,
      slowest: slow.idx >= 0 ? slow : null,
    };
  }, [results]);

  // Subject breakdown
  const subjectBreakdown = useMemo(() => {
    const map: Record<string, { total: number; correct: number; name: string }> = {};
    results.forEach((r) => {
      const key = r.subject_id || "general";
      const name = SUBJECT_NAMES[key] || (r.topic ? r.topic.split(" - ")[0] : "General Practice");
      if (!map[key]) {
        map[key] = { total: 0, correct: 0, name };
      }
      map[key].total += 1;
      if (r.correct) map[key].correct += 1;
    });

    return Object.entries(map).map(([key, data]) => {
      const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      return {
        key,
        name: data.name,
        total: data.total,
        correct: data.correct,
        percentage: pct,
      };
    });
  }, [results]);

  // Weakest topic for 7-day revision plan
  const weakestTopic = useMemo(() => {
    const topicStats: Record<string, { total: number; wrong: number }> = {};
    results.forEach((r) => {
      const t = r.topic || "General";
      if (!topicStats[t]) topicStats[t] = { total: 0, wrong: 0 };
      topicStats[t].total += 1;
      if (!r.correct) topicStats[t].wrong += 1;
    });
    const sorted = Object.entries(topicStats).sort((a, b) => b[1].wrong - a[1].wrong);
    return sorted.length > 0 && sorted[0][1].wrong > 0 ? sorted[0][0] : undefined;
  }, [results]);

  // Top 5 mistakes
  const topMistakes = useMemo(() => {
    return results.filter((r) => !r.correct).slice(0, 5);
  }, [results]);

  // Filtered review questions
  const filteredReviewQuestions = useMemo(() => {
    if (filterReview === "incorrect") return results.filter((r) => !r.correct);
    if (filterReview === "correct") return results.filter((r) => r.correct);
    return results;
  }, [results, filterReview]);

  // SVG Accuracy ring calculation
  const ringSize = 140;
  const strokeWidth = 14;
  const center = ringSize / 2;
  const radiusVal = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusVal;
  const strokeDashoffset = circumference - (circumference * accuracy) / 100;
  const ringColor = accuracy >= 75 ? "#10B981" : accuracy >= 50 ? "#F59E0B" : "#EF4444";

  if (!report && results.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 44 }}>📊</Text>
          <Text style={styles.emptyTitle}>No Exam Report Found</Text>
          <Text style={styles.emptySubtitle}>
            Complete a Mock Exam or Timed Quiz to generate an analytics report.
          </Text>
          <Pressable
            style={styles.actionBtnPrimary}
            onPress={() => router.push("/(tabs)/exams" as any)}
            testID="back-to-practice-empty"
          >
            <Text style={styles.actionBtnPrimaryText}>Back to Practice</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.closeBtn}
          onPress={() => router.push("/(tabs)/exams" as any)}
          testID="results-close-btn"
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>
          {isMock ? "Mock Exam Performance Report" : "Timed Quiz Results"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD */}
        <View style={styles.heroCard} testID="results-hero-card">
          <View style={styles.heroTopRow}>
            <View style={styles.heroLeft}>
              <View style={styles.modeTag}>
                <Text style={styles.modeTagText}>
                  {isMock ? "100-QUESTION MOCK" : "TIMED ASSESSMENT"}
                </Text>
              </View>
              <Text style={styles.scoreText}>
                {totalScore}
                <Text style={styles.scoreTotal}> / {totalQuestions}</Text>
              </Text>
              <View
                style={[
                  styles.passBadge,
                  isPassed ? styles.passBadgeSuccess : styles.passBadgeFail,
                ]}
              >
                <Text
                  style={[
                    styles.passBadgeText,
                    isPassed ? styles.passTextSuccess : styles.passTextFail,
                  ]}
                >
                  {isPassed ? "✓ PASSED (≥ 75%)" : "✗ NEEDS IMPROVEMENT (< 75%)"}
                </Text>
              </View>
            </View>

            {/* ACCURACY RING */}
            <View style={styles.ringContainer} testID="accuracy-ring">
              <Svg width={ringSize} height={ringSize}>
                <G rotation="-90" origin={`${center}, ${center}`}>
                  <Circle
                    cx={center}
                    cy={center}
                    r={radiusVal}
                    stroke="#334155"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <Circle
                    cx={center}
                    cy={center}
                    r={radiusVal}
                    stroke={ringColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </G>
                <SvgText
                  x={center}
                  y={center - 4}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="24"
                  fontWeight="bold"
                >
                  {`${accuracy}%`}
                </SvgText>
                <SvgText
                  x={center}
                  y={center + 16}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="11"
                  fontWeight="600"
                >
                  ACCURACY
                </SvgText>
              </Svg>
            </View>
          </View>

          <Text style={styles.heroSummary}>
            {isPassed
              ? "🎉 Excellent clinical readiness! Your score surpasses the NCLEX benchmark standard. Continue reinforcing your high-yield knowledge."
              : "⚠️ Below the 75% NCLEX benchmark. Target your lowest-scoring subjects and review question rationales below to close clinical gaps."}
          </Text>
        </View>

        {/* TIME STATS (4-Metric Grid) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Time & Pacing Metrics</Text>
          <View style={styles.timeGrid}>
            <View style={styles.timeCard}>
              <Text style={styles.timeIcon}>⌛</Text>
              <Text style={styles.timeVal}>{formatDuration(totalTime)}</Text>
              <Text style={styles.timeLabel}>Total Time Taken</Text>
            </View>

            <View style={styles.timeCard}>
              <Text style={styles.timeIcon}>⚡</Text>
              <Text style={styles.timeVal}>{avgTimePerQ}s</Text>
              <Text style={styles.timeLabel}>Avg Time / Question</Text>
            </View>

            <View style={styles.timeCard}>
              <Text style={styles.timeIcon}>🚀</Text>
              <Text style={styles.timeVal}>
                {fastest ? `${fastest.time}s` : "—"}
              </Text>
              <Text style={styles.timeLabel}>
                Fastest Q {fastest ? `(#${fastest.idx + 1})` : ""}
              </Text>
            </View>

            <View style={styles.timeCard}>
              <Text style={styles.timeIcon}>🐢</Text>
              <Text style={styles.timeVal}>
                {slowest ? `${slowest.time}s` : "—"}
              </Text>
              <Text style={styles.timeLabel}>
                Slowest Q {slowest ? `(#${slowest.idx + 1})` : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* SUBJECT BREAKDOWN */}
        <View style={styles.section} testID="subject-breakdown-section">
          <Text style={styles.sectionTitle}>📚 Subject Breakdown</Text>
          <View style={styles.subjectList}>
            {subjectBreakdown.map((sub) => {
              const barColor =
                sub.percentage >= 75 ? "#10B981" : sub.percentage >= 50 ? "#F59E0B" : "#EF4444";
              return (
                <View key={sub.key} style={styles.subjectRow}>
                  <View style={styles.subjectHeader}>
                    <Text style={styles.subjectName} numberOfLines={1}>
                      {sub.name}
                    </Text>
                    <Text style={[styles.subjectScore, { color: barColor }]}>
                      {sub.correct}/{sub.total} ({sub.percentage}%)
                    </Text>
                  </View>
                  <View style={styles.subjectBarBg}>
                    <View
                      style={[
                        styles.subjectBarFill,
                        { width: `${sub.percentage}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* TOP MISTAKES */}
        <View style={styles.section} testID="top-mistakes-section">
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>❌ Top Missed Questions</Text>
            {topMistakes.length > 0 && (
              <Text style={styles.mistakesCount}>
                Showing {topMistakes.length} of {results.filter((r) => !r.correct).length}
              </Text>
            )}
          </View>

          {topMistakes.length === 0 ? (
            <View style={styles.perfectScoreCard}>
              <Text style={{ fontSize: 32 }}>🎯</Text>
              <Text style={styles.perfectTitle}>Zero Mistakes!</Text>
              <Text style={styles.perfectSub}>
                Incredible mastery! You got every question correct.
              </Text>
            </View>
          ) : (
            topMistakes.map((m, i) => {
              const yourAnswerText =
                m.selected_index != null && m.options[m.selected_index]
                  ? m.options[m.selected_index]
                  : "Unanswered / Timed Out";
              const correctAnswerText = m.options[m.correct_index] || "Correct Option";

              return (
                <View key={m.question_id || i} style={styles.mistakeCard}>
                  <View style={styles.mistakeHeader}>
                    <Text style={styles.mistakeQNum}>Mistake #{i + 1}</Text>
                    {m.topic && <Text style={styles.mistakeTopic}>{m.topic}</Text>}
                  </View>
                  <Text style={styles.mistakeQuestion}>{m.question}</Text>

                  <View style={styles.answerBoxWrong}>
                    <Text style={styles.answerLabelWrong}>Your Answer:</Text>
                    <Text style={styles.answerTextWrong}>{yourAnswerText}</Text>
                  </View>

                  <View style={styles.answerBoxRight}>
                    <Text style={styles.answerLabelRight}>Correct Answer:</Text>
                    <Text style={styles.answerTextRight}>{correctAnswerText}</Text>
                  </View>

                  {m.explanation && (
                    <Text style={styles.mistakeRationale}>
                      💡 <Text style={{ fontWeight: "700" }}>Rationale:</Text> {m.explanation}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionButtonsContainer}>
          {/* 1. Review All Questions */}
          <Pressable
            testID="review-all-btn"
            style={styles.actionBtnSecondary}
            onPress={() => setReviewModalVisible(true)}
          >
            <Text style={styles.actionBtnSecondaryText}>🔍 Review All Questions ({results.length})</Text>
          </Pressable>

          {/* 2. Get 7-Day Revision Plan */}
          <Pressable
            testID="get-revision-plan-btn"
            style={styles.actionBtnGradient}
            onPress={() => {
              router.push({
                pathname: "/nclex/revision-plan" as any,
                params: weakestTopic ? { topic: weakestTopic } : {},
              });
            }}
          >
            <Text style={styles.actionBtnGradientText}>
              📅 Get 7-Day AI Revision Plan {weakestTopic ? `(${weakestTopic})` : ""} →
            </Text>
          </Pressable>

          {/* 3. Retry Mock Exam */}
          <Pressable
            testID="retry-mock-btn"
            style={styles.actionBtnOutline}
            onPress={() => {
              router.replace({
                pathname: "/quiz/[subjectId]" as any,
                params: { subjectId: isMock ? "mock" : "timed" },
              });
            }}
          >
            <Text style={styles.actionBtnOutlineText}>
              🔄 Retry {isMock ? "Mock Exam" : "Timed Quiz"}
            </Text>
          </Pressable>

          {/* 4. Back to Practice */}
          <Pressable
            testID="back-to-practice-btn"
            style={styles.actionBtnText}
            onPress={() => router.push("/(tabs)/exams" as any)}
          >
            <Text style={styles.actionBtnTextLabel}>← Back to Practice Hub</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* FULL REVIEW MODAL */}
      <Modal visible={reviewModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Full Exam Review</Text>
              <Text style={styles.modalSub}>{results.length} questions total</Text>
            </View>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setReviewModalVisible(false)}
              testID="modal-close-btn"
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </View>

          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {(["all", "incorrect", "correct"] as const).map((filter) => (
              <Pressable
                key={filter}
                style={[
                  styles.filterTab,
                  filterReview === filter && styles.filterTabActive,
                ]}
                onPress={() => setFilterReview(filter)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filterReview === filter && styles.filterTabTextActive,
                  ]}
                >
                  {filter === "all"
                    ? `All (${results.length})`
                    : filter === "incorrect"
                    ? `Mistakes (${results.filter((r) => !r.correct).length})`
                    : `Correct (${results.filter((r) => r.correct).length})`}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
            showsVerticalScrollIndicator={false}
          >
            {filteredReviewQuestions.map((q, idx) => (
              <View key={q.question_id || idx} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View
                    style={[
                      styles.reviewStatusBadge,
                      q.correct ? styles.reviewBadgeCorrect : styles.reviewBadgeWrong,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reviewStatusText,
                        q.correct ? { color: "#065F46" } : { color: "#991B1B" },
                      ]}
                    >
                      {q.correct ? "✓ Correct" : "✗ Incorrect"}
                    </Text>
                  </View>
                  <Text style={styles.reviewTimeSpent}>⏱ {q.time_spent_seconds}s</Text>
                </View>

                <Text style={styles.reviewQuestion}>
                  <Text style={{ fontWeight: "800" }}>Q{idx + 1}.</Text> {q.question}
                </Text>

                <View style={{ gap: 8, marginTop: 12 }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = q.selected_index === optIdx;
                    const isCorrect = q.correct_index === optIdx;
                    let optBg = "#F8FAFC";
                    let optBorder = "#E2E8F0";
                    let optColor = "#1E293B";

                    if (isCorrect) {
                      optBg = "#DCFCE7";
                      optBorder = "#86EFAC";
                      optColor = "#15803D";
                    } else if (isSelected && !isCorrect) {
                      optBg = "#FEE2E2";
                      optBorder = "#FCA5A5";
                      optColor = "#B91C1C";
                    }

                    return (
                      <View
                        key={optIdx}
                        style={[
                          styles.reviewOpt,
                          { backgroundColor: optBg, borderColor: optBorder },
                        ]}
                      >
                        <Text style={[styles.reviewOptLetter, { color: optColor }]}>
                          {String.fromCharCode(65 + optIdx)}
                        </Text>
                        <Text style={[styles.reviewOptText, { color: optColor }]}>
                          {opt}
                        </Text>
                        {isCorrect && <Text style={{ fontSize: 13 }}>✅</Text>}
                        {isSelected && !isCorrect && (
                          <Text style={{ fontSize: 13 }}>❌ (Your choice)</Text>
                        )}
                      </View>
                    );
                  })}
                </View>

                {(q.explanation || q.rationale) && (
                  <View style={styles.reviewExplBox}>
                    <Text style={styles.reviewExplTitle}>Clinical Explanation</Text>
                    <Text style={styles.reviewExplBody}>
                      {q.explanation || q.rationale}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0F172A",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  topBarTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  // Hero card
  heroCard: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLeft: { flex: 1, paddingRight: 12 },
  modeTag: {
    backgroundColor: "#1E293B",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  modeTagText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  scoreText: { color: "#FFFFFF", fontSize: 36, fontWeight: "900" },
  scoreTotal: { fontSize: 20, color: "#64748B", fontWeight: "600" },
  passBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  passBadgeSuccess: { backgroundColor: "rgba(16, 185, 129, 0.2)" },
  passBadgeFail: { backgroundColor: "rgba(239, 68, 68, 0.2)" },
  passBadgeText: { fontSize: 12, fontWeight: "800" },
  passTextSuccess: { color: "#34D399" },
  passTextFail: { color: "#F87171" },
  ringContainer: { alignItems: "center", justifyContent: "center" },
  heroSummary: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },

  // Section general
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mistakesCount: { fontSize: 12, color: colors.muted, fontWeight: "600" },

  // Time stats grid
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  timeIcon: { fontSize: 20, marginBottom: 4 },
  timeVal: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  timeLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: "500" },

  // Subject breakdown
  subjectList: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  subjectRow: { gap: 6 },
  subjectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subjectName: { fontSize: 14, fontWeight: "700", color: "#1E293B", flex: 1 },
  subjectScore: { fontSize: 13, fontWeight: "800" },
  subjectBarBg: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    overflow: "hidden",
  },
  subjectBarFill: { height: "100%", borderRadius: 999 },

  // Top mistakes
  mistakeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mistakeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mistakeQNum: { fontSize: 12, fontWeight: "800", color: "#EF4444" },
  mistakeTopic: {
    fontSize: 11,
    color: colors.brandPrimary,
    fontWeight: "700",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mistakeQuestion: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
    marginBottom: 12,
  },
  answerBoxWrong: {
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: radius.md,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  answerLabelWrong: { fontSize: 11, fontWeight: "700", color: "#991B1B" },
  answerTextWrong: { fontSize: 13, color: "#7F1D1D", marginTop: 2, fontWeight: "600" },
  answerBoxRight: {
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: radius.md,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  answerLabelRight: { fontSize: 11, fontWeight: "700", color: "#166534" },
  answerTextRight: { fontSize: 13, color: "#14532D", marginTop: 2, fontWeight: "600" },
  mistakeRationale: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: radius.sm,
  },
  perfectScoreCard: {
    backgroundColor: "#ECFDF5",
    padding: 20,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  perfectTitle: { fontSize: 18, fontWeight: "800", color: "#065F46", marginTop: 8 },
  perfectSub: { fontSize: 13, color: "#047857", marginTop: 4, textAlign: "center" },

  // Action buttons
  actionButtonsContainer: {
    padding: 16,
    marginTop: 10,
    gap: 12,
  },
  actionBtnSecondary: {
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
    minHeight: minTouchTarget,
    justifyContent: "center",
  },
  actionBtnSecondaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  actionBtnGradient: {
    backgroundColor: "#0284C7",
    paddingVertical: 15,
    borderRadius: radius.lg,
    alignItems: "center",
    minHeight: minTouchTarget,
    justifyContent: "center",
  },
  actionBtnGradientText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  actionBtnOutline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
    minHeight: minTouchTarget,
    justifyContent: "center",
  },
  actionBtnOutlineText: { color: "#334155", fontSize: 15, fontWeight: "700" },
  actionBtnText: {
    alignItems: "center",
    paddingVertical: 10,
  },
  actionBtnTextLabel: { color: colors.muted, fontSize: 14, fontWeight: "600" },

  // Full review modal
  modalSafe: { flex: 1, backgroundColor: "#FFFFFF" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  modalSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  modalCloseBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  modalCloseText: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  filterTabActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  filterTabText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  filterTabTextActive: { color: "#FFFFFF", fontWeight: "700" },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reviewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  reviewBadgeCorrect: { backgroundColor: "#DCFCE7" },
  reviewBadgeWrong: { backgroundColor: "#FEE2E2" },
  reviewStatusText: { fontSize: 11, fontWeight: "800" },
  reviewTimeSpent: { fontSize: 12, color: colors.muted },
  reviewQuestion: { fontSize: 15, fontWeight: "600", color: "#0F172A", lineHeight: 22 },
  reviewOpt: {
    flexDirection: "row",
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  reviewOptLetter: { fontSize: 13, fontWeight: "800", width: 16 },
  reviewOptText: { flex: 1, fontSize: 13, fontWeight: "500" },
  reviewExplBox: {
    marginTop: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  reviewExplTitle: { fontSize: 12, fontWeight: "800", color: "#1E3A8A", marginBottom: 4 },
  reviewExplBody: { fontSize: 12, color: "#334155", lineHeight: 18 },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  actionBtnPrimary: {
    marginTop: 12,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  actionBtnPrimaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
