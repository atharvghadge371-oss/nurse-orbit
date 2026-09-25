import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { api } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

export default function NursingScopeDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setS(await api.nurseScope(String(id))); }
      catch (e: any) { console.log(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="nsd-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title} numberOfLines={1}>{s?.name || "Scope"}</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : s && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 14, paddingBottom: 60 }}>
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>{s.emoji}</Text>
            <Text style={styles.heroT}>{s.name}</Text>
            <Text style={styles.heroCat}>{s.category}</Text>
            <Text style={styles.heroDesc}>{s.short_desc}</Text>
            {!!s.trend && (
              <View style={styles.trendPill}>
                <Text style={styles.trendPillTxt}>📈 {s.trend}</Text>
              </View>
            )}
          </View>

          {!!(s.why_choose || []).length && (
            <Section title="Why choose this specialty" emoji="✨">
              {s.why_choose.map((p: string, i: number) => <Bullet key={i} text={p} />)}
            </Section>
          )}

          <Section title="How to become" emoji="🛤️">
            {(s.how_to_become || []).map((p: string, i: number) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumTxt}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{p}</Text>
              </View>
            ))}
          </Section>

          <Section title="Core skills" emoji="🧠">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(s.core_skills || []).map((skill: string, i: number) => (
                <View key={i} style={styles.skillChip}>
                  <Text style={styles.skillTxt}>{skill}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Accepted countries" emoji="🌍">
            {(s.countries || []).map((c: any, i: number) => (
              <View key={i} style={styles.country}>
                <Text style={styles.countryFlag}>🏳️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.countryName}>{c.name}</Text>
                  <Text style={styles.countryNote}>{c.note}</Text>
                </View>
              </View>
            ))}
          </Section>

          {!!s.typical_salary && (
            <View style={styles.salaryCard}>
              <Text style={styles.salaryH}>💰 Typical salary</Text>
              <Text style={styles.salaryV}>{s.typical_salary}</Text>
              <Text style={styles.salaryN}>Ranges vary by experience, hospital type and city. Reference only.</Text>
            </View>
          )}

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerT}>⚠︎ Certification names, exam formats and eligibility change periodically. Confirm current requirements with the relevant nursing council before enrolling.</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Section({ title, emoji, children }: { title: string; emoji: string; children: any }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={{ marginTop: 6, gap: 6 }}>{children}</View>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ color: colors.brandPrimary, fontSize: 14, fontWeight: "800", marginTop: 1 }}>•</Text>
      <Text style={{ flex: 1, color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "800", flex: 1, textAlign: "center" },
  hero: { backgroundColor: colors.brand, padding: 18, borderRadius: radius.lg, alignItems: "center", gap: 6 },
  heroEmoji: { fontSize: 44 },
  heroT: { color: "#FFF", fontSize: 20, fontWeight: "900", textAlign: "center" },
  heroCat: { color: "#E0F2FE", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  heroDesc: { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 6 },
  trendPill: { marginTop: 10, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  trendPillTxt: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  step: { flexDirection: "row", gap: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  stepNumTxt: { color: "#FFF", fontSize: 11, fontWeight: "900" },
  stepText: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.brandTertiary },
  skillTxt: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800" },
  country: { flexDirection: "row", gap: 10, padding: 10, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  countryFlag: { fontSize: 20 },
  countryName: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  countryNote: { color: colors.muted, fontSize: 11, marginTop: 2, lineHeight: 15 },
  salaryCard: { backgroundColor: "#ECFDF5", padding: 14, borderRadius: radius.md, borderLeftWidth: 4, borderLeftColor: colors.success, gap: 4 },
  salaryH: { color: "#065F46", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  salaryV: { color: "#064E3B", fontSize: 15, fontWeight: "800" },
  salaryN: { color: "#065F46", fontSize: 11 },
  disclaimer: { padding: 12, borderRadius: radius.md, backgroundColor: "#FEF3C7" },
  disclaimerT: { color: "#92400E", fontSize: 11, lineHeight: 16 },
});
