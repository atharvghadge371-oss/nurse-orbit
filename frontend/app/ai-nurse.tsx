import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";
import { RemoteImage } from "@/src/components/content-image";

const SUGGESTIONS = [
  "Explain heart failure for a first-year nursing student.",
  "Give me 10 pharmacology questions.",
  "Explain the mechanism of action of beta-blockers.",
  "Create a study plan for the NCLEX-RN.",
];

type MedImg = { id: string; url: string; title: string; caption: string };
type Msg = { role: "user" | "assistant"; content: string; references?: any[]; images?: MedImg[] };

export default function AINurse() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ prefill?: string }>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [unavailableImages, setUnavailableImages] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<ScrollView>(null);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const prefillFired = useRef(false);

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages]);

  useEffect(() => {
    if (params.prefill && !prefillFired.current) {
      prefillFired.current = true;
      const decoded = decodeURIComponent(params.prefill);
      setTimeout(() => send(decoded), 400);
    }
  }, [params.prefill]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      await api.chatStream(
        sessionId, msg,
        (delta) => setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { ...copy[copy.length - 1], role: "assistant", content: copy[copy.length - 1].content + delta };
          return copy;
        }),
        (refs, imgs) => {
          setMessages((m) => {
            const c = [...m];
            const last = { ...c[c.length - 1] };
            if (refs && refs.length) last.references = refs;
            if (imgs && imgs.length) last.images = imgs;
            c[c.length - 1] = last;
            return c;
          });
          setBusy(false);
        },
        (err) => { setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: `Error: ${err}` }; return c; }); setBusy(false); },
        "STUDENT",
        (imgs) => {
          setMessages((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], images: imgs }; return c; });
        },
      );
    } catch (e: any) {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: `Error: ${e.message}` }; return c; });
      setBusy(false);
    }
  };

  const openRef = (r: any) => router.push(`/library/read/${r.book_id}?chapter=${r.chapter}` as any);
  const openImage = (img: MedImg) => router.push({
    pathname: "/image-viewer",
    params: {
      url: encodeURIComponent(img.url),
      title: encodeURIComponent(img.title || ""),
      caption: encodeURIComponent(img.caption || ""),
    },
  } as any);

  const markImageUnavailable = (key: string) => {
    setUnavailableImages((current) => {
      if (current.has(key)) return current;
      const updated = new Set(current);
      updated.add(key);
      return updated;
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="ai-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>💬 AI Nurse</Text>
          <Text style={styles.subtitle}>Your nursing tutor</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && (
          <View style={{ gap: 12, marginTop: 20 }}>
            <Text style={styles.hello}>Hi! I&apos;m AI Nurse, your educational assistant. Ask me anything about nursing.</Text>
            <Text style={styles.suggestLabel}>Try:</Text>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} testID={`sugg-${s.slice(0, 10)}`} style={styles.suggest} onPress={() => send(s)}>
                <Text style={styles.suggestText}>{s}</Text>
              </Pressable>
            ))}
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>AI Nurse is an educational assistant and does not replace professional clinical judgment, institutional protocols, or licensed healthcare advice.</Text>
            </View>
          </View>
        )}
        {messages.map((m, i) => (
          <View key={i} style={{ gap: 6 }}>
            <View style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
              <Text style={[styles.bubbleText, m.role === "user" && { color: "#FFF" }]}>
                {m.content || (busy && i === messages.length - 1 ? "..." : "")}
              </Text>
              {m.role === "assistant" && m.images && m.images.length > 0 && (
                <View style={styles.imagesWrap}>
                  {m.images.map((img, idx) => {
                    const imageKey = img.id || img.url || `image-${idx}`;
                    const unavailable = !img.url || unavailableImages.has(imageKey);
                    return (
                      <Pressable
                        key={imageKey}
                        testID={`ai-image-${idx}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${img.title || "Medical illustration"}${unavailable ? ", bundled fallback shown" : ", tap to zoom"}`}
                        disabled={unavailable}
                        onPress={() => openImage(img)}
                        style={[styles.imgCard, unavailable && styles.imgCardUnavailable]}
                      >
                        <RemoteImage
                          uri={img.url}
                          fallback="clinicalSkills"
                          style={styles.img}
                          contentFit="contain"
                          transition={250}
                          accessibilityLabel={img.title || "Medical illustration"}
                          onFallback={() => markImageUnavailable(imageKey)}
                        />
                        <View style={styles.imgMeta}>
                          <Text style={styles.imgTitle} numberOfLines={1}>🖼️ {img.title}</Text>
                          <Text style={styles.imgCaption} numberOfLines={2}>{img.caption}</Text>
                          <Text style={styles.imgHint}>{unavailable ? "Bundled study visual shown" : "Tap to zoom"}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
            {m.role === "assistant" && m.references && m.references.length > 0 && (
              <View style={styles.refsBox}>
                <Text style={styles.refsTitle}>📖 References from your Library</Text>
                {m.references.map((r: any, ri: number) => (
                  <Pressable key={ri} onPress={() => openRef(r)} style={styles.refItem} testID={`ref-${ri}`}>
                    <Text style={styles.refBook}>{r.book_title}</Text>
                    <Text style={styles.refCh}>Ch {r.chapter} · {r.chapter_title} — {r.author}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
        <TextInput
          testID="ai-input"
          value={input}
          onChangeText={setInput}
          placeholder="Ask AI Nurse..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          onSubmitEditing={() => send()}
        />
        <Pressable testID="ai-send" disabled={busy || !input.trim()} onPress={() => send()} style={[styles.sendBtn, (busy || !input.trim()) && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontSize: 20 }}>➤</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, padding: 8 },
  title: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  subtitle: { fontSize: 12, color: colors.muted },
  hello: { color: colors.onSurface, fontSize: 15, lineHeight: 22 },
  suggestLabel: { color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 8 },
  suggest: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  suggestText: { color: colors.onSurface, fontSize: 14, fontWeight: "500" },
  disclaimer: { padding: 14, borderRadius: radius.md, backgroundColor: "#FEF3C7", marginTop: 8 },
  disclaimerText: { color: "#B45309", fontSize: 12, lineHeight: 18 },
  bubble: { padding: 14, borderRadius: radius.md, maxWidth: "85%" },
  bubbleUser: { backgroundColor: colors.brandPrimary, alignSelf: "flex-end" },
  bubbleBot: { backgroundColor: colors.surfaceTertiary, alignSelf: "flex-start" },
  bubbleText: { color: colors.onSurface, fontSize: 15, lineHeight: 22 },
  imagesWrap: { marginTop: 10, gap: 10 },
  imgCard: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  imgCardUnavailable: { opacity: 0.92 },
  img: { width: "100%", height: 180, backgroundColor: colors.surfaceTertiary },
  imgMeta: { padding: 10, gap: 3 },
  imgTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  imgCaption: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  imgHint: { color: colors.brandPrimary, fontSize: 10, fontWeight: "700", marginTop: 2 },
  refsBox: { padding: 12, backgroundColor: colors.brandTertiary, borderRadius: radius.md, gap: 6, borderLeftWidth: 3, borderLeftColor: colors.brandPrimary },
  refsTitle: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
  refItem: { padding: 8, backgroundColor: colors.surface, borderRadius: 6 },
  refBook: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  refCh: { color: colors.muted, fontSize: 11, marginTop: 2 },
  inputBar: { flexDirection: "row", gap: 10, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, alignItems: "center", backgroundColor: colors.surface },
  input: { flex: 1, backgroundColor: colors.surfaceTertiary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: colors.onSurface },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
});
