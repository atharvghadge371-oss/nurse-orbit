import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { colors, spacing, radius, tabContentBottomPadding } from "@/src/theme";

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: gam } = useQuery({ queryKey: ["gam"], queryFn: api.gamification });

  const menu = [
    { label: "Clinical Logbook", icon: "📓", to: "/logbook" },
    { label: "AI Nurse persona", icon: "🤖", to: "/tools/ai-persona" },
    { label: "My Health", icon: "❤️", to: "/health" },
    { label: "Career Development", icon: "🚀", to: "/career" },
    { label: "Translator", icon: "🌐", to: "/tools/translator" },
    { label: "Nursing Library", icon: "📚", to: "/library" },
    { label: "Notifications", icon: "🔔", to: "/notifications" },
    { label: "About Nurse Orbit", icon: "ℹ️", to: "/about" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabContentBottomPadding(insets.bottom) }}>
        <View style={styles.card}>
          <View style={styles.avatar}><Text style={{ fontSize: 36, color: "#FFF" }}>{(user?.name || "N")[0].toUpperCase()}</Text></View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.tagRow}>
            {user?.user_type && <Tag>{user.user_type}</Tag>}
            {user?.qualification && <Tag>{user.qualification}</Tag>}
            {user?.year && <Tag>{user.year}</Tag>}
            {user?.country && <Tag>{user.country}</Tag>}
          </View>
        </View>

        {gam && (
          <View style={styles.gamCard}>
            <View style={styles.gamItem}><Text style={styles.gamNum}>{gam.xp}</Text><Text style={styles.gamLbl}>XP</Text></View>
            <View style={styles.gamItem}><Text style={styles.gamNum}>🔥 {gam.streak}</Text><Text style={styles.gamLbl}>Streak</Text></View>
            <View style={styles.gamItem}><Text style={styles.gamNum}>L{gam.level}</Text><Text style={styles.gamLbl}>Level</Text></View>
            <View style={styles.gamItem}><Text style={styles.gamNum}>{gam.badges.length}</Text><Text style={styles.gamLbl}>Badges</Text></View>
          </View>
        )}

        <View style={styles.menuBox}>
          {menu.map((m, i) => (
            <Pressable key={m.label} testID={`p-menu-${m.label.replace(/\s+/g, "-")}`} onPress={() => m.to && router.push(m.to as any)} style={[styles.menuItem, i < menu.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
              <Text style={{ fontSize: 20, width: 30 }}>{m.icon}</Text>
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable testID="p-logout" style={styles.logout} onPress={async () => { await logout(); router.replace("/(auth)/welcome"); }}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Tag({ children }: any) { return <View style={styles.tag}><Text style={styles.tagText}>{children}</Text></View>; }

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, padding: 24, backgroundColor: colors.surface, borderRadius: radius.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border, gap: 6 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  name: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  email: { color: colors.muted, fontSize: 13 },
  tagRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.brandTertiary },
  tagText: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800" },
  gamCard: { flexDirection: "row", marginHorizontal: spacing.lg, marginTop: 16, padding: 16, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: 10 },
  gamItem: { flex: 1, alignItems: "center" },
  gamNum: { color: colors.brandPrimary, fontSize: 16, fontWeight: "800" },
  gamLbl: { color: colors.muted, fontSize: 10, fontWeight: "700", marginTop: 4 },
  menuBox: { marginHorizontal: spacing.lg, marginTop: 20, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", minHeight: 56, padding: 16 },
  menuLabel: { flex: 1, color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  arrow: { fontSize: 22, color: colors.muted },
  logout: { marginHorizontal: spacing.lg, marginTop: 20, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: "center", borderWidth: 1, borderColor: colors.error },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: "800" },
});
