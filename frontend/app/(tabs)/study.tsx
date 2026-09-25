import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, tabContentBottomPadding } from "@/src/theme";
import { appVisuals } from "@/src/visuals";

const HUB = [
  { key: "journey", label: "My Nursing Journey", desc: "Year-wise progress & your 7-day plan", icon: "🧭", color: "#0F766E", to: "/journey" },
  { key: "library", label: "Nursing Library", desc: "Books, chapters, references", icon: "📚", color: "#1E3A8A", to: "/library" },
  { key: "academy", label: "Nursing Academy", desc: "Structured yearly curriculum", icon: "🎓", color: "#0D9488", to: "/academy" },
  { key: "skills", label: "Clinical Skills", desc: "Step-by-step procedures", icon: "🩹", color: "#059669", to: "/clinical-skills" },
  { key: "ecg", label: "ECG Learning", desc: "Rhythms, interpretation, cases", icon: "🫀", color: "#DC2626", to: "/ecg-learning" },
  { key: "abg", label: "ABG & Ventilator", desc: "Calculator + basics", icon: "🫁", color: "#7C3AED", to: "/abg" },
  { key: "drugs", label: "Drug Guide", desc: "Meds with nursing considerations", icon: "💊", color: "#0891B2", to: "/drug-guide" },
  { key: "emergency", label: "Emergency / Code Blue", desc: "BLS, ACLS and more", icon: "🚨", color: "#B91C1C", to: "/emergency" },
  { key: "cme", label: "CME / CPD", desc: "Track your professional hours", icon: "⏱", color: "#F59E0B", to: "/cme" },
  { key: "abroad", label: "Work Abroad", desc: "Licensing pathways", icon: "✈️", color: "#3B82F6", to: "/abroad-list" },
];

export default function Learn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>Everything a nurse needs to master</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabContentBottomPadding(insets.bottom), gap: 12 }}>
        <Pressable testID="learn-featured-academy" style={styles.featured} onPress={() => router.push("/academy" as any)}>
          <Image source={appVisuals.learning} style={styles.featuredImage} contentFit="cover" contentPosition="center" />
          <LinearGradient colors={["rgba(10,25,49,0.08)", "rgba(10,25,49,0.9)"]} style={styles.featuredShade}>
            <Text style={styles.featuredEyebrow}>NURSING ACADEMY</Text>
            <Text style={styles.featuredTitle}>Build confidence, one clinical concept at a time</Text>
            <Text style={styles.featuredAction}>Explore your curriculum  →</Text>
          </LinearGradient>
        </Pressable>
        {HUB.map((h) => (
          <Pressable key={h.key} testID={`learn-${h.key}`} style={styles.card} onPress={() => router.push(h.to as any)}>
            <View style={[styles.iconBox, { backgroundColor: h.color }]}><Text style={styles.icon}>{h.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{h.label}</Text>
              <Text style={styles.cardDesc}>{h.desc}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  featured: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.brand },
  featuredImage: { width: "100%", height: "100%" },
  featuredShade: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", padding: 16 },
  featuredEyebrow: { color: "#99F6E4", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  featuredTitle: { color: "#FFF", fontSize: 20, lineHeight: 25, fontWeight: "900", maxWidth: "88%", marginTop: 5 },
  featuredAction: { color: "#FFF", fontSize: 12, fontWeight: "800", marginTop: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 80, padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 26 },
  cardTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  cardDesc: { color: colors.muted, fontSize: 12, marginTop: 2 },
  arrow: { color: colors.muted, fontSize: 26 },
});
