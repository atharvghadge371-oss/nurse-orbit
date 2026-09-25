import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
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

interface PlanDay {
  day: number;
  title: string;
  focus: string;
  tasks: string[];
  ai_prompt: string;
}

interface RevisionPlan {
  plan_id?: string;
  id?: string;
  topic: string;
  rationale: string;
  days: PlanDay[];
}

export default function RevisionPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { topic: rawTopic } = useLocalSearchParams<{ topic?: string }>();
  const topicParam = rawTopic?.trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<RevisionPlan | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1])); // Day 1 open by default

  useEffect(() => {
    let mounted = true;
    async function loadPlan() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.generateRevisionPlan(topicParam || undefined);
        if (mounted) {
          const planData: RevisionPlan = {
            id: res.plan_id || res.id,
            topic: res.topic || res.plan_data?.topic || topicParam || "Targeted Area",
            rationale:
              res.rationale ||
              res.plan_data?.rationale ||
              "A structured 7-day revision curriculum designed to solidify clinical understanding and eliminate NCLEX mistakes.",
            days: res.days || res.plan_data?.days || [],
          };
          setPlan(planData);
        }
      } catch (err: any) {
        if (mounted) {
          setError(
            err?.message ||
              "Failed to generate revision plan. Please complete more practice questions first."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPlan();
    return () => {
      mounted = false;
    };
  }, [topicParam]);

  const toggleDay = (dayNum: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNum)) {
        next.delete(dayNum);
      } else {
        next.add(dayNum);
      }
      return next;
    });
  };

  const handleSaveToCalendar = () => {
    Alert.alert(
      "Reminder feature coming soon",
      "Your 7-day study modules will automatically sync with your Nurse Orbit Study Calendar in an upcoming update!",
      [{ text: "OK" }]
    );
  };

  const handleSharePlan = () => {
    Alert.alert(
      "Share Plan",
      `7-Day Revision Plan for ${plan?.topic || "your clinical focus"} is ready to share.`,
      [{ text: "OK" }]
    );
  };

  // Loading Screen
  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator
          size="large"
          color={colors.brandPrimary}
          style={{ marginBottom: 16 }}
        />
        <Text style={{ fontSize: 44, marginBottom: 10 }}>📋</Text>
        <Text style={styles.loadingTitle}>
          {topicParam
            ? `Building your plan for ${topicParam}...`
            : "Detecting your weakest area..."}
        </Text>
        <Text style={styles.loadingSub}>
          Orbit AI is analyzing your mistake patterns...
        </Text>
      </View>
    );
  }

  // Error Screen
  if (error || !plan) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={{ fontSize: 46 }}>⚠️</Text>
        <Text style={styles.errorTitle}>Plan Unavailable</Text>
        <Text style={styles.errorSub}>
          {error || "Could not generate revision plan."}
        </Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.retryBtnText}>Return to NCLEX</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="revision-plan-back"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>7-Day Revision Plan</Text>
          <Text style={styles.headerSubtitle}>{plan.topic}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: screenContentBottomPadding(insets.bottom) + minTouchTarget,
        }}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>AI STUDY CURRICULUM</Text>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: "#F0FDF4" }]}>
              <Text style={[styles.heroBadgeText, { color: "#166534" }]}>
                7 DAYS · STRUCTURED
              </Text>
            </View>
          </View>

          <Text style={styles.heroTopic}>{plan.topic}</Text>
          <Text style={styles.heroRationaleLabel}>Why this is your focus:</Text>
          <Text style={styles.heroRationale}>{plan.rationale}</Text>
        </View>

        {/* Section Heading */}
        <Text style={styles.sectionHeading}>Daily Action Modules</Text>

        {/* Day-by-Day Accordion List */}
        <View style={{ gap: 10 }}>
          {plan.days.map((dayItem) => {
            const isExpanded = expandedDays.has(dayItem.day);
            return (
              <View key={dayItem.day} style={styles.dayCard}>
                {/* Header (always visible, tap to toggle) */}
                <Pressable
                  testID={`day-header-${dayItem.day}`}
                  style={styles.dayHeader}
                  onPress={() => toggleDay(dayItem.day)}
                >
                  <View style={styles.dayNumberBadge}>
                    <Text style={styles.dayNumberText}>D{dayItem.day}</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.dayTitle}>{dayItem.title}</Text>
                    <Text style={styles.dayFocusText} numberOfLines={1}>
                      Focus: {dayItem.focus}
                    </Text>
                  </View>
                  <Text style={styles.chevronIcon}>{isExpanded ? "▲" : "▼"}</Text>
                </Pressable>

                {/* Body (visible when expanded) */}
                {isExpanded && (
                  <View style={styles.dayBody}>
                    <View style={styles.divider} />

                    {/* Focus block */}
                    <View style={styles.focusBlock}>
                      <Text style={styles.focusHeading}>🎯 Core Focus Area:</Text>
                      <Text style={styles.focusBody}>{dayItem.focus}</Text>
                    </View>

                    {/* Task List */}
                    <Text style={styles.tasksHeading}>Daily Action Tasks:</Text>
                    <View style={{ gap: 8, marginBottom: 14 }}>
                      {dayItem.tasks.map((task, tIdx) => (
                        <View key={tIdx} style={styles.taskRow}>
                          <Text style={styles.taskBullet}>•</Text>
                          <Text style={styles.taskText}>{task}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Ask AI Tutor Button */}
                    {!!dayItem.ai_prompt && (
                      <Pressable
                        testID={`btn-ai-tutor-day-${dayItem.day}`}
                        style={styles.aiPromptBtn}
                        onPress={() => {
                          router.push(
                            `/(tabs)/ai-tab?prefill=${encodeURIComponent(
                              dayItem.ai_prompt
                            )}` as any
                          );
                        }}
                      >
                        <Text style={styles.aiPromptBtnText}>
                          💬 Ask AI Tutor for Day {dayItem.day} Guidance ›
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Action Buttons: Save to Calendar & Share Plan */}
        <View style={styles.bottomActions}>
          <Pressable
            testID="btn-save-calendar"
            style={styles.actionBtnPrimary}
            onPress={handleSaveToCalendar}
          >
            <Text style={styles.actionBtnPrimaryText}>📅 Save to Calendar</Text>
          </Pressable>

          <Pressable
            testID="btn-share-plan"
            style={styles.actionBtnSecondary}
            onPress={handleSharePlan}
          >
            <Text style={styles.actionBtnSecondaryText}>📤 Share Plan</Text>
          </Pressable>
        </View>
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
    gap: 8,
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
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
    marginTop: 14,
    textAlign: "center",
  },
  loadingSub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.error,
    marginTop: 12,
  },
  errorSub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  retryBtnText: {
    color: "#FFF",
    fontWeight: "700",
  },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  heroBadge: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.brandPrimary,
    letterSpacing: 0.5,
  },
  heroTopic: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 8,
  },
  heroRationaleLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  heroRationale: {
    fontSize: 13.5,
    color: colors.onSurfaceSecondary,
    lineHeight: 20,
  },

  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 12,
  },

  // Accordion
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  dayNumberBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  dayTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 2,
  },
  dayFocusText: {
    fontSize: 12,
    color: colors.muted,
  },
  chevronIcon: {
    fontSize: 12,
    color: colors.muted,
  },
  dayBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: 12,
  },
  focusBlock: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focusHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.brandPrimary,
    marginBottom: 3,
  },
  focusBody: {
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
  },
  tasksHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  taskBullet: {
    fontSize: 16,
    color: colors.brandSecondary,
    lineHeight: 18,
  },
  taskText: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceSecondary,
    lineHeight: 18,
  },
  aiPromptBtn: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  aiPromptBtnText: {
    color: colors.brandPrimary,
    fontSize: 12.5,
    fontWeight: "700",
  },

  // Bottom action buttons
  bottomActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionBtnPrimaryText: {
    color: "#FFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnSecondaryText: {
    color: colors.onSurface,
    fontSize: 13.5,
    fontWeight: "700",
  },
});
