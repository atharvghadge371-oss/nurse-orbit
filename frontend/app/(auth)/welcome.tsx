import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius } from "@/src/theme";
import { appVisuals } from "@/src/visuals";

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.brand }} testID="welcome-screen">
      <LinearGradient colors={[colors.brand, colors.brandPrimary]} style={StyleSheet.absoluteFill} />
      <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>✚</Text>
            <Text style={styles.logoGlobe}>◐</Text>
          </View>
          <Text style={styles.brand}>Nurse Orbit</Text>
          <Text style={styles.tagline}>Learn. License. Work. Grow.</Text>
        </View>

        <View style={styles.heroWrap}>
          <Image source={appVisuals.welcomeHero} style={styles.hero} contentFit="cover" contentPosition="top" />
          <LinearGradient
            colors={["rgba(10,25,49,0.02)", "rgba(10,25,49,0.55)"]}
            locations={[0.35, 1]}
            style={styles.heroShade}
          />
        </View>

        <View style={{ gap: 12 }}>
          <Text style={styles.subtitle}>
            Everything a nurse needs throughout their professional journey.
          </Text>
          <Pressable testID="get-started-btn" style={styles.primaryBtn} onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.primaryBtnText}>Get started</Text>
          </Pressable>
          <Pressable testID="login-link-btn" style={styles.ghostBtn} onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.ghostBtnText}>I already have an account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl },
  logoWrap: { alignItems: "center", gap: 8, marginBottom: spacing.xl },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 2 },
  logoIcon: { color: "#FFF", fontSize: 28, fontWeight: "800" },
  logoGlobe: { color: "#0D9488", fontSize: 22, fontWeight: "700", marginLeft: -6 },
  brand: { color: "#FFF", fontSize: 28, fontWeight: "800", letterSpacing: 0.5 },
  tagline: { color: "#CBD5E1", fontSize: 14, fontWeight: "500" },
  heroWrap: { flex: 1, minHeight: 178, maxHeight: 286, borderRadius: radius.lg, overflow: "hidden", marginBottom: spacing.xl },
  hero: { width: "100%", height: "100%" },
  heroShade: { ...StyleSheet.absoluteFill },
  subtitle: { color: "#F1F5F9", fontSize: 16, textAlign: "center", lineHeight: 22, marginBottom: 4 },
  primaryBtn: { backgroundColor: colors.brandSecondary, paddingVertical: 16, borderRadius: radius.lg, alignItems: "center" },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  ghostBtn: { paddingVertical: 14, alignItems: "center" },
  ghostBtnText: { color: "#CBD5E1", fontSize: 15, fontWeight: "600" },
});
