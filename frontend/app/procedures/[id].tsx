import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

export default function ProcedureDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["proc", id], queryFn: () => api.procedureDetail(id!) });
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;

  const p: any = data;
  const toggle = (i: number) => {
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  };
  const donePct = Math.round((checked.size / (p.steps?.length || 1)) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={["#0891B2", "#0369A1"]} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="proc-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{p.name}</Text>
          <Text style={styles.subtitle}>{donePct}% complete · {checked.size}/{p.steps?.length}</Text>
        </View>
        <Text style={{ fontSize: 26 }}>📋</Text>
      </LinearGradient>

      <View style={styles.progBarWrap}>
        <View style={[styles.progBarFill, { width: `${donePct}%` }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: 14 }}>
        {p.purpose && (
          <View style={styles.section}>
            <Text style={styles.sHead}>🎯 Purpose</Text>
            <Text style={styles.sBody}>{p.purpose}</Text>
          </View>
        )}

        {p.duration && (
          <View style={styles.section}>
            <Text style={styles.sHead}>⏱ Duration</Text>
            <Text style={styles.sBody}>{p.duration}</Text>
          </View>
        )}

        {p.articles && p.articles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sHead}>🧰 Articles required</Text>
            <View style={{ marginTop: 4 }}>
              {p.articles.map((a: string, i: number) => (
                <View key={i} style={styles.bullet}>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.bulletText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {p.steps && p.steps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sHead}>📝 Procedure steps</Text>
            <View style={{ marginTop: 6, gap: 8 }}>
              {p.steps.map((step: string, i: number) => {
                const isChecked = checked.has(i);
                return (
                  <Pressable key={i} testID={`step-${i}`} onPress={() => toggle(i)} style={[styles.step, isChecked && styles.stepChecked]}>
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Text style={{ color: "#FFF", fontWeight: "900" }}>✓</Text>}
                    </View>
                    <View style={styles.stepNum}><Text style={styles.stepNumTxt}>{i + 1}</Text></View>
                    <Text style={[styles.stepText, isChecked && { textDecorationLine: "line-through", color: colors.muted }]}>{step}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {p.tips && p.tips.length > 0 && (
          <View style={styles.tipCard}>
            <Text style={styles.sHead}>💡 Nurse&apos;s tips</Text>
            {p.tips.map((tip: string, i: number) => (
              <View key={i} style={styles.bullet}>
                <Text style={[styles.dot, { color: "#B45309" }]}>▸</Text>
                <Text style={[styles.bulletText, { color: "#78350F" }]}>{tip}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.lg, paddingBottom: 16 },
  backIcon: { fontSize: 30, color: "#FFF", width: 30, fontWeight: "800" },
  title: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 3 },
  progBarWrap: { height: 4, backgroundColor: colors.divider },
  progBarFill: { height: "100%", backgroundColor: colors.success },
  section: { padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  sHead: { color: colors.brandPrimary, fontSize: 13, fontWeight: "900", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  sBody: { color: colors.onSurface, fontSize: 14, lineHeight: 20 },
  bullet: { flexDirection: "row", gap: 10, marginTop: 4 },
  dot: { color: colors.brandPrimary, fontSize: 16, width: 14, fontWeight: "900" },
  bulletText: { flex: 1, color: colors.onSurface, fontSize: 13, lineHeight: 18 },
  step: { flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.sm, backgroundColor: colors.surfaceSecondary, alignItems: "flex-start", borderWidth: 1, borderColor: colors.border },
  stepChecked: { backgroundColor: "#DCFCE7", borderColor: colors.success },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  stepNumTxt: { color: colors.brandPrimary, fontSize: 11, fontWeight: "900" },
  stepText: { flex: 1, color: colors.onSurface, fontSize: 13, lineHeight: 19 },
  tipCard: { padding: 14, backgroundColor: "#FEF3C7", borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: "#F59E0B", gap: 4 },
});
