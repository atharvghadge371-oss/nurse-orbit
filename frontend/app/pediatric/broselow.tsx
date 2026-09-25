import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/api";
import { colors, radius, screenContentBottomPadding, spacing } from "@/src/theme";

type Zone = any;

const ROWS: [string, string, string?][] = [
  ["age_approx",                  "Approx age"],
  ["weight_range",                "Weight"],
  ["et_tube_uncuffed",            "ET tube (uncuffed)"],
  ["et_tube_cuffed",              "ET tube (cuffed)"],
  ["et_tube_depth_cm",            "ETT depth (cm)"],
  ["lma_size",                    "LMA size"],
  ["adrenaline_iv_mg",            "Adrenaline IV / IO (mg)", "1:10,000"],
  ["adrenaline_iv_ml_1_10k",      "Adrenaline IV / IO (mL)", "1:10,000"],
  ["adrenaline_im_1_1k_mg",       "Adrenaline IM (mg)",      "1:1,000 – anaphylaxis"],
  ["adrenaline_ett_mg",           "Adrenaline ETT (mg)"],
  ["atropine_mg",                 "Atropine (mg)"],
  ["amiodarone_mg",               "Amiodarone (mg)"],
  ["adenosine_first_mg",          "Adenosine 1st (mg)"],
  ["adenosine_second_mg",         "Adenosine 2nd (mg)"],
  ["defib_j",                     "Defibrillation (J)"],
  ["cardiovert_j",                "Cardioversion (J)"],
  ["fluid_bolus_ml",              "Fluid bolus 20 mL/kg"],
  ["d10w_ml",                     "D10W 5 mL/kg"],
  ["naloxone_mg",                 "Naloxone (mg)"],
  ["midazolam_mg",                "Midazolam (mg)"],
  ["diazepam_mg",                 "Diazepam (mg)"],
  ["fentanyl_mcg",                "Fentanyl (mcg)"],
  ["ketamine_iv_mg",              "Ketamine IV (mg)"],
  ["paracetamol_pr_mg",           "Paracetamol PR (mg)"],
];

export default function Broselow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.pedBroselow();
        setZones(r.zones || []);
      } catch (e: any) { console.log(e.message); }
    })();
  }, []);

  const suggestedIdx = useMemo(() => {
    const w = parseFloat(weight);
    if (!w || !zones.length) return null;
    for (let i = 0; i < zones.length; i++) {
      if (w >= zones[i].weight_kg_min && w <= zones[i].weight_kg_max) return i;
    }
    if (w < zones[0].weight_kg_min) return 0;
    return zones.length - 1;
  }, [weight, zones]);

  const idx = selectedIdx ?? suggestedIdx ?? 0;
  const zone: Zone | null = zones[idx] || null;

  const rowValue = (z: Zone, key: string) => {
    if (key === "weight_range") return `${z.weight_kg_min}–${z.weight_kg_max} kg`;
    return z[key] ?? "—";
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="br-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View>
          <Text style={styles.title}>Broselow Cart</Text>
          <Text style={styles.subtitle}>Colour-coded pediatric emergency</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: screenContentBottomPadding(insets.bottom) }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.lbl}>Child weight (kg)</Text>
          <TextInput
            testID="br-weight"
            value={weight}
            onChangeText={(v) => { setWeight(v); setSelectedIdx(null); }}
            keyboardType="decimal-pad"
            placeholder="e.g. 15"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          {suggestedIdx !== null && (
            <Text style={styles.hint}>Suggested zone: <Text style={{ fontWeight: "800", color: colors.brandPrimary }}>{zones[suggestedIdx]?.color}</Text> ({zones[suggestedIdx]?.age_approx})</Text>
          )}
        </View>

        {/* Zone selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
          {zones.map((z, i) => {
            const on = i === idx;
            return (
              <Pressable
                key={z.color}
                testID={`br-zone-${z.color}`}
                onPress={() => setSelectedIdx(i)}
                style={[styles.zoneChip, { backgroundColor: z.hex }, on && styles.zoneChipActive]}
              >
                <Text style={[styles.zoneChipText, { color: ["Grey","Pink","Yellow","White"].includes(z.color) ? "#111827" : "#FFF" }]}>
                  {z.color}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {zone && (
          <View style={styles.zoneCard}>
            <View style={[styles.zoneBanner, { backgroundColor: zone.hex }]}>
              <Text style={[styles.zoneBannerText, { color: ["Grey","Pink","Yellow","White"].includes(zone.color) ? "#111827" : "#FFF" }]}>
                {zone.color.toUpperCase()} · {zone.weight_kg_min}–{zone.weight_kg_max} kg · {zone.age_approx}
              </Text>
            </View>
            <View style={{ padding: 12 }}>
              {ROWS.map(([key, label, note], i) => (
                <View key={key} style={[styles.row, i < ROWS.length - 1 && styles.rowBorder]}>
                  <Text style={styles.rowLabel}>{label}{note ? <Text style={styles.rowNote}>  ·  {note}</Text> : null}</Text>
                  <Text style={styles.rowValue}>{rowValue(zone, key)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>⚠︎ Values are the standard published Broselow ranges. Confirm with local resus protocol.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center" },

  card: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 6 },
  lbl: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  input: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, fontSize: 18, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, fontWeight: "800" },
  hint: { color: colors.muted, fontSize: 12, marginTop: 6 },

  zoneChip: { paddingHorizontal: 14, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent", flexShrink: 0 },
  zoneChipActive: { borderColor: colors.onSurface },
  zoneChipText: { fontSize: 12, fontWeight: "800" },

  zoneCard: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  zoneBanner: { padding: 14, alignItems: "center" },
  zoneBannerText: { fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 12 },
  rowNote: { color: colors.muted, fontSize: 10 },
  rowValue: { color: colors.onSurface, fontSize: 14, fontWeight: "800", textAlign: "right", maxWidth: "50%" },

  disclaimer: { padding: 12, borderRadius: radius.md, backgroundColor: "#FEF3C7" },
  disclaimerText: { color: "#92400E", fontSize: 11, lineHeight: 16 },
});
