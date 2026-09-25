import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";
import { appVisuals } from "@/src/visuals";

export default function AbroadList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["pathways"], queryFn: api.pathways });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="ab-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Work Abroad</Text>
        <View style={{ width: 30 }} />
      </View>
      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 12 }}>
          <View style={styles.featured}>
            <Image source={appVisuals.globalCareer} style={styles.featuredImage} contentFit="cover" contentPosition="center" />
            <LinearGradient colors={["rgba(30,58,138,0.08)", "rgba(30,58,138,0.92)"]} style={styles.featuredShade}>
              <Text style={styles.featuredEyebrow}>GLOBAL NURSING CAREERS</Text>
              <Text style={styles.featuredTitle}>Choose a pathway with confidence</Text>
            </LinearGradient>
          </View>
          {(data?.pathways || []).map((p: any) => (
            <Pressable key={p.id} testID={`abroad-${p.id}`} style={styles.card} onPress={() => router.push(`/pathway/${p.id}` as any)}>
              <Text style={{ fontSize: 32 }}>{p.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.country}>{p.country}</Text>
                <Text style={styles.meta}>{p.language} · {p.total_steps} steps · {p.demand} demand</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  featured: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.brandPrimary, marginBottom: 2 },
  featuredImage: { width: "100%", height: "100%" },
  featuredShade: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", padding: 16 },
  featuredEyebrow: { color: "#BFDBFE", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  featuredTitle: { color: "#FFF", fontSize: 19, lineHeight: 24, fontWeight: "900", maxWidth: "88%", marginTop: 5 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  country: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  arrow: { color: colors.muted, fontSize: 26 },
});
