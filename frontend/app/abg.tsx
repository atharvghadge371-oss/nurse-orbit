import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

export default function ABG() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ph, setPh] = useState("");
  const [pco2, setPco2] = useState("");
  const [hco3, setHco3] = useState("");
  const [po2, setPo2] = useState("");
  const [sao2, setSao2] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const { data: vt } = useQuery({ queryKey: ["vent"], queryFn: api.ventilator });

  const interpret = async () => {
    setBusy(true);
    try {
      const r = await api.abgInterpret({
        pH: parseFloat(ph), PaCO2: parseFloat(pco2), HCO3: parseFloat(hco3),
        PaO2: po2 ? parseFloat(po2) : undefined, SaO2: sao2 ? parseFloat(sao2) : undefined,
      });
      setResult(r);
    } catch (e: any) { setResult({ error: e.message }); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="abg-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>ABG & Ventilator</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={styles.calcBox}>
          <Text style={styles.calcTitle}>🫁 ABG Interpreter</Text>
          <Text style={styles.calcSub}>Enter arterial blood-gas values for an educational interpretation.</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Field label="pH" value={ph} onChange={setPh} placeholder="7.35–7.45" tid="abg-ph" />
            <Field label="PaCO₂" value={pco2} onChange={setPco2} placeholder="35–45" tid="abg-pco2" />
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Field label="HCO₃⁻" value={hco3} onChange={setHco3} placeholder="22–26" tid="abg-hco3" />
            <Field label="PaO₂" value={po2} onChange={setPo2} placeholder="80–100" tid="abg-po2" />
          </View>
          <Field label="SaO₂ (%)" value={sao2} onChange={setSao2} placeholder="95–100" tid="abg-sao2" />

          <Pressable testID="abg-interpret" disabled={!ph || !pco2 || !hco3 || busy} style={[styles.primary, (!ph || !pco2 || !hco3 || busy) && { opacity: 0.4 }]} onPress={interpret}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Interpret</Text>}
          </Pressable>
        </View>

        {result && !result.error && (
          <View style={styles.resultBox} testID="abg-result">
            <Text style={styles.resultTitle}>{result.primary}</Text>
            <Text style={styles.h}>Compensation</Text>
            <Text style={styles.body}>{result.compensation}</Text>
            {result.problems && result.problems.length > 0 && (<>
              <Text style={styles.h}>Additional Findings</Text>
              {result.problems.map((p: string, i: number) => <Text key={i} style={styles.bullet}>• {p}</Text>)}
            </>)}
            {result.causes && result.causes.length > 0 && (<>
              <Text style={styles.h}>Common Causes</Text>
              {result.causes.map((c: string, i: number) => <Text key={i} style={styles.bullet}>• {c}</Text>)}
            </>)}
            <Text style={styles.disclaimer}>{result.disclaimer}</Text>
          </View>
        )}
        {result?.error && <Text style={styles.err}>{result.error}</Text>}

        <Text style={styles.sec}>Ventilator Basics</Text>
        {(vt?.topics || []).map((t: any) => (
          <View key={t.id} style={styles.topicCard} testID={`vent-${t.id}`}>
            <Text style={styles.topicTitle}>{t.title}</Text>
            <Text style={styles.topicBody}>
              {t.content.split(/(\*\*[^*]+\*\*)/g).map((p: string, i: number) =>
                p.startsWith("**") && p.endsWith("**") ? <Text key={i} style={{ fontWeight: "800", color: colors.brandPrimary }}>{p.slice(2, -2)}</Text> : <Text key={i}>{p}</Text>
              )}
            </Text>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, tid }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLbl}>{label}</Text>
      <TextInput testID={tid} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  calcBox: { padding: 18, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  calcTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  calcSub: { color: colors.muted, fontSize: 12, marginTop: 4 },
  fieldLbl: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "800", marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: 12, fontSize: 15, color: colors.onSurface, borderWidth: 1, borderColor: colors.border },
  primary: { marginTop: 16, backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  resultBox: { padding: 16, backgroundColor: colors.brandTertiary, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.brandPrimary },
  resultTitle: { color: colors.brandPrimary, fontSize: 20, fontWeight: "800" },
  h: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", marginTop: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  body: { color: colors.onSurface, fontSize: 13, marginTop: 4, lineHeight: 19 },
  bullet: { color: colors.onSurface, fontSize: 13, marginTop: 4 },
  disclaimer: { color: colors.muted, fontSize: 11, fontStyle: "italic", marginTop: 12 },
  err: { color: colors.error, fontSize: 13 },
  sec: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: 16 },
  topicCard: { padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  topicTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800", marginBottom: 6 },
  topicBody: { color: colors.onSurface, fontSize: 13, lineHeight: 20 },
});
