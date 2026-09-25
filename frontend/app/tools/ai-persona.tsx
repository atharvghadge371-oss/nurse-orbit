import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, radius, spacing } from "@/src/theme";

const TONES = [
  { key: "warm",    label: "Warm",    emoji: "🤗", desc: "Kind and encouraging, like a supportive senior nurse" },
  { key: "funny",   label: "Funny",   emoji: "😄", desc: "Playful and light, with friendly humour" },
  { key: "strict",  label: "Strict",  emoji: "🎯", desc: "Concise and precise — like an exam-focused instructor" },
  { key: "neutral", label: "Neutral", emoji: "🧑‍⚕️", desc: "Neutral and professional" },
];

const NAME_SUGGESTIONS = ["Nurse Meera", "Buddy", "Tutor Sam", "Sister Jane", "Nurse Priya", "Coach", "Doc"];

export default function AIPersona() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refresh } = useAuth() as any;
  const [name, setName] = useState<string>("");
  const [tone, setTone] = useState<string>("warm");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.ai_name || "");
      setTone(user.ai_tone || "warm");
      setLoaded(true);
    }
  }, [user]);

  const save = async () => {
    const n = name.trim();
    if (!n) return Alert.alert("Please give the AI a name (or pick a suggestion)");
    setSaving(true);
    try {
      await api.updateProfile({ ai_name: n, ai_tone: tone });
      if (refresh) await refresh();
      Alert.alert("Saved", `Nurse Orbit's AI will now call itself "${n}" with a ${tone} tone.`);
      router.back();
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="persona-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View>
          <Text style={styles.title}>AI Nurse persona</Text>
          <Text style={styles.subtitle}>Give your AI a nickname & personality</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {!loaded ? <ActivityIndicator color={colors.brandPrimary} /> : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroE}>🤖</Text>
              <Text style={styles.heroT}>Call your AI tutor by any name</Text>
              <Text style={styles.heroS}>Give it a nickname you love — the AI will introduce itself with that name in every chat.</Text>
            </View>

            <Text style={styles.lbl}>Nickname</Text>
            <TextInput
              testID="persona-name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Nurse Meera, Buddy, Tutor Sam"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.lblSmall}>Suggestions</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {NAME_SUGGESTIONS.map((s) => (
                <Pressable key={s} testID={`persona-sugg-${s}`} onPress={() => setName(s)} style={styles.sugg}>
                  <Text style={styles.suggText}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.lbl}>Tone</Text>
            <View style={{ gap: 8 }}>
              {TONES.map((t) => {
                const on = tone === t.key;
                return (
                  <Pressable key={t.key} testID={`persona-tone-${t.key}`} onPress={() => setTone(t.key)} style={[styles.toneCard, on && styles.toneCardActive]}>
                    <View style={styles.toneRow}>
                      <Text style={{ fontSize: 28 }}>{t.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.toneLbl, on && { color: colors.brandPrimary }]}>{t.label}</Text>
                        <Text style={styles.toneDesc}>{t.desc}</Text>
                      </View>
                      <Text style={{ color: on ? colors.brandPrimary : colors.muted, fontSize: 20 }}>{on ? "●" : "○"}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable testID="persona-save" disabled={saving} onPress={save} style={[styles.primary, saving && { opacity: 0.5 }]}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Save persona</Text>}
            </Pressable>

            <View style={styles.preview}>
              <Text style={styles.previewLbl}>Preview</Text>
              <Text style={styles.previewTxt}>
                &quot;Hi{user?.name ? ` ${(user.name || "").split(" ")[0]}` : ""}, I&apos;m <Text style={{ fontWeight: "800", color: colors.brandPrimary }}>{name || "Nurse AI"}</Text> —
                ready to help you with anything nursing today!&quot;
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center" },
  hero: { backgroundColor: colors.brandTertiary, padding: 14, borderRadius: radius.lg, gap: 6, alignItems: "center" },
  heroE: { fontSize: 40 },
  heroT: { color: colors.brandPrimary, fontSize: 15, fontWeight: "800", textAlign: "center" },
  heroS: { color: colors.brandPrimary, fontSize: 12, lineHeight: 17, textAlign: "center" },
  lbl: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  lblSmall: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 6 },
  input: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, fontSize: 16, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, fontWeight: "700" },
  sugg: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  suggText: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  toneCard: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  toneCardActive: { borderColor: colors.brandPrimary, borderWidth: 2, backgroundColor: colors.brandTertiary },
  toneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  toneLbl: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  toneDesc: { color: colors.muted, fontSize: 11, marginTop: 2 },
  primary: { backgroundColor: colors.brandPrimary, padding: 16, borderRadius: radius.lg, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  preview: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 6 },
  previewLbl: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  previewTxt: { color: colors.onSurface, fontSize: 13, lineHeight: 20, fontStyle: "italic" },
});
