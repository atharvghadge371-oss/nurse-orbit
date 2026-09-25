import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, minTouchTarget, screenContentBottomPadding, spacing, radius } from "@/src/theme";

export default function CarePlansList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["careplans"], queryFn: api.listCarePlans });

  const del = async (id: string) => { await api.deleteCarePlan(id); qc.invalidateQueries({ queryKey: ["careplans"] }); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="cp-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Care Plans</Text>
        <View style={{ width: 30 }} />
      </View>

      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom) + minTouchTarget + spacing.lg }}>
          {(data?.plans || []).length === 0 && (
            <View style={{ alignItems: "center", padding: 40, gap: 8 }}>
              <Text style={{ fontSize: 44 }}>📝</Text>
              <Text style={styles.emptyTitle}>No care plans yet</Text>
              <Text style={styles.emptyText}>Build your first care plan — AI can draft it for you in seconds.</Text>
            </View>
          )}
          {(data?.plans || []).map((p: any) => (
            <View key={p.id} style={styles.card} testID={`plan-${p.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{p.condition}</Text>
                {!!p.diagnosis && <Text style={styles.cardMeta} numberOfLines={2}>{p.diagnosis}</Text>}
                <Text style={styles.date}>{new Date(p.created_at).toLocaleDateString()}</Text>
              </View>
              <Pressable testID={`plan-del-${p.id}`} onPress={() => del(p.id)} style={styles.delBtn}>
                <Text style={styles.delBtnText}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
      <Pressable testID="cp-new-fab" accessibilityRole="button" accessibilityLabel="Create a care plan" style={[styles.fab, { bottom: insets.bottom + spacing.lg }]} onPress={() => router.push("/care-plans/new" as any)}>
        <Text style={{ color: "#FFF", fontSize: 26, fontWeight: "800" }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  emptyTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: 4 },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  cardTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  date: { color: colors.muted, fontSize: 11, marginTop: 6 },
  delBtn: { minHeight: minTouchTarget, justifyContent: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: "#FEE2E2" },
  delBtnText: { color: colors.error, fontSize: 11, fontWeight: "800" },
  fab: { position: "absolute", right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
});
