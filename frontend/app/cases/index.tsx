import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

const DIFF_COLOR: Record<string, string> = { Easy: "#10B981", Medium: "#F59E0B", Hard: "#EF4444" };
const CAT_ICON: Record<string, string> = { Neurology: "🧠", Cardiac: "🫀", Emergency: "🚨", Respiratory: "🫁", Trauma: "🩹" };

export default function CasesIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["sims"], queryFn: () => api.simsList() });

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;

  const sims: any[] = data?.sims || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={["#0F172A", "#1E3A8A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="cases-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Clinical Simulator</Text>
          <Text style={styles.subtitle}>Live ICU scenarios · make the call, save the patient</Text>
        </View>
        <Text style={{ fontSize: 26 }}>🎮</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 12 }}>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>Each scenario has a live vitals monitor and evolving patient. Choose the correct action at each step — vitals will respond to your decisions.</Text>
        </View>

        {sims.map((s) => (
          <Pressable key={s.id} testID={`sim-${s.id}`} style={styles.card} onPress={() => router.push(`/cases/${s.id}` as any)}>
            <View style={styles.emojiBox}>
              <Text style={styles.emoji}>{s.emoji || CAT_ICON[s.category] || "🩺"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle} numberOfLines={2}>{s.title}</Text>
                <View style={[styles.diffPill, { backgroundColor: (DIFF_COLOR[s.difficulty] || colors.info) + "22" }]}>
                  <Text style={[styles.diffTxt, { color: DIFF_COLOR[s.difficulty] || colors.info }]}>{s.difficulty}</Text>
                </View>
              </View>
              <Text style={styles.vignette} numberOfLines={2}>{s.vignette}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaChip}><Text style={styles.metaTxt}>🏥 {s.category}</Text></View>
                <View style={styles.metaChip}><Text style={styles.metaTxt}>⚡ {s.steps_count} decisions</Text></View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.lg, paddingBottom: 18 },
  backIcon: { fontSize: 30, color: "#FFF", width: 30, fontWeight: "800" },
  title: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  subtitle: { color: "#CBD5E1", fontSize: 12, marginTop: 3 },
  tipCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.brandTertiary, borderLeftWidth: 3, borderLeftColor: colors.brandPrimary },
  tipIcon: { fontSize: 20 },
  tipText: { flex: 1, color: colors.brandPrimary, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  card: { flexDirection: "row", gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  emojiBox: { width: 62, height: 62, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  emoji: { fontSize: 34 },
  rowBetween: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, color: colors.onSurface, fontSize: 15, fontWeight: "900" },
  vignette: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  metaRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  metaChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.surfaceTertiary },
  metaTxt: { color: colors.onSurfaceSecondary, fontSize: 10, fontWeight: "800" },
  diffPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  diffTxt: { fontSize: 10, fontWeight: "800" },
});
