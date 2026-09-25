import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, minTouchTarget, radius, screenContentBottomPadding, spacing } from "@/src/theme";

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  needs_work: { label: "Needs work", bg: "#FEE2E2", fg: "#B91C1C" },
  in_progress: { label: "In progress", bg: "#E0F2FE", fg: "#0369A1" },
  completed: { label: "Completed", bg: "#D1FAE5", fg: "#047857" },
  not_started: { label: "Not started", bg: colors.surfaceTertiary, fg: colors.muted },
};

const TASK_ICON: Record<string, string> = {
  lesson: "📖", review: "📝", quiz: "🎯", ai: "🤖", skills: "🩺", sim: "🚑",
  drug: "💊", library: "📚", logbook: "📓", wellbeing: "🧘",
};

const shortYear = (y: string) => (y === "Clinical Specialties" ? "Specialties" : y);

export default function MyJourney() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { refresh: refreshUser } = useAuth();
  const [viewYear, setViewYear] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["journey"], queryFn: api.journey });
  // Lessons are completed on other screens, so re-read progress whenever this screen regains focus
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const onSaved = (j: any) => queryClient.setQueryData(["journey"], j);
  const onFail = (e: any) => Alert.alert("Something went wrong", e.message);

  const setYear = useMutation({
    mutationFn: (year: string) => api.journeySetYear(year),
    onSuccess: (j) => { onSaved(j); setViewYear(null); refreshUser(); },
    onError: onFail,
  });
  const buildPlan = useMutation({
    mutationFn: api.journeyBuildPlan,
    onSuccess: (j) => { onSaved(j); setOpenDay(null); },
    onError: onFail,
  });
  const toggleTask = useMutation({
    mutationFn: ({ planId, taskId }: { planId: string; taskId: string }) => api.journeyToggleTask(planId, taskId),
    onSuccess: onSaved,
    onError: onFail,
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;
  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{(error as any)?.message || "Could not load your journey."}</Text>
        <Pressable testID="journey-retry" onPress={() => refetch()} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Try again</Text></Pressable>
      </View>
    );
  }

  const current = data.current_year as string;
  const shownYear = viewYear || current;
  const year = data.years.find((y: any) => y.year === shownYear);
  const currentYear = data.years.find((y: any) => y.year === current);
  const plan = data.plan;
  const nextIdx = data.years.findIndex((y: any) => y.year === current) + 1;
  const nextYear = data.years[nextIdx]?.year as string | undefined;
  // Default to the first unfinished day of the plan
  const expandedDay = openDay ?? plan?.days.find((d: any) => !d.done)?.day ?? null;

  const confirmRebuild = () =>
    Alert.alert("Rebuild your plan?", "Orbit will build a fresh 7-day plan from your latest progress. Ticks on the current plan are cleared (completed lessons stay completed).", [
      { text: "Cancel", style: "cancel" },
      { text: "Rebuild", onPress: () => buildPlan.mutate() },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={["#0D9488", "#0369A1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Pressable testID="journey-back" onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backTxt}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.hEyebrow}>PILLAR 1</Text>
            <Text style={styles.hTitle}>My Nursing Journey</Text>
          </View>
        </View>
        <View style={styles.heroStats}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroBig} testID="journey-year-progress">{currentYear?.progress ?? 0}%</Text>
            <Text style={styles.heroLbl}>of {current} complete</Text>
            <View style={styles.heroBar}><View style={[styles.heroFill, { width: `${currentYear?.progress ?? 0}%` }]} /></View>
          </View>
          <View style={styles.heroSide}>
            <Text style={styles.heroSideVal}>{data.overall.lessons_done}/{data.overall.lessons_total}</Text>
            <Text style={styles.heroLbl}>lessons overall</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: screenContentBottomPadding(insets.bottom) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
      >
        {/* Year selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {data.years.map((y: any) => {
            const active = y.year === shownYear;
            return (
              <Pressable key={y.year} testID={`journey-year-${y.year}`} onPress={() => setViewYear(y.year)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && { color: "#FFF" }]}>
                  {y.is_current ? "● " : ""}{shortYear(y.year)}
                </Text>
                <Text style={[styles.chipPct, active && { color: "rgba(255,255,255,0.85)" }]}>{y.progress}%</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.body}>
          {shownYear !== current && (
            <View style={styles.switchCard}>
              <Text style={styles.switchText}>{`You're viewing ${shownYear}. Your plan and next steps follow ${current}.`}</Text>
              <Pressable testID="journey-set-year" disabled={setYear.isPending} onPress={() => setYear.mutate(shownYear)} style={[styles.secondaryBtn, setYear.isPending && { opacity: 0.6 }]}>
                <Text style={styles.secondaryBtnText}>{setYear.isPending ? "Saving…" : `Make ${shortYear(shownYear)} my current year`}</Text>
              </Pressable>
            </View>
          )}

          {/* Next up */}
          {shownYear === current && (data.next_up ? (
            <Pressable testID="journey-next-up" style={styles.nextCard} onPress={() => router.push(data.next_up.route as any)}>
              <Text style={styles.nextEyebrow}>NEXT UP · {data.next_up.subject_name.toUpperCase()}</Text>
              <Text style={styles.nextTitle}>{data.next_up.action === "quiz" ? "🎯 " : "📖 "}{data.next_up.title}</Text>
              <Text style={styles.nextReason}>{data.next_up.reason}</Text>
              <Text style={styles.nextAction}>{data.next_up.action === "quiz" ? "Start practice" : "Open lesson"}  →</Text>
            </Pressable>
          ) : (
            <View style={styles.doneCard} testID="journey-year-done">
              <Text style={styles.doneTitle}>🎉 Every lesson in {current} is complete</Text>
              <Text style={styles.doneSub}>{"Keep your MCQ accuracy up with practice, or move on when you're ready."}</Text>
              {nextYear && (
                <Pressable testID="journey-advance-year" disabled={setYear.isPending} onPress={() => setYear.mutate(nextYear)} style={[styles.secondaryBtn, { marginTop: 10 }]}>
                  <Text style={styles.secondaryBtnText}>Move on to {shortYear(nextYear)}</Text>
                </Pressable>
              )}
            </View>
          ))}

          {/* Focus areas from MCQ performance */}
          {data.focus_subjects.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardH}>🧠 Focus areas</Text>
              <Text style={styles.cardSub}>Subjects where your MCQ accuracy is below 70%</Text>
              {data.focus_subjects.map((f: any) => (
                <Pressable key={f.id} testID={`journey-focus-${f.id}`} style={styles.focusRow} onPress={() => router.push(`/quiz/${f.id}` as any)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.focusName}>{f.name}</Text>
                    <Text style={styles.focusMeta}>{f.year} · {f.mcq_accuracy}% over {f.mcq_attempted} questions</Text>
                  </View>
                  <Text style={styles.focusCta}>Practise ›</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Subjects in the selected year */}
          <Text style={styles.sectionH}>{shownYear} curriculum</Text>
          {year?.subjects.map((s: any) => {
            const st = STATUS[s.status];
            return (
              <Pressable key={s.id} testID={`journey-subject-${s.id}`} style={styles.subjectCard} onPress={() => router.push(`/lesson/${s.id}` as any)}>
                <View style={[styles.subjectDot, { backgroundColor: s.color }]} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.subjectName} numberOfLines={2}>{s.name}</Text>
                    <View style={[styles.pill, { backgroundColor: st.bg }]}><Text style={[styles.pillText, { color: st.fg }]}>{st.label}</Text></View>
                  </View>
                  <View style={styles.bar}><View style={[styles.barFill, { width: `${s.progress}%`, backgroundColor: s.color }]} /></View>
                  <Text style={styles.subjectMeta}>
                    {s.lessons_done}/{s.lessons_total} lessons{s.mcq_accuracy != null ? ` · MCQ ${s.mcq_accuracy}%` : ""}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {/* Personalised 7-day plan */}
          {shownYear === current && (
            <>
              <Text style={styles.sectionH}>Your 7-day plan</Text>
              {!plan ? (
                <View style={styles.card}>
                  <Text style={styles.cardH}>🗓️ Build a week around your curriculum</Text>
                  <Text style={styles.cardSub}>
                    Orbit plans the next 7 days from your {current} progress: weakest subjects first, with lessons, practice questions, a skills or simulation task each day, and a weekly review.
                  </Text>
                  <Pressable testID="journey-build-plan" disabled={buildPlan.isPending} onPress={() => buildPlan.mutate()} style={[styles.primaryBtn, buildPlan.isPending && { opacity: 0.6 }]}>
                    {buildPlan.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Build my plan</Text>}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.card} testID="journey-plan">
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardH}>{plan.tasks_done}/{plan.tasks_total} tasks done</Text>
                    <Text style={styles.planPct}>{plan.progress}%</Text>
                  </View>
                  <View style={styles.bar}><View style={[styles.barFill, { width: `${plan.progress}%`, backgroundColor: colors.brandSecondary }]} /></View>

                  {plan.days.map((d: any) => {
                    const open = d.day === expandedDay;
                    const doneCount = d.tasks.filter((t: any) => t.done).length;
                    return (
                      <View key={d.day} style={styles.dayBox}>
                        <Pressable testID={`journey-day-${d.day}`} onPress={() => setOpenDay(open ? 0 : d.day)} style={styles.dayHead}>
                          <View style={[styles.dayNum, d.done && { backgroundColor: colors.success }]}>
                            <Text style={styles.dayNumText}>{d.done ? "✓" : d.day}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dayTitle}>Day {d.day} · {d.title}</Text>
                            <Text style={styles.dayMeta}>{doneCount}/{d.tasks.length} done</Text>
                          </View>
                          <Text style={styles.chev}>{open ? "▾" : "▸"}</Text>
                        </Pressable>
                        {open && d.tasks.map((t: any) => {
                          const busy = toggleTask.isPending && toggleTask.variables?.taskId === t.id;
                          return (
                            <View key={t.id} style={styles.taskRow}>
                              <Pressable
                                testID={`journey-task-${t.id}`}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: t.done }}
                                disabled={toggleTask.isPending}
                                onPress={() => toggleTask.mutate({ planId: plan.id, taskId: t.id })}
                                style={styles.checkHit}
                              >
                                <View style={[styles.check, t.done && styles.checkOn]}>
                                  {busy ? <ActivityIndicator size="small" color={t.done ? "#FFF" : colors.brandSecondary} /> : t.done ? <Text style={styles.checkMark}>✓</Text> : null}
                                </View>
                              </Pressable>
                              <Pressable style={styles.taskBody} onPress={() => router.push(t.route as any)}>
                                <Text style={[styles.taskLabel, t.done && styles.taskDone]}>{TASK_ICON[t.kind] || "•"}  {t.label}</Text>
                                <Text style={styles.taskOpen}>›</Text>
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}

                  <Pressable testID="journey-rebuild-plan" disabled={buildPlan.isPending} onPress={confirmRebuild} style={styles.rebuild}>
                    <Text style={styles.rebuildText}>{buildPlan.isPending ? "Rebuilding…" : "↻ Rebuild plan from latest progress"}</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl, backgroundColor: colors.surfaceSecondary },
  errorText: { color: colors.onSurface, fontSize: 14, textAlign: "center" },
  header: { paddingHorizontal: spacing.lg, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: minTouchTarget, height: minTouchTarget, borderRadius: minTouchTarget / 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)" },
  backTxt: { color: "#FFF", fontSize: 24, fontWeight: "800", lineHeight: 26 },
  hEyebrow: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  hTitle: { color: "#FFF", fontSize: 21, fontWeight: "900" },
  heroStats: { flexDirection: "row", alignItems: "flex-end", gap: 16, marginTop: 16 },
  heroBig: { color: "#FFF", fontSize: 34, fontWeight: "900" },
  heroLbl: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700" },
  heroBar: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", marginTop: 8, overflow: "hidden" },
  heroFill: { height: "100%", backgroundColor: "#FFF" },
  heroSide: { alignItems: "flex-end" },
  heroSideVal: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  chipRow: { paddingHorizontal: spacing.lg, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", minHeight: minTouchTarget, justifyContent: "center" },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  chipPct: { color: colors.muted, fontSize: 10, fontWeight: "700", marginTop: 1 },
  body: { paddingHorizontal: spacing.lg, gap: 12 },
  switchCard: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.brandTertiary, gap: 10 },
  switchText: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  nextCard: { padding: 16, borderRadius: radius.lg, backgroundColor: colors.brand },
  nextEyebrow: { color: "#99F6E4", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  nextTitle: { color: "#FFF", fontSize: 17, fontWeight: "900", marginTop: 6 },
  nextReason: { color: "#CBD5E1", fontSize: 12, marginTop: 6, lineHeight: 17 },
  nextAction: { color: "#FFF", fontSize: 12, fontWeight: "800", marginTop: 10 },
  doneCard: { padding: 16, borderRadius: radius.lg, backgroundColor: "#D1FAE5" },
  doneTitle: { color: "#065F46", fontSize: 15, fontWeight: "900" },
  doneSub: { color: "#047857", fontSize: 12, marginTop: 4, lineHeight: 17 },
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  cardH: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  cardSub: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  focusRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.divider, minHeight: minTouchTarget },
  focusName: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  focusMeta: { color: "#B91C1C", fontSize: 11, fontWeight: "700", marginTop: 2 },
  focusCta: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
  sectionH: { color: colors.onSurface, fontSize: 17, fontWeight: "800", marginTop: 10 },
  subjectCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  subjectDot: { width: 6, borderRadius: 3 },
  subjectName: { flex: 1, color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  subjectMeta: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 10, fontWeight: "800" },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  barFill: { height: "100%" },
  planPct: { color: colors.brandSecondary, fontSize: 16, fontWeight: "900" },
  dayBox: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 4 },
  dayHead: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: minTouchTarget },
  dayNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  dayNumText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  dayTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  dayMeta: { color: colors.muted, fontSize: 11, marginTop: 1 },
  chev: { color: colors.muted, fontSize: 14, width: 16, textAlign: "center" },
  taskRow: { flexDirection: "row", alignItems: "center", marginLeft: 18 },
  checkHit: { width: minTouchTarget, height: minTouchTarget, alignItems: "center", justifyContent: "center" },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.brandSecondary, borderColor: colors.brandSecondary },
  checkMark: { color: "#FFF", fontSize: 13, fontWeight: "900" },
  taskBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, minHeight: minTouchTarget },
  taskLabel: { flex: 1, color: colors.onSurface, fontSize: 13, lineHeight: 18 },
  taskDone: { color: colors.muted, textDecorationLine: "line-through" },
  taskOpen: { color: colors.muted, fontSize: 20 },
  rebuild: { alignSelf: "center", paddingVertical: 10, minHeight: minTouchTarget, justifyContent: "center" },
  rebuildText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
  primaryBtn: { minHeight: minTouchTarget, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  secondaryBtn: { minHeight: minTouchTarget, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
});
