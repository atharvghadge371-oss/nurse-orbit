import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "@/src/api";
import { WellbeingCard } from "@/src/components/WellbeingCard";
import { colors, radius, spacing } from "@/src/theme";

export default function HealthHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<any>(null);
  const [steps, setSteps] = useState<any>(null);
  const [rewards, setRewards] = useState<any>(null);
  const [meds, setMeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSteps, setAddSteps] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, r, m] = await Promise.all([
        api.hpProfile(), api.hpStepsToday(), api.hpRewards(), api.hpListMeds(),
      ]);
      setProfile(p); setSteps(s); setRewards(r); setMeds(m.medications || []);
    } catch (e: any) { console.log(e.message); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const quickAddSteps = async (amt: number) => {
    setBusy(true);
    try { const r = await api.hpAddSteps({ steps: amt, source: "manual" }); setSteps((s: any) => ({ ...s, today: r.today_total, month: r.month_total })); }
    catch (e: any) { Alert.alert("Failed", e.message); }
    finally { setBusy(false); }
  };

  const submitAddSteps = async () => {
    const n = parseInt(addSteps);
    if (!n || n <= 0) return;
    setBusy(true);
    try {
      const r = await api.hpAddSteps({ steps: n, source: "manual" });
      setSteps((s: any) => ({ ...s, today: r.today_total, month: r.month_total }));
      setAddSteps("");
      await load();
    } catch (e: any) { Alert.alert("Failed", e.message); }
    finally { setBusy(false); }
  };

  const goalPct = steps ? Math.min(100, Math.round((steps.today / (steps.goal || 8000)) * 100)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="hh-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View>
          <Text style={styles.title}>My Health</Text>
          <Text style={styles.subtitle}>Sleep · stress · activity · nutrition</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brandPrimary} />}
      >
        {/* BMI hero */}
        {profile && (
          <View style={styles.bmiCard}>
            <Text style={styles.cardH}>Body composition</Text>
            <View style={styles.bmiRow}>
              <Big label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : "—"} />
              <Big label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : "—"} />
              <Big label="BMI" value={profile.bmi ? String(profile.bmi) : "—"} accent={profile.bmi_category === "Healthy" ? colors.success : profile.bmi_category === "Underweight" ? colors.warning : profile.bmi_category ? "#EF4444" : colors.muted} />
            </View>
            {profile.bmi_category && <Text style={[styles.bmiCat, { color: profile.bmi_category === "Healthy" ? colors.success : colors.warning }]}>{profile.bmi_category}</Text>}
            <Pressable testID="hh-edit-profile" onPress={() => router.push("/health/profile" as any)} style={styles.editLink}>
              <Text style={styles.editLinkTxt}>Edit height / weight / conditions ›</Text>
            </Pressable>
          </View>
        )}

        <WellbeingCard />

        {/* Steps */}
        {steps && (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardH}>🚶 Steps today</Text>
              <Text style={styles.cardSub}>{steps.streak_days}-day streak 🔥</Text>
            </View>
            <View style={styles.stepsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepsBig}>{steps.today.toLocaleString()}</Text>
                <Text style={styles.stepsGoal}>of {(steps.goal || 8000).toLocaleString()} · {goalPct}%</Text>
                <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${goalPct}%` }]} /></View>
              </View>
              <View style={{ width: 90 }}>
                <Text style={styles.monthLbl}>This month</Text>
                <Text style={styles.monthVal}>{(steps.month || 0).toLocaleString()}</Text>
              </View>
            </View>

            {/* Quick add */}
            <View style={styles.quickRow}>
              {[500, 1000, 2500, 5000].map((n) => (
                <Pressable key={n} testID={`hh-add-${n}`} disabled={busy} onPress={() => quickAddSteps(n)} style={styles.quickBtn}>
                  <Text style={styles.quickBtnTxt}>+ {n}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              <TextInput testID="hh-steps-input" value={addSteps} onChangeText={setAddSteps} keyboardType="number-pad" placeholder="Enter steps…" placeholderTextColor={colors.muted} style={styles.input} />
              <Pressable testID="hh-add-custom" disabled={busy || !addSteps} onPress={submitAddSteps} style={[styles.primary, (busy || !addSteps) && { opacity: 0.5 }]}>
                <Text style={styles.primaryText}>Add</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Rewards */}
        {rewards && (
          <View style={styles.rewardCard}>
            <Text style={styles.rewardH}>🎁 Step rewards this month</Text>
            <Text style={styles.rewardCur}>{(rewards.month_steps || 0).toLocaleString()} steps</Text>
            {rewards.current_tier ? (
              <View style={styles.tierPill}><Text style={styles.tierTxt}>✨ Unlocked: {rewards.current_tier.reward}</Text></View>
            ) : null}
            {rewards.next_tier && (
              <Text style={styles.rewardNext}>
                Next: <Text style={{ fontWeight: "900" }}>{rewards.next_tier.reward}</Text> in {rewards.steps_to_next.toLocaleString()} steps
              </Text>
            )}
            <View style={{ marginTop: 6, gap: 4 }}>
              {(rewards.tiers || []).map((t: any) => {
                const done = rewards.month_steps >= t.steps;
                return (
                  <View key={t.steps} style={styles.tierRow}>
                    <Text style={{ fontSize: 14 }}>{done ? "✅" : "⭕️"}</Text>
                    <Text style={[styles.tierLbl, done && { color: colors.brandPrimary, fontWeight: "800" }]}>{t.steps.toLocaleString()} steps → {t.reward}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Quick tools */}
        <Text style={styles.sectionH}>Health tools</Text>
        <View style={styles.grid}>
          <Tile emoji="💧" label="Vitals & BP" to="/health/vitals" testID="hh-vitals" />
          <Tile emoji="💊" label="Medications" to="/health/medications" testID="hh-meds" />
          <Tile emoji="🥗" label="Nutrition" to="/health/nutrition" testID="hh-nutri" />
          <Tile emoji="🧾" label="Lab reports" to="/health/labs" testID="hh-labs" />
        </View>

        {meds.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardH}>Current medications</Text>
            {meds.slice(0, 5).map((m) => (
              <View key={m.id} style={styles.medRow}>
                <View style={styles.medDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{m.name}</Text>
                  <Text style={styles.medSub}>{m.dose} · {(m.schedule || []).join(", ") || m.frequency}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerT}>Your data stays private in your account. Educational tracker — always consult your physician for medical decisions.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Big({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: accent || colors.onSurface, fontSize: 20, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Tile({ emoji, label, to, testID }: { emoji: string; label: string; to: string; testID: string }) {
  const router = useRouter();
  return (
    <Pressable testID={testID} onPress={() => router.push(to as any)} style={styles.tile}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <Text style={styles.tileLbl}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center" },
  cardH: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  cardSub: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10 },
  bmiCard: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  bmiRow: { flexDirection: "row", marginTop: 8 },
  bmiCat: { textAlign: "center", fontSize: 12, fontWeight: "800", marginTop: 2 },
  editLink: { alignSelf: "flex-end" },
  editLinkTxt: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  stepsBig: { color: colors.brandPrimary, fontSize: 34, fontWeight: "900" },
  stepsGoal: { color: colors.muted, fontSize: 11 },
  progressBar: { height: 8, backgroundColor: colors.surfaceTertiary, borderRadius: 4, overflow: "hidden", marginTop: 6 },
  progressFill: { height: "100%", backgroundColor: colors.brandPrimary },
  monthLbl: { color: colors.muted, fontSize: 10, textAlign: "right" },
  monthVal: { color: colors.onSurface, fontSize: 18, fontWeight: "800", textAlign: "right" },
  quickRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  quickBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.brandTertiary, alignItems: "center" },
  quickBtnTxt: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
  input: { flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, fontSize: 14, color: colors.onSurface },
  primary: { paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  rewardCard: { padding: 14, borderRadius: radius.lg, backgroundColor: "#FEF3C7", borderLeftWidth: 4, borderLeftColor: colors.warning, gap: 4 },
  rewardH: { color: "#78350F", fontSize: 13, fontWeight: "800" },
  rewardCur: { color: "#78350F", fontSize: 22, fontWeight: "900" },
  rewardNext: { color: "#92400E", fontSize: 12, marginTop: 4 },
  tierPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.success, marginTop: 4 },
  tierTxt: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierLbl: { color: "#78350F", fontSize: 11 },
  sectionH: { color: colors.onSurface, fontSize: 13, fontWeight: "800", textTransform: "uppercase", marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "48%", padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 6 },
  tileLbl: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  medRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  medDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandSecondary },
  medName: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  medSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  disclaimer: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  disclaimerT: { color: colors.muted, fontSize: 11, lineHeight: 16 },
});
