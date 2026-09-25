import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, minTouchTarget, screenContentBottomPadding, spacing, radius } from "@/src/theme";

type Tile = { key: string; label: string; icon: string; color: string; to: string; testID: string; sub?: string };
export type AccessSection = { n: number; title: string; desc: string; tiles: Tile[] };

/**
 * Shared Access-Grid screen used for both Student and RN roles.
 * Pass a flat tile-set, or numbered sections (the Student area's 10 pillars), plus a role banner.
 */
export function AccessGrid({
  role,
  tagline,
  gradient,
  emoji,
  tiles,
  sections,
}: {
  role: string;
  tagline: string;
  gradient: [string, string];
  emoji: string;
  tiles?: Tile[];
  sections?: AccessSection[];
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      {/* Header */}
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable testID="access-back" onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle}>{emoji}  {role}</Text>
          <Text style={styles.hSub}>{tagline}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
        {tiles && (
          <View style={styles.grid}>
            {tiles.map((t) => (
              <Pressable key={t.key} testID={t.testID} style={styles.card} onPress={() => router.push(t.to as any)}>
                <View style={[styles.iconBox, { backgroundColor: t.color }]}>
                  <Text style={styles.icon}>{t.icon}</Text>
                </View>
                <Text style={styles.label} numberOfLines={2}>{t.label}</Text>
                {t.sub && <Text style={styles.sub} numberOfLines={2}>{t.sub}</Text>}
              </Pressable>
            ))}
          </View>
        )}
        {sections?.map((sec) => (
          <View key={sec.n} style={styles.section} testID={`pillar-${sec.n}`}>
            <View style={styles.secHead}>
              <View style={styles.secNum}><Text style={styles.secNumTxt}>{sec.n}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.secTitle}>{sec.title}</Text>
                <Text style={styles.secDesc}>{sec.desc}</Text>
              </View>
            </View>
            <View style={styles.grid}>
              {sec.tiles.map((t) => (
                <Pressable key={t.key} testID={t.testID} style={styles.miniCard} onPress={() => router.push(t.to as any)}>
                  <View style={[styles.miniIcon, { backgroundColor: t.color }]}>
                    <Text style={styles.miniIconTxt}>{t.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel} numberOfLines={2}>{t.label}</Text>
                    {t.sub && <Text style={styles.sub} numberOfLines={1}>{t.sub}</Text>}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.lg, paddingBottom: 18 },
  backBtn: { width: minTouchTarget, height: minTouchTarget, borderRadius: minTouchTarget / 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)" },
  backTxt: { color: "#FFF", fontSize: 24, fontWeight: "800", lineHeight: 26 },
  hTitle: { color: "#FFF", fontSize: 21, fontWeight: "900" },
  hSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600", marginTop: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { width: "48%", minHeight: 148, padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "flex-start", justifyContent: "center" },
  iconBox: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 28 },
  label: { color: colors.onSurface, fontSize: 13, fontWeight: "800", marginTop: 10, lineHeight: 17 },
  sub: { color: colors.muted, fontSize: 11, fontWeight: "600", marginTop: 3, lineHeight: 15 },
  section: { marginBottom: 20 },
  secHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  secNum: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: "#0F766E", alignItems: "center", justifyContent: "center" },
  secNumTxt: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  secTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "900" },
  secDesc: { color: colors.muted, fontSize: 11, fontWeight: "600", marginTop: 1, lineHeight: 15 },
  miniCard: { width: "48%", minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  miniIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  miniIconTxt: { fontSize: 20 },
  miniLabel: { color: colors.onSurface, fontSize: 12, fontWeight: "800", lineHeight: 16 },
});
