import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

export default function NursingScopeHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scopes, setScopes] = useState<any[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([api.nurseScopes(), api.nurseTrends()]);
        setScopes(s.scopes || []); setCats(s.categories || []);
        setTrends(t.trends || []);
      } catch (e: any) { console.log(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() =>
    category ? scopes.filter((s) => s.category === category) : scopes
  , [scopes, category]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="ns-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View>
          <Text style={styles.title}>Scope of Nursing</Text>
          <Text style={styles.subtitle}>Career pathways & current trends</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 14, paddingBottom: 60 }}>
          <View style={styles.hero}>
            <Text style={styles.heroT}>🎓 After BSc Nursing — where next?</Text>
            <Text style={styles.heroS}>Explore 15+ nursing specializations with step-by-step "how to become", accepted countries, salary ranges and current global demand.</Text>
          </View>

          {/* Trends */}
          <Text style={styles.sectionH}>🌍 Current trends in nursing</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
            {trends.map((t) => (
              <View key={t.id} style={styles.trendCard}>
                <Text style={{ fontSize: 24 }}>{t.emoji}</Text>
                <Text style={styles.trendTitle}>{t.title}</Text>
                <Text style={styles.trendSum} numberOfLines={5}>{t.summary}</Text>
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.trendStudyH}>Study →</Text>
                  {(t.what_to_study || []).slice(0, 3).map((w: string) => (
                    <Text key={w} style={styles.trendStudy}>• {w}</Text>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Category chips */}
          <Text style={styles.sectionH}>🩺 Specializations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <Chip label="All" on={!category} onPress={() => setCategory(null)} />
            {cats.map((c) => <Chip key={c} label={c} on={category === c} onPress={() => setCategory(c)} />)}
          </ScrollView>

          <View style={{ gap: 8 }}>
            {filtered.map((s) => (
              <Pressable key={s.id} testID={`scope-${s.id}`} onPress={() => router.push(`/nursing-scope/${s.id}` as any)} style={styles.tile}>
                <View style={styles.tileIcon}><Text style={{ fontSize: 26 }}>{s.emoji}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tileTitle}>{s.name}</Text>
                  <Text style={styles.tileCat}>{s.category}</Text>
                  <Text style={styles.tileSum} numberOfLines={2}>{s.short_desc}</Text>
                  {!!s.trend && <Text style={styles.tileTrend}>📈 {s.trend}</Text>}
                </View>
                <Text style={{ color: colors.muted, fontSize: 22 }}>›</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
      <Text style={[styles.chipText, on && { color: "#FFF" }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center" },
  hero: { backgroundColor: colors.brand, padding: 16, borderRadius: radius.lg, gap: 6 },
  heroT: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  heroS: { color: "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 18 },
  sectionH: { color: colors.onSurface, fontSize: 14, fontWeight: "800", marginTop: 4 },
  trendCard: { width: 220, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 4 },
  trendTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "800", marginTop: 4 },
  trendSum: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  trendStudyH: { color: colors.brandPrimary, fontSize: 10, fontWeight: "800", textTransform: "uppercase", marginTop: 6 },
  trendStudy: { color: colors.onSurfaceSecondary, fontSize: 11, marginTop: 2 },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipText: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  tile: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  tileIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  tileTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  tileCat: { color: colors.brandPrimary, fontSize: 10, fontWeight: "800", textTransform: "uppercase", marginTop: 2 },
  tileSum: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 4 },
  tileTrend: { color: colors.success, fontSize: 10, fontWeight: "700", marginTop: 4 },
});
