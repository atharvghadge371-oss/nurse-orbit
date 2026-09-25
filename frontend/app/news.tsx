import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";
import { AppVisualImage, newsVisualFor } from "@/src/components/content-image";

export default function News() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["news"], queryFn: api.news });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="news-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Global Nursing News</Text>
        <View style={{ width: 30 }} />
      </View>
      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 14 }}>
          {(data?.news || []).map((n: any) => (
            <View key={n.id} style={styles.card} testID={`news-${n.id}`}>
              <AppVisualImage
                visual={newsVisualFor(n.category, n.headline)}
                style={styles.img}
                contentFit="cover"
                accessibilityLabel={`${n.category} nursing news illustration`}
              />
              <View style={{ padding: 14 }}>
                <View style={styles.tagRow}>
                  <View style={styles.tag}><Text style={styles.tagText}>{n.category}</Text></View>
                  <Text style={styles.date}>{n.date}</Text>
                </View>
                <Text style={styles.headline}>{n.headline}</Text>
                <Text style={styles.summary} numberOfLines={3}>{n.summary}</Text>
                <Text style={styles.source}>Source: {n.source}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  img: { width: "100%", height: 160 },
  tagRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.brandTertiary },
  tagText: { fontSize: 11, color: colors.brandPrimary, fontWeight: "800" },
  date: { fontSize: 11, color: colors.muted },
  headline: { color: colors.onSurface, fontSize: 16, fontWeight: "800", lineHeight: 22 },
  summary: { color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 6, lineHeight: 19 },
  source: { color: colors.muted, fontSize: 11, marginTop: 8, fontStyle: "italic" },
});
