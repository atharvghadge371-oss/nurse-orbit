import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, minTouchTarget, spacing, radius, tabContentBottomPadding } from "@/src/theme";

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["home"], queryFn: () => api.home() });
  const { data: gam, refetch: refG } = useQuery({ queryKey: ["gam"], queryFn: () => api.gamification() });

  const onRefresh = async () => { setRefreshing(true); await Promise.all([refetch(), refG()]); setRefreshing(false); };

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;

  const dailyPct = gam ? Math.min(100, Math.round((gam.daily_progress / gam.daily_goal) * 100)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabContentBottomPadding(insets.bottom) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Brand header */}
        <View style={styles.brandBlock}>
          <View>
            <Text style={styles.brandTitle}>Nurse Orbit</Text>
            <Text style={styles.brandTagline}>Study. Practice. Understand. Perform.</Text>
          </View>
          <Pressable testID="notif-btn" onPress={() => router.push("/notifications")} style={styles.iconBtn}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </Pressable>
        </View>

        <Text style={styles.greet} testID="home-greet">
          Good day, <Text style={{ color: colors.brandPrimary }}>{(user?.name || "Nurse").split(" ")[0]}</Text> 👋
        </Text>
        {user?.user_type && <Text style={styles.userMeta}>{user.user_type}{user.year ? ` · ${user.year}` : ""}</Text>}

        {/* Gamification strip */}
        {gam && (
          <View style={styles.gamStrip} testID="gam-strip">
            <View style={styles.gamItem}><Text style={styles.gamValue}>{gam.xp}</Text><Text style={styles.gamLabel}>XP</Text></View>
            <View style={styles.gamItem}><Text style={styles.gamValue}>🔥 {gam.streak}</Text><Text style={styles.gamLabel}>Streak</Text></View>
            <View style={styles.gamItem}><Text style={styles.gamValue}>L{gam.level}</Text><Text style={styles.gamLabel}>Level</Text></View>
            <View style={[styles.gamItem, { flex: 2 }]}>
              <Text style={styles.gamLabel}>Today ({gam.daily_progress}/{gam.daily_goal})</Text>
              <View style={styles.pBar}><View style={[styles.pFill, { width: `${dailyPct}%` }]} /></View>
            </View>
          </View>
        )}

        {/* Primary — Health Nurse AI */}
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Your AI Companion</Text></View>
        <Pressable testID="ask-ai-hero" style={styles.aiHero} onPress={() => router.push("/(tabs)/ai-tab" as any)}>
          <LinearGradient colors={[colors.brandPrimary, colors.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiHeroGrad}>
            <View style={styles.aiBadge}><Text style={{ fontSize: 32 }}>🤖</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiHeroTitle}>Health Nurse AI Chat</Text>
              <Text style={styles.aiHeroSub}>24/7 clinical &amp; study companion. Ask anything.</Text>
            </View>
            <Text style={{ fontSize: 28, color: "#FFF" }}>›</Text>
          </LinearGradient>
        </Pressable>

        {/* Role-based access tiles */}
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Choose your access</Text></View>
        <View style={styles.roleRow}>
          <Pressable testID="role-student" style={styles.roleCard} onPress={() => router.push("/access/student" as any)}>
            <LinearGradient colors={["#0D9488", "#0369A1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.roleGrad}>
              <Text style={styles.roleEmoji}>🎓</Text>
              <Text style={styles.roleTitle}>Student Nurse</Text>
              <Text style={styles.roleSub}>Learn · Practice · Simulate</Text>
              <View style={styles.roleTags}>
                <Text style={styles.roleTag}>Journey</Text>
                <Text style={styles.roleTag}>NCLEX</Text>
                <Text style={styles.roleTag}>10 pillars</Text>
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable testID="role-rn" style={styles.roleCard} onPress={() => router.push("/access/rn" as any)}>
            <LinearGradient colors={["#1E3A8A", "#B91C1C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.roleGrad}>
              <Text style={styles.roleEmoji}>👩‍⚕️</Text>
              <Text style={styles.roleTitle}>Registered Nurse</Text>
              <Text style={styles.roleSub}>Duty · Career · Abroad</Text>
              <View style={styles.roleTags}>
                <Text style={styles.roleTag}>Roster</Text>
                <Text style={styles.roleTag}>Jobs</Text>
                <Text style={styles.roleTag}>Abroad</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Continue Learning */}
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Continue Learning</Text></View>
        <Pressable testID="continue-card" style={styles.continueCard} onPress={() => router.push("/(tabs)/study")}>
          <LinearGradient colors={[colors.brand, colors.brandPrimary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.continueGrad}>
            <View style={{ flex: 1 }}>
              <Text style={styles.continueSubj}>{data?.continue_learning?.subject || "Medical-Surgical Nursing"}</Text>
              <Text style={styles.continueChapter}>{data?.continue_learning?.topic || "Cardiovascular Disorders"}</Text>
              <View style={styles.pBarLight}><View style={[styles.pFill, { width: `${data?.continue_learning?.progress || 68}%`, backgroundColor: colors.brandSecondary }]} /></View>
              <Text style={styles.continueMeta}>{data?.continue_learning?.progress || 68}% complete</Text>
            </View>
            <View style={styles.continueArrow}><Text style={{ fontSize: 20, color: "#FFF" }}>→</Text></View>
          </LinearGradient>
        </Pressable>

        {/* Today's challenge */}
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Today's Challenge</Text></View>
        <Pressable testID="daily-challenge" style={styles.challengeCard} onPress={() => router.push("/(tabs)/exams")}>
          <View style={styles.badge}><Text style={{ fontSize: 20 }}>🎯</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.chalTitle}>Daily 10-question MCQ challenge</Text>
            <Text style={styles.chalSub}>Earn XP and keep your streak alive</Text>
          </View>
          <View style={styles.startPill}><Text style={styles.startPillText}>Start</Text></View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  brandBlock: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 6 },
  brandTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  brandTagline: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700", marginTop: 2 },
  iconBtn: { width: minTouchTarget, height: minTouchTarget, borderRadius: minTouchTarget / 2, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  greet: { color: colors.onSurface, fontSize: 22, fontWeight: "800", paddingHorizontal: spacing.lg, marginTop: 12 },
  userMeta: { color: colors.muted, fontSize: 13, paddingHorizontal: spacing.lg, marginTop: 2, fontWeight: "600" },
  gamStrip: { flexDirection: "row", gap: 10, marginHorizontal: spacing.lg, marginTop: 14, backgroundColor: colors.surface, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  gamItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  gamValue: { color: colors.brandPrimary, fontSize: 16, fontWeight: "800" },
  gamLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", marginTop: 2 },
  pBar: { height: 4, backgroundColor: colors.surfaceTertiary, borderRadius: 999, marginTop: 6, overflow: "hidden" },
  pBarLight: { height: 5, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, marginTop: 10, overflow: "hidden" },
  pFill: { height: "100%", backgroundColor: colors.brandPrimary },
  sectionHead: { paddingHorizontal: spacing.lg, marginTop: 22, marginBottom: 12 },
  sectionTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  aiHero: { marginHorizontal: spacing.lg, borderRadius: radius.lg, overflow: "hidden" },
  aiHeroGrad: { padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  aiBadge: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  aiHeroTitle: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  aiHeroSub: { color: "#CBD5E1", fontSize: 12, marginTop: 3 },
  roleRow: { flexDirection: "row", gap: 10, paddingHorizontal: spacing.lg },
  roleCard: { flex: 1, minWidth: 0, borderRadius: radius.lg, overflow: "hidden" },
  roleGrad: { padding: 14, minHeight: 172, justifyContent: "space-between" },
  roleEmoji: { fontSize: 36 },
  roleTitle: { color: "#FFF", fontSize: 16, fontWeight: "900", marginTop: 8 },
  roleSub: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700", marginTop: 4 },
  roleTags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 10 },
  roleTag: { color: "#FFF", fontSize: 9, fontWeight: "800", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" },
  continueCard: { marginHorizontal: spacing.lg, borderRadius: radius.lg, overflow: "hidden" },
  continueGrad: { padding: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  continueSubj: { color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  continueChapter: { color: "#FFF", fontSize: 17, fontWeight: "800", marginTop: 4 },
  continueMeta: { color: "#CBD5E1", fontSize: 11, fontWeight: "700", marginTop: 6 },
  continueArrow: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  challengeCard: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: spacing.lg, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  badge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  chalTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  chalSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  startPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.brandSecondary },
  startPillText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
});
