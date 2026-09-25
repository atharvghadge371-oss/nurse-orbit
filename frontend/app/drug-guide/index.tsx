import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

export default function DrugGuide() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["drugs", q], queryFn: () => api.drugs(q || undefined) });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="drugs-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Drug Guide</Text>
        <View style={{ width: 30 }} />
      </View>
      <View style={{ padding: spacing.lg, paddingBottom: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
        <TextInput testID="drugs-search" value={q} onChangeText={setQ} placeholder="Search drug name, class, indication…" placeholderTextColor={colors.muted} style={styles.search} autoCapitalize="none" />
      </View>
      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 10 }}>
          <Pressable testID="drug-pediatric" onPress={() => router.push("/pediatric" as any)} style={styles.pedCard}>
            <View style={styles.pedIcon}><Text style={{ fontSize: 26 }}>👶</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pedTitle}>Pediatric Intelligence</Text>
              <Text style={styles.pedSub}>Broselow cart · weight-based dose · fluids · BSA</Text>
            </View>
            <Text style={{ color: "#FFF", fontSize: 22 }}>›</Text>
          </Pressable>

          {(data?.drugs || []).map((d: any) => (
            <Pressable key={d.id} testID={`drug-${d.id}`} style={styles.card} onPress={() => router.push(`/drug-guide/${d.id}` as any)}>
              <View style={styles.pill}><Text style={{ fontSize: 22 }}>💊</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{d.name}</Text>
                <Text style={styles.cls}>{d.class}</Text>
                <Text style={styles.indi} numberOfLines={1}>{(d.indications || []).slice(0, 2).join(" · ")}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
          {(data?.drugs || []).length === 0 && <Text style={styles.empty}>No drugs found</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  search: { backgroundColor: colors.surfaceTertiary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.onSurface, borderWidth: 1, borderColor: colors.border },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  pill: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  name: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  cls: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700", marginTop: 2 },
  indi: { color: colors.muted, fontSize: 11, marginTop: 4 },
  arrow: { color: colors.muted, fontSize: 24 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 40 },
  pedCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: colors.brandPrimary, borderRadius: radius.lg },
  pedIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  pedTitle: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  pedSub: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 3 },
});
