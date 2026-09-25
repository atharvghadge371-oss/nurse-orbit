import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";
import { libraryVisualFor, RemoteImage } from "@/src/components/content-image";

export default function CategoryBooks() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: cats } = useQuery({ queryKey: ["lib-cats"], queryFn: api.libCategories });
  const { data, isLoading } = useQuery({ queryKey: ["lib-books", id], queryFn: () => api.libBooks({ category_id: id! }) });
  const cat = cats?.categories.find((c: any) => c.id === id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: cat?.color || colors.brandPrimary }]}>
        <Pressable testID="cat-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.icon}>{cat?.icon}</Text>
          <Text style={styles.title}>{cat?.name || "Category"}</Text>
          <Text style={styles.subtitle}>{data?.books?.length ?? 0} books</Text>
        </View>
      </View>

      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 12 }}>
          {(data?.books || []).map((b: any) => (
            <Pressable key={b.id} testID={`catbook-${b.id}`} style={styles.card} onPress={() => router.push(`/library/book/${b.id}` as any)}>
              <RemoteImage
                uri={b.cover_image}
                fallback={libraryVisualFor(b.title, b.category, cat?.name)}
                style={styles.cover}
                contentFit="cover"
                accessibilityLabel={`${b.title} book cover`}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.bookTitle}>{b.title}</Text>
                <Text style={styles.bookAuthor}>{b.author}</Text>
                <Text style={styles.bookEdition}>{b.edition} · {b.publication_year}</Text>
                <Text style={styles.bookDesc} numberOfLines={2}>{b.description}</Text>
                <View style={styles.chipsRow}>
                  <Chip>{b.chapter_count} chapters</Chip>
                  <Chip>{b.page_count} pages</Chip>
                </View>
              </View>
            </Pressable>
          ))}
          {(data?.books || []).length === 0 && <Text style={styles.empty}>No books yet in this category.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

function Chip({ children }: any) { return <View style={styles.chip}><Text style={styles.chipText}>{children}</Text></View>; }

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", padding: spacing.lg, paddingBottom: 24, gap: 8 },
  backIcon: { fontSize: 30, color: "#FFF", width: 30 },
  icon: { fontSize: 36 },
  title: { color: "#FFF", fontSize: 22, fontWeight: "800", marginTop: 4 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  card: { flexDirection: "row", gap: 14, padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  cover: { width: 74, height: 100, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  bookTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  bookAuthor: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700" },
  bookEdition: { color: colors.muted, fontSize: 11 },
  bookDesc: { color: colors.onSurfaceSecondary, fontSize: 12, lineHeight: 17, marginTop: 4 },
  chipsRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.surfaceTertiary },
  chipText: { fontSize: 10, color: colors.onSurfaceSecondary, fontWeight: "700" },
  empty: { color: colors.muted, textAlign: "center", marginTop: 40 },
});
