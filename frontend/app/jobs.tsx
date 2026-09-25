import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

export default function Jobs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: () => api.jobs() });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="jobs-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Nursing Jobs</Text>
        <View style={{ width: 30 }} />
      </View>

      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 12 }}>
          {(data?.jobs || []).map((j: any) => (
            <View key={j.id} style={styles.card} testID={`job-${j.id}`}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 32 }}>{j.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pos}>{j.position}</Text>
                  <Text style={styles.employer}>{j.employer}</Text>
                  <Text style={styles.location}>{j.city}, {j.country}</Text>
                </View>
              </View>
              <View style={styles.meta}>
                <Chip label={j.specialty} />
                <Chip label={j.experience} />
                <Chip label={j.type} />
              </View>
              <View style={styles.footer}>
                <Text style={styles.salary}>{j.salary}</Text>
                <Text style={styles.posted}>{j.posted}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Pressable style={styles.saveBtn} testID={`save-job-${j.id}`}><Text style={styles.saveText}>Save</Text></Pressable>
                <Pressable style={styles.applyBtn} testID={`apply-job-${j.id}`}><Text style={styles.applyText}>Apply</Text></Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Chip({ label }: { label: string }) { return <View style={styles.chip}><Text style={styles.chipText}>{label}</Text></View>; }

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  card: { backgroundColor: colors.surface, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  pos: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  employer: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700", marginTop: 2 },
  location: { color: colors.muted, fontSize: 12, marginTop: 2 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surfaceTertiary },
  chipText: { fontSize: 11, color: colors.onSurfaceSecondary, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, alignItems: "center" },
  salary: { color: colors.success, fontSize: 14, fontWeight: "800" },
  posted: { color: colors.muted, fontSize: 12 },
  saveBtn: { flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  saveText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  applyBtn: { flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center" },
  applyText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
