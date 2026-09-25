import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

export default function NursingDiagnosis() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scenario, setScenario] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    if (!scenario.trim()) return;
    setBusy(true); setErr("");
    try { setResult(await api.nursingDiagnosis(scenario.trim())); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="diag-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Nursing Diagnosis</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Describe the clinical scenario</Text>
          <Text style={styles.cardSub}>Example: "Patient with pneumonia, SpO2 88%, RR 32, productive cough."</Text>
          <TextInput
            testID="diag-input"
            value={scenario}
            onChangeText={setScenario}
            placeholder="Type the patient scenario..."
            placeholderTextColor={colors.muted}
            multiline
            style={styles.input}
          />
          <Pressable testID="diag-run" disabled={!scenario.trim() || busy} style={[styles.primary, (!scenario.trim() || busy) && { opacity: 0.4 }]} onPress={run}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Generate diagnoses</Text>}
          </Pressable>
        </View>

        {!!err && <Text style={styles.err}>{err}</Text>}

        {result && (
          <View style={{ gap: 14 }} testID="diag-result">
            {(result.diagnoses || []).map((d: any, i: number) => (
              <View key={i} style={styles.diagCard}>
                <Text style={styles.diagLabel}>{d.label}</Text>
                {d.related_factors && <>
                  <Text style={styles.h}>Related to</Text>
                  {(d.related_factors as string[]).map((f, ii) => <Text key={ii} style={styles.bullet}>• {f}</Text>)}
                </>}
                {d.supporting_findings && <>
                  <Text style={styles.h}>Supporting findings</Text>
                  {(d.supporting_findings as string[]).map((f, ii) => <Text key={ii} style={styles.bullet}>• {f}</Text>)}
                </>}
              </View>
            ))}

            {result.goals && (
              <View style={styles.diagCard}>
                <Text style={styles.h}>Goals / Outcomes</Text>
                {result.goals.map((g: string, i: number) => <Text key={i} style={styles.bullet}>• {g}</Text>)}
              </View>
            )}
            {result.interventions && (
              <View style={styles.diagCard}>
                <Text style={styles.h}>Interventions & Rationales</Text>
                {result.interventions.map((iv: any, i: number) => (
                  <View key={i} style={{ marginTop: 8 }}>
                    <Text style={styles.bullet}>• {iv.action}</Text>
                    <Text style={styles.rationale}>Rationale: {iv.rationale}</Text>
                  </View>
                ))}
              </View>
            )}
            {result.evaluation && (
              <View style={styles.diagCard}>
                <Text style={styles.h}>Evaluation</Text>
                {result.evaluation.map((e: string, i: number) => <Text key={i} style={styles.bullet}>• {e}</Text>)}
              </View>
            )}

            <View style={styles.disclaimer}><Text style={styles.disclaimerText}>{result.disclaimer}</Text></View>

            <Pressable testID="diag-to-care-plan" style={styles.secondary} onPress={() => router.push(`/care-plans/new?scenario=${encodeURIComponent(scenario)}` as any)}>
              <Text style={styles.secondaryText}>Build a Care Plan from this →</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  card: { padding: 16, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  cardSub: { color: colors.muted, fontSize: 12, marginTop: 4 },
  input: { minHeight: 100, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: 14, fontSize: 14, color: colors.onSurface, marginTop: 12, textAlignVertical: "top", borderWidth: 1, borderColor: colors.border },
  primary: { marginTop: 12, backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.md, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  diagCard: { padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  diagLabel: { color: colors.brandPrimary, fontSize: 15, fontWeight: "800", marginBottom: 6 },
  h: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  bullet: { color: colors.onSurface, fontSize: 13, lineHeight: 20, marginTop: 4 },
  rationale: { color: colors.muted, fontSize: 12, marginTop: 2, marginLeft: 14, fontStyle: "italic" },
  disclaimer: { padding: 12, borderRadius: radius.md, backgroundColor: "#FEF3C7" },
  disclaimerText: { color: "#92400E", fontSize: 11, lineHeight: 16 },
  secondary: { padding: 14, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center" },
  secondaryText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800" },
  err: { color: colors.error, fontSize: 13 },
});
