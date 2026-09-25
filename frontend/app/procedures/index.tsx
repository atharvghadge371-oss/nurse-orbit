import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

const YEAR_COLORS: Record<string, [string, string]> = {
  "Year 1": ["#0D9488", "#0F766E"],
  "Year 2": ["#2563EB", "#1E40AF"],
  "Year 3": ["#7C3AED", "#5B21B6"],
  "Year 4": ["#B91C1C", "#7F1D1D"],
  "Abnormal": ["#EA580C", "#9A3412"],
};

function shortYear(y: string): string {
  const m = y.match(/Year \d/); return m ? m[0] : (y.includes("Abnormal") ? "Abnormal" : y);
}

export default function ProceduresIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"procedures" | "abnormal">("procedures");

  const { data: procData, isLoading: pLoad } = useQuery({ queryKey: ["procs"], queryFn: () => api.proceduresList() });
  const { data: abData, isLoading: aLoad } = useQuery({ queryKey: ["abnormal"], queryFn: () => api.abnormalDeliveries() });

  const isLoading = pLoad || aLoad;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={["#0891B2", "#0369A1"]} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="proc-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Procedures</Text>
          <Text style={styles.subtitle}>Step-by-step nursing procedures</Text>
        </View>
        <Text style={{ fontSize: 24 }}>📋</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable testID="tab-proc" onPress={() => setTab("procedures")} style={[styles.tab, tab === "procedures" && styles.tabActive]}>
          <Text style={[styles.tabTxt, tab === "procedures" && styles.tabTxtActive]}>Year-wise procedures</Text>
        </Pressable>
        <Pressable testID="tab-ab" onPress={() => setTab("abnormal")} style={[styles.tab, tab === "abnormal" && styles.tabActive]}>
          <Text style={[styles.tabTxt, tab === "abnormal" && styles.tabTxtActive]}>Abnormal deliveries</Text>
        </Pressable>
      </View>

      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 20 }}>
          {tab === "procedures" && procData?.years?.map((yr: string) => {
            const grad = YEAR_COLORS[shortYear(yr)] || ["#64748B", "#334155"];
            const items = procData.procedures[yr] || [];
            return (
              <View key={yr}>
                <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.yearHead}>
                  <Text style={styles.yearTitle}>{yr}</Text>
                  <View style={styles.yearBadge}><Text style={styles.yearBadgeTxt}>{items.length}</Text></View>
                </LinearGradient>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {items.map((p: any) => (
                    <Pressable key={p.id} testID={`proc-${p.id}`} style={styles.procCard} onPress={() => router.push(`/procedures/${p.id}` as any)}>
                      <View style={styles.procBullet}><Text style={styles.procBulletTxt}>📌</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.procName}>{p.name}</Text>
                        <Text style={styles.procPurpose} numberOfLines={2}>{p.purpose}</Text>
                      </View>
                      <Text style={styles.arr}>›</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}

          {tab === "abnormal" && (
            <View>
              <View style={styles.warnCard}>
                <Text style={styles.warnIcon}>⚠️</Text>
                <Text style={styles.warnText}>Obstetric emergencies. Study calmly — you&apos;ll rely on this fast one day.</Text>
              </View>
              <View style={{ gap: 8, marginTop: 12 }}>
                {(abData?.conditions || []).map((c: any) => (
                  <Pressable key={c.id} testID={`ab-${c.id}`} style={styles.procCard} onPress={() => router.push(`/procedures/abnormal/${c.id}` as any)}>
                    <View style={[styles.procBullet, { backgroundColor: "#FEE2E2" }]}><Text style={styles.procBulletTxt}>🚨</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.procName}>{c.name}</Text>
                      <Text style={styles.procPurpose} numberOfLines={2}>{c.definition}</Text>
                    </View>
                    <Text style={styles.arr}>›</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.lg, paddingBottom: 16 },
  backIcon: { fontSize: 30, color: "#FFF", width: 30, fontWeight: "800" },
  title: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 3 },
  tabs: { flexDirection: "row", padding: spacing.md, gap: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center" },
  tabActive: { backgroundColor: colors.brandPrimary },
  tabTxt: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  tabTxtActive: { color: "#FFF" },
  yearHead: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: radius.md, gap: 10 },
  yearTitle: { flex: 1, color: "#FFF", fontSize: 14, fontWeight: "900" },
  yearBadge: { minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  yearBadgeTxt: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  procCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  procBullet: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  procBulletTxt: { fontSize: 18 },
  procName: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  procPurpose: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 15 },
  arr: { fontSize: 22, color: colors.muted },
  warnCard: { flexDirection: "row", gap: 10, padding: 14, backgroundColor: "#FEF3C7", borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: "#F59E0B" },
  warnIcon: { fontSize: 20 },
  warnText: { flex: 1, color: "#78350F", fontSize: 12, lineHeight: 17, fontWeight: "600" },
});
