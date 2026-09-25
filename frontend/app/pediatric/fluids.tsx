import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { api } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

export default function PediatricFluids() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState("");
  const [fluids, setFluids] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const [vol, setVol] = useState("");
  const [hr, setHr] = useState("");
  const [drop, setDrop] = useState("20");
  const [drip, setDrip] = useState<any>(null);
  const [busyDrip, setBusyDrip] = useState(false);

  const calcFluids = async () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return Alert.alert("Enter weight in kg");
    setBusy(true);
    try { setFluids(await api.pedFluids(w)); }
    catch (e: any) { Alert.alert("Failed", e.message); }
    finally { setBusy(false); }
  };

  const calcDrip = async () => {
    const v = parseFloat(vol); const t = parseFloat(hr); const d = parseInt(drop) || 20;
    if (!v || !t) return Alert.alert("Enter volume and time");
    setBusyDrip(true);
    try { setDrip(await api.pedDrip(v, t, d)); }
    catch (e: any) { Alert.alert("Failed", e.message); }
    finally { setBusyDrip(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="fl-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View>
          <Text style={styles.title}>IV Fluids & Bolus</Text>
          <Text style={styles.subtitle}>Holliday-Segar + drip-rate</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardH}>💧 Maintenance fluids</Text>
          <Text style={styles.lbl}>Weight (kg)</Text>
          <TextInput testID="fl-weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 25" placeholderTextColor={colors.muted} style={styles.input} />
          <Pressable testID="fl-calc" disabled={busy || !weight} onPress={calcFluids} style={[styles.primary, (busy || !weight) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Calculate</Text>}
          </Pressable>
          {fluids && (
            <View style={styles.result}>
              <View style={styles.bigRow}>
                <Big label="Per hour" value={`${fluids.maintenance_ml_per_hr} mL`} accent={colors.brandPrimary} />
                <Big label="Per day" value={`${fluids.maintenance_ml_per_day} mL`} accent={colors.brandSecondary} />
                <Big label="Bolus (20 mL/kg)" value={`${fluids.recommended_bolus_ml} mL`} accent="#EF4444" />
              </View>
              <Text style={styles.rule}>{fluids.rule}</Text>
              <Text style={styles.warn}>⚠︎ {fluids.disclaimer}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardH}>💉 IV drip rate</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lbl}>Volume (mL)</Text>
              <TextInput testID="dr-vol" value={vol} onChangeText={setVol} keyboardType="decimal-pad" placeholder="500" placeholderTextColor={colors.muted} style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lbl}>Time (hr)</Text>
              <TextInput testID="dr-hr" value={hr} onChangeText={setHr} keyboardType="decimal-pad" placeholder="8" placeholderTextColor={colors.muted} style={styles.input} />
            </View>
            <View style={{ width: 100 }}>
              <Text style={styles.lbl}>gtt/mL</Text>
              <TextInput testID="dr-drop" value={drop} onChangeText={setDrop} keyboardType="number-pad" placeholder="20" placeholderTextColor={colors.muted} style={styles.input} />
            </View>
          </View>
          <Text style={styles.helpSmall}>Macro drip set: 15 or 20 · Micro drip set: 60</Text>
          <Pressable testID="dr-calc" disabled={busyDrip || !vol || !hr} onPress={calcDrip} style={[styles.primary, (busyDrip || !vol || !hr) && { opacity: 0.5 }]}>
            {busyDrip ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Calculate drip rate</Text>}
          </Pressable>
          {drip && (
            <View style={styles.result}>
              <View style={styles.bigRow}>
                <Big label="mL / hr" value={String(drip.ml_per_hr)} accent={colors.brandPrimary} />
                <Big label="drops / min" value={String(drip.drops_per_min)} accent={colors.brandSecondary} />
              </View>
              <Text style={styles.rule}>{drip.formula}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Big({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", padding: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: accent, fontSize: 22, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center" },
  card: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  cardH: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  lbl: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginTop: 4 },
  helpSmall: { color: colors.muted, fontSize: 11 },
  input: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, fontSize: 16, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, fontWeight: "700" },
  primary: { backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.lg, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  result: { marginTop: 8, gap: 8 },
  bigRow: { flexDirection: "row", gap: 8 },
  rule: { color: colors.muted, fontSize: 11, marginTop: 6, lineHeight: 16 },
  warn: { color: "#92400E", fontSize: 11, backgroundColor: "#FEF3C7", padding: 10, borderRadius: 8, marginTop: 6 },
});
