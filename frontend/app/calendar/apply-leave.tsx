import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { api } from "@/src/api";
import { colors, radius, screenContentBottomPadding, spacing } from "@/src/theme";

export default function ApplyLeave() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().add(13, "day").format("YYYY-MM-DD"));
  const [kind, setKind] = useState<"AL" | "SICK">("AL");
  const [preview, setPreview] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.calSuggestAL(14);
        setSuggestions(r.suggestions || []);
      } catch {}
    })();
  }, []);

  const runPreview = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return Alert.alert("Enter dates as YYYY-MM-DD");
    }
    setBusy(true);
    try {
      const r = await api.calPreviewLeave({ start_date: startDate, end_date: endDate, leave_kind: kind });
      setPreview(r);
    } catch (e: any) { Alert.alert("Preview failed", e.message); }
    finally { setBusy(false); }
  };

  const apply = async () => {
    if (!preview) return;
    if (!preview.can_apply) return Alert.alert("Not enough balance", `Needs ${preview.leave_cost} · you have ${preview.available_balance}`);
    setApplying(true);
    try {
      const r = await api.calApplyLeave({ start_date: startDate, end_date: endDate, leave_kind: kind });
      Alert.alert("Leave applied", `${r.applied_days} working days converted to ${kind}`);
      router.back();
    } catch (e: any) { Alert.alert("Failed", e.message); }
    finally { setApplying(false); }
  };

  const useSuggestion = (s: any) => {
    setStartDate(s.start); setEndDate(s.end); setPreview(null);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="al-close" onPress={() => router.back()}><Text style={styles.close}>✕</Text></Pressable>
        <Text style={styles.title}>Apply leave</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
        <Text style={styles.help}>Choose a date range. Only working days (Morning / Evening / Night shifts) in that range consume your balance. Off days are free.</Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sec}>From</Text>
            <TextInput testID="al-start" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sec}>To</Text>
            <TextInput testID="al-end" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />
          </View>
        </View>

        <Text style={styles.sec}>Kind</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["AL", "SICK"] as const).map((k) => (
            <Pressable
              key={k}
              testID={`al-kind-${k}`}
              onPress={() => setKind(k)}
              style={[styles.kindChip, kind === k && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}
            >
              <Text style={[styles.kindText, kind === k && { color: "#FFF" }]}>{k === "AL" ? "Annual leave" : "Sick leave"}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable testID="al-preview" disabled={busy} onPress={runPreview} style={[styles.secondary, busy && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator color={colors.brandPrimary} /> : <Text style={styles.secondaryText}>Preview cost</Text>}
        </Pressable>

        {preview && (
          <View style={[styles.previewBox, preview.can_apply ? { borderColor: colors.success } : { borderColor: colors.error }]}>
            <Text style={styles.previewH}>{preview.leave_kind} preview</Text>
            <View style={styles.previewRow}>
              <Metric label="Days in range" v={preview.total_days_in_range} />
              <Metric label="Working" v={preview.working_days} accent={colors.brandPrimary} />
              <Metric label="Off" v={preview.off_days} accent={colors.muted} />
              <Metric label="Unset" v={preview.unknown_days} accent={colors.warning} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />
            <Text style={styles.previewCost}>Cost: <Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>{preview.leave_cost}</Text> {preview.leave_kind}   ·   Balance: <Text style={{ fontWeight: "800" }}>{preview.available_balance}</Text></Text>
            {!preview.can_apply && <Text style={styles.warn}>⚠︎ Not enough balance. Reduce the range or add a shift pattern first.</Text>}
            {preview.unknown_days > 0 && <Text style={styles.warn}>ℹ︎ {preview.unknown_days} day(s) have no shift set — they will not be counted. Add a shift pattern to cover them.</Text>}
            <Pressable testID="al-apply" disabled={!preview.can_apply || applying} onPress={apply} style={[styles.primary, (!preview.can_apply || applying) && { opacity: 0.5 }]}>
              {applying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Apply {preview.leave_cost} {preview.leave_kind}</Text>}
            </Pressable>
          </View>
        )}

        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />
        <Text style={styles.sec}>Suggested 2-week windows</Text>
        {suggestions.length === 0 ? (
          <Text style={styles.helpSmall}>Add a shift pattern first so we can suggest optimal AL windows.</Text>
        ) : suggestions.map((s) => (
          <Pressable key={s.start} testID={`sugg-${s.start}`} onPress={() => useSuggestion(s)} style={styles.sugg}>
            <View style={{ flex: 1 }}>
              <Text style={styles.suggTitle}>{dayjs(s.start).format("MMM D")} – {dayjs(s.end).format("MMM D, YYYY")}</Text>
              <Text style={styles.suggSub}>{s.working_days} working days → {s.al_cost} AL</Text>
            </View>
            <Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>Use ›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Metric({ label, v, accent }: { label: string; v: number; accent?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: accent || colors.onSurface, fontSize: 18, fontWeight: "800" }}>{v}</Text>
      <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  close: { color: colors.onSurface, fontSize: 22, fontWeight: "700", width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  help: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  helpSmall: { color: colors.muted, fontSize: 11, fontStyle: "italic" },
  sec: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.onSurface },
  kindChip: { flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  kindText: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  secondary: { padding: 12, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center" },
  secondaryText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800" },
  previewBox: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 2 },
  previewH: { color: colors.brandPrimary, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  previewRow: { flexDirection: "row", marginTop: 10 },
  previewCost: { color: colors.onSurface, fontSize: 14 },
  warn: { color: colors.warning, fontSize: 12, marginTop: 6 },
  primary: { marginTop: 12, backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  sugg: { padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 8 },
  suggTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  suggSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
