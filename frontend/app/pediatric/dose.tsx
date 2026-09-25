import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

type Drug = any;

export default function PediatricDose() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Drug | null>(null);
  const [weight, setWeight] = useState("");
  const [conc, setConc] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.pedDrugs();
        setDrugs(r.drugs || []); setCats(r.categories || []);
      } catch (e: any) { console.log(e.message); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return drugs.filter((d) =>
      (!category || d.category === category) &&
      (!term || d.name.toLowerCase().includes(term) || (d.indication || "").toLowerCase().includes(term))
    );
  }, [drugs, q, category]);

  useEffect(() => {
    setConc(selected?.common_concentration_mg_per_ml ? String(selected.common_concentration_mg_per_ml)
          : selected?.common_concentration_mcg_per_ml ? String(selected.common_concentration_mcg_per_ml) : "");
    setResult(null);
  }, [selected]);

  const calc = async () => {
    if (!selected) return Alert.alert("Pick a drug");
    const w = parseFloat(weight);
    if (!w || w <= 0) return Alert.alert("Enter valid weight in kg");
    setBusy(true);
    try {
      const c = conc ? parseFloat(conc) : undefined;
      const r = await api.pedCalc(selected.id, w, c);
      setResult(r);
    } catch (e: any) { Alert.alert("Failed", e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="dose-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View>
          <Text style={styles.title}>Pediatric Dose</Text>
          <Text style={styles.subtitle}>Weight-based calculator (mg/kg)</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.lbl}>Weight (kg)</Text>
          <TextInput testID="dose-weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 15" placeholderTextColor={colors.muted} style={styles.input} />
        </View>

        <TextInput testID="dose-search" value={q} onChangeText={setQ} placeholder="Search drug or indication…" placeholderTextColor={colors.muted} style={styles.search} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Chip label="All" on={!category} onPress={() => setCategory(null)} />
          {cats.map((c) => <Chip key={c} label={c} on={category === c} onPress={() => setCategory(c)} />)}
        </ScrollView>

        <View style={{ gap: 6 }}>
          {filtered.map((d) => (
            <Pressable
              key={d.id}
              testID={`drug-${d.id}`}
              onPress={() => setSelected(d)}
              style={[styles.drugRow, selected?.id === d.id && { borderColor: colors.brandPrimary, borderWidth: 2 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.drugName}>{d.name}</Text>
                <Text style={styles.drugSub}>{d.route} · {d.dose_range}  ·  {d.category}</Text>
                {!!d.indication && <Text style={styles.drugIndic}>{d.indication}</Text>}
              </View>
              <Text style={{ fontSize: 20, color: selected?.id === d.id ? colors.brandPrimary : colors.muted }}>{selected?.id === d.id ? "●" : "○"}</Text>
            </Pressable>
          ))}
        </View>

        {selected && (
          <View style={styles.calcBox}>
            <Text style={styles.calcH}>Selected: {selected.name}</Text>
            <Text style={styles.lbl}>Concentration ({selected.dose_mcg_per_kg ? "mcg" : "mg"}/mL) — optional</Text>
            <TextInput testID="dose-conc" value={conc} onChangeText={setConc} keyboardType="decimal-pad" placeholder="e.g. 0.1 for 1:10,000 adrenaline" placeholderTextColor={colors.muted} style={styles.input} />

            <Pressable testID="dose-calc" disabled={busy || !weight} onPress={calc} style={[styles.primary, (busy || !weight) && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Calculate dose</Text>}
            </Pressable>

            {result && (
              <View style={[styles.resultBox, result.capped_at_max && { borderColor: colors.warning }]}>
                <Text style={styles.resultH}>Dose for {result.weight_kg} kg</Text>
                <View style={styles.bigVal}>
                  <Text style={styles.bigNum}>{result.final_dose}</Text>
                  <Text style={styles.bigUnit}>{result.dose_unit}</Text>
                </View>
                {result.volume_ml !== null && result.volume_ml !== undefined && (
                  <Text style={styles.volLine}>≈ <Text style={{ fontWeight: "800", color: colors.brandPrimary }}>{result.volume_ml} mL</Text> at {result.concentration_used_mg_per_ml} {result.dose_unit}/mL</Text>
                )}
                {result.capped_at_max && (
                  <Text style={styles.warn}>⚠︎ Calculated dose ({result.calculated_dose} {result.dose_unit}) exceeds adult max — capped at {result.max_single_dose} {result.dose_unit}</Text>
                )}
                <View style={{ marginTop: 10, gap: 4 }}>
                  <MetaLine k="Reference" v={selected.dose_range} />
                  <MetaLine k="Route" v={selected.route} />
                  <MetaLine k="Frequency" v={selected.frequency} />
                  {selected.max_single_dose_mg && <MetaLine k="Max single dose" v={`${selected.max_single_dose_mg} mg`} />}
                  {selected.indication && <MetaLine k="Indication" v={selected.indication} />}
                  {selected.notes && <MetaLine k="Notes" v={selected.notes} />}
                </View>
                <Text style={styles.disclaimerText}>⚠︎ {result.disclaimer}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable testID={`chip-${label}`} onPress={onPress} style={[styles.chip, on && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
      <Text style={[styles.chipText, on && { color: "#FFF" }]}>{label}</Text>
    </Pressable>
  );
}
function MetaLine({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800", width: 90 }}>{k}</Text>
      <Text style={{ color: colors.onSurface, fontSize: 12, flex: 1 }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center" },
  card: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 6 },
  lbl: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  input: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, fontSize: 16, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, fontWeight: "700" },
  search: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, fontSize: 14, color: colors.onSurface },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipText: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  drugRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  drugName: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  drugSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  drugIndic: { color: colors.onSurfaceSecondary, fontSize: 11, marginTop: 4, fontStyle: "italic" },
  calcBox: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.brandTertiary, borderLeftWidth: 4, borderLeftColor: colors.brandPrimary, gap: 10, marginTop: 8 },
  calcH: { color: colors.brandPrimary, fontSize: 13, fontWeight: "800", textTransform: "uppercase" },
  primary: { backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  resultBox: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.brandPrimary, gap: 6 },
  resultH: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  bigVal: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  bigNum: { color: colors.brandPrimary, fontSize: 40, fontWeight: "900" },
  bigUnit: { color: colors.brandPrimary, fontSize: 20, fontWeight: "800" },
  volLine: { color: colors.onSurface, fontSize: 14, marginTop: 4 },
  warn: { color: colors.warning, fontSize: 12, fontWeight: "800", marginTop: 6 },
  disclaimerText: { color: "#92400E", fontSize: 11, marginTop: 10, backgroundColor: "#FEF3C7", padding: 10, borderRadius: 8 },
});
