import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, tabContentBottomPadding } from "@/src/theme";
import { appVisuals } from "@/src/visuals";

const MODES = [
  { key: "practice", label: "Quick 10", icon: "⚡", desc: "10 questions", color: "#0D9488" },
  { key: "practice-25", label: "Practice 25", icon: "🎯", desc: "25 questions", color: "#1E3A8A" },
  { key: "mock", label: "Mock Exam", icon: "📝", desc: "100 questions", color: "#EA580C" },
  { key: "weak", label: "Weak Areas", icon: "🧠", desc: "AI-picked topics", color: "#8B5CF6" },
  { key: "bookmarked", label: "Bookmarked", icon: "🔖", desc: "Your saved questions", color: "#F59E0B" },
  { key: "incorrect", label: "Incorrect", icon: "🔁", desc: "Review your mistakes", color: "#B91C1C" },
];

const CATEGORIES = [
  { key: "cases", label: "Clinical Cases", icon: "🩺", desc: "Interactive simulations", to: "/cases", color: "#0D9488" },
  { key: "diag", label: "Nursing Diagnosis", icon: "🧠", desc: "AI-guided", to: "/nursing-diagnosis", color: "#8B5CF6" },
  { key: "plans", label: "Care Plans", icon: "📝", desc: "Build & save", to: "/care-plans", color: "#059669" },
  { key: "ecg", label: "ECG Cases", icon: "🫀", desc: "Identify rhythms", to: "/ecg-learning", color: "#DC2626" },
  { key: "nclex", label: "NCLEX / Prometric", icon: "🎓", desc: "International prep", to: "/nclex", color: "#3B82F6" },
  { key: "exam", label: "Exam Center", icon: "🏛", desc: "DOH, DHA, NMC, NCLEX", to: "/abroad-list", color: "#0F172A" },
];

export default function Practice() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: stats } = useQuery({ queryKey: ["qstats"], queryFn: api.qStats });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.subtitle}>Test your knowledge & sharpen clinical reasoning</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabContentBottomPadding(insets.bottom) }}>
        <Pressable testID="practice-featured-quiz" style={styles.featured} onPress={() => router.push("/quiz/practice" as any)}>
          <Image source={appVisuals.examPrep} style={styles.featuredImage} contentFit="cover" contentPosition="center" />
          <LinearGradient colors={["rgba(10,25,49,0.12)", "rgba(10,25,49,0.9)"]} style={styles.featuredShade}>
            <Text style={styles.featuredEyebrow}>DAILY PRACTICE</Text>
            <Text style={styles.featuredTitle}>Turn focused practice into exam-day calm</Text>
            <Text style={styles.featuredAction}>Start a quick 10  →</Text>
          </LinearGradient>
        </Pressable>
        <View style={styles.statBox}>
          <View style={styles.statItem}><Text style={styles.statNum}>{stats?.attempted ?? 0}</Text><Text style={styles.statLbl}>Attempted</Text></View>
          <View style={styles.statSep} />
          <View style={styles.statItem}><Text style={styles.statNum}>{stats?.accuracy ?? 0}%</Text><Text style={styles.statLbl}>Accuracy</Text></View>
          <View style={styles.statSep} />
          <View style={styles.statItem}><Text style={styles.statNum}>{stats?.correct ?? 0}</Text><Text style={styles.statLbl}>Correct</Text></View>
        </View>

        <Text style={styles.sec}>MCQ Modes</Text>
        <View style={styles.grid}>
          {MODES.map((m) => (
            <Pressable key={m.key} testID={`mode-${m.key}`} style={styles.modeCard} onPress={() => router.push(`/quiz/${m.key.replace("-25","")}` as any)}>
              <View style={[styles.modeIcon, { backgroundColor: m.color + "22" }]}>
                <Text style={{ fontSize: 22 }}>{m.icon}</Text>
              </View>
              <Text style={styles.modeLbl}>{m.label}</Text>
              <Text style={styles.modeDesc}>{m.desc}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sec}>Simulation & Preparation</Text>
        {CATEGORIES.map((c) => (
          <Pressable key={c.key} testID={`cat-${c.key}`} style={styles.rowCard} onPress={() => router.push(c.to as any)}>
            <View style={[styles.rowIcon, { backgroundColor: c.color }]}><Text style={{ fontSize: 22 }}>{c.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLbl}>{c.label}</Text>
              <Text style={styles.rowDesc}>{c.desc}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  featured: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.brand, marginBottom: 14 },
  featuredImage: { width: "100%", height: "100%" },
  featuredShade: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", padding: 16 },
  featuredEyebrow: { color: "#BFDBFE", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  featuredTitle: { color: "#FFF", fontSize: 19, lineHeight: 24, fontWeight: "900", maxWidth: "88%", marginTop: 5 },
  featuredAction: { color: "#FFF", fontSize: 12, fontWeight: "800", marginTop: 10 },
  statBox: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { color: colors.brandPrimary, fontSize: 22, fontWeight: "800" },
  statLbl: { color: colors.muted, fontSize: 11, marginTop: 4, fontWeight: "700" },
  statSep: { width: 1, backgroundColor: colors.divider },
  sec: { color: colors.onSurface, fontSize: 17, fontWeight: "800", marginTop: 24, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  modeCard: { width: "48%", minHeight: 126, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 6 },
  modeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  modeLbl: { color: colors.onSurface, fontSize: 15, fontWeight: "800", marginTop: 6 },
  modeDesc: { color: colors.muted, fontSize: 11 },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 76, padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  rowIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  rowLbl: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  rowDesc: { color: colors.muted, fontSize: 11, marginTop: 2 },
  arrow: { color: colors.muted, fontSize: 26 },
});
