import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from "expo-audio";
import { api, API_URL, getToken } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

const MODES = [
  { key: "patient", label: "Patient", hint: "Warm, plain-language" },
  { key: "medical", label: "Medical", hint: "Full clinical register" },
  { key: "casual", label: "Casual", hint: "Everyday tone" },
];

const QUICK_PHRASES = [
  "Hello, how are you feeling today?",
  "Please tell me where the pain is.",
  "On a scale of 1 to 10, how bad is the pain?",
  "Are you allergic to any medications?",
  "You need to take this tablet after food.",
  "I will insert a small needle in your hand for fluids.",
  "Please do not eat or drink anything before the surgery.",
  "The doctor will visit you shortly.",
  "Take a deep breath and hold it.",
  "Please press this button if you need help.",
];

let sharedPlayer: AudioPlayer | null = null;

export default function Translator() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [languages, setLanguages] = useState<string[]>(["English", "Hindi", "Malayalam", "Arabic", "German", "French", "Spanish"]);
  const [source, setSource] = useState<string | null>(null); // null = auto
  const [target, setTarget] = useState<string>("Hindi");
  const [mode, setMode] = useState("patient");
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [pickerFor, setPickerFor] = useState<"source" | "target" | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/translate/languages`).then((x) => x.json());
        if (r?.languages?.length) setLanguages(r.languages);
      } catch {}
    })();
    (async () => {
      try { await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }); } catch {}
    })();
    return () => {
      try { sharedPlayer?.remove(); sharedPlayer = null; } catch {}
    };
  }, []);

  const filteredLangs = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return languages;
    return languages.filter((l) => l.toLowerCase().includes(s));
  }, [languages, q]);

  const swap = () => {
    if (!source) return;
    const s = source; setSource(target); setTarget(s);
    if (translated) { setText(translated); setTranslated(""); }
  };

  const doTranslate = async (override?: string) => {
    const t = (override ?? text).trim();
    if (!t) return;
    setBusy(true); setTranslated("");
    try {
      const r = await api.translate(t, target, source || undefined, mode);
      setTranslated(r.output || "");
    } catch (e: any) {
      Alert.alert("Translation failed", e.message);
    } finally { setBusy(false); }
  };

  const speak = async () => {
    if (!translated) return;
    setSpeaking(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/translate/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: translated, voice: "nova", model: "tts-1" }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      let uri: string;
      if (Platform.OS === "web") {
        uri = URL.createObjectURL(blob);
      } else {
        // For native: convert to base64 then to file
        const buf = await blob.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        const path = `${FileSystem.cacheDirectory}tts-${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
        uri = path;
      }
      try { sharedPlayer?.remove(); } catch {}
      sharedPlayer = createAudioPlayer({ uri });
      sharedPlayer.play();
    } catch (e: any) {
      Alert.alert("Playback failed", e.message);
    } finally { setSpeaking(false); }
  };

  const copyOut = async () => {
    if (!translated) return;
    await Clipboard.setStringAsync(translated);
    Alert.alert("Copied", "Translation copied to clipboard");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="tx-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Translator</Text>
          <Text style={styles.subtitle}>Talk to patients in any language</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {/* Language pickers */}
        <View style={styles.langRow}>
          <Pressable testID="tx-src" style={styles.langPill} onPress={() => { setPickerFor("source"); setQ(""); }}>
            <Text style={styles.langLbl}>From</Text>
            <Text style={styles.langVal} numberOfLines={1}>{source || "Auto-detect"}</Text>
          </Pressable>
          <Pressable testID="tx-swap" style={styles.swapBtn} onPress={swap} disabled={!source}>
            <Text style={{ fontSize: 20, color: source ? colors.brandPrimary : colors.muted }}>⇄</Text>
          </Pressable>
          <Pressable testID="tx-tgt" style={styles.langPill} onPress={() => { setPickerFor("target"); setQ(""); }}>
            <Text style={styles.langLbl}>To</Text>
            <Text style={styles.langVal} numberOfLines={1}>{target}</Text>
          </Pressable>
        </View>

        {/* Mode chips */}
        <View style={styles.modeRow}>
          {MODES.map((m) => {
            const on = mode === m.key;
            return (
              <Pressable key={m.key} testID={`tx-mode-${m.key}`} onPress={() => setMode(m.key)} style={[styles.modeChip, on && styles.modeChipActive]}>
                <Text style={[styles.modeLbl, on && { color: "#FFF" }]}>{m.label}</Text>
                <Text style={[styles.modeHint, on && { color: "#FFFA" }]}>{m.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Input */}
        <View style={styles.card}>
          <Text style={styles.cardLbl}>Original</Text>
          <TextInput
            testID="tx-input"
            value={text}
            onChangeText={setText}
            placeholder="Type or paste text to translate…"
            placeholderTextColor={colors.muted}
            multiline
            style={styles.input}
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.count}>{text.length} chars</Text>
            <Pressable testID="tx-clear" onPress={() => { setText(""); setTranslated(""); }}>
              <Text style={styles.smallLink}>Clear</Text>
            </Pressable>
          </View>
        </View>

        <Pressable testID="tx-go" disabled={busy || !text.trim()} onPress={() => doTranslate()} style={[styles.primary, (busy || !text.trim()) && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Translate</Text>}
        </Pressable>

        {/* Output */}
        {!!translated && (
          <View style={styles.outCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.cardLbl}>{target}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable testID="tx-copy" onPress={copyOut} style={styles.iconBtn}><Text style={styles.iconBtnTxt}>Copy</Text></Pressable>
                <Pressable testID="tx-speak" disabled={speaking} onPress={speak} style={[styles.iconBtn, styles.iconBtnPrimary]}>
                  {speaking ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={[styles.iconBtnTxt, { color: "#FFF" }]}>🔊 Speak</Text>}
                </Pressable>
              </View>
            </View>
            <Text testID="tx-output" style={styles.outText} selectable>{translated}</Text>
          </View>
        )}

        {/* Quick phrases */}
        <Text style={styles.sec}>Quick phrases</Text>
        <View style={{ gap: 8 }}>
          {QUICK_PHRASES.map((p) => (
            <Pressable
              key={p}
              testID={`tx-quick-${p.slice(0, 14)}`}
              onPress={() => { setText(p); doTranslate(p); }}
              style={styles.quick}
            >
              <Text style={styles.quickText}>{p}</Text>
              <Text style={{ color: colors.brandPrimary, fontSize: 16 }}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Language picker modal */}
      <Modal transparent visible={!!pickerFor} animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerFor(null)}>
          <Pressable style={[styles.modalCard, { marginTop: insets.top + 40, marginBottom: insets.bottom + 20 }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerFor === "source" ? "From language" : "To language"}</Text>
              <Pressable onPress={() => setPickerFor(null)}><Text style={styles.close}>✕</Text></Pressable>
            </View>
            <TextInput
              testID="tx-lang-search"
              value={q}
              onChangeText={setQ}
              placeholder="Search language…"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />
            {pickerFor === "source" && (
              <Pressable testID="tx-lang-auto" onPress={() => { setSource(null); setPickerFor(null); }} style={styles.langItem}>
                <Text style={styles.langItemText}>Auto-detect</Text>
                {source === null && <Text style={styles.check}>✓</Text>}
              </Pressable>
            )}
            <FlatList
              data={filteredLangs}
              keyExtractor={(x) => x}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = pickerFor === "source" ? source === item : target === item;
                return (
                  <Pressable
                    testID={`tx-lang-${item}`}
                    onPress={() => {
                      if (pickerFor === "source") setSource(item);
                      else setTarget(item);
                      setPickerFor(null);
                    }}
                    style={styles.langItem}
                  >
                    <Text style={[styles.langItemText, active && { color: colors.brandPrimary, fontWeight: "800" }]}>{item}</Text>
                    {active && <Text style={styles.check}>✓</Text>}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // btoa exists in modern JS engines used by Hermes/Metro; fallback to global
  // @ts-ignore
  return (global as any).btoa ? (global as any).btoa(bin) : Buffer.from(bin, "binary").toString("base64");
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 12 },

  langRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  langPill: { flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  langLbl: { color: colors.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  langVal: { color: colors.onSurface, fontSize: 15, fontWeight: "800", marginTop: 2 },
  swapBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },

  modeRow: { flexDirection: "row", gap: 8 },
  modeChip: { flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  modeChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  modeLbl: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  modeHint: { color: colors.muted, fontSize: 10, marginTop: 2, textAlign: "center" },

  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
  cardLbl: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { minHeight: 100, maxHeight: 260, fontSize: 16, color: colors.onSurface, textAlignVertical: "top" },
  count: { color: colors.muted, fontSize: 11 },
  smallLink: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },

  primary: { backgroundColor: colors.brandPrimary, padding: 16, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },

  outCard: { backgroundColor: colors.brandTertiary, borderRadius: radius.md, borderLeftWidth: 4, borderLeftColor: colors.brandPrimary, padding: 12, gap: 8 },
  outText: { color: colors.onSurface, fontSize: 18, lineHeight: 26, marginTop: 4 },
  iconBtn: { paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  iconBtnPrimary: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  iconBtnTxt: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },

  sec: { color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  quick: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  quickText: { flex: 1, color: colors.onSurface, fontSize: 13, lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", padding: 16 },
  modalCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  modalTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  close: { color: colors.onSurface, fontSize: 18, fontWeight: "800", padding: 4 },
  searchInput: { margin: 12, padding: 12, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, fontSize: 14, color: colors.onSurface },
  langItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.divider },
  langItemText: { color: colors.onSurface, fontSize: 15 },
  check: { color: colors.brandPrimary, fontSize: 16, fontWeight: "800" },
});
