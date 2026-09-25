import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/src/theme";

const TILES = [
  {
    to: "/nursing-scope",
    icon: "🎓",
    color: "#1E3A8A",
    title: "Scope of Nursing",
    sub: "16+ specializations — how to become, accepted countries, salary, trends",
  },
  {
    to: "/abroad-list",
    icon: "✈️",
    color: "#0D9488",
    title: "Work Abroad Pathways",
    sub: "Step-by-step licensing pathways for UAE, UK, USA, Canada, Germany, KSA, AUS",
  },
  {
    to: "/jobs",
    icon: "💼",
    color: "#F59E0B",
    title: "Nursing Jobs",
    sub: "Curated job feed from global recruiters",
  },
  {
    to: "/passport-list",
    icon: "🛡",
    color: "#059669",
    title: "Professional Passport",
    sub: "Secure document vault — licence, CV, immunizations, offer letters",
  },
  {
    to: "/cme",
    icon: "⏱",
    color: "#8B5CF6",
    title: "CME / CPD",
    sub: "Log continuing-education hours and certificates",
  },
  {
    to: "/news",
    icon: "📰",
    color: "#EF4444",
    title: "Nursing News",
    sub: "Global nursing news, policy updates and recruiter announcements",
  },
];

export default function CareerHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="c-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View>
          <Text style={styles.title}>Career Development</Text>
          <Text style={styles.subtitle}>Grow your nursing career globally</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: 60 }}>
        <View style={styles.hero}>
          <Text style={styles.heroT}>🚀 Plan the next 5 years</Text>
          <Text style={styles.heroS}>Discover specializations, unlock global job opportunities, keep your documents ready and log every CME hour — all in one place.</Text>
        </View>

        {TILES.map((t) => (
          <Pressable key={t.to} testID={`career-${t.title.replace(/\s+/g, "-")}`} onPress={() => router.push(t.to as any)} style={styles.tile}>
            <View style={[styles.tileIcon, { backgroundColor: t.color + "22" }]}>
              <Text style={{ fontSize: 26 }}>{t.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tileTitle}>{t.title}</Text>
              <Text style={styles.tileSub}>{t.sub}</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 22 }}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center" },
  hero: { backgroundColor: colors.brand, padding: 16, borderRadius: radius.lg, gap: 6 },
  heroT: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  heroS: { color: "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 18 },
  tile: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  tileIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  tileTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  tileSub: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 15 },
});
