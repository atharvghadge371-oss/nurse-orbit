import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

type OsceAttempt = {
  id: string;
  station_id: string;
  station_title: string;
  station_category: string;
  scored_marks: number;
  total_marks: number;
  pass_mark: number;
  percentage: number;
  passed: boolean;
  xp_awarded: number;
  time_spent_seconds: number | null;
  created_at: string;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function OsceHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [attempts, setAttempts] = useState<OsceAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.osceHistory();
      setAttempts(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  // Stats
  const totalAttempts = attempts.length;
  const passes = attempts.filter((a) => a.passed).length;
  const passRate = totalAttempts > 0 ? Math.round((passes / totalAttempts) * 100) : 0;
  const totalXp = attempts.reduce((sum, a) => sum + (a.xp_awarded ?? 0), 0);
  const avgPct = totalAttempts > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / totalAttempts)
    : 0;

  // Best stations (by percentage, deduped by station)
  const bestByStation: Record<string, OsceAttempt> = {};
  for (const a of attempts) {
    if (!bestByStation[a.station_id] || a.percentage > bestByStation[a.station_id].percentage) {
      bestByStation[a.station_id] = a;
    }
  }

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
        <Text style={styles.loadingText}>Loading your OSCE history…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="history-back">
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>OSCE History</Text>
          <Text style={styles.headerSub}>Your practice performance</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats summary */}
        {totalAttempts > 0 && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalAttempts}</Text>
              <Text style={styles.statLabel}>Attempts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: passRate >= 60 ? colors.success : colors.warning }]}>
                {passRate}%
              </Text>
              <Text style={styles.statLabel}>Pass Rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{avgPct}%</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#F59E0B" }]}>+{totalXp}</Text>
              <Text style={styles.statLabel}>XP Earned</Text>
            </View>
          </View>
        )}

        {/* Best scores per station */}
        {Object.keys(bestByStation).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Best Scores by Station</Text>
            {Object.values(bestByStation)
              .sort((a, b) => b.percentage - a.percentage)
              .map((a) => (
                <TouchableOpacity
                  key={a.station_id}
                  style={styles.bestCard}
                  onPress={() => router.push({ pathname: "/osce/[id]" as any, params: { id: a.station_id } })}
                  testID={`best-${a.station_id}`}
                >
                  <View style={styles.bestCardLeft}>
                    <Text style={styles.bestTitle}>{a.station_title}</Text>
                    <Text style={styles.bestCategory}>{a.station_category}</Text>
                  </View>
                  <View style={styles.bestRight}>
                    <Text style={[styles.bestScore, { color: a.passed ? colors.success : colors.error }]}>
                      {a.percentage}%
                    </Text>
                    <Text style={[styles.bestResult, { color: a.passed ? colors.success : colors.error }]}>
                      {a.passed ? "PASS" : "FAIL"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* All attempts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 All Attempts</Text>
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
              <TouchableOpacity onPress={load}><Text style={styles.retryText}>Tap to retry</Text></TouchableOpacity>
            </View>
          ) : attempts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyTitle}>No attempts yet</Text>
              <Text style={styles.emptySubtitle}>Complete an OSCE station to see your history here</Text>
              <TouchableOpacity style={styles.goBtn} onPress={() => router.push("/osce" as any)} testID="go-practice-btn">
                <Text style={styles.goBtnText}>Start Practising →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            attempts.map((attempt, idx) => (
              <View key={attempt.id ?? idx} style={[styles.attemptCard, attempt.passed ? styles.attemptCardPass : styles.attemptCardFail]}>
                <View style={styles.attemptCardHeader}>
                  <View style={[styles.resultTag, { backgroundColor: attempt.passed ? "#ECFDF5" : "#FEF2F2" }]}>
                    <Text style={[styles.resultTagText, { color: attempt.passed ? colors.success : colors.error }]}>
                      {attempt.passed ? "✅ PASS" : "❌ FAIL"}
                    </Text>
                  </View>
                  <Text style={styles.attemptDate}>{formatDate(attempt.created_at)}</Text>
                </View>
                <Text style={styles.attemptTitle}>{attempt.station_title}</Text>
                <Text style={styles.attemptCategory}>{attempt.station_category}</Text>

                <View style={styles.attemptStats}>
                  <View style={styles.attemptStat}>
                    <Text style={styles.attemptStatValue}>{attempt.scored_marks}/{attempt.total_marks}</Text>
                    <Text style={styles.attemptStatLabel}>Score</Text>
                  </View>
                  <View style={styles.attemptStat}>
                    <Text style={[styles.attemptStatValue, { color: attempt.passed ? colors.success : colors.error }]}>
                      {attempt.percentage}%
                    </Text>
                    <Text style={styles.attemptStatLabel}>Percentage</Text>
                  </View>
                  <View style={styles.attemptStat}>
                    <Text style={styles.attemptStatValue}>{formatDuration(attempt.time_spent_seconds)}</Text>
                    <Text style={styles.attemptStatLabel}>Duration</Text>
                  </View>
                  <View style={styles.attemptStat}>
                    <Text style={[styles.attemptStatValue, { color: "#F59E0B" }]}>+{attempt.xp_awarded}</Text>
                    <Text style={styles.attemptStatLabel}>XP</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.attemptProgress}>
                  <View style={[
                    styles.attemptProgressFill,
                    {
                      width: `${Math.min(attempt.percentage, 100)}%`,
                      backgroundColor: attempt.passed ? colors.success : colors.warning,
                    },
                  ]} />
                  <View style={[
                    styles.passMark,
                    { left: `${Math.min((attempt.pass_mark / attempt.total_marks) * 100, 100)}%` },
                  ]} />
                </View>

                <TouchableOpacity
                  style={styles.retryStationBtn}
                  onPress={() => router.push({ pathname: "/osce/[id]" as any, params: { id: attempt.station_id } })}
                  testID={`retry-${attempt.station_id}`}
                >
                  <Text style={styles.retryStationText}>Practice Again →</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceSecondary },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  loadingText: { marginTop: spacing.md, color: colors.muted, fontSize: 14 },
  scroll: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  backBtn: { padding: 6 },
  backBtnText: { color: "#fff", fontSize: 22, fontWeight: "600" },
  headerTitles: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },

  statsGrid: {
    flexDirection: "row",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: "900", color: colors.onSurface },
  statLabel: { fontSize: 10, color: colors.muted, marginTop: 3, textAlign: "center", fontWeight: "600" },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.brandPrimary, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },

  bestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bestCardLeft: { flex: 1 },
  bestTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  bestCategory: { fontSize: 12, color: colors.muted, marginTop: 2 },
  bestRight: { alignItems: "center" },
  bestScore: { fontSize: 20, fontWeight: "900" },
  bestResult: { fontSize: 11, fontWeight: "700", marginTop: 2 },

  attemptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  attemptCardPass: { borderLeftWidth: 4, borderLeftColor: colors.success },
  attemptCardFail: { borderLeftWidth: 4, borderLeftColor: colors.error },
  attemptCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  resultTag: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  resultTagText: { fontSize: 12, fontWeight: "800" },
  attemptDate: { fontSize: 12, color: colors.muted },
  attemptTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface, marginBottom: 2 },
  attemptCategory: { fontSize: 12, color: colors.muted, marginBottom: spacing.sm },

  attemptStats: { flexDirection: "row", gap: spacing.sm, marginVertical: spacing.sm },
  attemptStat: { flex: 1, alignItems: "center" },
  attemptStatValue: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  attemptStatLabel: { fontSize: 10, color: colors.muted, fontWeight: "600", marginTop: 2 },

  attemptProgress: {
    height: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 3,
    overflow: "visible",
    position: "relative",
    marginVertical: spacing.sm,
  },
  attemptProgressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    minWidth: 4,
  },
  passMark: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 12,
    backgroundColor: colors.brandPrimary,
    borderRadius: 1,
  },

  retryStationBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    paddingVertical: 8,
    alignItems: "center",
  },
  retryStationText: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700" },

  errorCard: { backgroundColor: "#FEE2E2", borderRadius: radius.lg, padding: spacing.lg, alignItems: "center" },
  errorText: { color: "#B91C1C", fontSize: 14, textAlign: "center", marginBottom: spacing.sm },
  retryText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700" },

  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.xs },
  emptySubtitle: { fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: spacing.lg, lineHeight: 18 },
  goBtn: { backgroundColor: colors.brandPrimary, borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 12 },
  goBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
