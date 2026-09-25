import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";
import { libraryVisualFor, RemoteImage } from "@/src/components/content-image";

export default function LibrarySearch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const hasQuery = q.trim().length >= 2;

  const updateQuery = (nextQuery: string) => {
    setQ(nextQuery);
    if (nextQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
    } else {
      setResults([]);
      setLoading(true);
    }
  };

  useEffect(() => {
    if (!hasQuery) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setResults([]);
      try {
        const r = await api.libSearch(q.trim());
        if (!cancelled) setResults(r.results || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [hasQuery, q]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="search-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <TextInput
          testID="lib-search-input"
          value={q}
          onChangeText={updateQuery}
          autoFocus
          placeholder="Search books, chapters, topics..."
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>

      {hasQuery && loading && <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 20 }} />}

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
        {!loading && hasQuery && results.length === 0 && (
          <Text style={styles.empty}>No results for &quot;{q}&quot;</Text>
        )}
        {results.map((r) => (
          <View key={r.book_id} style={styles.card} testID={`search-book-${r.book_id}`}>
            <Pressable onPress={() => router.push(`/library/book/${r.book_id}` as any)} style={styles.bookRow}>
              <RemoteImage
                uri={r.cover_image}
                fallback={libraryVisualFor(r.book_title, r.category, r.category_name)}
                style={styles.cover}
                contentFit="cover"
                accessibilityLabel={`${r.book_title} book cover`}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.bookTitle}>{r.book_title}</Text>
                <Text style={styles.bookAuthor}>{r.author}</Text>
              </View>
            </Pressable>
            {r.hits.map((h: any, i: number) => (
              <Pressable
                key={i}
                testID={`hit-${r.book_id}-${i}`}
                style={styles.hit}
                onPress={() => h.type === "chapter"
                  ? router.push(`/library/read/${r.book_id}?chapter=${h.chapter}` as any)
                  : router.push(`/library/book/${r.book_id}` as any)}
              >
                <Text style={styles.hitType}>{h.type === "chapter" ? `Ch ${h.chapter} · ${h.title}` : "Book match"}</Text>
                <Text style={styles.hitSnippet} numberOfLines={2}>{h.snippet}</Text>
              </Pressable>
            ))}
          </View>
        ))}

        {!hasQuery && (
          <View style={{ alignItems: "center", padding: 24, gap: 8 }}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={styles.hint}>Search across all books, chapters and topics.</Text>
            <Text style={styles.hintSmall}>Try: heparin · sepsis · ECG · triage · NCLEX</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: 8, gap: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, padding: 8 },
  input: { flex: 1, backgroundColor: colors.surfaceTertiary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.onSurface, borderWidth: 1, borderColor: colors.border },
  empty: { color: colors.muted, textAlign: "center", marginTop: 40 },
  card: { padding: 14, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  bookRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  cover: { width: 40, height: 56, borderRadius: radius.sm },
  bookTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  bookAuthor: { color: colors.brandPrimary, fontSize: 11, fontWeight: "700", marginTop: 2 },
  hit: { marginTop: 10, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: colors.brandSecondary },
  hitType: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", marginBottom: 4 },
  hitSnippet: { color: colors.onSurfaceSecondary, fontSize: 12, lineHeight: 17 },
  hint: { color: colors.onSurface, fontSize: 14, textAlign: "center", marginTop: 4 },
  hintSmall: { color: colors.muted, fontSize: 12, textAlign: "center" },
});
