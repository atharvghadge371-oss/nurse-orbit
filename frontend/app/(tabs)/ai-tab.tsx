import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import { api } from "@/src/api";
import { colors, minTouchTarget, spacing, radius } from "@/src/theme";
import { exportChatToPDF } from "@/src/utils/pdf-export";
import { RemoteImage } from "@/src/components/content-image";

const SUGGESTIONS = [
  { text: "Explain sepsis", icon: "🦠" },
  { text: "Create a care plan for pneumonia", icon: "📝" },
  { text: "Test me on ECG", icon: "🫀" },
  { text: "Give me 10 pharmacology MCQs", icon: "💊" },
  { text: "Teach me ABG interpretation", icon: "🫁" },
  { text: "Prepare me for NCLEX", icon: "🎓" },
];

const MODES = [
  { key: "SIMPLE", label: "Simple", icon: "🌱" },
  { key: "STUDENT", label: "Student", icon: "🎓" },
  { key: "CLINICAL", label: "Clinical", icon: "🩺" },
  { key: "EXAM", label: "Exam", icon: "📝" },
  { key: "QUICK", label: "Quick", icon: "⚡" },
];

type MedImg = { id: string; url: string; title: string; caption: string };
type Msg = { role: "user" | "assistant"; content: string; references?: any[]; images?: MedImg[] };

export default function AITab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compactHeader = width < 360;
  const params = useLocalSearchParams<{ prefill?: string }>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [unavailableImages, setUnavailableImages] = useState<Set<string>>(() => new Set());
  const [mode, setMode] = useState("STUDENT");
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

  const openImage = (img: MedImg) => {
    router.push({
      pathname: "/image-viewer",
      params: {
        url: encodeURIComponent(img.url),
        title: encodeURIComponent(img.title || ""),
        caption: encodeURIComponent(img.caption || ""),
      },
    } as any);
  };

  const markImageUnavailable = (key: string) => {
    setUnavailableImages((current) => {
      if (current.has(key)) return current;
      const updated = new Set(current);
      updated.add(key);
      return updated;
    });
  };

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
          const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], role: "assistant", content: c[c.length - 1].content + delta }; return c;
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
        mode,
        (imgs) => {
          setMessages((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], images: imgs }; return c; });
        },
      );
    } catch (e: any) {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: `Error: ${e.message}` }; return c; });
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <View style={styles.aiBadge}><Text style={{ fontSize: 20 }}>🤖</Text></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={1}>{compactHeader ? "Nurse AI" : "Ask Nurse AI"}</Text>
          {!compactHeader && <Text style={styles.subtitle} numberOfLines={1}>Your 24/7 AI nursing study companion</Text>}
        </View>
        <View style={styles.headerActions}>
          <Pressable testID="ai-persona" accessibilityRole="button" accessibilityLabel="Name your AI nurse" onPress={() => router.push("/tools/ai-persona" as any)} style={styles.newBtn}>
            <Text style={styles.newBtnText}>🤖 Name</Text>
          </Pressable>
          <Pressable testID="ai-new-chat" accessibilityRole="button" accessibilityLabel="Start a new chat" onPress={() => { setMessages([]); setUnavailableImages(new Set()); }} style={styles.iconNewBtn}>
            <Text style={styles.iconNewBtnText}>＋</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.modeRowWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable key={m.key} testID={`mode-${m.key}`} onPress={() => setMode(m.key)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && { color: "#FFF" }]}>{m.icon} {m.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && (
          <View style={{ gap: 12, marginTop: 8 }}>
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeIcon}>💡</Text>
              <Text style={styles.welcomeTitle}>Ask anything about nursing</Text>
              <Text style={styles.welcomeSub}>Diseases, medications, ECG, ABG, care plans, procedures, exam prep — I&apos;ll explain at your chosen level and show diagrams when relevant.</Text>
            </View>
            <Text style={styles.suggLbl}>Suggested prompts</Text>
            <View style={styles.suggGrid}>
              {SUGGESTIONS.map((s, i) => (
                <Pressable key={i} testID={`sugg-${i}`} style={styles.suggCard} onPress={() => send(s.text)}>
                  <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                  <Text style={styles.suggText} numberOfLines={2}>{s.text}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>AI Nurse is an educational assistant and does not replace professional clinical judgment, institutional protocols, or licensed healthcare advice.</Text>
            </View>
          </View>
        )}
        {messages.map((m, i) => (
          <View key={i} style={{ gap: 6 }}>
            <View style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
              <Text style={[styles.bubbleText, m.role === "user" && { color: "#FFF" }]}>{m.content || (busy && i === messages.length - 1 ? "..." : "")}</Text>

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
                  <Pressable key={ri} testID={`ref-${ri}`} onPress={() => router.push(`/library/read/${r.book_id}?chapter=${r.chapter}` as any)} style={styles.refItem}>
                    <Text style={styles.refBook}>{r.book_title}</Text>
                    <Text style={styles.refCh}>Ch {r.chapter} · {r.chapter_title} — {r.author}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {m.role === "assistant" && !!m.content && !busy && (
              <View style={styles.msgActions}>
                <Pressable
                  testID={`ai-save-pdf-${i}`}
                  style={styles.actionBtn}
                  onPress={() => {
                    const prevUser = i > 0 && messages[i - 1]?.role === "user" ? messages[i - 1].content : undefined;
                    exportChatToPDF({
                      question: prevUser,
                      answer: m.content,
                      images: m.images,
                      references: m.references,
                    });
                  }}
                >
                  <Text style={styles.actionTxt}>📄 Save as PDF</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <View style={styles.inputRow}>
          <TextInput
            testID="ai-input"
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about nursing…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            onSubmitEditing={() => send()}
          />
          <Pressable testID="ai-send" disabled={busy || !input.trim()} onPress={() => send()} style={[styles.sendBtn, (busy || !input.trim()) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "800" }}>➤</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.lg, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  aiBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, minWidth: 0 },
  headerActions: { flexDirection: "row", alignItems: "center", flexShrink: 0, gap: 6 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 11 },
  newBtn: { minHeight: minTouchTarget, justifyContent: "center", paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  newBtnText: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  iconNewBtn: { width: minTouchTarget, height: minTouchTarget, borderRadius: minTouchTarget / 2, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  iconNewBtnText: { color: colors.onSurface, fontSize: 20, fontWeight: "700", lineHeight: 22 },
  modeRowWrap: { height: 60, borderBottomWidth: 1, borderBottomColor: colors.divider, justifyContent: "center" },
  modeRow: { paddingHorizontal: spacing.lg, gap: 8, alignItems: "center", paddingRight: spacing.lg + 4 },
  chip: { paddingHorizontal: 14, minHeight: 40, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  welcomeCard: { padding: 20, borderRadius: radius.lg, backgroundColor: colors.brandTertiary, alignItems: "center", gap: 8 },
  welcomeIcon: { fontSize: 40 },
  welcomeTitle: { color: colors.brandPrimary, fontSize: 18, fontWeight: "800" },
  welcomeSub: { color: colors.brandPrimary, fontSize: 13, textAlign: "center", lineHeight: 19 },
  suggLbl: { color: colors.muted, fontSize: 13, fontWeight: "800", marginTop: 12, textTransform: "uppercase", letterSpacing: 1 },
  suggGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggCard: { width: "48%", padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8, minHeight: 90 },
  suggText: { color: colors.onSurface, fontSize: 13, fontWeight: "600", lineHeight: 17 },
  disclaimer: { padding: 12, borderRadius: radius.md, backgroundColor: "#FEF3C7", marginTop: 8 },
  disclaimerText: { color: "#92400E", fontSize: 11, lineHeight: 16 },
  bubble: { padding: 14, borderRadius: radius.md, maxWidth: "88%" },
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
  inputBar: { padding: spacing.md, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  input: { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: colors.onSurface, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  msgActions: { flexDirection: "row", gap: 8, marginTop: 4, alignSelf: "flex-start" },
  actionBtn: { minHeight: minTouchTarget, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandPrimary },
  actionTxt: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800" },
});
