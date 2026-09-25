import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import Svg, { Path, Circle, Line, G, Ellipse, Text as SvgText } from "react-native-svg";
import { api } from "@/src/api";
import { colors, spacing } from "@/src/theme";

// ─── ECG waveform paths (single beat) ───────────────────────────────
const ECG_BEAT_PATH = "M0 30 L15 30 L18 30 L20 20 L22 40 L24 8 L26 55 L28 25 L30 30 L45 30 L50 20 L60 30 L120 30";
const VF_PATH = "M0 30 L5 20 L10 42 L15 15 L20 48 L25 12 L30 44 L35 18 L40 40 L45 20 L50 46 L55 14 L60 42 L65 22 L70 38 L75 18 L80 44 L85 15 L90 40 L95 22 L100 42 L105 18 L110 40 L115 20 L120 30";

// ─── Animated ECG rhythm strip ──────────────────────────────────────
function ECGStrip({ rate, rhythm }: { rate: number; rhythm?: string }) {
  const tx = useRef(new Animated.Value(0)).current;
  const isVF = rhythm?.toUpperCase().includes("VF") || rhythm?.toUpperCase().includes("V.FIB");
  const beatMs = Math.max(300, Math.round(60_000 / Math.max(30, rate)));

  useEffect(() => {
    tx.setValue(0);
    Animated.loop(
      Animated.timing(tx, { toValue: -120, duration: beatMs, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, [beatMs]);

  const path = isVF ? VF_PATH : ECG_BEAT_PATH;

  return (
    <View style={ecgStyles.container}>
      {/* grid */}
      <Svg width="100%" height="60" viewBox="0 0 300 60" preserveAspectRatio="none" style={ecgStyles.grid}>
        {[...Array(15)].map((_, i) => <Line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={60} stroke="#0F3D2E" strokeWidth={0.5} />)}
        {[...Array(4)].map((_, i) => <Line key={`h${i}`} x1={0} y1={i * 15} x2={300} y2={i * 15} stroke="#0F3D2E" strokeWidth={0.5} />)}
      </Svg>
      {/* animated waveform (3 copies looping) */}
      <Animated.View style={{ flexDirection: "row", height: 60, transform: [{ translateX: tx }] }}>
        {[0, 1, 2, 3].map((k) => (
          <Svg key={k} width={120} height={60} viewBox="0 0 120 60">
            <Path d={path} stroke="#00FF7F" strokeWidth={1.8} fill="none" />
          </Svg>
        ))}
      </Animated.View>
    </View>
  );
}

const ecgStyles = StyleSheet.create({
  container: { height: 60, backgroundColor: "#020A05", borderRadius: 6, overflow: "hidden", position: "relative" },
  grid: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
});

// ─── SpO2 pleth wave ────────────────────────────────────────────────
function PlethWave({ hr }: { hr: number }) {
  const tx = useRef(new Animated.Value(0)).current;
  const beatMs = Math.max(400, Math.round(60_000 / Math.max(40, hr)));
  useEffect(() => {
    tx.setValue(0);
    Animated.loop(Animated.timing(tx, { toValue: -60, duration: beatMs, easing: Easing.linear, useNativeDriver: true })).start();
  }, [beatMs]);
  const path = "M0 20 Q10 20 15 5 Q20 -3 25 20 L40 20 L60 20";
  return (
    <View style={{ height: 30, backgroundColor: "#02030A", borderRadius: 4, overflow: "hidden" }}>
      <Animated.View style={{ flexDirection: "row", transform: [{ translateX: tx }] }}>
        {[0, 1, 2, 3, 4].map((k) => (
          <Svg key={k} width={60} height={30} viewBox="0 0 60 30">
            <Path d={path} stroke="#22D3EE" strokeWidth={1.5} fill="none" />
          </Svg>
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Patient body silhouette ───────────────────────────────────────
function PatientBody({ highlights }: { highlights: string[] }) {
  const has = (k: string) => highlights.includes(k);
  return (
    <Svg width="100%" height="140" viewBox="0 0 200 260" preserveAspectRatio="xMidYMid meet">
      {/* head */}
      <Circle cx={100} cy={38} r={26} fill="#F1D3B0" stroke="#B48A66" strokeWidth={1.5} />
      {/* face expression */}
      <Circle cx={92} cy={35} r={2} fill="#0F172A" />
      <Circle cx={108} cy={35} r={2} fill="#0F172A" />
      <Path d="M92 46 Q100 42 108 46" stroke="#0F172A" strokeWidth={1.5} fill="none" />
      {/* neck */}
      <Path d="M92 62 L92 74 L108 74 L108 62" fill="#F1D3B0" stroke="#B48A66" strokeWidth={1} />
      {/* torso (gown) */}
      <Path d="M60 74 L140 74 L152 160 L48 160 Z" fill="#4C9EEB" stroke="#1E3A8A" strokeWidth={1.5} />
      {/* arms */}
      <Path d="M60 74 L38 152 L48 158 L70 88 Z" fill="#F1D3B0" stroke="#B48A66" strokeWidth={1.2} />
      <Path d="M140 74 L162 152 L152 158 L130 88 Z" fill="#F1D3B0" stroke="#B48A66" strokeWidth={1.2} />
      {/* legs */}
      <Path d="M60 160 L52 248 L82 248 L90 160 Z" fill="#0F172A" opacity={0.85} />
      <Path d="M140 160 L148 248 L118 248 L110 160 Z" fill="#0F172A" opacity={0.85} />

      {/* Highlights */}
      {has("chest") && (
        <G>
          <Circle cx={100} cy={110} r={20} fill="#EF4444" opacity={0.35} />
          <SvgText x={100} y={116} fontSize={14} fontWeight="900" textAnchor="middle" fill="#B91C1C">⚡</SvgText>
        </G>
      )}
      {has("head") && (
        <G>
          <Circle cx={100} cy={38} r={30} fill="#F59E0B" opacity={0.3} />
        </G>
      )}
      {has("weak-right") && (
        <G>
          <Ellipse cx={155} cy={110} rx={12} ry={35} fill="#EF4444" opacity={0.3} />
        </G>
      )}
      {has("burns") && (
        <G>
          <Circle cx={100} cy={100} r={22} fill="#F97316" opacity={0.4} />
          <Circle cx={70} cy={120} r={10} fill="#F97316" opacity={0.4} />
          <Circle cx={130} cy={120} r={10} fill="#F97316" opacity={0.4} />
        </G>
      )}
      {has("unresponsive") && (
        <G>
          <Path d="M88 32 L96 40 M96 32 L88 40" stroke="#0F172A" strokeWidth={2} />
          <Path d="M104 32 L112 40 M112 32 L104 40" stroke="#0F172A" strokeWidth={2} />
        </G>
      )}
      {has("iv") && (
        <G>
          <Line x1={38} y1={140} x2={20} y2={100} stroke="#3B82F6" strokeWidth={2} />
          <Circle cx={20} cy={98} r={5} fill="#DBEAFE" stroke="#3B82F6" strokeWidth={1.5} />
        </G>
      )}
      {has("intubated") && (
        <G>
          <Line x1={100} y1={56} x2={100} y2={36} stroke="#0EA5E9" strokeWidth={3} />
          <Circle cx={100} cy={34} r={4} fill="#0EA5E9" />
        </G>
      )}
    </Svg>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────
function parseVital(v: any, def = 0): number {
  if (typeof v !== "string") return typeof v === "number" ? v : def;
  const m = v.match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : def;
}

function bodyHighlightsForSim(id?: string): string[] {
  switch (id) {
    case "stroke-ischemic": return ["head", "weak-right"];
    case "acute-mi": return ["chest"];
    case "burns-fluids": return ["burns"];
    case "unconscious": return ["unresponsive"];
    default: return [];
  }
}

// ─── Main screen ────────────────────────────────────────────────────
export default function SimGame() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ["sim", id], queryFn: () => api.simDetail(id!) });

  const [stepIdx, setStepIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false); // shown feedback yet?
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<{ idx: number; correct: boolean; feedback: string } | null>(null);
  const [vitals, setVitals] = useState<Record<string, any>>({});
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const [completed, setCompleted] = useState(false);
  const [highlights, setHighlights] = useState<string[]>([]);

  useEffect(() => {
    if (data) {
      setVitals(data.initial_vitals || {});
      setHighlights(bodyHighlightsForSim(data.id));
    }
  }, [data]);

  const currentStep = data?.steps?.[stepIdx];
  const totalSteps = data?.steps?.length || 0;

  const submit = () => {
    if (selected === null || locked || !currentStep) return;
    const opt = currentStep.options[selected];
    setAnswered({ idx: selected, correct: !!opt.correct, feedback: opt.feedback });
    setLocked(true);
    if (opt.correct) setScore((s) => s + 1);

    // Flash
    setFlash(opt.correct ? "ok" : "bad");
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.45, duration: 120, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setFlash(null));

    // Evolve vitals
    if (currentStep.vitals_after) setVitals((v) => ({ ...v, ...currentStep.vitals_after }));

    // Update body highlights based on step
    if (data?.id === "unconscious" && stepIdx >= 1) setHighlights(["unresponsive", "intubated", "iv"]);
    if (data?.id === "acute-mi" && stepIdx >= 0) setHighlights((h) => Array.from(new Set([...h, "iv"])));
    if (data?.id === "burns-fluids" && stepIdx >= 0) setHighlights((h) => Array.from(new Set([...h, "iv"])));
    if (data?.id === "stroke-ischemic" && stepIdx >= 3) setHighlights((h) => Array.from(new Set([...h, "iv"])));
  };

  const next = () => {
    setSelected(null);
    setAnswered(null);
    setLocked(false);
    if (stepIdx < totalSteps - 1) setStepIdx((i) => i + 1);
    else setCompleted(true);
  };

  const restart = () => {
    setStepIdx(0); setSelected(null); setAnswered(null); setLocked(false); setScore(0); setCompleted(false);
    setVitals(data?.initial_vitals || {}); setHighlights(bodyHighlightsForSim(data?.id));
  };

  const hr = useMemo(() => parseVital(vitals.HR, 80), [vitals.HR]);
  const spo2 = useMemo(() => parseVital(vitals.SpO2, 98), [vitals.SpO2]);

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;

  if (completed) {
    const pct = Math.round((score / totalSteps) * 100);
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <LinearGradient colors={["#0F172A", "#1E3A8A"]} style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable testID="sim-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.title}>Debrief</Text></View>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 16, paddingBottom: 60 }}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreEmoji}>{pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "📚"}</Text>
            <Text style={styles.scoreVal}>{score} / {totalSteps}</Text>
            <Text style={styles.scoreLabel}>{pct}% correct</Text>
            <Text style={styles.scoreTag}>{data.title}</Text>
          </View>

          <Text style={styles.h}>Key learning points</Text>
          {(data.learning_points || []).map((p: string, i: number) => (
            <View key={i} style={styles.lpCard}>
              <Text style={styles.lpIcon}>💡</Text>
              <Text style={styles.lpText}>{p}</Text>
            </View>
          ))}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable testID="sim-retry" style={styles.secondary} onPress={restart}>
              <Text style={styles.secondaryTxt}>🔄 Retry</Text>
            </Pressable>
            <Pressable testID="sim-done" style={styles.primary} onPress={() => router.back()}>
              <Text style={styles.primaryTxt}>Finish</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1E" }}>
      {/* Header */}
      <LinearGradient colors={["#0F172A", "#0A0F1E"]} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="sim-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{data.title}</Text>
          <Text style={styles.subtitle}>Step {stepIdx + 1} of {totalSteps} · Score {score}</Text>
        </View>
        <Text style={{ fontSize: 22 }}>{data.emoji}</Text>
      </LinearGradient>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[styles.dot, i < stepIdx && styles.dotDone, i === stepIdx && styles.dotCurrent]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 160 }}>
        {/* CARDIAC MONITOR */}
        <View style={styles.monitor}>
          <View style={styles.monHeader}>
            <View style={styles.pulseDot} />
            <Text style={styles.monTitleTxt}>PATIENT MONITOR · Bed 3</Text>
            <Text style={styles.monAlarm}>ALARM</Text>
          </View>

          {/* Row: HR + Rhythm */}
          <View style={styles.vRow}>
            <View style={styles.vBox}>
              <Text style={styles.vLbl}>HR bpm</Text>
              <Text style={[styles.vVal, { color: hr < 50 || hr > 120 ? "#EF4444" : "#22FF88" }]}>{vitals.HR || "--"}</Text>
              <Text style={styles.vSub}>NIBP {vitals.BP || "--"}</Text>
            </View>
            <View style={styles.stripBox}>
              <Text style={styles.stripLbl}>II · ECG</Text>
              <ECGStrip rate={hr} rhythm={String(vitals.Rhythm || "")} />
            </View>
          </View>

          {/* Row: SpO2 + Pleth */}
          <View style={styles.vRow}>
            <View style={styles.vBox}>
              <Text style={styles.vLbl}>SpO₂ %</Text>
              <Text style={[styles.vVal, { color: spo2 < 92 ? "#EF4444" : "#22D3EE", fontSize: 30 }]}>{vitals.SpO2 || "--"}</Text>
              <Text style={styles.vSub}>RR {vitals.RR || "--"}</Text>
            </View>
            <View style={styles.stripBox}>
              <Text style={styles.stripLbl}>Pleth</Text>
              <PlethWave hr={hr} />
              <View style={{ flexDirection: "row", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                {vitals.Temp && <Text style={styles.smallMet}>T {vitals.Temp}</Text>}
                {vitals.GCS && <Text style={styles.smallMet}>GCS {vitals.GCS}</Text>}
                {vitals.BSL && <Text style={[styles.smallMet, { color: "#F59E0B" }]}>BSL {vitals.BSL}</Text>}
                {vitals.Pain && <Text style={[styles.smallMet, { color: "#F87171" }]}>Pain {vitals.Pain}</Text>}
                {vitals.UO && <Text style={[styles.smallMet, { color: "#A78BFA" }]}>UO {vitals.UO}</Text>}
                {vitals.Rhythm && <Text style={[styles.smallMet, { color: "#FCD34D" }]}>Rhy {vitals.Rhythm}</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* PATIENT BODY */}
        <View style={styles.patientArea}>
          <View style={styles.bedFrame}>
            <PatientBody highlights={highlights} />
          </View>
          <View style={styles.vignetteBox}>
            <Text style={styles.vignetteLbl}>SITUATION</Text>
            <Text style={styles.vignetteTxt}>{data.vignette}</Text>
          </View>
        </View>

        {/* STEP PROMPT */}
        <View style={styles.promptCard}>
          <Text style={styles.stepBadge}>STEP {stepIdx + 1}</Text>
          <Text style={styles.promptTxt}>{currentStep.prompt}</Text>
        </View>

        {/* OPTIONS */}
        <View style={{ gap: 10, marginTop: 12 }}>
          {currentStep.options.map((opt: any, i: number) => {
            const isSel = selected === i;
            const isAns = answered?.idx === i;
            let bg = "#111827", border = "#334155", fg = "#E5E7EB";
            if (locked && opt.correct) { bg = "#052E1F"; border = "#22C55E"; fg = "#86EFAC"; }
            else if (isAns && !opt.correct) { bg = "#2E0505"; border = "#EF4444"; fg = "#FCA5A5"; }
            else if (isSel && !locked) { bg = "#1E3A8A"; border = "#60A5FA"; fg = "#FFF"; }
            return (
              <Pressable
                key={i}
                testID={`sim-opt-${i}`}
                disabled={locked}
                style={[styles.opt, { backgroundColor: bg, borderColor: border }]}
                onPress={() => setSelected(i)}
              >
                <View style={[styles.optLetter, { borderColor: border }]}><Text style={{ color: fg, fontWeight: "800", fontSize: 13 }}>{String.fromCharCode(65 + i)}</Text></View>
                <Text style={[styles.optText, { color: fg }]}>{opt.label}</Text>
                {locked && opt.correct && <Text style={{ color: "#22C55E", fontSize: 18 }}>✓</Text>}
                {isAns && !opt.correct && <Text style={{ color: "#EF4444", fontSize: 18 }}>✗</Text>}
              </Pressable>
            );
          })}
        </View>

        {/* Feedback */}
        {answered && (
          <View style={[styles.feedback, answered.correct ? styles.feedbackOk : styles.feedbackBad]}>
            <Text style={[styles.feedbackTitle, { color: answered.correct ? "#86EFAC" : "#FCA5A5" }]}>
              {answered.correct ? "✓ Nice call" : "✗ Not quite"}
            </Text>
            <Text style={styles.feedbackText}>{answered.feedback}</Text>
          </View>
        )}
      </ScrollView>

      {/* Flash overlay */}
      {flash && (
        <Animated.View pointerEvents="none" style={[styles.flash, { backgroundColor: flash === "ok" ? "#22C55E" : "#EF4444", opacity: flashOpacity }]} />
      )}

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {!locked ? (
          <Pressable testID="sim-submit" disabled={selected === null} style={[styles.primary, selected === null && { opacity: 0.35 }]} onPress={submit}>
            <Text style={styles.primaryTxt}>Confirm action</Text>
          </Pressable>
        ) : (
          <Pressable testID="sim-next" style={styles.primary} onPress={next}>
            <Text style={styles.primaryTxt}>{stepIdx < totalSteps - 1 ? "Next step →" : "See debrief"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.lg, paddingBottom: 12 },
  backIcon: { fontSize: 30, color: "#FFF", width: 30, fontWeight: "800" },
  title: { color: "#FFF", fontSize: 17, fontWeight: "900" },
  subtitle: { color: "#94A3B8", fontSize: 11, marginTop: 2 },

  dotsRow: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.lg, paddingBottom: 10 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#1E293B" },
  dotDone: { backgroundColor: "#22C55E" },
  dotCurrent: { backgroundColor: "#60A5FA" },

  monitor: { backgroundColor: "#020617", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#1E293B" },
  monHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  monTitleTxt: { flex: 1, color: "#94A3B8", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  monAlarm: { color: "#FCA5A5", fontSize: 9, fontWeight: "800", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "#450A0A" },

  vRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  vBox: { width: 92, backgroundColor: "#0B111F", borderRadius: 6, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "#1E293B" },
  vLbl: { color: "#94A3B8", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  vVal: { color: "#22FF88", fontSize: 34, fontWeight: "900", lineHeight: 38 },
  vSub: { color: "#94A3B8", fontSize: 10, fontWeight: "700", marginTop: 2 },
  stripBox: { flex: 1, backgroundColor: "#0B111F", borderRadius: 6, padding: 8, borderWidth: 1, borderColor: "#1E293B" },
  stripLbl: { color: "#22C55E", fontSize: 9, fontWeight: "800", marginBottom: 4, letterSpacing: 1 },
  smallMet: { color: "#22D3EE", fontSize: 10, fontWeight: "800" },

  patientArea: { flexDirection: "row", gap: 10, marginTop: 12 },
  bedFrame: { width: 130, backgroundColor: "#0F1A2E", borderRadius: 10, padding: 4, borderWidth: 1, borderColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  vignetteBox: { flex: 1, backgroundColor: "#0F1A2E", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#1E293B" },
  vignetteLbl: { color: "#60A5FA", fontSize: 9, fontWeight: "800", letterSpacing: 1, marginBottom: 6 },
  vignetteTxt: { color: "#E5E7EB", fontSize: 12, lineHeight: 17 },

  promptCard: { marginTop: 12, padding: 14, backgroundColor: "#0F1A2E", borderRadius: 10, borderLeftWidth: 3, borderLeftColor: "#60A5FA" },
  stepBadge: { color: "#60A5FA", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginBottom: 6 },
  promptTxt: { color: "#F1F5F9", fontSize: 15, lineHeight: 21, fontWeight: "700" },

  opt: { flexDirection: "row", padding: 12, borderRadius: 10, borderWidth: 1.5, gap: 10, alignItems: "center" },
  optLetter: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  optText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" },

  feedback: { marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1 },
  feedbackOk: { backgroundColor: "#052E1F", borderColor: "#22C55E" },
  feedbackBad: { backgroundColor: "#2E0505", borderColor: "#EF4444" },
  feedbackTitle: { fontSize: 14, fontWeight: "900", marginBottom: 6 },
  feedbackText: { color: "#E5E7EB", fontSize: 13, lineHeight: 18 },

  flash: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.md, borderTopWidth: 1, borderTopColor: "#1E293B", backgroundColor: "#020617" },
  primary: { backgroundColor: "#1E3A8A", padding: 16, borderRadius: 12, alignItems: "center" },
  primaryTxt: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  secondary: { flex: 1, backgroundColor: colors.surfaceTertiary, padding: 16, borderRadius: 12, alignItems: "center" },
  secondaryTxt: { color: colors.onSurface, fontSize: 15, fontWeight: "900" },

  scoreCard: { padding: 24, alignItems: "center", backgroundColor: colors.brandTertiary, borderRadius: 20, borderWidth: 1, borderColor: colors.brandPrimary },
  scoreEmoji: { fontSize: 60 },
  scoreVal: { color: colors.brandPrimary, fontSize: 44, fontWeight: "900", marginTop: 8 },
  scoreLabel: { color: colors.brandPrimary, fontSize: 15, fontWeight: "800", marginTop: 4 },
  scoreTag: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 8 },
  h: { color: colors.onSurface, fontSize: 15, fontWeight: "900", marginTop: 8 },
  lpCard: { flexDirection: "row", gap: 10, padding: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: colors.brandSecondary },
  lpIcon: { fontSize: 18 },
  lpText: { flex: 1, color: colors.onSurface, fontSize: 13, lineHeight: 19, fontWeight: "500" },
});
