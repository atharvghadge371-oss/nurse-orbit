import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

export default function NewCarePlan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scenario?: string }>();
  const qc = useQueryClient();
  const [condition, setCondition] = useState(params.scenario ? decodeURIComponent(params.scenario) : "");
  const [assessment, setAssessment] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [goals, setGoals] = useState("");
  const [interventions, setInterventions] = useState("");
  const [rationales, setRationales] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!condition.trim()) { setErr("Condition is required"); return; }
    setBusy(true); setErr("");
    try {
      await api.createCarePlan({ condition: condition.trim(), assessment, diagnosis, goals, interventions, rationales, evaluation, ai_generate: useAI });
      qc.invalidateQueries({ queryKey: ["careplans"] });
      router.back();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="cp-new-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>New Care Plan</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Field label="Patient condition / diagnosis *" v={condition} on={setCondition} tid="cp-cond" placeholder="e.g. Community-acquired pneumonia" />
        <Field label="Assessment findings" v={assessment} on={setAssessment} tid="cp-ass" placeholder="Vital signs, symptoms..." multi />

        <View style={styles.aiRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>✨ Let AI draft the plan</Text>
            <Text style={styles.aiSub}>Fill any fields below and AI will complete the rest.</Text>
          </View>
          <Switch testID="cp-ai-toggle" value={useAI} onValueChange={setUseAI} trackColor={{ true: colors.brandSecondary }} />
        </View>

        <Field label="Nursing diagnosis" v={diagnosis} on={setDiagnosis} tid="cp-dx" placeholder="Optional" multi />
        <Field label="Goals" v={goals} on={setGoals} tid="cp-goals" placeholder="Optional" multi />
        <Field label="Interventions" v={interventions} on={setInterventions} tid="cp-inv" placeholder="Optional" multi />
        <Field label="Rationales" v={rationales} on={setRationales} tid="cp-rat" placeholder="Optional" multi />
        <Field label="Evaluation" v={evaluation} on={setEvaluation} tid="cp-eval" placeholder="Optional" multi />

        {!!err && <Text style={styles.err}>{err}</Text>}

        <Pressable testID="cp-save" disabled={busy} style={[styles.primary, busy && { opacity: 0.5 }]} onPress={save}>
          {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Save Care Plan</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, v, on, tid, placeholder, multi }: any) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={tid}
        value={v}
        onChangeText={on}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multi}
        style={[styles.input, multi && { minHeight: 70, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  label: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "800", marginBottom: 6 },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: 12, fontSize: 14, color: colors.onSurface, borderWidth: 1, borderColor: colors.border },
  aiRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.brandTertiary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brandPrimary },
  aiTitle: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800" },
  aiSub: { color: colors.brandPrimary, fontSize: 11, marginTop: 2 },
  primary: { marginTop: 8, backgroundColor: colors.brandPrimary, padding: 16, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  err: { color: colors.error, fontSize: 13 },
});
