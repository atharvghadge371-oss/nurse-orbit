import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { api } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

export default function PediatricBSA() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [h, setH] = useState("");
  const [w, setW] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const calc = async () => {
    const H = parseFloat(h), W = parseFloat(w);
    if (!H || !W) return Alert.alert("Enter height (cm) and weight (kg)");
    setBusy(true);
    try { setResult(await api.pedBSA(H, W)); }
    catch (e: any) { Alert.alert("Failed", e.message); }
    finally { setBusy(false); }
  };

  const bmi = (() => {
    const H = parseFloat(h), W = parseFloat(w);
    if (!H || !W) return null;
    const m = H / 100;
    return +(W / (m * m)).toFixed(1);
  })();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="bs-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View>
          <Text style={styles.title}>Body Surface Area</Text>
          <Text style={styles.subtitle}>Mosteller formula</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lbl}>Height (cm)</Text>
              <TextInput testID="bs-h" value={h} onChangeText={setH} keyboardType="decimal-pad" placeholder="110" placeholderTextColor={colors.muted} style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lbl}>Weight (kg)</Text>
              <TextInput testID="bs-w" value={w} onChangeText={setW} keyboardType="decimal-pad" placeholder="18" placeholderTextColor={colors.muted} style={styles.input} />
            </View>
          </View>
          <Pressable testID="bs-calc" disabled={busy || !h || !w} onPress={calc} style={[styles.primary, (busy || !h || !w) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Calculate BSA</Text>}
          </Pressable>

          {result && (
            <View style={styles.resultBox}>
              <Text style={styles.rH}>Body Surface Area</Text>
              <View style={styles.bigWrap}>
                <Text style={styles.bigNum}>{result.bsa_m2}</Text>
                <Text style={styles.bigUnit}>m²</Text>
              </View>
              {bmi !== null && (
                <View style={styles.bmiRow}>
                  <Text style={styles.bmiK}>BMI</Text>
                  <Text style={styles.bmiV}>{bmi}</Text>
                </View>
              )}
              <Text style={styles.formula}>{result.formula}</Text>
              <Text style={styles.helpSmall}>Used for chemotherapy dosing (mg/m²), IV fluid calc in burn resuscitation and cardiac output indexing.</Text>
            </View>
          )}
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
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10 },
  lbl: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 4 },
  input: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, fontSize: 16, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, fontWeight: "700" },
  primary: { backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  resultBox: { padding: 16, borderRadius: radius.lg, backgroundColor: colors.brandTertiary, borderLeftWidth: 4, borderLeftColor: colors.brandPrimary, gap: 8 },
  rH: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  bigWrap: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  bigNum: { color: colors.brandPrimary, fontSize: 46, fontWeight: "900" },
  bigUnit: { color: colors.brandPrimary, fontSize: 22, fontWeight: "800" },
  bmiRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  bmiK: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  bmiV: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  formula: { color: colors.muted, fontSize: 11, marginTop: 6, lineHeight: 16 },
  helpSmall: { color: colors.onSurfaceSecondary, fontSize: 11, marginTop: 4, lineHeight: 16 },
});
