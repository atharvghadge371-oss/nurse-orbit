import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

const SECTIONS: [string, string, string][] = [
  ["Indications", "indications", "💠"],
  ["Equipment", "equipment", "🧰"],
  ["Preparation", "preparation", "📋"],
  ["Procedure", "procedure", "👣"],
  ["Safety", "safety", "🛡"],
  ["Complications", "complications", "⚠️"],
  ["Documentation", "documentation", "📝"],
  ["Common Mistakes", "mistakes", "🚫"],
];

export default function SkillDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["skill", id], queryFn: () => api.skill(id!) });

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;
  const s = data.skill;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="sk-detail-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.subtitle}>{s.category} · {s.duration}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 12 }}>
        {SECTIONS.map(([label, key, icon], secIdx) => {
          const val = (s as any)[key];
          if (!val) return null;
          return (
            <View key={key} style={styles.section}>
              <Text style={styles.sectionTitle}>{icon} {label}</Text>
              {(val as string[]).map((v, i) => (
                <Text key={i} style={styles.step}>
                  {key === "procedure" ? <Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>{i + 1}. </Text> : <Text>• </Text>}{v}
                </Text>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 12 },
  section: { padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  step: { color: colors.onSurface, fontSize: 13, lineHeight: 20, marginTop: 4 },
});
