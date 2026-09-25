import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  colors,
  minTouchTarget,
  screenContentBottomPadding,
  spacing,
  radius,
} from "@/src/theme";

export default function LanguagesHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleOpenAiRoleplay = () => {
    const prompt =
      "I am an international nurse preparing for my nursing language communication exam. Please act as a patient/interlocutor in a hospital role-play and practice clinical dialogue with me.";
    router.push(`/(tabs)/ai-tab?prefill=${encodeURIComponent(prompt)}` as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="languages-back-btn"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Languages</Text>
          <Text style={styles.headerSub}>OET · IELTS · German for Nurses</Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom:
            screenContentBottomPadding(insets.bottom) + minTouchTarget + spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Writing Practice CTA Card */}
        <Pressable
          testID="languages-writing-lab-banner"
          onPress={() => router.push("/languages/writing-practice" as any)}
          style={({ pressed }) => [
            styles.heroBanner,
            pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
        >
          <LinearGradient
            colors={["#0891B2", "#0E7490", "#155E75"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>⚡ AI ASSISTED</Text>
              </View>
              <Text style={styles.heroEmoji}>✍️</Text>
            </View>
            <Text style={styles.heroTitle}>Quick Writing Practice</Text>
            <Text style={styles.heroDesc}>
              Submit OET referral letters, IELTS Task 2 essays, or German ward notes. Get instant AI evaluation, letter grades, and actionable clinical improvements.
            </Text>
            <View style={styles.heroCtaRow}>
              <Text style={styles.heroCtaText}>Start Writing Practice →</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Section Heading */}
        <Text style={styles.sectionHeading}>EXAM PREPARATION TRACKS</Text>

        {/* Card 1: OET Preparation */}
        <Pressable
          testID="lang-card-oet"
          onPress={() => router.push("/languages/oet" as any)}
          style={({ pressed }) => [
            styles.trackCard,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
              <Text style={styles.iconEmoji}>🩺</Text>
            </View>
            <View style={styles.cardHeaderTexts}>
              <View style={styles.titleRow}>
                <Text style={styles.trackTitle}>OET Preparation</Text>
                <View style={[styles.badgePill, { backgroundColor: "#DBEAFE" }]}>
                  <Text style={[styles.badgePillText, { color: "#1E40AF" }]}>Target: Grade B</Text>
                </View>
              </View>
              <Text style={styles.trackSubtitle}>Occupational English Test (Healthcare)</Text>
            </View>
          </View>

          <Text style={styles.trackSummary}>
            The gold-standard English test for healthcare professionals. Covers 4 sub-tests: Listening, Reading, Referral Writing, and Clinical Role-play Speaking.
          </Text>

          <View style={styles.tagsRow}>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>🎧 Consultations</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>📖 Case Texts</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>✍️ Discharge Letters</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>🗣️ Bedside Role-play</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterRequirement}>Required by UK NMC, NMBI Ireland, AHPRA AU, CGFNS USA</Text>
            <Text style={styles.cardArrow}>›</Text>
          </View>
        </Pressable>

        {/* Card 2: IELTS Academic */}
        <Pressable
          testID="lang-card-ielts"
          onPress={() => router.push("/languages/ielts" as any)}
          style={({ pressed }) => [
            styles.trackCard,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Text style={styles.iconEmoji}>🌐</Text>
            </View>
            <View style={styles.cardHeaderTexts}>
              <View style={styles.titleRow}>
                <Text style={styles.trackTitle}>IELTS Preparation</Text>
                <View style={[styles.badgePill, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={[styles.badgePillText, { color: "#92400E" }]}>Band 7.0+</Text>
                </View>
              </View>
              <Text style={styles.trackSubtitle}>International English Language Testing System</Text>
            </View>
          </View>

          <Text style={styles.trackSummary}>
            Academic English proficiency for international nurse registration, university bridging courses, and visa endorsements.
          </Text>

          <View style={styles.tagsRow}>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>🎧 Lecture Notes</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>📖 Academic Texts</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>✍️ Essay Analysis</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>🗣️ 3-Part Interview</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterRequirement}>NMC UK: Overall 7.0 (Min 7.0 L/R/S, 6.5 Writing)</Text>
            <Text style={styles.cardArrow}>›</Text>
          </View>
        </Pressable>

        {/* Card 3: German for Nurses */}
        <Pressable
          testID="lang-card-german"
          onPress={() => router.push("/languages/german" as any)}
          style={({ pressed }) => [
            styles.trackCard,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#F3E8FF" }]}>
              <Text style={styles.iconEmoji}>🇩🇪</Text>
            </View>
            <View style={styles.cardHeaderTexts}>
              <View style={styles.titleRow}>
                <Text style={styles.trackTitle}>German for Nurses</Text>
                <View style={[styles.badgePill, { backgroundColor: "#F3E8FF" }]}>
                  <Text style={[styles.badgePillText, { color: "#6B21A8" }]}>A1 · A2 · B1</Text>
                </View>
              </View>
              <Text style={styles.trackSubtitle}>Fachsprache Deutsch für die Pflege</Text>
            </View>
          </View>

          <Text style={styles.trackSummary}>
            Structured clinical German from foundational hospital greetings to vital signs, medication administration, and doctor handover (Übergabe).
          </Text>

          <View style={styles.tagsRow}>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>🏥 Stationsalltag</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>🫀 Vitalwerte</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>💊 Medikamente</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>📋 Übergabe</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterRequirement}>For Anerkennung (Recognition) in Germany, Austria & Switzerland</Text>
            <Text style={styles.cardArrow}>›</Text>
          </View>
        </Pressable>

        {/* Interactive AI Roleplay Promo */}
        <View style={styles.aiRoleplayCard}>
          <View style={styles.aiRoleplayHeader}>
            <Text style={styles.aiRoleplayEmoji}>🤖</Text>
            <View style={styles.aiRoleplayTexts}>
              <Text style={styles.aiRoleplayTitle}>Practice Bedside Speaking</Text>
              <Text style={styles.aiRoleplayDesc}>
                Role-play with our Claude clinical conversational partner. Practice explaining medications, reassuring anxious patients, or conducting admissions.
              </Text>
            </View>
          </View>
          <Pressable
            testID="languages-ai-roleplay-btn"
            onPress={handleOpenAiRoleplay}
            style={({ pressed }) => [
              styles.aiRoleplayBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.aiRoleplayBtnText}>Start Role-play with Orbit AI →</Text>
          </Pressable>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            ℹ️ <Text style={{ fontWeight: "700" }}>Original practice content. Not official exam material.</Text> Nurse Orbit language materials are designed for clinical practice and exam orientation. Always verify current registration requirements directly with your target regulatory board (NMC, NMBI, AHPRA, CGFNS, or German Landesprüfungsamt).
          </Text>
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
  heroBanner: {
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.xl,
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroGradient: {
    padding: spacing.lg,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  heroBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  heroEmoji: {
    fontSize: 24,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
    marginBottom: 12,
  },
  heroCtaRow: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  heroCtaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0E7490",
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  trackCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 22,
  },
  cardHeaderTexts: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  trackTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  trackSubtitle: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  trackSummary: {
    fontSize: 13,
    color: colors.onSurfaceSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceTertiary,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardFooterRequirement: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    flex: 1,
    marginRight: 8,
  },
  cardArrow: {
    fontSize: 20,
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  aiRoleplayCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: spacing.xl,
  },
  aiRoleplayHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  aiRoleplayEmoji: {
    fontSize: 26,
    marginRight: 10,
  },
  aiRoleplayTexts: {
    flex: 1,
  },
  aiRoleplayTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 4,
  },
  aiRoleplayDesc: {
    fontSize: 12,
    color: "#14532D",
    lineHeight: 17,
  },
  aiRoleplayBtn: {
    backgroundColor: "#166534",
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: minTouchTarget,
  },
  aiRoleplayBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  disclaimerBox: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
  },
});
