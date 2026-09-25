import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

const CATEGORIES = ["Year 1", "Year 2", "Year 3", "Year 4", "Post Basic", "MSc", "Clinical Specialties"];

export default function Academy() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cat, setCat] = useState("Year 1");
  const { data, isLoading } = useQuery({ queryKey: ["subjects"], queryFn: api.subjects });
  const filtered = useMemo(() => (data?.subjects || []).filter((s: any) => s.year === cat), [data, cat]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="ac-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Nursing Academy</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => setCat(c)} style={[styles.chip, cat === c && styles.chipActive]}>
            <Text style={[styles.chipText, cat === c && { color: "#FFF" }]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 12 }}>
          {filtered.map((s: any) => (
            <Pressable key={s.id} testID={`ac-${s.id}`} style={styles.card} onPress={() => router.push(`/lesson/${s.id}` as any)}>
              <View style={[styles.iconBox, { backgroundColor: s.color }]}><Text style={{ fontSize: 22, color: "#FFF" }}>📖</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.meta}>{s.topics} topics · {s.lessons} lessons</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 8, backgroundColor: colors.surface },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  chipRow: { paddingHorizontal: spacing.lg, gap: 8, height: 56, alignItems: "center", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  chip: { paddingHorizontal: 16, height: 36, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  name: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  arrow: { color: colors.muted, fontSize: 26 },
});
