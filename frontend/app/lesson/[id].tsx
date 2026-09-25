import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, minTouchTarget, screenContentBottomPadding, spacing, radius } from "@/src/theme";

export default function LessonView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["lessons", id], queryFn: () => api.lessons(id!) });
  const { data: subs } = useQuery({ queryKey: ["subjects"], queryFn: api.subjects });
  const { data: progress } = useQuery({ queryKey: ["journey-subject", id], queryFn: () => api.journeySubject(id!) });
  const subject = subs?.subjects.find((s: any) => s.id === id);
  const completed = new Set<string>(progress?.completed_lesson_ids || []);

  const mark = useMutation({
    mutationFn: ({ lessonId, done }: { lessonId: string; done: boolean }) => api.completeLesson(lessonId, done),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journey-subject", id] });
      queryClient.invalidateQueries({ queryKey: ["journey"] });
      queryClient.invalidateQueries({ queryKey: ["gam"] });
    },
    onError: (e: any) => Alert.alert("Could not update lesson", e.message),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="lesson-back" onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.subject}>{subject?.name || "Lesson"}</Text>
          <Text style={styles.year}>
            {subject?.year}{progress ? ` · ${completed.size}/${progress.lessons_total} lessons complete` : ""}
          </Text>
        </View>
        <Pressable testID="start-quiz-btn" onPress={() => router.push(`/quiz/${id}` as any)} style={styles.quizBtn}>
          <Text style={styles.quizBtnText}>Quiz</Text>
        </Pressable>
      </View>
      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
          {(data?.lessons || []).map((l: any) => {
            const done = completed.has(l.id);
            const busy = mark.isPending && mark.variables?.lessonId === l.id;
            return (
              <View key={l.id} style={[styles.lessonCard, done && styles.lessonCardDone]}>
                <Text style={styles.lessonTitle}>{l.title}</Text>
                <Text style={styles.lessonDuration}>⏱ {l.duration}</Text>
                <Text style={styles.h}>Learning Objectives</Text>
                {l.objectives.map((o: string, i: number) => <Text key={i} style={styles.bullet}>• {o}</Text>)}
                <Text style={styles.h}>Key Concepts</Text>
                <Text style={styles.body}>{l.key_concepts}</Text>
                <Text style={styles.h}>Clinical Notes</Text>
                <Text style={styles.body}>{l.clinical_notes}</Text>
                <Text style={styles.ref}>Reference: {l.references}</Text>
                <Pressable
                  testID={`lesson-complete-${l.id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  disabled={busy || !progress}
                  onPress={() => mark.mutate({ lessonId: l.id, done: !done })}
                  style={[styles.completeBtn, done && styles.completeBtnDone]}
                >
                  {busy ? <ActivityIndicator color={done ? colors.success : "#FFF"} /> : (
                    <Text style={[styles.completeText, done && { color: "#047857" }]}>{done ? "✓ Completed · tap to undo" : "Mark lesson complete"}</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 8 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 32, color: colors.onSurface },
  subject: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  year: { color: colors.muted, fontSize: 12 },
  quizBtn: { backgroundColor: colors.brandSecondary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md },
  quizBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  lessonCard: { padding: 18, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  lessonCardDone: { borderColor: "#6EE7B7" },
  lessonTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  lessonDuration: { color: colors.muted, fontSize: 12, marginTop: 4 },
  h: { color: colors.brandPrimary, fontSize: 13, fontWeight: "800", marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  bullet: { color: colors.onSurface, fontSize: 14, marginTop: 6, lineHeight: 20 },
  body: { color: colors.onSurface, fontSize: 14, marginTop: 8, lineHeight: 22 },
  ref: { color: colors.muted, fontSize: 12, marginTop: 12, fontStyle: "italic" },
  completeBtn: { marginTop: 16, minHeight: minTouchTarget, borderRadius: radius.md, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  completeBtnDone: { backgroundColor: "#D1FAE5" },
  completeText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
});
