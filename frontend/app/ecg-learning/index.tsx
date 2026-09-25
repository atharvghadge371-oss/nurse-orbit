import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

type ECGVisual = { waveform: string; readout: string };

// These compact rhythm strips are intentionally drawn rather than photographed.
// A photograph of unrelated anatomy is not useful when the learner is asked to
// identify a rhythm, and `contain`-style vector artwork remains crisp on every
// phone size.
const ECG_VISUALS: Record<string, ECGVisual> = {
  "ecg-01": {
    readout: "Regular • 70 bpm",
    waveform: "M0 76 L16 76 L24 76 L30 69 L36 82 L44 76 L48 37 L55 102 L62 75 L72 76 L84 70 L92 76 L106 76 L114 76 L120 69 L126 82 L134 76 L138 37 L145 102 L152 75 L162 76 L174 70 L182 76 L196 76 L204 76 L210 69 L216 82 L224 76 L228 37 L235 102 L242 75 L252 76 L264 70 L272 76 L286 76 L294 76 L300 69 L306 82 L314 76 L318 37 L325 102 L332 75 L342 76 L354 70 L360 76",
  },
  "ecg-02": {
    readout: "Irregular • 110 bpm",
    waveform: "M0 76 Q8 69 16 78 Q24 71 32 77 L40 75 L46 34 L53 102 L60 75 Q68 69 76 78 Q84 68 92 77 Q100 70 108 76 L122 76 L128 36 L135 101 L142 76 Q150 67 158 79 Q166 69 174 77 L188 76 L194 35 L201 102 L208 75 Q216 69 224 78 Q232 67 240 77 Q248 71 256 76 L274 76 L280 34 L287 102 L294 75 Q302 68 310 78 Q318 69 326 77 Q334 70 342 76 L360 76",
  },
  "ecg-03": {
    readout: "Wide-complex • 180 bpm",
    waveform: "M0 76 L14 76 L22 65 L31 32 L42 19 L54 47 L67 98 L80 76 L96 76 L104 65 L113 32 L124 19 L136 47 L149 98 L162 76 L178 76 L186 65 L195 32 L206 19 L218 47 L231 98 L244 76 L260 76 L268 65 L277 32 L288 19 L300 47 L313 98 L326 76 L360 76",
  },
  "ecg-04": {
    readout: "ST elevation • V2–V4",
    waveform: "M0 76 L16 76 L24 76 L30 69 L36 82 L44 76 L48 37 L55 102 L62 57 L82 57 L94 62 L104 76 L116 76 L124 76 L130 69 L136 82 L144 76 L148 37 L155 102 L162 57 L182 57 L194 62 L204 76 L216 76 L224 76 L230 69 L236 82 L244 76 L248 37 L255 102 L262 57 L282 57 L294 62 L304 76 L316 76 L324 76 L330 69 L336 82 L344 76 L348 37 L355 102 L360 57",
  },
  "ecg-05": {
    readout: "Chaotic rhythm • no organised QRS",
    waveform: "M0 76 C7 38 14 100 21 58 C28 15 35 105 43 49 C50 23 57 95 65 65 C73 19 80 110 88 54 C96 31 103 97 111 46 C119 12 126 108 134 62 C142 28 149 95 157 52 C165 17 172 112 180 47 C188 34 195 99 203 61 C211 16 218 108 226 50 C234 26 241 100 249 58 C257 18 264 105 272 44 C280 35 287 97 295 54 C303 14 310 112 318 60 C326 24 333 96 341 49 C348 19 354 99 360 65",
  },
};

function ECGStrip({ caseId }: { caseId: string }) {
  const visual = ECG_VISUALS[caseId] ?? ECG_VISUALS["ecg-01"];

  return (
    <View accessibilityLabel={`ECG rhythm strip, ${visual.readout}`} style={styles.ecgStrip}>
      <View style={styles.ecgStripHeader}>
        <Text style={styles.ecgLead}>LEAD II · 25 mm/s</Text>
        <Text style={styles.ecgReadout}>{visual.readout}</Text>
      </View>
      <Svg width="100%" height={124} viewBox="0 0 360 124" preserveAspectRatio="none">
        {[...Array(19)].map((_, index) => (
          <Line key={`vertical-${index}`} x1={index * 20} y1="0" x2={index * 20} y2="124" stroke="rgba(94,234,212,0.13)" strokeWidth="1" />
        ))}
        {[...Array(7)].map((_, index) => (
          <Line key={`horizontal-${index}`} x1="0" y1={index * 20 + 2} x2="360" y2={index * 20 + 2} stroke="rgba(94,234,212,0.13)" strokeWidth="1" />
        ))}
        <Path d={visual.waveform} stroke="#5EEAD4" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export default function ECG() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [caseId, setCaseId] = useState<string | null>(null);
  const { data: list } = useQuery({ queryKey: ["ecg-list"], queryFn: api.ecgCases });
  const { data: cs } = useQuery({ queryKey: ["ecg", caseId], queryFn: () => api.ecgCase(caseId!), enabled: !!caseId });
  const [sel, setSel] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);

  const openCase = (id: string) => { setCaseId(id); setSel(null); setReveal(false); };

  const learningTopics = [
    "ECG Basics", "Normal ECG", "Heart Rate", "Rhythm", "P Waves", "PR Interval",
    "QRS", "QT/QTc", "Axis", "Bradycardia", "Tachycardia", "Atrial Fibrillation",
    "Atrial Flutter", "SVT", "VT", "VF", "AV Blocks", "STEMI patterns", "Ischemia",
    "Electrolyte-related changes",
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="ecg-back" onPress={() => caseId ? setCaseId(null) : router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>ECG Learning Center</Text>
        <View style={{ width: 30 }} />
      </View>

      {!caseId ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
          <Text style={styles.sec}>Practice Cases</Text>
          {(list?.cases || []).map((c: any) => (
            <Pressable key={c.id} testID={`ecg-case-${c.id}`} style={styles.caseCard} onPress={() => openCase(c.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.caseTitle}>{c.title}</Text>
                <Text style={styles.caseMeta}>Difficulty: {c.difficulty}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}

          <Text style={styles.sec}>Learn</Text>
          <View style={styles.topicsGrid}>
            {learningTopics.map((t) => (
              <Pressable
                key={t}
                testID={`ecg-topic-${t}`}
                style={styles.topic}
                onPress={() => router.push(`/(tabs)/ai-tab?prefill=${encodeURIComponent("Explain " + t + " for a nursing student, with a memory aid.")}` as any)}
              >
                <Text style={styles.topicText}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : !cs ? (
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
          <Text style={styles.caseTitle}>{cs.case.title}</Text>
          <Text style={styles.caseMeta}>{cs.case.description}</Text>
          <ECGStrip caseId={cs.case.id} />
          <Text style={styles.q}>What is the rhythm?</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {cs.case.options.map((o: string, i: number) => {
              const isSel = sel === i;
              let bg = colors.surface, border = colors.border, fg = colors.onSurface;
              if (reveal) {
                if (i === cs.case.answer) { bg = "#DCFCE7"; border = colors.success; fg = "#15803D"; }
                else if (isSel) { bg = "#FEE2E2"; border = colors.error; fg = "#B91C1C"; }
              } else if (isSel) { bg = colors.brandTertiary; border = colors.brandPrimary; fg = colors.brandPrimary; }
              return (
                <Pressable key={i} testID={`ecg-opt-${i}`} disabled={reveal} onPress={() => setSel(i)} style={[styles.opt, { backgroundColor: bg, borderColor: border }]}>
                  <Text style={[styles.optText, { color: fg }]}>{String.fromCharCode(65 + i)}. {o}</Text>
                </Pressable>
              );
            })}
          </View>
          {!reveal ? (
            <Pressable testID="ecg-check" disabled={sel === null} style={[styles.primary, sel === null && { opacity: 0.4 }]} onPress={() => setReveal(true)}>
              <Text style={styles.primaryText}>Check answer</Text>
            </Pressable>
          ) : (
            <View style={styles.explain}>
              <Text style={[styles.explTitle, { color: sel === cs.case.answer ? colors.success : colors.error }]}>
                {sel === cs.case.answer ? "✓ Correct" : "✗ Not quite"}
              </Text>
              <Text style={styles.explBody}>{cs.case.explanation}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  sec: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: 8, marginBottom: 12 },
  caseCard: { flexDirection: "row", padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8, alignItems: "center" },
  caseTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  caseMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  arrow: { fontSize: 26, color: colors.muted },
  topicsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topic: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  topicText: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  ecgStrip: { marginTop: 14, padding: 12, borderRadius: radius.md, overflow: "hidden", backgroundColor: "#062A2B", borderWidth: 1, borderColor: "#0F766E" },
  ecgStripHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 },
  ecgLead: { color: "#99F6E4", fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  ecgReadout: { color: "#CCFBF1", fontSize: 10, fontWeight: "700", textAlign: "right" },
  q: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: 16 },
  opt: { padding: 12, borderRadius: radius.md, borderWidth: 1.5 },
  optText: { fontSize: 14, fontWeight: "600" },
  primary: { marginTop: 20, backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  explain: { marginTop: 20, padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  explTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  explBody: { color: colors.onSurface, fontSize: 13, lineHeight: 20 },
});
