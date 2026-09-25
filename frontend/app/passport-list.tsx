// Passport list — hosts the same content that was in (tabs)/passport.tsx
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/src/api";
import { colors, minTouchTarget, screenContentBottomPadding, spacing, radius } from "@/src/theme";

const CATS = ["Identity", "Education", "Licensing", "Certifications", "Experience", "Language", "CME", "Career"];
const statusStyle: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: "#DCFCE7", fg: "#15803D" },
  "EXPIRING SOON": { bg: "#FEF3C7", fg: "#B45309" },
  EXPIRED: { bg: "#FEE2E2", fg: "#B91C1C" },
  MISSING: { bg: "#F1F5F9", fg: "#64748B" },
};

export default function Passport() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["documents"], queryFn: api.documents });
  const docs = data?.documents || [];
  const grouped: Record<string, any[]> = {};
  docs.forEach((d: any) => { grouped[d.category] = grouped[d.category] || []; grouped[d.category].push(d); });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="pp-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Professional Passport</Text>
        <View style={{ width: 30 }} />
      </View>
      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom) + minTouchTarget + spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} />}
        >
          {docs.length === 0 ? (
            <View style={{ alignItems: "center", padding: 40, gap: 8 }}>
              <Text style={{ fontSize: 56 }}>🛡</Text>
              <Text style={styles.emptyTitle}>Your vault is empty</Text>
              <Text style={styles.emptyText}>Add your first document — we'll monitor expiry and alert you.</Text>
            </View>
          ) : (
            CATS.filter((c) => grouped[c]?.length > 0).map((cat) => (
              <View key={cat} style={{ marginTop: 12 }}>
                <Text style={styles.sec}>{cat}</Text>
                {grouped[cat].map((d: any) => (
                  <View key={d.id} style={styles.docCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>{d.name}</Text>
                      {!!d.issuer && <Text style={styles.docMeta}>{d.issuer}</Text>}
                      {!!d.expiry_date && <Text style={styles.docMeta}>Expires: {d.expiry_date}</Text>}
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusStyle[d.status]?.bg }]}>
                      <Text style={[styles.badgeText, { color: statusStyle[d.status]?.fg }]}>{d.status}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
      <Pressable testID="pp-fab" accessibilityRole="button" accessibilityLabel="Upload a document" style={[styles.fab, { bottom: insets.bottom + spacing.lg }]} onPress={() => router.push("/document-upload" as any)}>
        <Text style={{ color: "#FFF", fontSize: 28, fontWeight: "800" }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  emptyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  sec: { color: colors.onSurface, fontSize: 15, fontWeight: "800", marginBottom: 10 },
  docCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  docName: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  docMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "800" },
  fab: { position: "absolute", right: spacing.lg, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
});
