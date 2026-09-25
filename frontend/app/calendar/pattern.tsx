import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import dayjs from "dayjs";
import { api } from "@/src/api";
import { colors, radius, screenContentBottomPadding, spacing } from "@/src/theme";

type Tok = "morning" | "evening" | "night" | "off";
const TOKENS: { key: Tok; icon: string; label: string; color: string }[] = [
  { key: "morning", icon: "🌅", label: "Morning", color: "#F59E0B" },
  { key: "evening", icon: "🌇", label: "Evening", color: "#8B5CF6" },
  { key: "night", icon: "🌙", label: "Night", color: "#1E3A8A" },
  { key: "off", icon: "🛌", label: "Off", color: "#94A3B8" },
];

const PRESETS: { name: string; pattern: Tok[] }[] = [
  { name: "4 duty / 4 off / 4 night / 4 off", pattern: ["morning", "morning", "morning", "morning", "off", "off", "off", "off", "night", "night", "night", "night", "off", "off", "off", "off"] },
  { name: "5 mornings / 2 off (5-2)", pattern: ["morning", "morning", "morning", "morning", "morning", "off", "off"] },
  { name: "3-day rotation (M/E/N/off)", pattern: ["morning", "evening", "night", "off"] },
  { name: "12 hr — 3 on / 3 off", pattern: ["morning", "morning", "morning", "off", "off", "off"] },
];

export default function PatternGenerator() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [pattern, setPattern] = useState<Tok[]>([]);
  const [cycles, setCycles] = useState("4");
  const [busy, setBusy] = useState(false);

  const addTok = (t: Tok) => setPattern((p) => [...p, t]);
  const removeLast = () => setPattern((p) => p.slice(0, -1));
  const clear = () => setPattern([]);
  const usePreset = (p: Tok[]) => setPattern([...p]);

  const totalDays = pattern.length * (parseInt(cycles) || 0);

  const submit = async () => {
    if (pattern.length === 0) return Alert.alert("Add at least one shift to the pattern");
    setBusy(true);
    try {
      const r = await api.calPattern({ start_date: startDate, pattern, cycles: parseInt(cycles) || 1 });
      Alert.alert("Pattern created", `${r.created} events added starting ${startDate}`);
      router.back();
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="pat-close" onPress={() => router.back()}><Text style={styles.close}>✕</Text></Pressable>
        <Text style={styles.title}>Shift pattern</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
        <Text style={styles.help}>Build one cycle of your shift pattern (e.g. 4 mornings, 4 off, 4 nights, 4 off) and choose how many times to repeat it.</Text>

        <Text style={styles.sec}>Start date</Text>
        <TextInput testID="pat-start" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />

        <Text style={styles.sec}>Presets</Text>
        <View style={{ gap: 8 }}>
          {PRESETS.map((p) => (
            <Pressable key={p.name} testID={`preset-${p.name}`} onPress={() => usePreset(p.pattern)} style={styles.preset}>
              <Text style={styles.presetText}>{p.name}</Text>
              <Text style={styles.presetLen}>{p.pattern.length} days</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sec}>Or tap to build one cycle</Text>
        <View style={styles.tokRow}>
          {TOKENS.map((t) => (
            <Pressable key={t.key} testID={`tok-${t.key}`} onPress={() => addTok(t.key)} style={[styles.tokBtn, { backgroundColor: t.color }]}>
              <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "800" }}>{t.icon} {t.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.previewBox}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={styles.sec}>Your cycle ({pattern.length} days)</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable testID="pat-undo" onPress={removeLast} style={styles.smallBtn}><Text style={styles.smallBtnText}>Undo</Text></Pressable>
              <Pressable testID="pat-clear" onPress={clear} style={styles.smallBtn}><Text style={styles.smallBtnText}>Clear</Text></Pressable>
            </View>
          </View>
          <View style={styles.dotWrap}>
            {pattern.length === 0 && <Text style={styles.emptyPat}>No shifts yet — tap presets or the buttons above.</Text>}
            {pattern.map((t, i) => {
              const tc = TOKENS.find((x) => x.key === t)!;
              return (
                <View key={i} style={[styles.dayDot, { backgroundColor: tc.color }]}>
                  <Text style={styles.dayDotText}>{tc.icon}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.sec}>Repeat cycles</Text>
        <TextInput testID="pat-cycles" value={cycles} onChangeText={setCycles} keyboardType="number-pad" placeholder="4" placeholderTextColor={colors.muted} style={styles.input} />
        <Text style={styles.helpSmall}>Will create {totalDays} events until {dayjs(startDate).add(Math.max(0, totalDays - 1), "day").format("MMM D, YYYY")}.</Text>

        <Pressable testID="pat-submit" disabled={busy || pattern.length === 0} onPress={submit} style={[styles.primary, (busy || pattern.length === 0) && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Generate {totalDays} shifts</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  close: { color: colors.onSurface, fontSize: 22, fontWeight: "700", width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  help: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  helpSmall: { color: colors.muted, fontSize: 11 },
  sec: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.onSurface },
  preset: { padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  presetText: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  presetLen: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  tokRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tokBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, alignItems: "center" },
  previewBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border, gap: 6 },
  dotWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dayDot: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  dayDotText: { fontSize: 15 },
  emptyPat: { color: colors.muted, fontSize: 12, fontStyle: "italic" },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surfaceTertiary },
  smallBtnText: { color: colors.onSurface, fontSize: 11, fontWeight: "800" },
  primary: { marginTop: 12, backgroundColor: colors.brandPrimary, padding: 16, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
