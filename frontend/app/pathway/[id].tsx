import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

export default function PathwayDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["pathway", id], queryFn: () => api.pathway(id!) });

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;
  const p = data.pathway;
  const completed = new Set(data.completed);
  const progress = Math.round((completed.size / p.steps.length) * 100);
  const nextStep = p.steps.find((s: any) => !completed.has(s.n));

  const toggle = async (n: number) => {
    await api.togglePathwayStep(id!, n);
    qc.invalidateQueries({ queryKey: ["pathway", id] });
    qc.invalidateQueries({ queryKey: ["home"] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="pathway-back" onPress={() => router.back()} style={{ padding: 8 }}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{p.flag} {p.country}</Text>
          <Text style={styles.headerMeta}>{p.language}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Your Readiness</Text>
          <Text style={styles.summaryValue}>{progress}%</Text>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <Text style={styles.summaryMeta}>{completed.size} of {p.steps.length} steps completed</Text>
        </View>

        <Text style={styles.sec}>Roadmap</Text>
        <View>
          {p.steps.map((s: any, i: number) => {
            const done = completed.has(s.n);
            const active = !done && nextStep?.n === s.n;
            return (
              <Pressable key={s.n} testID={`step-${s.n}`} onPress={() => toggle(s.n)} style={styles.stepRow}>
                <View style={styles.stepLine}>
                  <View style={[styles.dot, done && { backgroundColor: colors.success }, active && { backgroundColor: colors.brandPrimary }]}>
                    <Text style={styles.dotText}>{done ? "✓" : s.n}</Text>
                  </View>
                  {i < p.steps.length - 1 && <View style={[styles.line, done && { backgroundColor: colors.success }]} />}
                </View>
                <View style={[styles.stepCard, done && styles.stepCardDone, active && styles.stepCardActive]}>
                  <Text style={[styles.stepTitle, done && { color: colors.success }]}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface },
  headerTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  headerMeta: { color: colors.muted, fontSize: 13 },
  summary: { padding: 20, backgroundColor: colors.brand, borderRadius: radius.lg, gap: 8 },
  summaryLabel: { color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  summaryValue: { color: "#FFF", fontSize: 32, fontWeight: "800" },
  progressBar: { height: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, overflow: "hidden", marginTop: 4 },
  progressFill: { height: "100%", backgroundColor: colors.brandSecondary },
  summaryMeta: { color: "#CBD5E1", fontSize: 12, marginTop: 6 },
  sec: { color: colors.onSurface, fontSize: 18, fontWeight: "800", marginTop: 24, marginBottom: 12 },
  stepRow: { flexDirection: "row", gap: 12, minHeight: 88 },
  stepLine: { alignItems: "center", width: 36 },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  dotText: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  stepCard: { flex: 1, padding: 14, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  stepCardActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  stepCardDone: { backgroundColor: "#F0FDF4", borderColor: colors.success },
  stepTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  stepDesc: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
});
