import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

export default function Emergency() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["em"], queryFn: api.emergency });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.error }]}>
        <Pressable testID="em-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🚨 Emergency / Code Blue</Text>
          <Text style={styles.subtitle}>High-yield algorithms and protocols</Text>
        </View>
      </View>
      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 12 }}>
          {(data?.topics || []).map((t: any) => (
            <View key={t.id} style={[styles.card, { borderLeftColor: t.color }]} testID={`em-${t.id}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.iconBox, { backgroundColor: t.color }]}><Text style={{ fontSize: 24 }}>{t.icon}</Text></View>
                <Text style={styles.cardTitle}>{t.title}</Text>
              </View>
              <Text style={styles.summary}>{t.summary}</Text>
              <View style={{ gap: 4, marginTop: 8 }}>
                {t.key_points.map((p: string, i: number) => <Text key={i} style={styles.bullet}>• {p}</Text>)}
              </View>
              <Pressable testID={`em-ask-${t.id}`} style={styles.askBtn} onPress={() => router.push(`/(tabs)/ai-tab?prefill=${encodeURIComponent("Give me a detailed emergency-nursing walkthrough for " + t.title + " with the latest algorithm and nursing priorities.")}` as any)}>
                <Text style={styles.askBtnText}>Ask AI to walk me through →</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 16 },
  backIcon: { fontSize: 30, color: "#FFF", width: 30 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  card: { padding: 16, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, gap: 8 },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardTitle: { flex: 1, color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  summary: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  bullet: { color: colors.onSurface, fontSize: 12, lineHeight: 18 },
  askBtn: { marginTop: 8, padding: 10, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center" },
  askBtnText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
});
