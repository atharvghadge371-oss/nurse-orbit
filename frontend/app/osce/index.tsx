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

type Station = {
  id: string;
  category: string;
  title: string;
  duration_minutes: number;
  difficulty: "easy" | "medium" | "hard";
  total_marks: number;
  pass_mark: number;
};

const DIFFICULTY_CONFIG = {
  easy: { label: "Beginner", color: "#10B981", bg: "#D1FAE5" },
  medium: { label: "Intermediate", color: "#F59E0B", bg: "#FEF3C7" },
  hard: { label: "Advanced", color: "#EF4444", bg: "#FEE2E2" },
};

const CATEGORY_ICONS: Record<string, string> = {
  Fundamentals: "🔬",
  "Clinical Skills": "🩺",
  Pharmacology: "💊",
  Emergency: "🚨",
  Communication: "💬",
};

export default function OsceHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDiff, setSelectedDiff] = useState<string>("All");

  const load = useCallback(async () => {
    try {
      const data = await api.osceStations();
      setStations(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load stations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const categories = ["All", ...Array.from(new Set(stations.map((s) => s.category)))];
  const difficulties = ["All", "easy", "medium", "hard"];

  const filtered = stations.filter((s) => {
    const catOk = selectedCategory === "All" || s.category === selectedCategory;
    const diffOk = selectedDiff === "All" || s.difficulty === selectedDiff;
    return catOk && diffOk;
  });

  const grouped: Record<string, Station[]> = {};
  for (const s of filtered) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  if (loading) {
    return (
      <View style={styles.centreContainer}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
        <Text style={styles.loadingText}>Loading OSCE Stations…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandPrimary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          testID="osce-back-btn"
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>OSCE Practice</Text>
          <Text style={styles.headerSub}>Objective Structured Clinical Examination</Text>
        </View>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => router.push("/osce/history" as any)}
          testID="osce-history-btn"
        >
          <Text style={styles.historyBtnText}>📊</Text>
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🏥</Text>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>{stations.length} Clinical Stations</Text>
          <Text style={styles.bannerSub}>
            Tick off checklist items, get AI examiner feedback & earn XP
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}
              testID={`cat-filter-${cat}`}
            >
              <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                {cat === "All" ? "All Categories" : `${CATEGORY_ICONS[cat] ?? "🩺"} ${cat}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Difficulty Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
          {difficulties.map((d) => {
            const cfg = d === "All" ? null : DIFFICULTY_CONFIG[d as keyof typeof DIFFICULTY_CONFIG];
            const active = selectedDiff === d;
            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.diffChip,
                  active && { backgroundColor: cfg?.bg ?? colors.brandTertiary, borderColor: cfg?.color ?? colors.brandPrimary },
                ]}
                onPress={() => setSelectedDiff(d)}
                testID={`diff-filter-${d}`}
              >
                <Text style={[styles.diffChipText, active && { color: cfg?.color ?? colors.brandPrimary, fontWeight: "700" }]}>
                  {d === "All" ? "All Levels" : cfg?.label ?? d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={load}><Text style={styles.retryText}>Tap to retry</Text></TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No stations match your filters</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categorySectionHeader}>
                <Text style={styles.categoryIcon}>{CATEGORY_ICONS[category] ?? "🩺"}</Text>
                <Text style={styles.categorySectionTitle}>{category}</Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>{items.length}</Text>
                </View>
              </View>
              {items.map((station) => {
                const diffCfg = DIFFICULTY_CONFIG[station.difficulty] ?? DIFFICULTY_CONFIG.medium;
                return (
                  <TouchableOpacity
                    key={station.id}
                    style={styles.stationCard}
                    onPress={() => router.push({ pathname: "/osce/[id]" as any, params: { id: station.id } })}
                    testID={`station-card-${station.id}`}
                    activeOpacity={0.78}
                  >
                    <View style={styles.stationCardLeft}>
                      <Text style={styles.stationTitle}>{station.title}</Text>
                      <View style={styles.stationMeta}>
                        <Text style={styles.stationMetaItem}>⏱ {station.duration_minutes} min</Text>
                        <Text style={styles.stationMetaItem}>🎯 {station.pass_mark}/{station.total_marks} to pass</Text>
                      </View>
                    </View>
                    <View style={styles.stationCardRight}>
                      <View style={[styles.diffBadge, { backgroundColor: diffCfg.bg }]}>
                        <Text style={[styles.diffBadgeText, { color: diffCfg.color }]}>{diffCfg.label}</Text>
                      </View>
                      <Text style={styles.stationArrow}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}

        {/* Tips card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 How to use OSCE Practice</Text>
          <Text style={styles.tipItem}>1. Read the station scenario carefully</Text>
          <Text style={styles.tipItem}>2. Mentally perform each step as if in a real exam</Text>
          <Text style={styles.tipItem}>3. Tick off steps you completed correctly</Text>
          <Text style={styles.tipItem}>4. Get AI examiner feedback on your performance</Text>
          <Text style={styles.tipItem}>5. Earn XP — 20 for a pass, 5 for an attempt</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceSecondary },
  centreContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  loadingText: { marginTop: spacing.md, color: colors.muted, fontSize: 14 },

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
  headerTitles: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.2 },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 1 },
  historyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  historyBtnText: { fontSize: 18 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  bannerEmoji: { fontSize: 42 },
  bannerText: { flex: 1 },
  bannerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bannerSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 3, lineHeight: 16 },

  scroll: { flex: 1 },
  filterRow: { marginTop: spacing.md, marginBottom: spacing.xs },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  filterChipText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  diffChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 8,
  },
  diffChipText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },

  categorySection: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  categorySectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm, gap: 8 },
  categoryIcon: { fontSize: 20 },
  categorySectionTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface, flex: 1 },
  categoryCount: { backgroundColor: colors.brandTertiary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  categoryCountText: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "700" },

  stationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stationCardLeft: { flex: 1 },
  stationTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface, marginBottom: 6 },
  stationMeta: { flexDirection: "row", gap: 12 },
  stationMetaItem: { fontSize: 12, color: colors.muted },
  stationCardRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  diffBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  diffBadgeText: { fontSize: 11, fontWeight: "700" },
  stationArrow: { fontSize: 22, color: colors.muted, marginLeft: 2 },

  errorCard: { margin: spacing.lg, backgroundColor: "#FEE2E2", borderRadius: radius.lg, padding: spacing.lg, alignItems: "center" },
  errorText: { color: "#B91C1C", fontSize: 14, textAlign: "center" },
  retryText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700", marginTop: 8 },
  emptyCard: { margin: spacing.lg, alignItems: "center", padding: spacing.xl },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.md },
  emptyText: { color: colors.muted, fontSize: 15, textAlign: "center" },

  tipsCard: {
    margin: spacing.lg,
    backgroundColor: "#EFF6FF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.brandPrimary,
  },
  tipsTitle: { fontSize: 14, fontWeight: "800", color: colors.brandPrimary, marginBottom: spacing.sm },
  tipItem: { fontSize: 13, color: colors.onSurface, marginBottom: 4, lineHeight: 18 },
});
