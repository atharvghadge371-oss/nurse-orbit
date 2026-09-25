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
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function GermanLessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: lesson, isLoading, refetch } = useQuery({
    queryKey: ["lang-german-lesson", id],
    queryFn: () => api.langGermanLesson(id || ""),
    enabled: !!id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePracticeDialogueWithAi = () => {
    if (!lesson) return;
    const dialogueStr =
      typeof lesson.practice_dialogue === "string"
        ? lesson.practice_dialogue
        : (lesson.practice_dialogue || [])
            .map((d: any) => `${d.speaker || "Speaker"}: ${d.de || ""}`)
            .join("\n");
    const prompt = `Let's practice German nursing dialogue: ${dialogueStr}`;
    router.push(`/(tabs)/ai-tab?prefill=${encodeURIComponent(prompt)}` as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="german-lesson-back-btn"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {lesson?.title || "German Lesson"}
          </Text>
          <Text style={styles.headerSub}>
            Level {lesson?.level || "—"} · Pflege-Deutsch
          </Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.brandPrimary} size="large" />
          <Text style={styles.loadingText}>Loading lesson content...</Text>
        </View>
      ) : !lesson ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Lesson not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backLinkBtn}>
            <Text style={styles.backLinkText}>Return to lessons list</Text>
          </Pressable>
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
          {/* Lesson Overview Banner */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewTopRow}>
              <View style={styles.levelPill}>
                <Text style={styles.levelPillText}>LEVEL {lesson.level}</Text>
              </View>
              <Text style={styles.vocabCountBadge}>
                {lesson.vocab?.length || 0} terms · {lesson.phrases?.length || 0} phrases
              </Text>
            </View>
            <Text style={styles.overviewDesc}>{lesson.desc}</Text>
          </View>

          {/* Section 1: Clinical Vocabulary Table */}
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.sectionEmoji}>📝</Text>
            <Text style={styles.sectionHeading}>VOCABULARY</Text>
          </View>

          {/* Table Header Row */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCol, { flex: 1.2 }]}>German</Text>
            <Text style={[styles.tableHeaderCol, { flex: 1.2 }]}>English</Text>
            <Text style={[styles.tableHeaderCol, { flex: 1 }]}>Used In</Text>
          </View>

          <View style={styles.vocabList}>
            {(lesson.vocab || []).map((v: any, idx: number) => (
              <View key={idx} style={styles.vocabTableRow}>
                <Text style={[styles.vocabDeCol, { flex: 1.2 }]}>{v.de}</Text>
                <Text style={[styles.vocabEnCol, { flex: 1.2 }]}>{v.en}</Text>
                <View style={[styles.vocabUsedInCol, { flex: 1 }]}>
                  <Text style={styles.usedInText}>{v.used_in || "Clinical"}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Section 2: Key Clinical Phrases */}
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.sectionEmoji}>💬</Text>
            <Text style={styles.sectionHeading}>KEY PHRASES</Text>
          </View>

          <View style={styles.phrasesList}>
            {(lesson.phrases || []).map((p: any, idx: number) => (
              <View key={idx} style={styles.phraseCard}>
                <Text style={styles.phraseDe}>{typeof p === "string" ? p : p.de}</Text>
                {typeof p !== "string" && p.en ? (
                  <Text style={styles.phraseEn}>{p.en}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Section 3: Practice Dialogue */}
          {lesson.practice_dialogue && (
            <>
              <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionEmoji}>🎭</Text>
                <Text style={styles.sectionHeading}>PRACTICE DIALOGUE</Text>
              </View>

              <View style={styles.dialogueCard}>
                {typeof lesson.practice_dialogue === "string" ? (
                  lesson.practice_dialogue.split("\n").map((line: string, idx: number) => {
                    const colonIdx = line.indexOf(":");
                    const speaker = colonIdx > -1 ? line.slice(0, colonIdx).trim() : "";
                    const text = colonIdx > -1 ? line.slice(colonIdx + 1).trim() : line;
                    const isNurse =
                      speaker.toLowerCase().includes("pflege") ||
                      speaker.toLowerCase().includes("nurse") ||
                      speaker.toLowerCase().includes("schwester");

                    return (
                      <View
                        key={idx}
                        style={[
                          styles.dialogueLine,
                          isNurse ? styles.dialogueLineNurse : styles.dialogueLineOther,
                        ]}
                      >
                        {speaker ? (
                          <View style={styles.speakerRow}>
                            <Text style={styles.speakerLabel}>
                              {isNurse ? "👩‍⚕️" : "👤"} {speaker}
                            </Text>
                          </View>
                        ) : null}
                        <Text style={styles.dialogueTextDe}>{text}</Text>
                      </View>
                    );
                  })
                ) : (
                  (lesson.practice_dialogue || []).map((line: any, idx: number) => {
                    const isNurse =
                      line.speaker?.toLowerCase().includes("pflege") ||
                      line.speaker?.toLowerCase().includes("nurse");

                    return (
                      <View
                        key={idx}
                        style={[
                          styles.dialogueLine,
                          isNurse ? styles.dialogueLineNurse : styles.dialogueLineOther,
                        ]}
                      >
                        <View style={styles.speakerRow}>
                          <Text style={styles.speakerLabel}>
                            {isNurse ? "👩‍⚕️" : "👤"} {line.speaker}
                          </Text>
                        </View>
                        <Text style={styles.dialogueTextDe}>{line.de}</Text>
                        {line.en ? (
                          <Text style={styles.dialogueTextEn}>{line.en}</Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            </>
          )}

          {/* Bottom Practice CTA */}
          <Pressable
            testID="german-practice-ai-cta"
            onPress={handlePracticeDialogueWithAi}
            style={({ pressed }) => [
              styles.ctaBtn,
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
          >
            <Text style={styles.ctaEmoji}>🤖</Text>
            <Text style={styles.ctaText}>Practice with AI →</Text>
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
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
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
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.error,
    marginBottom: 8,
  },
  backLinkBtn: {
    padding: 10,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  overviewCard: {
    backgroundColor: "#F3E8FF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    marginBottom: spacing.xl,
  },
  overviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelPill: {
    backgroundColor: "#6B21A8",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  levelPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  vocabCountBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7E22CE",
  },
  overviewDesc: {
    fontSize: 13,
    color: "#581C87",
    lineHeight: 18,
  },
  sectionHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  tableHeaderCol: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  vocabList: {
    gap: 6,
    marginBottom: spacing.lg,
  },
  vocabTableRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vocabDeCol: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onSurface,
    paddingRight: 6,
  },
  vocabEnCol: {
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    paddingRight: 6,
  },
  vocabUsedInCol: {
    alignItems: "flex-start",
  },
  usedInText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.brandPrimary,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  phrasesList: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  phraseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.brandPrimary,
  },
  phraseDe: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 4,
    lineHeight: 19,
  },
  phraseEn: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  dialogueCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginBottom: spacing.xl,
  },
  dialogueLine: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dialogueLineNurse: {
    backgroundColor: "#F0FDFA",
    borderColor: "#CCFBF1",
    alignSelf: "flex-start",
    width: "95%",
  },
  dialogueLineOther: {
    backgroundColor: colors.surfaceTertiary,
    borderColor: colors.border,
    alignSelf: "flex-end",
    width: "95%",
  },
  speakerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  speakerLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.onSurfaceSecondary,
  },
  dialogueTextDe: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
    lineHeight: 18,
    marginBottom: 2,
  },
  dialogueTextEn: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
  ctaBtn: {
    backgroundColor: "#6B21A8",
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: minTouchTarget,
    marginTop: spacing.sm,
    shadowColor: "#6B21A8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaEmoji: {
    fontSize: 18,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
