import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

export default function ExamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["exam", id], queryFn: () => api.exam(id!) });

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;
  const e = data.exam;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="exam-back" onPress={() => router.back()} style={{ padding: 8 }}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.headerTitle}>{e.name}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
        <Text style={styles.flag}>{e.flag}</Text>
        <Text style={styles.title}>{e.full_name}</Text>
        <Text style={styles.country}>{e.country}</Text>

        <Section title="Overview" body={e.overview} />
        <Section title="Eligibility" body={e.eligibility} />
        <Section title="Education" body={e.education} />

        <Text style={styles.h}>Required Documents</Text>
        {e.documents.map((d: string, i: number) => <Text key={i} style={styles.bullet}>• {d}</Text>)}

        <Section title="Application Process" body={e.process} />
        <Section title="Renewal" body={e.renewal} />

        <View style={styles.sourceBox}>
          <Text style={styles.sourceLabel}>Last Reviewed: {e.last_reviewed}</Text>
          <Pressable onPress={() => Linking.openURL(e.official)} testID="official-link">
            <Text style={styles.link}>Official source: {e.official}</Text>
          </Pressable>
          <Text style={styles.disclaimer}>Regulatory information is for educational guidance. Always confirm with the official regulator.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <>
      <Text style={styles.h}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface },
  headerTitle: { flex: 1, color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  flag: { fontSize: 48 },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "800", marginTop: 8 },
  country: { color: colors.muted, fontSize: 14, marginTop: 4 },
  h: { color: colors.brandPrimary, fontSize: 13, fontWeight: "800", marginTop: 20, textTransform: "uppercase", letterSpacing: 0.5 },
  body: { color: colors.onSurface, fontSize: 14, marginTop: 8, lineHeight: 22 },
  bullet: { color: colors.onSurface, fontSize: 14, marginTop: 6, lineHeight: 20 },
  sourceBox: { marginTop: 24, padding: 16, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 8 },
  sourceLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  link: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700" },
  disclaimer: { color: colors.muted, fontSize: 11, marginTop: 4, fontStyle: "italic" },
});
