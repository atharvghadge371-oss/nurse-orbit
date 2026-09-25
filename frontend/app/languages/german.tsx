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

const LEVELS = [
  { id: "ALL", label: "All Levels" },
  { id: "A1", label: "A1 (Basics)" },
  { id: "A2", label: "A2 (Ward Care)" },
  { id: "B1", label: "B1 (Clinical Handover)" },
];

export default function GermanLessonsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const { data: lessons, isLoading, refetch } = useQuery({
    queryKey: ["lang-german", selectedLevel],
    queryFn: () =>
      api.langGerman(selectedLevel === "ALL" ? undefined : selectedLevel),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "A1":
        return { bg: "#DCFCE7", text: "#166534", border: "#BBF7D0" };
      case "A2":
        return { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" };
      case "B1":
        return { bg: "#F3E8FF", text: "#6B21A8", border: "#E9D5FF" };
      default:
        return { bg: colors.surfaceTertiary, text: colors.onSurface, border: colors.border };
    }
  };

  const handleStartAiPractice = () => {
    const prompt =
      "Hallo! Ich lerne Deutsch für Pflegekräfte. Bitte spiele die Rolle eines deutschen Patienten im Krankenhaus. Sprich in einfachen Sätzen (A2/B1 Niveau) und korrigiere mich freundlich, wenn ich Fehler mache.";
    router.push(`/(tabs)/ai-tab?prefill=${encodeURIComponent(prompt)}` as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="german-back-btn"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>German for Nurses</Text>
          <Text style={styles.headerSub}>Pflege-Deutsch A1 · A2 · B1</Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Level Filter Chips Bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {LEVELS.map((lvl) => {
            const isActive = selectedLevel === lvl.id;
            return (
              <Pressable
                key={lvl.id}
                testID={`german-filter-${lvl.id.toLowerCase()}`}
                onPress={() => setSelectedLevel(lvl.id)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {lvl.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.brandPrimary} size="large" />
          <Text style={styles.loadingText}>Loading German nursing lessons...</Text>
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
          {/* Recognition Banner */}
          <View style={styles.anerkennungCard}>
            <View style={styles.anerkennungHeader}>
              <Text style={styles.anerkennungEmoji}>🇩🇪</Text>
              <View style={styles.anerkennungTexts}>
                <Text style={styles.anerkennungTitle}>Anerkennung (Recognition) Path</Text>
                <Text style={styles.anerkennungDesc}>
                  Working as a registered nurse (Pflegefachkraft) in Germany requires B1 or B2 general German plus passing the Fachsprachenprüfung (medical nursing exam).
                </Text>
              </View>
            </View>
          </View>

          {/* Lessons List */}
          <Text style={styles.sectionHeading}>
            {selectedLevel === "ALL" ? "ALL LESSONS" : `LEVEL ${selectedLevel} MODULES`} ({(lessons || []).length})
          </Text>

          {(lessons || []).map((lesson: any) => {
            const levelStyle = getLevelColor(lesson.level);
            const vocabPreview = (lesson.vocab || []).slice(0, 3);

            return (
              <Pressable
                key={lesson.id}
                testID={`german-lesson-${lesson.id}`}
                onPress={() => router.push(`/languages/german/${lesson.id}` as any)}
                style={({ pressed }) => [
                  styles.lessonCard,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                ]}
              >
                <View style={styles.lessonHeaderRow}>
                  <View
                    style={[
                      styles.levelBadge,
                      {
                        backgroundColor: levelStyle.bg,
                        borderColor: levelStyle.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelBadgeText,
                        { color: levelStyle.text },
                      ]}
                    >
                      {lesson.level}
                    </Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </View>

                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonDesc}>{lesson.desc}</Text>

                {/* Vocabulary Preview Chips */}
                <View style={styles.vocabPreviewContainer}>
                  <Text style={styles.vocabPreviewHeading}>KEY TERMS:</Text>
                  <View style={styles.vocabChipsWrap}>
                    {vocabPreview.map((v: any, idx: number) => (
                      <View key={idx} style={styles.vocabChip}>
                        <Text style={styles.vocabDe}>{v.de}</Text>
                        <Text style={styles.vocabEn}>({v.en})</Text>
                      </View>
                    ))}
                    {(lesson.vocab || []).length > 3 && (
                      <View style={styles.vocabChipMore}>
                        <Text style={styles.vocabMoreText}>
                          +{(lesson.vocab || []).length - 3} more
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Footer metadata */}
                <View style={styles.lessonFooter}>
                  <Text style={styles.lessonFooterText}>
                    📝 {lesson.vocab?.length || 0} terms · 💬 {lesson.phrases?.length || 0} phrases · 🎭 Dialogue
                  </Text>
                  <Text style={styles.openLessonText}>Open Lesson →</Text>
                </View>
              </Pressable>
            );
          })}

          {/* AI German Dialogue Practice */}
          <View style={styles.aiCard}>
            <Text style={styles.aiCardTitle}>Practice Speaking German with Orbit AI</Text>
            <Text style={styles.aiCardDesc}>
              Chat with our German-speaking patient simulator. Perfect for training bedside responses, asking about pain levels, and practicing shift handovers.
            </Text>
            <Pressable
              testID="german-start-ai-btn"
              onPress={handleStartAiPractice}
              style={({ pressed }) => [
                styles.aiCardBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.aiCardBtnText}>Start German Dialogue Practice →</Text>
            </Pressable>
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
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
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
  anerkennungCard: {
    backgroundColor: "#FAF5FF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    marginBottom: spacing.lg,
  },
  anerkennungHeader: {
    flexDirection: "row",
  },
  anerkennungEmoji: {
    fontSize: 26,
    marginRight: 10,
  },
  anerkennungTexts: {
    flex: 1,
  },
  anerkennungTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6B21A8",
    marginBottom: 4,
  },
  anerkennungDesc: {
    fontSize: 12,
    color: "#581C87",
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  lessonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  lessonHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  arrowIcon: {
    fontSize: 22,
    color: colors.muted,
    fontWeight: "600",
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 4,
  },
  lessonDesc: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
    marginBottom: 12,
  },
  vocabPreviewContainer: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 12,
  },
  vocabPreviewHeading: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  vocabChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  vocabChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vocabDe: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurface,
  },
  vocabEn: {
    fontSize: 11,
    color: colors.muted,
  },
  vocabChipMore: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: "center",
  },
  vocabMoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  lessonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lessonFooterText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
  openLessonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  aiCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginTop: spacing.md,
  },
  aiCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 4,
  },
  aiCardDesc: {
    fontSize: 12,
    color: "#14532D",
    lineHeight: 17,
    marginBottom: 12,
  },
  aiCardBtn: {
    backgroundColor: "#166534",
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: minTouchTarget,
  },
  aiCardBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
