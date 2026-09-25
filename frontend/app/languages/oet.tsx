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
  minTouchTarget,
  screenContentBottomPadding,
  spacing,
  radius,
} from "@/src/theme";

export default function OETScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: sections, isLoading, refetch } = useQuery({
    queryKey: ["lang-oet"],
    queryFn: () => api.langOET(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleStartRoleplay = (topic?: string) => {
    const prompt = topic
      ? `I am preparing for OET Speaking. Let's do a clinical role-play on "${topic}". Please act as the patient, set up your situation, and let me begin with an empathetic greeting.`
      : "I am preparing for the OET Nursing Speaking exam. Please act as a patient in a hospital ward, give me a clinical situation, and evaluate my nurse communication skills.";
    router.push(`/(tabs)/ai-tab?prefill=${encodeURIComponent(prompt)}` as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="oet-back-btn"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>OET for Nurses</Text>
          <Text style={styles.headerSub}>Occupational English Test (Nursing)</Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.brandPrimary} size="large" />
          <Text style={styles.loadingText}>Loading OET sub-test modules...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom:
              screenContentBottomPadding(insets.bottom) + minTouchTarget + spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brandPrimary}
            />
          }
        >
          {/* Target Score Card */}
          <View style={styles.targetCard}>
            <View style={styles.targetTopRow}>
              <View style={styles.targetBadge}>
                <Text style={styles.targetBadgeText}>REQUIRED TARGET</Text>
              </View>
              <Text style={styles.gradeText}>Grade B (350+)</Text>
            </View>
            <Text style={styles.targetDesc}>
              Required for international registration with the UK Nursing and Midwifery Council (NMC), NMBI Ireland, AHPRA Australia, and CGFNS VisaScreen (USA).
            </Text>
            <View style={styles.targetMetricsRow}>
              <View style={styles.targetMetricItem}>
                <Text style={styles.targetMetricVal}>4</Text>
                <Text style={styles.targetMetricLabel}>Sub-tests</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.targetMetricItem}>
                <Text style={styles.targetMetricVal}>350/500</Text>
                <Text style={styles.targetMetricLabel}>Min Score Each</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.targetMetricItem}>
                <Text style={styles.targetMetricVal}>Grade B</Text>
                <Text style={styles.targetMetricLabel}>Equivalent: 7.0 IELTS</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Row */}
          <View style={styles.quickActionsRow}>
            <Pressable
              testID="oet-quick-writing-btn"
              onPress={() => router.push("/languages/writing-practice?type=oet" as any)}
              style={({ pressed }) => [
                styles.quickActionBtn,
                { backgroundColor: "#0891B2" },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.quickActionBtnEmoji}>✍️</Text>
              <Text style={styles.quickActionBtnText}>OET Writing Lab</Text>
            </Pressable>
            <Pressable
              testID="oet-quick-speaking-btn"
              onPress={() => handleStartRoleplay()}
              style={({ pressed }) => [
                styles.quickActionBtn,
                { backgroundColor: "#0D9488" },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.quickActionBtnEmoji}>🗣️</Text>
              <Text style={styles.quickActionBtnText}>Speak with AI Role-play</Text>
            </Pressable>
          </View>

          {/* Sub-tests List */}
          <Text style={styles.sectionTitle}>OET SUB-TEST MODULES</Text>

          {(sections || []).map((sec: any) => {
            const isWriting = sec.id === "oet-writing";
            const isSpeaking = sec.id === "oet-speaking";

            return (
              <View key={sec.id} style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionIconBg}>
                    <Text style={styles.sectionIconEmoji}>{sec.icon || "📄"}</Text>
                  </View>
                  <View style={styles.sectionHeaderTextWrap}>
                    <Text style={styles.sectionCardTitle}>{sec.name}</Text>
                    <Text style={styles.sectionCardDesc}>{sec.desc}</Text>
                  </View>
                </View>

                {/* Nursing Tips List */}
                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>NURSE-SPECIFIC TIPS</Text>
                  {(sec.tips || []).map((tip: string, idx: number) => (
                    <View key={idx} style={styles.tipRow}>
                      <Text style={styles.tipBullet}>✓</Text>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>

                {/* Contextual Action Button */}
                {isWriting && (
                  <Pressable
                    testID="oet-open-writing-lab"
                    onPress={() => router.push("/languages/writing-practice?type=oet" as any)}
                    style={({ pressed }) => [
                      styles.cardActionBtn,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={styles.cardActionBtnText}>OET Writing Lab →</Text>
                  </Pressable>
                )}

                {isSpeaking && (
                  <Pressable
                    testID="oet-start-speaking-roleplay"
                    onPress={() => handleStartRoleplay(sec.name)}
                    style={({ pressed }) => [
                      styles.cardActionBtn,
                      { backgroundColor: "#0D9488" },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={styles.cardActionBtnText}>Speak with AI Role-play →</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {/* OET Grade Descriptors Card */}
          <View style={styles.descriptorsCard}>
            <Text style={styles.descriptorsTitle}>OET BAND DESCRIPTORS</Text>
            <View style={styles.descRow}>
              <View style={[styles.descBadge, { backgroundColor: "#DCFCE7" }]}>
                <Text style={[styles.descBadgeText, { color: "#166534" }]}>A = Excellent (450-500)</Text>
              </View>
              <Text style={styles.descRowText}>Very high level of fluency; communicates effectively with ease and clinical clarity.</Text>
            </View>
            <View style={styles.descRow}>
              <View style={[styles.descBadge, { backgroundColor: "#DBEAFE" }]}>
                <Text style={[styles.descBadgeText, { color: "#1E40AF" }]}>B = Good (350-440)</Text>
              </View>
              <Text style={styles.descRowText}>High level; effective clinical communication; required standard for international nurse registration.</Text>
            </View>
            <View style={styles.descRow}>
              <View style={[styles.descBadge, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.descBadgeText, { color: "#92400E" }]}>C = Pass (300-340)</Text>
              </View>
              <Text style={styles.descRowText}>Good command in clinical context; accepted for OET Clubbing or UK NMC combined scoring.</Text>
            </View>
            <View style={styles.descRow}>
              <View style={[styles.descBadge, { backgroundColor: "#FEE2E2" }]}>
                <Text style={[styles.descBadgeText, { color: "#991B1B" }]}>D / E = Fail (&lt; 300)</Text>
              </View>
              <Text style={styles.descRowText}>Does not meet standard; requires targeted revision in medical vocabulary, letter structure, or bedside interaction.</Text>
            </View>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.muted,
  },
  targetCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: spacing.lg,
  },
  targetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  targetBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1E40AF",
  },
  gradeText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E3A8A",
  },
  targetDesc: {
    fontSize: 12,
    color: "#1E3A8A",
    lineHeight: 17,
    marginBottom: 14,
  },
  targetMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  targetMetricItem: {
    alignItems: "center",
  },
  targetMetricVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E40AF",
  },
  targetMetricLabel: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.xl,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: minTouchTarget,
    flexDirection: "row",
    gap: 6,
  },
  quickActionBtnEmoji: {
    fontSize: 16,
  },
  quickActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sectionIconEmoji: {
    fontSize: 20,
  },
  sectionHeaderTextWrap: {
    flex: 1,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 2,
  },
  sectionCardDesc: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  tipsContainer: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 10,
  },
  tipsTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.onSurfaceSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  tipBullet: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.brandPrimary,
    marginRight: 6,
    marginTop: 1,
  },
  tipText: {
    fontSize: 12,
    color: colors.onSurface,
    lineHeight: 17,
    flex: 1,
  },
  cardActionBtn: {
    backgroundColor: "#0891B2",
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: minTouchTarget,
    marginTop: 4,
  },
  cardActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  descriptorsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  descriptorsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.onSurface,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  descRow: {
    marginBottom: 10,
  },
  descBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  descBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  descRowText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
});
