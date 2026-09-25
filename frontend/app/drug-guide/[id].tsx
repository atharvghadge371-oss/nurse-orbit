import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

const SECTIONS: [string, string, string][] = [
  ["Indications", "indications", "💠"],
  ["Mechanism of Action", "moa", "⚙️"],
  ["Common Adverse Effects", "common_effects", "⚠️"],
  ["Serious Adverse Effects", "serious_effects", "🚨"],
  ["Contraindications", "contraindications", "⛔"],
  ["Nursing Considerations", "nursing", "👩‍⚕️"],
  ["Monitoring", "monitoring", "📊"],
  ["Patient Education", "education", "📚"],
];

export default function DrugDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["drug", id], queryFn: () => api.drug(id!) });

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;
  const d = data.drug;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="drug-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{d.name}</Text>
          <Text style={styles.cls}>{d.class}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 12 }}>
        {SECTIONS.map(([label, key, icon]) => {
          const val = (d as any)[key];
          if (!val) return null;
          return (
            <View key={key} style={styles.section} testID={`section-${key}`}>
              <Text style={styles.sectionTitle}>{icon} {label}</Text>
              {Array.isArray(val) ? (
                val.map((v: string, i: number) => <Text key={i} style={styles.bullet}>• {v}</Text>)
              ) : (
                <Text style={styles.body}>{String(val)}</Text>
              )}
            </View>
          );
        })}
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>{data.disclaimer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  name: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  cls: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700", marginTop: 2 },
  section: { padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  bullet: { color: colors.onSurface, fontSize: 13, lineHeight: 20, marginTop: 4 },
  body: { color: colors.onSurface, fontSize: 13, lineHeight: 20 },
  warnBox: { padding: 14, borderRadius: radius.md, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: colors.warning },
  warnText: { color: "#92400E", fontSize: 12, lineHeight: 18, fontWeight: "600" },
});
