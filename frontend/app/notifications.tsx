import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

const iconFor = (t: string) => t === "expired" ? "⛔" : t === "expiry" ? "⚠️" : t === "cme" ? "⏱" : "🔔";
const colorFor = (t: string) => t === "expired" ? colors.error : t === "expiry" ? colors.warning : colors.brandPrimary;

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="notif-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 30 }} />
      </View>
      {isLoading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom), gap: 10 }}>
          {(data?.notifications || []).map((n: any) => (
            <View key={n.id} style={styles.card} testID={`notif-${n.id}`}>
              <View style={[styles.dot, { backgroundColor: colorFor(n.type) + "22" }]}>
                <Text style={{ fontSize: 20 }}>{iconFor(n.type)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.text}>{n.title}</Text>
                {n.date && <Text style={styles.date}>{n.date}</Text>}
              </View>
            </View>
          ))}
          {(data?.notifications || []).length === 0 && <Text style={styles.empty}>No notifications</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  card: { flexDirection: "row", gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  dot: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  text: { color: colors.onSurface, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  date: { color: colors.muted, fontSize: 11, marginTop: 4 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 40 },
});
