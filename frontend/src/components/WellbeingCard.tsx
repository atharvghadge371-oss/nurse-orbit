import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, minTouchTarget, radius } from "@/src/theme";

const STRESS = [
  { v: 1, emoji: "😌", label: "Calm" },
  { v: 2, emoji: "🙂", label: "Mild" },
  { v: 3, emoji: "😐", label: "Some" },
  { v: 4, emoji: "😟", label: "High" },
  { v: 5, emoji: "😫", label: "Very high" },
];
const MOOD = [
  { v: 1, emoji: "😞", label: "Very low" },
  { v: 2, emoji: "🙁", label: "Low" },
  { v: 3, emoji: "😐", label: "Okay" },
  { v: 4, emoji: "🙂", label: "Good" },
  { v: 5, emoji: "😄", label: "Great" },
];
const INSIGHT_STYLE: Record<string, { bg: string; fg: string; icon: string }> = {
  sleep: { bg: "#EEF2FF", fg: "#3730A3", icon: "😴" },
  stress: { bg: "#FEF3C7", fg: "#92400E", icon: "🌬️" },
  mood: { bg: "#FCE7F3", fg: "#9D174D", icon: "💬" },
  positive: { bg: "#D1FAE5", fg: "#065F46", icon: "✨" },
};
const SLEEP_STEP = 0.5;
const SLEEP_MAX = 14;
const DEFAULT_SLEEP = 7;

/** Pillar 9 — daily sleep / stress / mood check-in with weekly averages and gentle insights. */
export function WellbeingCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["wellbeing"], queryFn: api.hpWellbeing });
  // Unsaved edits layered over today's saved check-in; cleared once saved
  const [draft, setDraft] = useState<{ sleep?: number; stress?: number; mood?: number }>({});
  const today = data?.today;
  const sleep: number | null = draft.sleep ?? today?.sleep_hours ?? null;
  const stress: number | null = draft.stress ?? today?.stress ?? null;
  const mood: number | null = draft.mood ?? today?.mood ?? null;

  const save = useMutation({
    mutationFn: () => api.hpSaveWellbeing({
      ...(sleep != null ? { sleep_hours: sleep } : {}), ...(stress ? { stress } : {}), ...(mood ? { mood } : {}),
    }),
    onSuccess: (s) => { queryClient.setQueryData(["wellbeing"], s); setDraft({}); },
    onError: (e: any) => Alert.alert("Could not save check-in", e.message),
  });

  if (isLoading) return <View style={styles.card}><ActivityIndicator color={colors.brandPrimary} /></View>;

  const week = data?.week;
  // The first tap sets a typical night; later taps adjust it
  const bumpSleep = (d: number) =>
    setDraft((x) => ({ ...x, sleep: sleep == null ? DEFAULT_SLEEP : Math.min(SLEEP_MAX, Math.max(0, sleep + d)) }));
  const setStress = (v: number) => setDraft((x) => ({ ...x, stress: v }));
  const setMood = (v: number) => setDraft((x) => ({ ...x, mood: v }));
  const canSave = sleep != null || stress != null || mood != null;

  return (
    <View style={styles.card} testID="wellbeing-card">
      <View style={styles.rowBetween}>
        <Text style={styles.cardH}>🧘 Wellbeing check-in</Text>
        {data?.streak_days > 0 && <Text style={styles.cardSub}>{data.streak_days}-day streak</Text>}
      </View>
      <Text style={styles.hint}>{today ? "Saved for today. Update it any time." : "Placements and exams are demanding. How are you doing today?"}</Text>

      <Text style={styles.label}>Sleep last night</Text>
      <View style={styles.stepper}>
        <Pressable testID="wb-sleep-minus" onPress={() => bumpSleep(-SLEEP_STEP)} style={styles.stepBtn}><Text style={styles.stepBtnTxt}>−</Text></Pressable>
        <Text style={styles.sleepVal} testID="wb-sleep-value">{sleep != null ? `${sleep} h` : "—"}</Text>
        <Pressable testID="wb-sleep-plus" onPress={() => bumpSleep(SLEEP_STEP)} style={styles.stepBtn}><Text style={styles.stepBtnTxt}>+</Text></Pressable>
      </View>

      <Text style={styles.label}>Stress</Text>
      <Scale options={STRESS} value={stress} onChange={setStress} testPrefix="wb-stress" />

      <Text style={styles.label}>Mood</Text>
      <Scale options={MOOD} value={mood} onChange={setMood} testPrefix="wb-mood" />

      <Pressable testID="wb-save" disabled={save.isPending || !canSave} onPress={() => save.mutate()} style={[styles.primary, (save.isPending || !canSave) && { opacity: 0.5 }]}>
        {save.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{today ? "Update check-in" : "Save check-in"}</Text>}
      </Pressable>

      {week?.check_ins > 0 && (
        <View style={styles.weekRow}>
          <Stat label="Avg sleep" value={week.avg_sleep_hours != null ? `${week.avg_sleep_hours} h` : "—"} />
          <Stat label="Avg stress" value={week.avg_stress != null ? `${week.avg_stress}/5` : "—"} />
          <Stat label="Avg mood" value={week.avg_mood != null ? `${week.avg_mood}/5` : "—"} />
          <Stat label="Check-ins" value={`${week.check_ins}/7`} />
        </View>
      )}

      {(data?.insights || []).map((i: any) => {
        const s = INSIGHT_STYLE[i.kind] || INSIGHT_STYLE.positive;
        return (
          <View key={i.kind} style={[styles.insight, { backgroundColor: s.bg }]} testID={`wb-insight-${i.kind}`}>
            <Text style={{ fontSize: 16 }}>{s.icon}</Text>
            <Text style={[styles.insightText, { color: s.fg }]}>{i.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Scale({ options, value, onChange, testPrefix }: {
  options: { v: number; emoji: string; label: string }[];
  value: number | null;
  onChange: (v: number) => void;
  testPrefix: string;
}) {
  return (
    <View style={styles.scale}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <Pressable
            key={o.v}
            testID={`${testPrefix}-${o.v}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.v)}
            style={[styles.scaleBtn, on && styles.scaleBtnOn]}
          >
            <Text style={{ fontSize: 20 }}>{o.emoji}</Text>
            <Text style={[styles.scaleLbl, on && { color: colors.brandPrimary }]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardH: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  cardSub: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  label: { color: colors.onSurface, fontSize: 12, fontWeight: "800", marginTop: 4 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: { width: minTouchTarget, height: minTouchTarget, borderRadius: minTouchTarget / 2, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  stepBtnTxt: { color: colors.brandPrimary, fontSize: 22, fontWeight: "800" },
  sleepVal: { color: colors.onSurface, fontSize: 22, fontWeight: "900", minWidth: 70, textAlign: "center" },
  scale: { flexDirection: "row", gap: 6 },
  scaleBtn: { flex: 1, minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  scaleBtnOn: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  scaleLbl: { color: colors.muted, fontSize: 9, fontWeight: "700", marginTop: 2 },
  primary: { minHeight: minTouchTarget, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  weekRow: { flexDirection: "row", paddingTop: 10, marginTop: 2, borderTopWidth: 1, borderTopColor: colors.divider },
  statVal: { color: colors.brandPrimary, fontSize: 15, fontWeight: "900" },
  statLbl: { color: colors.muted, fontSize: 10, marginTop: 2 },
  insight: { flexDirection: "row", gap: 8, padding: 10, borderRadius: radius.md, alignItems: "flex-start" },
  insightText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
});
