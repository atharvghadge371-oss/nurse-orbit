import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";
import { libraryVisualFor, RemoteImage } from "@/src/components/content-image";

export default function Library() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { data: cats, isLoading: catL } = useQuery({ queryKey: ["lib-cats"], queryFn: api.libCategories });
  const { data: feat, refetch } = useQuery({ queryKey: ["lib-featured"], queryFn: api.libFeatured });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="lib-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Nursing Library</Text>
          <Text style={styles.subtitle}>Books, guides & references</Text>
        </View>
        {user?.is_admin && (
          <Pressable testID="lib-admin-btn" onPress={() => router.push("/library/admin" as any)} style={styles.adminBtn}>
            <Text style={styles.adminBtnText}>Admin</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: screenContentBottomPadding(insets.bottom) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Search box */}
        <Pressable testID="lib-search-btn" style={styles.searchBox} onPress={() => router.push("/library/search" as any)}>
          <Text style={{ fontSize: 18 }}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search books, topics, chapters…</Text>
        </Pressable>

        {catL ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
          <>
            {(feat?.continue_reading || []).length > 0 && (
              <Section title="Continue Reading">
                <HorizontalBookRow books={feat!.continue_reading} onPress={(b: any) => router.push(`/library/read/${b.id}?chapter=${b.current_chapter || 1}` as any)} showProgress />
              </Section>
            )}

            <Section title="Featured Books">
              <HorizontalBookRow books={feat?.featured || []} onPress={(b: any) => router.push(`/library/book/${b.id}` as any)} large />
            </Section>

            <Section title="Recently Added">
              <HorizontalBookRow books={feat?.recent || []} onPress={(b: any) => router.push(`/library/book/${b.id}` as any)} />
            </Section>

            {(feat?.bookmarked || []).length > 0 && (
              <Section title="Bookmarked Books">
                <HorizontalBookRow books={feat!.bookmarked} onPress={(b: any) => router.push(`/library/book/${b.id}` as any)} />
              </Section>
            )}

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Browse by Category</Text>
            </View>
            <View style={styles.catGrid}>
              {(cats?.categories || []).map((c: any) => (
                <Pressable
                  key={c.id}
                  testID={`lib-cat-${c.id}`}
                  style={[styles.catCard, { backgroundColor: c.color }]}
                  onPress={() => router.push(`/library/category/${c.id}` as any)}
                >
                  <Text style={styles.catIcon}>{c.icon}</Text>
                  <Text style={styles.catName} numberOfLines={2}>{c.name}</Text>
                  <Text style={styles.catCount}>{c.book_count} {c.book_count === 1 ? "book" : "books"}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: any) {
  return (
    <View style={{ marginTop: 20 }}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function HorizontalBookRow({ books, onPress, large, showProgress }: any) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookRow}>
      {books.map((b: any) => (
        <Pressable key={b.id} testID={`lib-book-${b.id}`} style={[styles.bookCard, large && { width: 150 }]} onPress={() => onPress(b)}>
          <RemoteImage
            uri={b.cover_image}
            fallback={libraryVisualFor(b.title, b.category, b.category_name)}
            style={[styles.cover, large && { height: 200 }]}
            contentFit="cover"
            accessibilityLabel={`${b.title} book cover`}
          />
          <Text style={styles.bookTitle} numberOfLines={2}>{b.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{b.author}</Text>
          {showProgress && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${b.progress || 0}%` }]} />
            </View>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 8 },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 12 },
  adminBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.brandTertiary },
  adminBtnText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, marginHorizontal: spacing.lg, marginTop: 16, padding: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  searchPlaceholder: { color: colors.muted, fontSize: 14, flex: 1 },
  sectionHead: { paddingHorizontal: spacing.lg, marginTop: 4, marginBottom: 10 },
  sectionTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  bookRow: { paddingHorizontal: spacing.lg - 4, gap: 12, paddingRight: 24 },
  bookCard: { width: 128, marginHorizontal: 4 },
  cover: { width: "100%", height: 170, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  bookTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "800", marginTop: 8, lineHeight: 17 },
  bookAuthor: { color: colors.muted, fontSize: 11, marginTop: 2 },
  progressBar: { height: 4, backgroundColor: colors.surfaceTertiary, borderRadius: 999, marginTop: 6, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.brandPrimary },
  catGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg - 4, gap: 8 },
  catCard: { width: "31.7%", aspectRatio: 0.95, borderRadius: radius.md, padding: 12, justifyContent: "space-between", margin: 4 },
  catIcon: { fontSize: 26 },
  catName: { color: "#FFF", fontSize: 11, fontWeight: "800", lineHeight: 14 },
  catCount: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700" },
});
