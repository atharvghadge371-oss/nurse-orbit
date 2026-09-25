import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, spacing, radius } from "@/src/theme";

type Chapter = { number: number; title: string; content: string };

export default function LibraryAdmin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState<"list" | "add">("list");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [edition, setEdition] = useState("");
  const [isbn, setIsbn] = useState("");
  const [year, setYear] = useState("");
  const [cover, setCover] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([{ number: 1, title: "", content: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: cats } = useQuery({ queryKey: ["lib-cats"], queryFn: api.libCategories });
  const { data: books, refetch } = useQuery({ queryKey: ["lib-books-admin"], queryFn: () => api.libBooks() });

  if (!user?.is_admin) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40 }}>🔒</Text>
        <Text style={styles.title}>Admin Access Required</Text>
        <Text style={styles.subtitle}>Only administrators can manage the library. Contact your organisation admin to be granted access.</Text>
        <Pressable style={styles.primary} onPress={() => router.back()}><Text style={styles.primaryText}>Go back</Text></Pressable>
      </View>
    );
  }

  const addChapter = () => setChapters((c) => [...c, { number: c.length + 1, title: "", content: "" }]);
  const updateChapter = (i: number, key: keyof Chapter, val: any) => {
    setChapters((c) => c.map((ch, idx) => idx === i ? { ...ch, [key]: val } : ch));
  };
  const removeChapter = (i: number) => setChapters((c) => c.filter((_, idx) => idx !== i).map((ch, idx) => ({ ...ch, number: idx + 1 })));

  const submit = async () => {
    setError(""); setSuccess("");
    if (!title || !author || !categoryId) { setError("Title, author and category are required."); return; }
    setBusy(true);
    try {
      await api.libAdminAddBook({
        title, author, category_id: categoryId,
        edition, isbn, publication_year: year ? Number(year) : null,
        cover_image: cover, description,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        chapters: chapters.filter((c) => c.title && c.content),
      });
      setSuccess(`"${title}" added to the library.`);
      setTitle(""); setAuthor(""); setCategoryId(""); setEdition(""); setIsbn(""); setYear("");
      setCover(""); setDescription(""); setTags(""); setChapters([{ number: 1, title: "", content: "" }]);
      qc.invalidateQueries({ queryKey: ["lib-books-admin"] });
      qc.invalidateQueries({ queryKey: ["lib-cats"] });
      qc.invalidateQueries({ queryKey: ["lib-featured"] });
      refetch();
      setStep("list");
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const removeBook = async (id: string) => {
    try { await api.libAdminDeleteBook(id); refetch(); qc.invalidateQueries({ queryKey: ["lib-cats"] }); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="admin-close" onPress={() => router.back()}><Text style={styles.close}>✕</Text></Pressable>
        <Text style={styles.title}>Library Admin</Text>
        <Pressable testID="admin-toggle" onPress={() => setStep(step === "list" ? "add" : "list")}>
          <Text style={styles.toggle}>{step === "list" ? "+ Add" : "List"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {!!success && <View style={styles.successBox}><Text style={styles.successText}>✓ {success}</Text></View>}
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        {step === "list" ? (
          <>
            <Text style={styles.sec}>All Books ({books?.books?.length ?? 0})</Text>
            {(books?.books || []).map((b: any) => (
              <View key={b.id} style={styles.bookRow} testID={`admin-book-${b.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookName}>{b.title}</Text>
                  <Text style={styles.bookMeta}>{b.author} · {b.chapter_count} chapters</Text>
                </View>
                <Pressable testID={`admin-delete-${b.id}`} onPress={() => removeBook(b.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sec}>Add a New Book</Text>
            <Label>Title *</Label>
            <TextInput testID="admin-title" value={title} onChangeText={setTitle} placeholder="e.g. Advanced Wound Care" placeholderTextColor={colors.muted} style={styles.input} />
            <Label>Author *</Label>
            <TextInput testID="admin-author" value={author} onChangeText={setAuthor} placeholder="e.g. Dr. J. Smith, RN" placeholderTextColor={colors.muted} style={styles.input} />

            <Label>Category *</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {(cats?.categories || []).map((c: any) => (
                <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.chip, categoryId === c.id && { backgroundColor: c.color }]}>
                  <Text style={[styles.chipText, categoryId === c.id && { color: "#FFF" }]}>{c.icon} {c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Label>Edition</Label>
                <TextInput testID="admin-edition" value={edition} onChangeText={setEdition} placeholder="1st" placeholderTextColor={colors.muted} style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Year</Label>
                <TextInput testID="admin-year" value={year} onChangeText={setYear} placeholder="2025" keyboardType="number-pad" placeholderTextColor={colors.muted} style={styles.input} />
              </View>
            </View>

            <Label>ISBN</Label>
            <TextInput testID="admin-isbn" value={isbn} onChangeText={setIsbn} placeholder="978-..." placeholderTextColor={colors.muted} style={styles.input} />

            <Label>Cover image URL</Label>
            <TextInput testID="admin-cover" value={cover} onChangeText={setCover} placeholder="https://..." placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />

            <Label>Description</Label>
            <TextInput testID="admin-desc" value={description} onChangeText={setDescription} multiline placeholder="Short description..." placeholderTextColor={colors.muted} style={[styles.input, { height: 70 }]} />

            <Label>Tags (comma separated)</Label>
            <TextInput testID="admin-tags" value={tags} onChangeText={setTags} placeholder="wound care, dressings" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />

            <Text style={styles.sec}>Chapters</Text>
            {chapters.map((ch, i) => (
              <View key={i} style={styles.chapterBox}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.chapterHead}>Chapter {ch.number}</Text>
                  {chapters.length > 1 && (
                    <Pressable onPress={() => removeChapter(i)}><Text style={{ color: colors.error, fontSize: 12, fontWeight: "700" }}>Remove</Text></Pressable>
                  )}
                </View>
                <TextInput testID={`ch-title-${i}`} value={ch.title} onChangeText={(t) => updateChapter(i, "title", t)} placeholder="Chapter title" placeholderTextColor={colors.muted} style={styles.input} />
                <TextInput testID={`ch-content-${i}`} value={ch.content} onChangeText={(t) => updateChapter(i, "content", t)} multiline placeholder="Chapter content (plain text; **bold** supported)" placeholderTextColor={colors.muted} style={[styles.input, { height: 140, marginTop: 8 }]} />
              </View>
            ))}
            <Pressable testID="add-ch-btn" style={styles.addChBtn} onPress={addChapter}>
              <Text style={styles.addChText}>+ Add another chapter</Text>
            </Pressable>

            <Pressable testID="admin-submit" style={[styles.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Publish Book</Text>}
            </Pressable>

            <Text style={styles.legal}>
              Please only upload content you have the rights to distribute (original work, public domain, or openly licensed).
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ children }: any) { return <Text style={styles.label}>{children}</Text>; }

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  close: { fontSize: 22, color: colors.onSurface, width: 30 },
  toggle: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800" },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  successBox: { padding: 12, borderRadius: radius.md, backgroundColor: "#DCFCE7", marginBottom: 12 },
  successText: { color: "#15803D", fontSize: 13, fontWeight: "700" },
  errorBox: { padding: 12, borderRadius: radius.md, backgroundColor: "#FEE2E2", marginBottom: 12 },
  errorText: { color: "#B91C1C", fontSize: 13, fontWeight: "700" },
  sec: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: 16, marginBottom: 10 },
  bookRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  bookName: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  bookMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: "#FEE2E2" },
  deleteBtnText: { color: colors.error, fontSize: 12, fontWeight: "800" },
  label: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700", marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  chipRow: { gap: 8, paddingVertical: 4, height: 44, alignItems: "center" },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipText: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  chapterBox: { padding: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  chapterHead: { color: colors.brandPrimary, fontSize: 13, fontWeight: "800" },
  addChBtn: { padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brandPrimary, alignItems: "center", marginTop: 4 },
  addChText: { color: colors.brandPrimary, fontSize: 13, fontWeight: "800" },
  primary: { marginTop: 20, backgroundColor: colors.brandPrimary, padding: 16, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  legal: { color: colors.muted, fontSize: 11, fontStyle: "italic", marginTop: 12, textAlign: "center", lineHeight: 16 },
});
