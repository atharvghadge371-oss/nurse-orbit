import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import {
  colors,
  screenContentBottomPadding,
  spacing,
  radius,
} from "@/src/theme";

const CATEGORIES = [
  { key: "fund", label: "Fundamentals", icon: "🩺" },
  { key: "adult", label: "Adult Health", icon: "🧑‍⚕️" },
  { key: "peds", label: "Pediatrics", icon: "🧸" },
  { key: "maternal", label: "Maternal", icon: "🤱" },
  { key: "mental", label: "Mental Health", icon: "🧠" },
  { key: "pharma", label: "Pharmacology", icon: "💊" },
  { key: "leadership", label: "Leadership", icon: "🎯" },
  { key: "safety", label: "Safety & Priority", icon: "🛡" },
];

export default function NCLEX() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["qStats"],
    queryFn: api.qStats,
  });

  const {
    data: insights,
    isLoading: insightsLoading,
    refetch: refetchInsights,
  } = useQuery({
    queryKey: ["qInsights"],
    queryFn: api.qInsights,
  });

  const { data: gam, refetch: refetchGam } = useQuery({
    queryKey: ["gam"],
    queryFn: api.gamification,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchInsights(), refetchGam()]);
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {}
    return dateStr;
  };

  const hasProgressData =
    (stats?.attempted ?? 0) >= 5 &&
    ((stats?.strong_subjects?.length ?? 0) > 0 || (stats?.weak_subjects?.length ?? 0) > 0);

  const strongSubjects = stats?.strong_subjects?.slice(0, 3) || [];
  const weakSubjects = stats?.weak_subjects?.slice(0, 5) || [];
  const mockSessions = stats?.mock_sessions?.slice(0, 3) || [];
  const frequentlyMissed = stats?.frequently_missed?.slice(0, 5) || [];

  const accuracyPercent = Math.round((stats?.accuracy ?? 0) * 100);
  const avgTimeSeconds = Math.round(stats?.avg_time_seconds ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="nclex-back"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🎓 NCLEX / Prometric</Text>
          <Text style={styles.subtitle}>International exam preparation & dashboard</Text>
        </View>
        {(statsLoading || insightsLoading) && (
          <ActivityIndicator size="small" color={colors.brandPrimary} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: screenContentBottomPadding(insets.bottom),
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brandPrimary}
          />
        }
      >
        {/* ================================================================= */}
        {/* 1. STATS ROW: Horizontal scrollable stat pills                    */}
        {/* ================================================================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsScrollContent}
        >
          {/* Attempted */}
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Attempted</Text>
            <Text style={styles.statPillValue}>{stats?.attempted ?? 0}</Text>
          </View>

          {/* Accuracy % */}
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Accuracy</Text>
            <Text
              style={[
                styles.statPillValue,
                {
                  color:
                    accuracyPercent >= 75
                      ? "#10B981"
                      : accuracyPercent >= 60
                      ? "#F59E0B"
                      : stats?.attempted
                      ? "#EF4444"
                      : colors.onSurface,
                },
              ]}
            >
              {stats?.attempted ? `${accuracyPercent}%` : "—"}
            </Text>
          </View>

          {/* Today */}
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Today</Text>
            <Text style={styles.statPillValue}>{stats?.questions_today ?? 0}</Text>
          </View>

          {/* Avg Time */}
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Avg Time</Text>
            <Text style={styles.statPillValue}>
              {stats?.attempted ? `${avgTimeSeconds}s per Q` : "—"}
            </Text>
          </View>

          {/* Streak */}
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Streak</Text>
            <Text style={styles.statPillValue}>
              🔥 {gam?.streak ?? 0} {gam?.streak === 1 ? "day" : "days"}
            </Text>
          </View>
        </ScrollView>

        {/* ================================================================= */}
        {/* 2. INSIGHTS CARD: Highlighted weakly topic with action buttons    */}
        {/* ================================================================= */}
        {!!insights?.suggested_revision_focus && (
          <View style={styles.insightsCard}>
            <View style={styles.insightsHeader}>
              <View style={styles.insightsBadge}>
                <Text style={styles.insightsBadgeText}>AI ORBIT INSIGHT</Text>
              </View>
              <Text style={styles.insightsTitle}>
                🎯 Orbit Insight: Your weakest area this week is{" "}
                <Text style={styles.insightsHighlight}>
                  {insights.suggested_revision_focus}
                </Text>
              </Text>
              {!!insights.insight && (
                <Text style={styles.insightsSub}>{insights.insight}</Text>
              )}
            </View>

            <View style={styles.insightsBtnRow}>
              <Pressable
                testID="btn-start-teach-me"
                style={styles.teachMeBtn}
                onPress={() =>
                  router.push(
                    `/nclex/recovery?topic=${encodeURIComponent(
                      insights.suggested_revision_focus
                    )}` as any
                  )
                }
              >
                <Text style={styles.teachMeBtnText}>⚡️ Start Teach Me</Text>
              </Pressable>

              <Pressable
                testID="btn-seven-day-plan"
                style={styles.planBtn}
                onPress={() =>
                  router.push(
                    `/nclex/revision-plan?topic=${encodeURIComponent(
                      insights.suggested_revision_focus
                    )}` as any
                  )
                }
              >
                <Text style={styles.planBtnText}>📅 7-Day Plan</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* 3. PROGRESS SECTION: Your NCLEX Progress (Strong & Weak Subjects) */}
        {/* ================================================================= */}
        <Text style={styles.sec}>Your NCLEX Progress</Text>
        <View style={styles.dashboardCard}>
          {!hasProgressData ? (
            <View style={styles.emptyProgressBox}>
              <Text style={styles.emptyProgressEmoji}>📊</Text>
              <Text style={styles.emptyProgressTitle}>
                Complete 5+ questions to see your analysis
              </Text>
              <Text style={styles.emptyProgressSub}>
                Answer clinical questions in practice or mock mode to unlock detailed mastery breakdowns.
              </Text>
            </View>
          ) : (
            <View>
              {/* Strong Subjects */}
              <View style={styles.subCategoryHeader}>
                <Text style={styles.subCategoryHeading}>💪 Strong Subjects</Text>
                <Text style={styles.subCategorySub}>≥ 75% accuracy</Text>
              </View>
              {strongSubjects.length === 0 ? (
                <Text style={styles.emptySubText}>
                  Keep practicing to establish high-confidence strong areas.
                </Text>
              ) : (
                strongSubjects.map((sub: any, idx: number) => {
                  const pct = Math.round((sub.accuracy ?? 0) * 100);
                  return (
                    <View key={idx} style={styles.progressItem}>
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>{sub.subject}</Text>
                        <Text style={[styles.progressPct, { color: "#10B981" }]}>
                          {pct}%
                        </Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: "#10B981" },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              )}

              {/* Weak Subjects */}
              <View style={[styles.subCategoryHeader, { marginTop: 18 }]}>
                <Text style={styles.subCategoryHeading}>⚠️ Weak Subjects</Text>
                <Text style={styles.subCategorySub}>&lt; 70% accuracy</Text>
              </View>
              {weakSubjects.length === 0 ? (
                <Text style={styles.emptySubText}>
                  No low-scoring subjects! Excellent mastery across tested topics.
                </Text>
              ) : (
                weakSubjects.map((sub: any, idx: number) => {
                  const pct = Math.round((sub.accuracy ?? 0) * 100);
                  const barColor = pct < 50 ? "#EF4444" : "#F97316";
                  return (
                    <View key={idx} style={styles.progressItem}>
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>{sub.subject}</Text>
                        <Text style={[styles.progressPct, { color: barColor }]}>
                          {pct}%
                        </Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* ================================================================= */}
        {/* 4. MOCK HISTORY: Recent Mock Exams                                */}
        {/* ================================================================= */}
        <Text style={styles.sec}>Recent Mock Exams</Text>
        {mockSessions.length === 0 ? (
          <View style={styles.emptyMockCard}>
            <Text style={styles.emptyMockText}>
              No mock exams yet. Try the 100-question mock!
            </Text>
            <Pressable
              testID="btn-mock-start"
              style={styles.mockActionBtn}
              onPress={() => router.push("/quiz/mock" as any)}
            >
              <Text style={styles.mockActionBtnText}>Launch Mock Simulation ›</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.dashboardCard}>
            {mockSessions.map((session: any, idx: number) => {
              const accPct = Math.round((session.accuracy ?? 0) * 100);
              const isPassing = accPct >= 75;
              return (
                <View
                  key={idx}
                  style={[
                    styles.mockRow,
                    idx < mockSessions.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mockDate}>{formatDate(session.date)}</Text>
                    <Text style={styles.mockScore}>
                      Score: {session.correct}/{session.total} questions
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.mockBadge,
                      {
                        backgroundColor: isPassing ? "#DCFCE7" : accPct >= 60 ? "#FEF3C7" : "#FEE2E2",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.mockBadgeText,
                        {
                          color: isPassing ? "#15803D" : accPct >= 60 ? "#B45309" : "#B91C1C",
                        },
                      ]}
                    >
                      {accPct}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ================================================================= */}
        {/* 5. FREQUENTLY MISSED: Frequently Missed Topics                     */}
        {/* ================================================================= */}
        <Text style={styles.sec}>Frequently Missed Topics</Text>
        {frequentlyMissed.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>
              No frequently missed topics detected yet. Keep up the high accuracy!
            </Text>
          </View>
        ) : (
          <View style={styles.dashboardCard}>
            {frequentlyMissed.map((t: any, idx: number) => {
              const accPct = Math.round((t.accuracy ?? 0) * 100);
              return (
                <Pressable
                  key={idx}
                  testID={`missed-topic-${idx}`}
                  style={[
                    styles.topicRow,
                    idx < frequentlyMissed.length - 1 && styles.rowDivider,
                  ]}
                  onPress={() =>
                    router.push(
                      `/(tabs)/ai-tab?prefill=${encodeURIComponent(
                        "Explain " + t.topic + " in detail with NCLEX-style examples"
                      )}` as any
                    )
                  }
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.topicName}>{t.topic}</Text>
                    <Text style={styles.topicMissCount}>
                      {t.missed_count} missed questions
                    </Text>
                  </View>
                  <View style={styles.topicRight}>
                    <View style={styles.topicBadge}>
                      <Text style={styles.topicBadgeText}>{accPct}% acc</Text>
                    </View>
                    <Text style={styles.arrow}>›</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ================================================================= */}
        {/* EXISTING CARDS: Daily challenge, weak area, categories & strategies */}
        {/* ================================================================= */}
        <Text style={[styles.sec, { marginTop: 24 }]}>Practice Modes</Text>
        <Pressable
          testID="nclex-daily"
          style={styles.dailyCard}
          onPress={() => router.push("/quiz/practice" as any)}
        >
          <Text style={styles.dailyIcon}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.dailyTitle}>Daily NCLEX Challenge</Text>
            <Text style={styles.dailySub}>10 curated questions · earn XP</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Start</Text>
          </View>
        </Pressable>

        <Pressable
          testID="nclex-weak"
          style={styles.weakCard}
          onPress={() => router.push("/quiz/weak" as any)}
        >
          <Text style={styles.weakIcon}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.weakTitle}>Weak Area Training</Text>
            <Text style={styles.weakSub}>Questions targeting your recent mistakes</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <Text style={styles.sec}>Browse by category</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              testID={`nclex-cat-${c.key}`}
              style={styles.catCard}
              onPress={() =>
                router.push(
                  `/(tabs)/ai-tab?prefill=${encodeURIComponent(
                    "Give me 5 NCLEX-style questions on " + c.label + ", with rationales."
                  )}` as any
                )
              }
            >
              <Text style={styles.catIcon}>{c.icon}</Text>
              <Text style={styles.catLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sec}>Question strategies</Text>
        {[
          "Prioritisation",
          "Delegation",
          "Safety-first",
          "Therapeutic communication",
          "Pharmacology",
        ].map((t) => (
          <Pressable
            key={t}
            testID={`nclex-str-${t}`}
            style={styles.stratCard}
            onPress={() =>
              router.push(
                `/(tabs)/ai-tab?prefill=${encodeURIComponent(
                  "Explain NCLEX " + t + " questions with 3 worked examples."
                )}` as any
              )
            }
          >
            <Text style={styles.stratText}>{t}</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}

        <Text style={styles.disclaimer}>
          Practice questions are original educational content, not official NCLEX items.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backIcon: {
    fontSize: 30,
    color: colors.onSurface,
    width: 30,
  },
  title: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
  },

  // Stats row
  statsScroll: {
    marginHorizontal: -spacing.lg,
    marginBottom: 16,
  },
  statsScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  statPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 95,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statPillLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statPillValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
  },

  // Insights card
  insightsCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 16,
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  insightsHeader: {
    marginBottom: 12,
  },
  insightsBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  insightsBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1E40AF",
    letterSpacing: 0.6,
  },
  insightsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E3A8A",
    lineHeight: 20,
    marginBottom: 4,
  },
  insightsHighlight: {
    color: "#2563EB",
    textDecorationLine: "underline",
  },
  insightsSub: {
    fontSize: 12.5,
    color: "#3B82F6",
    lineHeight: 17,
  },
  insightsBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  teachMeBtn: {
    flex: 1,
    backgroundColor: "#1E3A8A",
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  teachMeBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  planBtn: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  planBtnText: {
    color: "#1E40AF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Dashboard Card
  dashboardCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  emptyProgressBox: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  emptyProgressEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyProgressTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.onSurface,
    textAlign: "center",
    marginBottom: 4,
  },
  emptyProgressSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 17,
  },
  subCategoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  subCategoryHeading: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.onSurface,
  },
  subCategorySub: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: "italic",
    marginBottom: 4,
  },
  progressItem: {
    marginBottom: 10,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: "800",
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 7,
    borderRadius: 4,
  },

  // Mock History
  emptyMockCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyMockText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 10,
  },
  mockActionBtn: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  mockActionBtnText: {
    color: colors.brandPrimary,
    fontSize: 12.5,
    fontWeight: "700",
  },
  mockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  mockDate: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
  },
  mockScore: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  mockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  mockBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  // Frequently Missed Topics
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyCardText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  topicName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 2,
  },
  topicMissCount: {
    fontSize: 11.5,
    color: "#DC2626",
    fontWeight: "600",
  },
  topicRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topicBadge: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  topicBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },

  // Existing sections styles
  sec: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 10,
  },
  dailyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
  },
  dailyIcon: {
    fontSize: 32,
  },
  dailyTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  dailySub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFF",
  },
  pillText: {
    color: colors.brandPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  weakCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  weakIcon: {
    fontSize: 28,
  },
  weakTitle: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "800",
  },
  weakSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    color: colors.muted,
    fontSize: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catCard: {
    width: "48%",
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 6,
  },
  catIcon: {
    fontSize: 30,
  },
  catLabel: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "800",
  },
  stratCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  stratText: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
  },
  disclaimer: {
    color: colors.muted,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 20,
    textAlign: "center",
  },
});
