import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const menu = [
    { label: "My Profile", icon: "👤", onPress: () => {} },
    { label: "Clinical Logbook", icon: "📓", onPress: () => router.push("/logbook" as any) },
    { label: "Nursing Library", icon: "📖", onPress: () => router.push("/library") },
    { label: "Professional Passport", icon: "🛡", onPress: () => router.push("/passport-list" as any) },
    { label: "CME / CPD", icon: "⏱", onPress: () => router.push("/cme") },
    { label: "Nursing Jobs", icon: "💼", onPress: () => router.push("/jobs") },
    { label: "Nursing News", icon: "📰", onPress: () => router.push("/news") },
    { label: "AI Nurse", icon: "💬", onPress: () => router.push("/ai-nurse") },
    { label: "Notifications", icon: "🔔", onPress: () => router.push("/notifications") },
    { label: "Subscription", icon: "⭐", onPress: () => {} },
    { label: "Security", icon: "🔒", onPress: () => {} },
    { label: "Privacy", icon: "🛡", onPress: () => {} },
    { label: "Help & Support", icon: "❔", onPress: () => {} },
    { label: "About Nurse Orbit", icon: "ℹ", onPress: () => {} },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="profile-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
        <View style={styles.card}>
          <View style={styles.avatar}><Text style={{ fontSize: 36, color: "#FFF" }}>{(user?.name || "N")[0].toUpperCase()}</Text></View>
          <Text style={styles.name} testID="profile-name">{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.tagRow}>
            {user?.qualification && <Tag>{user.qualification}</Tag>}
            {user?.country && <Tag>{user.country}</Tag>}
          </View>
          {user?.goal && <Text style={styles.goal}>Goal: {user.goal}</Text>}
        </View>

        <View style={{ marginTop: 24, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
          {menu.map((m, i) => (
            <Pressable key={m.label} testID={`menu-${m.label.replace(/\s+/g, "-")}`} onPress={m.onPress} style={[styles.menuItem, i < menu.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
              <Text style={{ fontSize: 20, width: 30 }}>{m.icon}</Text>
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable testID="logout-btn" style={styles.logout} onPress={async () => { await logout(); router.replace("/(auth)/welcome"); }}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Tag({ children }: any) { return <View style={styles.tag}><Text style={styles.tagText}>{children}</Text></View>; }

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  card: { backgroundColor: colors.surface, padding: 24, borderRadius: radius.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border, gap: 6 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  name: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  email: { color: colors.muted, fontSize: 13 },
  tagRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.brandTertiary },
  tagText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700" },
  goal: { color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 8, fontWeight: "600" },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  menuLabel: { flex: 1, color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  arrow: { fontSize: 22, color: colors.muted },
  logout: { padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: "center", marginTop: 24, borderWidth: 1, borderColor: colors.error },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: "700" },
});
