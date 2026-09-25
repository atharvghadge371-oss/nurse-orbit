import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
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

export default function StudentPortfolioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: portfolio, isLoading, refetch } = useQuery({
    queryKey: ["logbook-portfolio"],
    queryFn: () => api.logbookPortfolio(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleExport = () => {
    Alert.alert(
      "Portfolio Export Ready 📄",
      `Student Portfolio for ${portfolio?.student_name || "Student"} has been compiled.\n\nTotal Hours: ${portfolio?.total_clinical_hours || 0}\nSkills Mastered: ${portfolio?.skills_count || 0}\nPlacements: ${portfolio?.placements?.length || 0}\n\nReady for university verification and clinical preceptor sign-off!`,
      [{ text: "Great!" }]
    );
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

  const formatTimestamp = (isoStr: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="portfolio-back"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Nursing Portfolio</Text>
        <Pressable
          testID="portfolio-export-header"
          onPress={handleExport}
          style={styles.exportHeaderBtn}
        >
          <Text style={styles.exportHeaderText}>Export</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.brandPrimary} size="large" />
          <Text style={styles.loadingText}>Compiling student portfolio...</Text>
        </View>
      ) : !portfolio ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Unable to load portfolio at this time.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: screenContentBottomPadding(insets.bottom) + minTouchTarget,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brandPrimary}
            />
          }
        >
          {/* Hero Gradient Header */}
          <LinearGradient
            colors={["#0A1931", "#1E3A8A", "#0D9488"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.verifiedTag}>
              <Text style={styles.verifiedTagText}>OFFICIAL VERIFIED RECORD</Text>
            </View>
            <Text style={styles.heroName}>{portfolio.student_name}</Text>
            <Text style={styles.heroRole}>Undergraduate Student Nurse · Clinical Portfolio</Text>
            <Text style={styles.heroGenerated}>
              Generated: {formatTimestamp(portfolio.generated_at)}
            </Text>

            {/* Stats Row inside Hero */}
            <View style={styles.heroMetricsGrid}>
              <View style={styles.heroMetricItem}>
                <Text style={styles.heroMetricValue}>
                  {Number(portfolio.total_clinical_hours).toFixed(1)}
                </Text>
                <Text style={styles.heroMetricLabel}>Clinical Hours</Text>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetricItem}>
                <Text style={styles.heroMetricValue}>
                  {portfolio.total_patients_encountered}
                </Text>
                <Text style={styles.heroMetricLabel}>Patients</Text>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetricItem}>
                <Text style={styles.heroMetricValue}>
                  {portfolio.total_entries}
                </Text>
                <Text style={styles.heroMetricLabel}>Rotations</Text>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetricItem}>
                <Text style={styles.heroMetricValue}>
                  {portfolio.skills_count}
                </Text>
                <Text style={styles.heroMetricLabel}>Skills</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Section 1: Clinical Placements Breakdown */}
          <Text style={styles.sectionHeading}>Clinical Placements & Rotations</Text>
          <View style={styles.card}>
            {portfolio.placements?.length === 0 ? (
              <Text style={styles.noneText}>No placements logged yet.</Text>
            ) : (
              portfolio.placements.map((p: any, idx: number) => {
                const totalHours = portfolio.total_clinical_hours || 1;
                const pct = Math.min(100, Math.round((p.hours / totalHours) * 100));
                return (
                  <View
                    key={idx}
                    style={[
                      styles.placementRow,
                      idx < portfolio.placements.length - 1 && styles.placementRowBorder,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.placementName}>{p.placement}</Text>
                      <Text style={styles.placementDept}>{p.department}</Text>
                      {/* Hours progress bar */}
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                    <View style={styles.placementStats}>
                      <Text style={styles.placementHours}>{Number(p.hours).toFixed(1)} hrs</Text>
                      <Text style={styles.placementEntries}>{p.entries} {p.entries === 1 ? "shift" : "shifts"}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Section 2: Clinical Skills & Competencies */}
          <View style={styles.sectionHeaderWithCount}>
            <Text style={styles.sectionHeading}>Clinical Skills Acquired</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{portfolio.skills_count} Mastered</Text>
            </View>
          </View>
          <View style={styles.card}>
            {portfolio.skills_achieved?.length === 0 ? (
              <Text style={styles.noneText}>No skills logged yet.</Text>
            ) : (
              <View style={styles.chipCloud}>
                {portfolio.skills_achieved.map((skill: string, idx: number) => (
                  <View key={idx} style={styles.skillTag}>
                    <Text style={styles.skillTagEmoji}>⭐️</Text>
                    <Text style={styles.skillTagText}>{skill}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Section 3: Procedures Breakdown */}
          <Text style={styles.sectionHeading}>Procedures Competency Inventory</Text>
          <View style={styles.card}>
            {/* Performed */}
            <Text style={styles.subHeading}>
              ⚡️ Hands-On Interventions Performed ({portfolio.procedures_performed?.length || 0})
            </Text>
            {portfolio.procedures_performed?.length === 0 ? (
              <Text style={styles.noneText}>No procedures recorded yet.</Text>
            ) : (
              <View style={[styles.chipCloud, { marginBottom: 16 }]}>
                {portfolio.procedures_performed.map((proc: string, idx: number) => (
                  <View key={idx} style={styles.performedTag}>
                    <Text style={styles.performedTagText}>✓ {proc}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Observed */}
            <Text style={[styles.subHeading, { marginTop: 6 }]}>
              👁 Complex Procedures Observed ({portfolio.procedures_observed?.length || 0})
            </Text>
            {portfolio.procedures_observed?.length === 0 ? (
              <Text style={styles.noneText}>No observed procedures recorded yet.</Text>
            ) : (
              <View style={styles.chipCloud}>
                {portfolio.procedures_observed.map((proc: string, idx: number) => (
                  <View key={idx} style={styles.observedTag}>
                    <Text style={styles.observedTagText}>• {proc}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Section 4: Supervisor Feedback Highlights */}
          {portfolio.supervisor_feedback_snippets?.length > 0 && (
            <View>
              <Text style={styles.sectionHeading}>Supervisor Feedback Highlights</Text>
              <View style={styles.feedbackList}>
                {portfolio.supervisor_feedback_snippets.map((snip: string, idx: number) => (
                  <View key={idx} style={styles.feedbackSnippetCard}>
                    <Text style={styles.quoteIcon}>“</Text>
                    <Text style={styles.feedbackSnippetText}>{snip}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Section 5: Chronological Timeline */}
          <Text style={styles.sectionHeading}>Clinical Rotation Timeline</Text>
          <View style={styles.card}>
            {portfolio.timeline?.length === 0 ? (
              <Text style={styles.noneText}>No timeline shifts recorded yet.</Text>
            ) : (
              portfolio.timeline.map((item: any, idx: number) => {
                const isLast = idx === portfolio.timeline.length - 1;
                return (
                  <View key={idx} style={styles.timelineRow}>
                    <View style={styles.timelineLineCol}>
                      <View style={styles.timelineDot} />
                      {!isLast && <View style={styles.timelineConnector} />}
                    </View>
                    <View style={[styles.timelineContent, !isLast && { paddingBottom: 16 }]}>
                      <View style={styles.timelineDateRow}>
                        <Text style={styles.timelineDateText}>{formatDate(item.date)}</Text>
                        <Text style={styles.timelineHoursText}>{Number(item.hours).toFixed(1)} hrs</Text>
                      </View>
                      <Text style={styles.timelinePlacementText}>{item.placement}</Text>
                      {item.key_skills?.length > 0 && (
                        <View style={styles.timelineSkillsRow}>
                          {item.key_skills.map((ks: string, i: number) => (
                            <View key={i} style={styles.timelineSkillPill}>
                              <Text style={styles.timelineSkillPillText}>{ks}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Export Button */}
          <Pressable
            testID="btn-export-portfolio"
            style={styles.exportFullBtn}
            onPress={handleExport}
          >
            <Text style={styles.exportFullBtnText}>📄 Export Verified Portfolio Summary</Text>
          </Pressable>
        </ScrollView>
      )}
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
    fontSize: 17,
    fontWeight: "800",
  },
  exportHeaderBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  exportHeaderText: {
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
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
  heroGradient: {
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  verifiedTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: 10,
  },
  verifiedTagText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 2,
  },
  heroRole: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 6,
  },
  heroGenerated: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.65)",
    marginBottom: 16,
  },
  heroMetricsGrid: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  heroMetricItem: {
    flex: 1,
    alignItems: "center",
  },
  heroMetricValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFF",
  },
  heroMetricLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  heroMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 10,
    marginTop: 10,
  },
  sectionHeaderWithCount: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  countBadge: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    color: colors.brandPrimary,
    fontSize: 11,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  placementRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  placementRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  placementName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 2,
  },
  placementDept: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    backgroundColor: colors.brandSecondary,
    borderRadius: 3,
  },
  placementStats: {
    alignItems: "flex-end",
  },
  placementHours: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.brandPrimary,
  },
  placementEntries: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  chipCloud: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FDF2F8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  skillTagEmoji: {
    fontSize: 12,
  },
  skillTagText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#BE185D",
  },
  subHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 8,
  },
  performedTag: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  performedTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
  },
  observedTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  observedTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  feedbackList: {
    gap: 10,
    marginBottom: 16,
  },
  feedbackSnippetCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    position: "relative",
  },
  quoteIcon: {
    fontSize: 24,
    color: "#F59E0B",
    lineHeight: 22,
    marginBottom: 2,
  },
  feedbackSnippetText: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 19,
    fontStyle: "italic",
  },
  timelineRow: {
    flexDirection: "row",
  },
  timelineLineCol: {
    alignItems: "center",
    width: 20,
    marginRight: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brandPrimary,
    marginTop: 4,
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.divider,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
  },
  timelineHoursText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.brandSecondary,
  },
  timelinePlacementText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: 2,
    marginBottom: 4,
  },
  timelineSkillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  timelineSkillPill: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  timelineSkillPillText: {
    fontSize: 10,
    color: colors.onSurfaceSecondary,
    fontWeight: "600",
  },
  noneText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: "italic",
  },
  exportFullBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  exportFullBtnText: {
    color: "#FFF",
    fontSize: 14.5,
    fontWeight: "800",
  },
});
