import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

export default function AbnormalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["ab", id], queryFn: () => api.abnormalDelivery(id!) });

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;
  const c: any = data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={["#EA580C", "#9A3412"]} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="ab-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{c.name}</Text>
          <Text style={styles.subtitle}>Obstetric emergency</Text>
        </View>
        <Text style={{ fontSize: 26 }}>🚨</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: 14 }}>
        <View style={styles.section}>
          <Text style={styles.sHead}>📖 Definition</Text>
          <Text style={styles.sBody}>{c.definition}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sHead}>👁 Signs</Text>
          {(c.signs || []).map((s: string, i: number) => (
            <View key={i} style={styles.bullet}>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: "#FEE2E2", borderColor: "#EF4444" }]}>
          <Text style={[styles.sHead, { color: "#B91C1C" }]}>⚡ Management</Text>
          {(c.management || []).map((m: string, i: number) => (
            <View key={i} style={styles.mgmtRow}>
              <View style={styles.mgmtNum}><Text style={styles.mgmtNumTxt}>{i + 1}</Text></View>
              <Text style={styles.mgmtText}>{m}</Text>
            </View>
          ))}
        </View>
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
  section: { padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  sHead: { color: colors.brandPrimary, fontSize: 13, fontWeight: "900", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  sBody: { color: colors.onSurface, fontSize: 14, lineHeight: 20 },
  bullet: { flexDirection: "row", gap: 10, marginTop: 4 },
  dot: { color: colors.brandPrimary, fontSize: 16, width: 14, fontWeight: "900" },
  bulletText: { flex: 1, color: colors.onSurface, fontSize: 13, lineHeight: 18 },
  mgmtRow: { flexDirection: "row", gap: 10, marginTop: 8, alignItems: "flex-start" },
  mgmtNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#B91C1C", alignItems: "center", justifyContent: "center" },
  mgmtNumTxt: { color: "#FFF", fontSize: 11, fontWeight: "900" },
  mgmtText: { flex: 1, color: "#7F1D1D", fontSize: 13, lineHeight: 19, fontWeight: "600" },
});
