import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";
import { libraryVisualFor, RemoteImage } from "@/src/components/content-image";

export default function BookDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["lib-book", id], queryFn: () => api.libBook(id!) });

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;
  const b = data.book;
  const currentChapter = data.progress?.current_chapter || 1;

  const toggleBm = async () => {
    await api.libToggleBookmark(id!, currentChapter);
    qc.invalidateQueries({ queryKey: ["lib-book", id] });
    qc.invalidateQueries({ queryKey: ["lib-featured"] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="book-back" accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Pressable testID="book-bookmark" accessibilityRole="button" accessibilityLabel="Bookmark this book" hitSlop={12} onPress={toggleBm}>
          <Text style={{ fontSize: 22 }}>{data.is_bookmarked ? "🔖" : "🏷"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + (b.has_file ? 168 : 104) }}>
        <View style={styles.heroWrap}>
          <RemoteImage
            uri={b.cover_image}
            fallback={libraryVisualFor(b.title, b.category, b.category_name)}
            style={styles.hero}
            contentFit="cover"
            accessibilityLabel={`${b.title} book cover`}
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>{b.title}</Text>
          <Text style={styles.author}>{b.author}</Text>
          <Text style={styles.edition}>{b.edition} · {b.publication_year} · ISBN {b.isbn}</Text>

          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statNum}>{b.chapter_count}</Text><Text style={styles.statLbl}>Chapters</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>{b.page_count}</Text><Text style={styles.statLbl}>Pages</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>{data.progress?.percentage ?? 0}%</Text><Text style={styles.statLbl}>Read</Text></View>
          </View>

          <Text style={styles.section}>About this book</Text>
          <Text style={styles.desc}>{b.description}</Text>

          <Text style={styles.section}>Table of Contents</Text>
          {(b.chapters || []).map((c: any) => (
            <Pressable
              key={c.number}
              testID={`toc-${c.number}`}
              style={[styles.chapter, c.number === currentChapter && styles.chapterActive]}
              onPress={() => router.push(`/library/read/${b.id}?chapter=${c.number}` as any)}
            >
              <Text style={styles.chapterNum}>Ch {c.number}</Text>
              <Text style={styles.chapterTitle} numberOfLines={2}>{c.title}</Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}

          <View style={styles.license}>
            <Text style={styles.licenseText}>License: {b.license}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {b.has_file && (
          <Pressable
            testID="read-pdf-btn"
            style={[styles.readBtn, { backgroundColor: colors.brandSecondary, marginBottom: 8 }]}
            onPress={() => router.push(`/library/pdf/${b.id}?title=${encodeURIComponent(b.title)}` as any)}
          >
            <Text style={styles.readBtnText}>📖 Read Original PDF (full quality)</Text>
          </Pressable>
        )}
        <Pressable
          testID="read-now-btn"
          style={[styles.readBtn, b.has_file && { backgroundColor: colors.surfaceTertiary }]}
          onPress={() => router.push(`/library/read/${b.id}?chapter=${currentChapter}` as any)}
        >
          <Text style={[styles.readBtnText, b.has_file && { color: colors.onSurface }]}>
            {b.has_file ? "Read chapter summaries" : (data.progress?.percentage ? "Continue Reading" : "Read Now")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 36, lineHeight: 40 },
  heroWrap: { padding: spacing.lg, alignItems: "center", backgroundColor: colors.surface },
  hero: { width: 160, height: 220, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  card: { padding: spacing.lg, marginTop: 8, backgroundColor: colors.surface },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "800", textAlign: "center" },
  author: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 6 },
  edition: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 4 },
  stats: { flexDirection: "row", marginTop: 20, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.divider },
  stat: { flex: 1, alignItems: "center" },
  statNum: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  statLbl: { color: colors.muted, fontSize: 11, marginTop: 2 },
  section: { color: colors.onSurface, fontSize: 15, fontWeight: "800", marginTop: 20, marginBottom: 10 },
  desc: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 22 },
  chapter: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, marginBottom: 6 },
  chapterActive: { backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandPrimary },
  chapterNum: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", width: 40 },
  chapterTitle: { flex: 1, color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  arrow: { fontSize: 22, color: colors.muted },
  license: { marginTop: 20, padding: 12, backgroundColor: colors.surfaceTertiary, borderRadius: radius.sm },
  licenseText: { color: colors.muted, fontSize: 11, fontStyle: "italic" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  readBtn: { minHeight: 52, justifyContent: "center", backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.lg, alignItems: "center" },
  readBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
