import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, minTouchTarget, spacing, radius } from "@/src/theme";

export default function Reader() {
  const { bookId, chapter } = useLocalSearchParams<{ bookId: string; chapter?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [chapterN, setChapterN] = useState(Number(chapter || 1));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(17);
  const [showToc, setShowToc] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const load = async (n: number) => {
    setLoading(true);
    try {
      const r = await api.libChapter(bookId!, n);
      setData(r);
      setChapterN(n);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(Number(chapter || 1)); }, [bookId]);

  const toggleBookmark = async () => {
    await api.libToggleBookmark(bookId!, chapterN);
    await load(chapterN);
    qc.invalidateQueries({ queryKey: ["lib-featured"] });
    qc.invalidateQueries({ queryKey: ["lib-book", bookId] });
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    await api.libAddNote(bookId!, chapterN, noteText.trim());
    setNoteText("");
    await load(chapterN);
  };

  const askAI = () => {
    router.push(`/ai-nurse?prefill=Explain the topic "${encodeURIComponent(data?.chapter?.title || "")}" from ${encodeURIComponent(data?.book_title || "")} for a nursing student.` as any);
  };

  if (loading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;

  const content = data.chapter.content as string;
  const highlighted = search && content.toLowerCase().includes(search.toLowerCase());

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="reader-close" onPress={() => router.back()} style={styles.iconBtn}><Text style={styles.iconTxt}>✕</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.bookTitle} numberOfLines={1}>{data.book_title}</Text>
          <Text style={styles.chSubtitle}>Ch {chapterN} of {data.total_chapters} · {data.percentage}%</Text>
        </View>
        <Pressable testID="reader-search" onPress={() => setShowSearch(true)} style={styles.iconBtn}><Text style={styles.iconTxt}>🔍</Text></Pressable>
        <Pressable testID="reader-toc" onPress={() => setShowToc(true)} style={styles.iconBtn}><Text style={styles.iconTxt}>≡</Text></Pressable>
        <Pressable testID="reader-bookmark" onPress={toggleBookmark} style={styles.iconBtn}>
          <Text style={styles.iconTxt}>{data.is_bookmarked ? "🔖" : "🏷"}</Text>
        </Pressable>
      </View>

      <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${data.percentage}%` }]} /></View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 136 }}>
        <Text style={styles.chNumber}>CHAPTER {chapterN}</Text>
        <Text style={styles.chTitle}>{data.chapter.title}</Text>
        <Text style={[styles.chBody, { fontSize, lineHeight: fontSize * 1.6 }]}>
          {content.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <Text key={i} style={{ fontWeight: "800", color: colors.brandPrimary }}>{part.slice(2, -2)}</Text>;
            }
            return <Text key={i}>{part}</Text>;
          })}
        </Text>

        {highlighted && (
          <View style={styles.searchHit}><Text style={styles.searchHitText}>✓ "{search}" found in this chapter</Text></View>
        )}

        {data.notes.length > 0 && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Your Notes ({data.notes.length})</Text>
            {data.notes.map((n: any) => (
              <View key={n.id} style={styles.noteCard}>
                <Text style={styles.noteText}>{n.text}</Text>
                <Text style={styles.noteMeta}>{new Date(n.created_at).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.zoomRow}>
          <Pressable testID="font-decrease" onPress={() => setFontSize(Math.max(13, fontSize - 1))} style={styles.zoomBtn}><Text style={styles.zoomTxt}>A-</Text></Pressable>
          <Pressable testID="font-increase" onPress={() => setFontSize(Math.min(26, fontSize + 1))} style={styles.zoomBtn}><Text style={styles.zoomTxt}>A+</Text></Pressable>
          <Pressable testID="add-note-btn" onPress={() => setShowNotes(true)} style={styles.zoomBtn}><Text style={styles.zoomTxt}>📝</Text></Pressable>
          <Pressable testID="ask-ai-btn" onPress={askAI} style={[styles.zoomBtn, { backgroundColor: colors.brandSecondary }]}>
            <Text style={[styles.zoomTxt, { color: "#FFF" }]}>Ask AI</Text>
          </Pressable>
        </View>
        <View style={styles.navRow}>
          <Pressable
            testID="prev-chapter"
            disabled={chapterN <= 1}
            style={[styles.navBtn, chapterN <= 1 && { opacity: 0.4 }]}
            onPress={() => load(chapterN - 1)}
          >
            <Text style={styles.navText}>‹ Previous</Text>
          </Pressable>
          <Pressable
            testID="next-chapter"
            disabled={chapterN >= data.total_chapters}
            style={[styles.navBtn, styles.navPrimary, chapterN >= data.total_chapters && { opacity: 0.4 }]}
            onPress={() => load(chapterN + 1)}
          >
            <Text style={[styles.navText, { color: "#FFF" }]}>Next ›</Text>
          </Pressable>
        </View>
      </View>

      {/* TOC modal */}
      <Modal visible={showToc} animationType="slide" transparent onRequestClose={() => setShowToc(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Table of Contents</Text>
              <Pressable onPress={() => setShowToc(false)}><Text style={{ fontSize: 22 }}>✕</Text></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 500 }}>
              {Array.from({ length: data.total_chapters }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  testID={`toc-mod-${n}`}
                  onPress={() => { setShowToc(false); load(n); }}
                  style={[styles.tocItem, chapterN === n && { backgroundColor: colors.brandTertiary }]}
                >
                  <Text style={styles.tocNum}>Ch {n}</Text>
                  <Text style={styles.tocTitle}>{n === chapterN ? data.chapter.title : `Chapter ${n}`}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notes modal */}
      <Modal visible={showNotes} animationType="slide" transparent onRequestClose={() => setShowNotes(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Add a Note</Text>
              <Pressable onPress={() => setShowNotes(false)}><Text style={{ fontSize: 22 }}>✕</Text></Pressable>
            </View>
            <TextInput
              testID="note-input"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              placeholder="Write your note about this chapter..."
              placeholderTextColor={colors.muted}
              style={styles.noteInput}
            />
            <Pressable testID="note-save" style={styles.saveBtn} onPress={async () => { await addNote(); setShowNotes(false); }}>
              <Text style={styles.saveBtnText}>Save Note</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Search modal */}
      <Modal visible={showSearch} animationType="fade" transparent onRequestClose={() => setShowSearch(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Search in book</Text>
              <Pressable onPress={() => setShowSearch(false)}><Text style={{ fontSize: 22 }}>✕</Text></Pressable>
            </View>
            <TextInput
              testID="reader-search-input"
              value={search}
              onChangeText={setSearch}
              placeholder="Type a term..."
              placeholderTextColor={colors.muted}
              style={[styles.noteInput, { height: 50 }]}
              onSubmitEditing={() => setShowSearch(false)}
            />
            <Pressable style={styles.saveBtn} onPress={() => setShowSearch(false)}>
              <Text style={styles.saveBtnText}>Find</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: 8, gap: 4, backgroundColor: colors.surface },
  iconBtn: { width: minTouchTarget, height: minTouchTarget, alignItems: "center", justifyContent: "center", borderRadius: minTouchTarget / 2 },
  iconTxt: { fontSize: 20, color: colors.onSurface },
  bookTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  chSubtitle: { color: colors.muted, fontSize: 11, marginTop: 1 },
  progressBar: { height: 3, backgroundColor: colors.surfaceTertiary },
  progressFill: { height: "100%", backgroundColor: colors.brandSecondary },
  chNumber: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  chTitle: { color: colors.onSurface, fontSize: 24, fontWeight: "800", marginTop: 8, marginBottom: 24, lineHeight: 32 },
  chBody: { color: colors.onSurface },
  searchHit: { marginTop: 20, padding: 12, backgroundColor: "#FEF3C7", borderRadius: radius.md },
  searchHitText: { color: "#92400E", fontSize: 13, fontWeight: "700" },
  notesSection: { marginTop: 32, padding: 16, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  notesTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800", marginBottom: 10 },
  noteCard: { padding: 12, borderLeftWidth: 3, borderLeftColor: colors.brandSecondary, backgroundColor: colors.surface, marginBottom: 8, borderRadius: 6 },
  noteText: { color: colors.onSurface, fontSize: 13, lineHeight: 18 },
  noteMeta: { color: colors.muted, fontSize: 10, marginTop: 4 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider, gap: 10 },
  zoomRow: { flexDirection: "row", gap: 8 },
  zoomBtn: { flex: 1, minHeight: minTouchTarget, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md },
  zoomTxt: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  navRow: { flexDirection: "row", gap: 8 },
  navBtn: { flex: 1, minHeight: minTouchTarget, justifyContent: "center", padding: 12, alignItems: "center", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md },
  navPrimary: { backgroundColor: colors.brandPrimary },
  navText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  tocItem: { flexDirection: "row", padding: 14, gap: 12, borderRadius: radius.md, marginBottom: 4 },
  tocNum: { color: colors.brandPrimary, fontSize: 13, fontWeight: "800", width: 40 },
  tocTitle: { flex: 1, color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  noteInput: { minHeight: 120, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: 14, textAlignVertical: "top", color: colors.onSurface, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  saveBtn: { backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.lg, alignItems: "center" },
  saveBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
