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

export default function IELTSScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: sections, isLoading, refetch } = useQuery({
    queryKey: ["lang-ielts"],
    queryFn: () => api.langIELTS(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleStartSpeakingPractice = () => {
    const prompt =
      "I am preparing for the IELTS Academic Speaking test as a nurse candidate. Please act as the IELTS examiner: conduct Part 1 (short questions about background/hometown), then Part 2 (cue card topic), then Part 3 (discussion). Keep your responses concise and guide me through the test.";
    router.push(`/(tabs)/ai-tab?prefill=${encodeURIComponent(prompt)}` as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="ielts-back-btn"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>IELTS Academic</Text>
          <Text style={styles.headerSub}>International Nursing Registration</Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.brandPrimary} size="large" />
          <Text style={styles.loadingText}>Loading IELTS Academic modules...</Text>
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
          {/* Nursing Registration Requirement Card */}
          <View style={styles.targetCard}>
            <View style={styles.targetTopRow}>
              <View style={styles.targetBadge}>
                <Text style={styles.targetBadgeText}>NMC & GLOBAL STANDARD</Text>
              </View>
              <Text style={styles.gradeText}>Band 7.0+</Text>
            </View>
            <Text style={styles.targetDesc}>
              Required for international registration with the UK Nursing and Midwifery Council (NMC) and Commonwealth nursing boards.
            </Text>
            <View style={styles.breakdownBox}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownTitle}>Listening</Text>
                <Text style={styles.breakdownScore}>Min 7.0</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownTitle}>Reading</Text>
                <Text style={styles.breakdownScore}>Min 7.0</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownTitle}>Writing</Text>
                <Text style={[styles.breakdownScore, { color: "#D97706" }]}>Min 6.5*</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownTitle}>Speaking</Text>
                <Text style={styles.breakdownScore}>Min 7.0</Text>
              </View>
            </View>
            <Text style={styles.footNote}>
              *UK NMC allows 6.5 in Writing provided Overall is at least 7.0.
            </Text>
          </View>

          {/* Quick Action Button */}
          <Pressable
            testID="ielts-quick-writing-btn"
            onPress={() => router.push("/languages/writing-practice?type=ielts" as any)}
            style={({ pressed }) => [
              styles.quickActionBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.quickActionBtnEmoji}>✍️</Text>
            <Text style={styles.quickActionBtnText}>Launch Academic Essay Writing Lab →</Text>
          </Pressable>

          {/* Sections List */}
          <Text style={styles.sectionTitle}>IELTS MODULE BREAKDOWN</Text>

          {(sections || []).map((sec: any) => {
            const isWriting = sec.id === "ielts-writing";
            const isSpeaking = sec.id === "ielts-speaking";

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

                {/* Tips */}
                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>HIGH-SCORING STRATEGIES</Text>
                  {(sec.tips || []).map((tip: string, idx: number) => (
                    <View key={idx} style={styles.tipRow}>
                      <Text style={styles.tipBullet}>✓</Text>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>

                {isWriting && (
                  <Pressable
                    testID="ielts-open-writing-lab"
                    onPress={() => router.push("/languages/writing-practice?type=ielts" as any)}
                    style={({ pressed }) => [
                      styles.cardActionBtn,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={styles.cardActionBtnText}>Practice Task 2 Academic Essay →</Text>
                  </Pressable>
                )}

                {isSpeaking && (
                  <Pressable
                    testID="ielts-start-speaking"
                    onPress={handleStartSpeakingPractice}
                    style={({ pressed }) => [
                      styles.cardActionBtn,
                      { backgroundColor: "#0D9488" },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={styles.cardActionBtnText}>Simulate 3-Part Interview with AI →</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {/* IELTS Band Scoring Scale Card */}
          <View style={styles.descriptorsCard}>
            <Text style={styles.descriptorsTitle}>IELTS 9-BAND SYSTEM EXPLAINED</Text>
            <View style={styles.descRow}>
              <View style={[styles.descBadge, { backgroundColor: "#DCFCE7" }]}>
                <Text style={[styles.descBadgeText, { color: "#166534" }]}>Band 8.0 - 9.0 (Expert)</Text>
              </View>
              <Text style={styles.descRowText}>Fully operational command; accurate, rapid, and fluent with full understanding.</Text>
            </View>
            <View style={styles.descRow}>
              <View style={[styles.descBadge, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.descBadgeText, { color: "#92400E" }]}>Band 7.0 - 7.5 (Good User - Benchmark)</Text>
              </View>
              <Text style={styles.descRowText}>Operational command; handles complex healthcare language well and understands detailed reasoning.</Text>
            </View>
            <View style={styles.descRow}>
              <View style={[styles.descBadge, { backgroundColor: "#FEE2E2" }]}>
                <Text style={[styles.descBadgeText, { color: "#991B1B" }]}>Band 6.0 - 6.5 (Competent User)</Text>
              </View>
              <Text style={styles.descRowText}>Generally effective command despite some inaccuracies; may require re-testing or OET alternative.</Text>
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
    backgroundColor: "#FFFBEB",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: spacing.lg,
  },
  targetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  targetBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },
  gradeText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#78350F",
  },
  targetDesc: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 17,
    marginBottom: 12,
  },
  breakdownBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  breakdownItem: {
    alignItems: "center",
    flex: 1,
  },
  breakdownTitle: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
    marginBottom: 2,
  },
  breakdownScore: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  footNote: {
    fontSize: 10,
    color: "#92400E",
    fontStyle: "italic",
    marginTop: 8,
  },
  quickActionBtn: {
    backgroundColor: "#0891B2",
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: minTouchTarget,
    marginBottom: spacing.xl,
  },
  quickActionBtnEmoji: {
    fontSize: 16,
  },
  quickActionBtnText: {
    fontSize: 13,
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
