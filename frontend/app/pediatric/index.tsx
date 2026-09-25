import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, screenContentBottomPadding, spacing } from "@/src/theme";

const TILES = [
  { key: "broselow", to: "/pediatric/broselow", title: "Broselow Cart", sub: "Colour-zone emergency dosing & equipment", icon: "🎨", accent: "#EF4444" },
  { key: "dose",     to: "/pediatric/dose",     title: "Dose Calculator", sub: "mg/kg for 40+ pediatric drugs", icon: "💊", accent: "#1E3A8A" },
  { key: "fluids",   to: "/pediatric/fluids",   title: "IV Fluids & Bolus", sub: "Holliday-Segar 4-2-1 + bolus + drip", icon: "💧", accent: "#0D9488" },
  { key: "bsa",      to: "/pediatric/bsa",      title: "BSA (Mosteller)", sub: "Body-surface-area calculator", icon: "📐", accent: "#8B5CF6" },
];

export default function PediatricHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="p-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View>
          <Text style={styles.title}>Pediatric Intelligence</Text>
          <Text style={styles.subtitle}>Weight-based dosing & Broselow tape</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
        <View style={styles.banner}>
          <Text style={styles.bannerH}>👶 Emergency-ready</Text>
          <Text style={styles.bannerT}>Enter the child's weight and instantly get correct doses, ET-tube size, defib joules and fluid bolus — matched to Broselow zones.</Text>
        </View>

        {TILES.map((t) => (
          <Pressable key={t.key} testID={`ped-${t.key}`} onPress={() => router.push(t.to as any)} style={styles.tile}>
            <View style={[styles.tileIcon, { backgroundColor: t.accent + "22" }]}>
              <Text style={{ fontSize: 26 }}>{t.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tileTitle}>{t.title}</Text>
              <Text style={styles.tileSub}>{t.sub}</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 22 }}>›</Text>
          </Pressable>
        ))}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>⚠︎ Educational reference only. Always verify with the prescriber and your institution's protocol before administering.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center" },
  banner: { backgroundColor: colors.brandTertiary, padding: 16, borderRadius: radius.lg, borderLeftWidth: 4, borderLeftColor: colors.brandPrimary },
  bannerH: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800" },
  bannerT: { color: colors.brandPrimary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  tile: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  tileIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  tileTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  tileSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  disclaimer: { padding: 12, borderRadius: radius.md, backgroundColor: "#FEF3C7", marginTop: 8 },
  disclaimerText: { color: "#92400E", fontSize: 11, lineHeight: 16 },
});
