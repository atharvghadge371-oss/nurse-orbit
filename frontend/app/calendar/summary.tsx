import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

export default function CalendarSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setS(await api.calSummary()); } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="sum-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title}>Leave & CME</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading && !s ? (
        <View style={{ padding: 40, alignItems: "center" }}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : s && (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brandPrimary} />}
        >
          <Card
            title="Annual leave"
            emoji="🏖️"
            rows={[
              ["Rate", `${s.al_rate_per_month} days / month`],
              ["Months worked", String(s.months_worked)],
              ["Accrued", String(s.al_accrued)],
              ["Taken", String(s.al_taken)],
            ]}
            big={{ label: "Remaining", value: String(s.al_remaining), accent: colors.success }}
          />
          <Card
            title="Sick leave"
            emoji="🤒"
            rows={[
              ["Rate", `${s.sick_rate_per_year} days / year`],
              ["Accrued", String(s.sick_accrued)],
              ["Taken", String(s.sick_taken)],
            ]}
            big={{ label: "Remaining", value: String(s.sick_remaining), accent: "#EF4444" }}
          />
          <Card
            title="Night shifts (last 6 months)"
            emoji="🌙"
            rows={[
              ["Count", String(s.night_shifts_6mo)],
            ]}
            big={{ label: "Nights", value: String(s.night_shifts_6mo), accent: colors.brandPrimary }}
          />
          <Card
            title="CME hours"
            emoji="🎓"
            rows={[
              ["Year to date", `${s.cme_hours_ytd} hrs`],
              ["All time", `${s.cme_hours_total} hrs`],
            ]}
            big={{ label: "YTD", value: `${s.cme_hours_ytd} hrs`, accent: colors.brandSecondary }}
          />

          <Pressable testID="sum-apply" onPress={() => router.push("/calendar/apply-leave" as any)} style={styles.primary}>
            <Text style={styles.primaryText}>Plan a leave window</Text>
          </Pressable>
          <Pressable testID="sum-settings" onPress={() => router.push("/calendar/settings" as any)} style={styles.secondary}>
            <Text style={styles.secondaryText}>Edit leave settings</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function Card({ title, emoji, rows, big }: { title: string; emoji: string; rows: [string, string][]; big: { label: string; value: string; accent: string } }) {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        <Text style={styles.cardH}>{title}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 10 }}>
        <View style={{ flex: 1 }}>
          {rows.map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text style={styles.rowK}>{k}</Text>
              <Text style={styles.rowV}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.bigBox, { borderColor: big.accent }]}>
          <Text style={[styles.bigValue, { color: big.accent }]}>{big.value}</Text>
          <Text style={styles.bigLabel}>{big.label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  cardH: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  rowK: { color: colors.muted, fontSize: 12 },
  rowV: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  bigBox: { width: 100, borderRadius: radius.md, borderWidth: 2, padding: 10, alignItems: "center", justifyContent: "center" },
  bigValue: { fontSize: 22, fontWeight: "800" },
  bigLabel: { color: colors.muted, fontSize: 10, marginTop: 2 },
  primary: { marginTop: 8, backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  secondary: { padding: 12, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center" },
  secondaryText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800" },
});
