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
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/api";
import {
  colors,
  minTouchTarget,
  screenContentBottomPadding,
  spacing,
  radius,
} from "@/src/theme";

export default function LogbookListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["logbook"],
    queryFn: () => api.logbookEntries(),
  });

  const entries = data?.entries || [];
  const summary = data?.summary || {
    total_entries: 0,
    total_hours: 0,
    total_patients: 0,
    unique_skills: [],
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
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
    } catch {
      // fallback
    }
    return dateStr;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="logbook-back"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Clinical Logbook</Text>
        <Pressable
          testID="logbook-header-add"
          onPress={() => router.push("/logbook/new" as any)}
          style={styles.headerAddBtn}
        >
          <Text style={styles.headerAddText}>+ Log</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.brandPrimary} size="large" />
          <Text style={styles.loadingText}>Loading clinical entries...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom:
              screenContentBottomPadding(insets.bottom) + minTouchTarget + spacing.xl,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brandPrimary}
            />
          }
        >
          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>⏱</Text>
              <Text style={styles.statNum}>{Number(summary.total_hours).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>👥</Text>
              <Text style={styles.statNum}>{summary.total_patients}</Text>
              <Text style={styles.statLabel}>Patients</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>📓</Text>
              <Text style={styles.statNum}>{summary.total_entries}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>⭐️</Text>
              <Text style={styles.statNum}>{summary.unique_skills?.length || 0}</Text>
              <Text style={styles.statLabel}>Skills</Text>
            </View>
          </View>

          {/* Portfolio CTA Card */}
          <LinearGradient
            colors={["#1E3A8A", "#2563EB", "#0D9488"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.portfolioCard}
          >
            <View style={styles.portfolioContent}>
              <View style={styles.portfolioBadge}>
                <Text style={styles.portfolioBadgeText}>AUTO-GENERATED</Text>
              </View>
              <Text style={styles.portfolioTitle}>Student Nursing Portfolio</Text>
              <Text style={styles.portfolioSub}>
                Verified clinical rotations, skills competencies, procedures tally & supervisor feedback summary.
              </Text>
            </View>
            <Pressable
              testID="btn-view-portfolio"
              style={styles.portfolioBtn}
              onPress={() => router.push("/logbook/portfolio" as any)}
            >
              <Text style={styles.portfolioBtnText}>View Portfolio ›</Text>
            </Pressable>
          </LinearGradient>

          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Rotations & Clinical Shifts</Text>
            <Text style={styles.sectionCount}>{entries.length} logged</Text>
          </View>

          {/* Entries List */}
          {entries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>📓</Text>
              <Text style={styles.emptyTitle}>No Clinical Entries Yet</Text>
              <Text style={styles.emptyText}>
                Log your hospital wards, procedures performed, skills achieved, and reflections to start building your professional portfolio.
              </Text>
              <Pressable
                testID="btn-first-log"
                style={styles.firstLogBtn}
                onPress={() => router.push("/logbook/new" as any)}
              >
                <Text style={styles.firstLogBtnText}>+ Log First Shift (+10 XP)</Text>
              </Pressable>
            </View>
          ) : (
            entries.map((item: any) => {
              const performedCount = item.procedures_performed?.length || 0;
              const observedCount = item.procedures_observed?.length || 0;
              return (
                <Pressable
                  key={item.id}
                  testID={`log-entry-${item.id}`}
                  style={styles.entryCard}
                  onPress={() => router.push(`/logbook/${item.id}` as any)}
                >
                  <View style={styles.entryTopRow}>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>{formatDate(item.date)}</Text>
                    </View>
                    <View style={styles.hoursBadge}>
                      <Text style={styles.hoursBadgeText}>{Number(item.clinical_hours).toFixed(1)} hrs</Text>
                    </View>
                  </View>

                  <Text style={styles.placementTitle}>{item.clinical_placement}</Text>
                  <Text style={styles.departmentText}>{item.hospital_department}</Text>

                  {/* Metrics row */}
                  <View style={styles.metricChipsRow}>
                    <View style={styles.metricChip}>
                      <Text style={styles.metricChipText}>👥 {item.patients_encountered} pts</Text>
                    </View>
                    {performedCount > 0 && (
                      <View style={[styles.metricChip, { backgroundColor: "#ECFDF5" }]}>
                        <Text style={[styles.metricChipText, { color: "#047857" }]}>
                          ⚡️ {performedCount} performed
                        </Text>
                      </View>
                    )}
                    {observedCount > 0 && (
                      <View style={[styles.metricChip, { backgroundColor: "#EFF6FF" }]}>
                        <Text style={[styles.metricChipText, { color: "#1D4ED8" }]}>
                          👁 {observedCount} observed
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Skills tags preview */}
                  {item.skills_achieved?.length > 0 && (
                    <View style={styles.skillsPreviewRow}>
                      {item.skills_achieved.slice(0, 3).map((sk: string, i: number) => (
                        <View key={i} style={styles.skillChip}>
                          <Text style={styles.skillChipText} numberOfLines={1}>
                            {sk}
                          </Text>
                        </View>
                      ))}
                      {item.skills_achieved.length > 3 && (
                        <View style={[styles.skillChip, styles.skillChipMore]}>
                          <Text style={styles.skillChipMoreText}>
                            +{item.skills_achieved.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Reflection snippet */}
                  {!!item.reflection && (
                    <Text style={styles.reflectionSnippet} numberOfLines={2}>
                      {`"${item.reflection}"`}
                    </Text>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <Pressable
        testID="logbook-fab"
        accessibilityRole="button"
        accessibilityLabel="Log clinical shift"
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => router.push("/logbook/new" as any)}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
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
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerBtn: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 32,
    color: colors.onSurface,
    lineHeight: 34,
  },
  headerTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
  },
  headerAddBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  headerAddText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statEmoji: {
    fontSize: 14,
    marginBottom: 2,
  },
  statNum: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.divider,
  },
  portfolioCard: {
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  portfolioContent: {
    marginBottom: 14,
  },
  portfolioBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: 8,
  },
  portfolioBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  portfolioTitle: {
    color: "#FFF",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 6,
  },
  portfolioSub: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12.5,
    lineHeight: 18,
  },
  portfolioBtn: {
    backgroundColor: "#FFF",
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  portfolioBtnText: {
    color: colors.brandPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  entryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateBadge: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  hoursBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  hoursBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
  },
  placementTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 2,
  },
  departmentText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
    marginBottom: 10,
  },
  metricChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  metricChip: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  metricChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceTertiary,
  },
  skillsPreviewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  skillChip: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    maxWidth: 160,
  },
  skillChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  skillChipMore: {
    backgroundColor: colors.surfaceTertiary,
  },
  skillChipMoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
  },
  reflectionSnippet: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: "italic",
    lineHeight: 16,
    marginTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: colors.brandSecondary,
    paddingLeft: 8,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  firstLogBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
  },
  firstLogBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "400",
    lineHeight: 34,
    marginTop: -2,
  },
});
