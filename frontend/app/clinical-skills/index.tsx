import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";
import { appVisuals } from "@/src/visuals";

export default function Skills() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["skills"], queryFn: () => api.skills() });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="sk-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Clinical Skills</Text>
        <View style={{ width: 30 }} />
      </View>
      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 10 }}>
          <View style={styles.featured}>
            <Image source={appVisuals.clinicalSkills} style={styles.featuredImage} contentFit="cover" contentPosition="center" />
            <LinearGradient colors={["rgba(6,78,59,0.1)", "rgba(6,78,59,0.92)"]} style={styles.featuredShade}>
              <Text style={styles.featuredEyebrow}>GUIDED PRACTICE</Text>
              <Text style={styles.featuredTitle}>Learn every step before you meet the patient</Text>
            </LinearGradient>
          </View>
          {(data?.skills || []).map((s: any) => (
            <Pressable key={s.id} testID={`skill-${s.id}`} style={styles.card} onPress={() => router.push(`/clinical-skills/${s.id}` as any)}>
              <View style={styles.iconBox}><Text style={{ fontSize: 22 }}>🩹</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.title}</Text>
                <Text style={styles.meta}>{s.category} · {s.duration}</Text>
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
  featured: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#065F46", marginBottom: 2 },
  featuredImage: { width: "100%", height: "100%" },
  featuredShade: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", padding: 16 },
  featuredEyebrow: { color: "#99F6E4", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  featuredTitle: { color: "#FFF", fontSize: 19, lineHeight: 24, fontWeight: "900", maxWidth: "88%", marginTop: 5 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  name: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  arrow: { color: colors.muted, fontSize: 22 },
});
