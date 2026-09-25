import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import {
  colors,
  minTouchTarget,
  screenContentBottomPadding,
  spacing,
  radius,
} from "@/src/theme";

interface MCQ {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

interface AssessmentQ {
  question: string;
  options: string[];
  correct_index: number;
}

interface SessionData {
  session_id: string;
  topic: string;
  step1_explanation: string;
  step2_visual: string;
  step3_mini_case: string;
  step4_mcqs: MCQ[];
  step5_clinical_scenario: string;
  step6_assessment: AssessmentQ[];
}

export default function RecoverySessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { topic: rawTopic } = useLocalSearchParams<{ topic?: string }>();
  const topic = (rawTopic || "NCLEX Priority Concepts").trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);

  // Stepper state: 1 to 6 (or 7 for completion screen)
  const [currentStep, setCurrentStep] = useState(1);

  // Step 4 (MCQs) state
  const [mcqIdx, setMcqIdx] = useState(0);
  const [mcqSelected, setMcqSelected] = useState<number | null>(null);
  const [mcqSubmitted, setMcqSubmitted] = useState(false);
  const [mcqScore, setMcqScore] = useState(0);

  // Step 5 (Clinical Scenario) state
  const [freeResponse, setFreeResponse] = useState("");

  // Step 6 (Final Assessment) state
  const [assessIdx, setAssessIdx] = useState(0);
  const [assessSelected, setAssessSelected] = useState<number | null>(null);
  const [assessSubmitted, setAssessSubmitted] = useState(false);
  const [assessScore, setAssessScore] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Pulse animation for loading
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.startRecoverySession(topic);
        if (mounted) {
          const sData: SessionData = {
            session_id: res.session_id || res.id,
            topic: res.topic || topic,
            step1_explanation: res.step1_explanation || res.session_data?.step1_explanation || "",
            step2_visual: res.step2_visual || res.session_data?.step2_visual || "",
            step3_mini_case: res.step3_mini_case || res.session_data?.step3_mini_case || "",
            step4_mcqs: res.step4_mcqs || res.session_data?.step4_mcqs || [],
            step5_clinical_scenario: res.step5_clinical_scenario || res.session_data?.step5_clinical_scenario || "",
            step6_assessment: res.step6_assessment || res.session_data?.step6_assessment || [],
          };
          setSession(sData);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || "Failed to generate recovery session.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSession();
    return () => {
      mounted = false;
    };
  }, [topic]);

  // Handle MCQ selection
  const handleMcqSelect = (optIndex: number) => {
    if (mcqSubmitted) return;
    setMcqSelected(optIndex);
  };

  const handleMcqSubmit = () => {
    if (mcqSelected === null || !session) return;
    const currentQ = session.step4_mcqs[mcqIdx];
    if (mcqSelected === currentQ.correct_index) {
      setMcqScore((prev) => prev + 1);
    }
    setMcqSubmitted(true);
  };

  const handleMcqNext = () => {
    if (!session) return;
    if (mcqIdx < session.step4_mcqs.length - 1) {
      setMcqIdx((prev) => prev + 1);
      setMcqSelected(null);
      setMcqSubmitted(false);
    } else {
      // Finished all MCQs -> Go to Step 5
      setCurrentStep(5);
    }
  };

  // Handle Assessment selection
  const handleAssessSelect = (optIndex: number) => {
    if (assessSubmitted) return;
    setAssessSelected(optIndex);
  };

  const handleAssessSubmit = () => {
    if (assessSelected === null || !session) return;
    const currentQ = session.step6_assessment[assessIdx];
    if (assessSelected === currentQ.correct_index) {
      setAssessScore((prev) => prev + 1);
    }
    setAssessSubmitted(true);
  };

  const handleAssessNext = async () => {
    if (!session) return;
    if (assessIdx < session.step6_assessment.length - 1) {
      setAssessIdx((prev) => prev + 1);
      setAssessSelected(null);
      setAssessSubmitted(false);
    } else {
      // Completed Step 6 -> Mark session complete on backend
      setCompleting(true);
      try {
        await api.completeRecoverySession(session.session_id);
      } catch {
        // Continue even if logging fails
      } finally {
        setCompleting(false);
        setCurrentStep(7); // Show completion screen
      }
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={{ fontSize: 56 }}>🧠</Text>
        </Animated.View>
        <Text style={styles.loadingTitle}>Building your recovery session...</Text>
        <Text style={styles.loadingSub}>
          Orbit AI is designing a targeted 6-step mini-curriculum for{"\n"}
          <Text style={{ fontWeight: "700", color: colors.brandPrimary }}>{`"${topic}"`}</Text>
        </Text>
        <ActivityIndicator
          size="large"
          color={colors.brandPrimary}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  // Error Screen
  if (error || !session) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={{ fontSize: 48 }}>⚠️</Text>
        <Text style={styles.errorTitle}>Session Unavailable</Text>
        <Text style={styles.errorSub}>
          {error || "Could not build the recovery session at this time."}
        </Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.retryBtnText}>Return to NCLEX</Text>
        </Pressable>
      </View>
    );
  }

  const stepTitles = [
    "📖 Explanation",
    "🗂 Visual Concept",
    "🩺 Mini Case",
    "📝 5 MCQs",
    "💡 Clinical Scenario",
    "🏁 Final Assessment",
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="recovery-back"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Recovery: {topic}
          </Text>
          <Text style={styles.headerSubtitle}>
            {currentStep <= 6 ? `6-step learning session · Step ${currentStep} of 6 (${stepTitles[currentStep - 1]})` : "6-step learning session · Complete 🎉"}
          </Text>
        </View>
      </View>

      {/* Stepper Progress Bar */}
      {currentStep <= 6 && (
        <View style={styles.stepperContainer}>
          <View style={styles.stepperTrack}>
            <View
              style={[
                styles.stepperFill,
                { width: `${(currentStep / 6) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.stepsPillsRow}>
            {[1, 2, 3, 4, 5, 6].map((st) => {
              const isPast = st < currentStep;
              const isCurrent = st === currentStep;
              return (
                <View
                  key={st}
                  style={[
                    styles.stepPill,
                    isPast && styles.stepPillPast,
                    isCurrent && styles.stepPillCurrent,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepPillText,
                      (isPast || isCurrent) && styles.stepPillTextActive,
                    ]}
                  >
                    {isPast ? "✓" : st}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: screenContentBottomPadding(insets.bottom) + minTouchTarget,
        }}
      >
        {/* ================================================================= */}
        {/* STEP 1: 📖 Explanation                                            */}
        {/* ================================================================= */}
        {currentStep === 1 && (
          <View style={styles.card}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 1 · CLINICAL EXPLANATION</Text>
            </View>
            <Text style={styles.stepTitle}>Core Clinical Breakdown</Text>
            <Text style={styles.stepSub}>
              Review the underlying pathophysiology, key priorities, and essential nursing actions.
            </Text>

            <View style={styles.explanationBox}>
              <Text style={styles.explanationText}>
                {session.step1_explanation || "No explanation provided for this topic."}
              </Text>
            </View>

            <Pressable
              testID="btn-next-step1"
              style={styles.primaryNextBtn}
              onPress={() => setCurrentStep(2)}
            >
              <Text style={styles.primaryNextBtnText}>Next: Visual Concept ›</Text>
            </Pressable>
          </View>
        )}

        {/* ================================================================= */}
        {/* STEP 2: 🗂 Visual Concept                                         */}
        {/* ================================================================= */}
        {currentStep === 2 && (
          <View style={styles.card}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 2 · STRUCTURED CONCEPT</Text>
            </View>
            <Text style={styles.stepTitle}>Visual Concept & Diagram</Text>
            <Text style={styles.stepSub}>
              Memorize key decision trees, classifications, and comparative patterns.
            </Text>

            <View style={styles.visualBox}>
              <Text style={styles.visualText}>
                {session.step2_visual || "Structured breakdown unavailable."}
              </Text>
            </View>

            <View style={styles.twoBtnRow}>
              <Pressable
                style={styles.prevBtn}
                onPress={() => setCurrentStep(1)}
              >
                <Text style={styles.prevBtnText}>‹ Previous</Text>
              </Pressable>
              <Pressable
                testID="btn-next-step2"
                style={styles.nextBtn}
                onPress={() => setCurrentStep(3)}
              >
                <Text style={styles.nextBtnText}>Next: Mini Case ›</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* STEP 3: 🩺 Mini Case                                              */}
        {/* ================================================================= */}
        {currentStep === 3 && (
          <View style={styles.card}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 3 · PATIENT SCENARIO</Text>
            </View>
            <Text style={styles.stepTitle}>Mini Clinical Case</Text>
            <Text style={styles.stepSub}>
              Apply the concept to a real bedside patient presentation.
            </Text>

            <View style={styles.caseBox}>
              <View style={styles.caseHeader}>
                <Text style={{ fontSize: 22 }}>🩺</Text>
                <Text style={styles.caseHeaderTitle}>Patient Presentation</Text>
              </View>
              <Text style={styles.caseText}>
                {session.step3_mini_case || "Clinical case not loaded."}
              </Text>
            </View>

            <View style={styles.twoBtnRow}>
              <Pressable
                style={styles.prevBtn}
                onPress={() => setCurrentStep(2)}
              >
                <Text style={styles.prevBtnText}>‹ Previous</Text>
              </Pressable>
              <Pressable
                testID="btn-next-step3"
                style={styles.nextBtn}
                onPress={() => {
                  setMcqIdx(0);
                  setMcqSelected(null);
                  setMcqSubmitted(false);
                  setMcqScore(0);
                  setCurrentStep(4);
                }}
              >
                <Text style={styles.nextBtnText}>Next: 5 MCQs ›</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* STEP 4: 📝 5 MCQs                                                 */}
        {/* ================================================================= */}
        {currentStep === 4 && session.step4_mcqs.length > 0 && (
          <View style={styles.card}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                STEP 4 · MCQ {mcqIdx + 1} OF {session.step4_mcqs.length}
              </Text>
            </View>

            <View style={styles.mcqProgressRow}>
              <Text style={styles.stepTitle}>Targeted Practice Quiz</Text>
              <Text style={styles.mcqScorePill}>Score: {mcqScore}/{mcqIdx}</Text>
            </View>

            {/* Current Question */}
            {(() => {
              const q = session.step4_mcqs[mcqIdx];
              return (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.questionText}>{q.question}</Text>

                  {/* Options */}
                  <View style={{ gap: 8, marginTop: 14 }}>
                    {q.options.map((opt, i) => {
                      const isSelected = mcqSelected === i;
                      const isCorrect = i === q.correct_index;

                      let optBg = colors.surfaceSecondary;
                      let optBorder = colors.border;
                      let optTextCol = colors.onSurface;

                      if (mcqSubmitted) {
                        if (isCorrect) {
                          optBg = "#DCFCE7";
                          optBorder = "#10B981";
                          optTextCol = "#15803D";
                        } else if (isSelected) {
                          optBg = "#FEE2E2";
                          optBorder = "#EF4444";
                          optTextCol = "#B91C1C";
                        }
                      } else if (isSelected) {
                        optBg = colors.brandTertiary;
                        optBorder = colors.brandPrimary;
                        optTextCol = colors.brandPrimary;
                      }

                      return (
                        <Pressable
                          key={i}
                          testID={`mcq-opt-${i}`}
                          disabled={mcqSubmitted}
                          style={[
                            styles.optCard,
                            { backgroundColor: optBg, borderColor: optBorder },
                          ]}
                          onPress={() => handleMcqSelect(i)}
                        >
                          <Text style={[styles.optLetter, { color: optTextCol }]}>
                            {String.fromCharCode(65 + i)}
                          </Text>
                          <Text style={[styles.optText, { color: optTextCol }]}>
                            {opt}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Submit / Explanation */}
                  {!mcqSubmitted ? (
                    <Pressable
                      testID="btn-submit-mcq"
                      disabled={mcqSelected === null}
                      style={[
                        styles.primaryNextBtn,
                        mcqSelected === null && { opacity: 0.5 },
                      ]}
                      onPress={handleMcqSubmit}
                    >
                      <Text style={styles.primaryNextBtnText}>Check Answer</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.explBox}>
                      <Text
                        style={[
                          styles.explHeader,
                          {
                            color:
                              mcqSelected === q.correct_index
                                ? "#15803D"
                                : "#B91C1C",
                          },
                        ]}
                      >
                        {mcqSelected === q.correct_index
                          ? "✓ Correct!"
                          : "✗ Incorrect"}
                      </Text>
                      <Text style={styles.explBody}>
                        {q.explanation ||
                          `Option ${String.fromCharCode(65 + q.correct_index)} is the correct answer.`}
                      </Text>

                      <Pressable
                        testID="btn-next-mcq"
                        style={styles.primaryNextBtn}
                        onPress={handleMcqNext}
                      >
                        <Text style={styles.primaryNextBtnText}>
                          {mcqIdx < session.step4_mcqs.length - 1
                            ? "Next Question ›"
                            : "Proceed to Clinical Scenario ›"}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* ================================================================= */}
        {/* STEP 5: 💡 Clinical Scenario                                      */}
        {/* ================================================================= */}
        {currentStep === 5 && (
          <View style={styles.card}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 5 · DECISION MAKING</Text>
            </View>
            <Text style={styles.stepTitle}>Clinical Decision Scenario</Text>
            <Text style={styles.stepSub}>
              Prioritize, delegate, and decide your next clinical steps in this patient scenario.
            </Text>

            <View style={styles.scenarioCard}>
              <Text style={styles.scenarioEmoji}>💡</Text>
              <Text style={styles.scenarioText}>
                {session.step5_clinical_scenario || "Decision scenario loading..."}
              </Text>
            </View>

            <Text style={styles.inputLabel}>What would you do? (Your Nursing Action)</Text>
            <TextInput
              testID="input-free-response"
              style={[styles.input, styles.textArea]}
              placeholder="Outline your assessment priorities, emergency checks, provider escalation, or medication adjustments..."
              placeholderTextColor={colors.muted}
              value={freeResponse}
              onChangeText={setFreeResponse}
              multiline
              numberOfLines={4}
            />

            <Pressable
              testID="btn-ask-orbit-ai"
              style={styles.aiTutorBtn}
              onPress={() => {
                const prompt = `I am reviewing a clinical scenario on ${topic}:\n"${session.step5_clinical_scenario}"\n\nMy proposed nursing action:\n"${freeResponse || "What is the optimal NCLEX-recommended action here?"}"\n\nPlease critique my clinical reasoning and explain the gold-standard nursing prioritization.`;
                router.push(`/(tabs)/ai-tab?prefill=${encodeURIComponent(prompt)}` as any);
              }}
            >
              <Text style={styles.aiTutorBtnText}>💬 Discuss with Orbit AI Tutor ›</Text>
            </Pressable>

            <View style={[styles.twoBtnRow, { marginTop: 14 }]}>
              <Pressable
                style={styles.prevBtn}
                onPress={() => setCurrentStep(4)}
              >
                <Text style={styles.prevBtnText}>‹ Previous</Text>
              </Pressable>
              <Pressable
                testID="btn-next-step5"
                style={styles.nextBtn}
                onPress={() => {
                  setAssessIdx(0);
                  setAssessSelected(null);
                  setAssessSubmitted(false);
                  setAssessScore(0);
                  setCurrentStep(6);
                }}
              >
                <Text style={styles.nextBtnText}>Final Assessment ›</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* STEP 6: 🏁 Final Assessment                                       */}
        {/* ================================================================= */}
        {currentStep === 6 && session.step6_assessment.length > 0 && (
          <View style={styles.card}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                STEP 6 · FINAL ASSESSMENT {assessIdx + 1} OF {session.step6_assessment.length}
              </Text>
            </View>

            <View style={styles.mcqProgressRow}>
              <Text style={styles.stepTitle}>Final Mastery Check</Text>
              <Text style={styles.mcqScorePill}>Score: {assessScore}/{assessIdx}</Text>
            </View>

            {(() => {
              const q = session.step6_assessment[assessIdx];
              return (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.questionText}>{q.question}</Text>

                  {/* Options */}
                  <View style={{ gap: 8, marginTop: 14 }}>
                    {q.options.map((opt, i) => {
                      const isSelected = assessSelected === i;
                      const isCorrect = i === q.correct_index;

                      let optBg = colors.surfaceSecondary;
                      let optBorder = colors.border;
                      let optTextCol = colors.onSurface;

                      if (assessSubmitted) {
                        if (isCorrect) {
                          optBg = "#DCFCE7";
                          optBorder = "#10B981";
                          optTextCol = "#15803D";
                        } else if (isSelected) {
                          optBg = "#FEE2E2";
                          optBorder = "#EF4444";
                          optTextCol = "#B91C1C";
                        }
                      } else if (isSelected) {
                        optBg = colors.brandTertiary;
                        optBorder = colors.brandPrimary;
                        optTextCol = colors.brandPrimary;
                      }

                      return (
                        <Pressable
                          key={i}
                          testID={`assess-opt-${i}`}
                          disabled={assessSubmitted}
                          style={[
                            styles.optCard,
                            { backgroundColor: optBg, borderColor: optBorder },
                          ]}
                          onPress={() => handleAssessSelect(i)}
                        >
                          <Text style={[styles.optLetter, { color: optTextCol }]}>
                            {String.fromCharCode(65 + i)}
                          </Text>
                          <Text style={[styles.optText, { color: optTextCol }]}>
                            {opt}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {!assessSubmitted ? (
                    <Pressable
                      testID="btn-submit-assess"
                      disabled={assessSelected === null}
                      style={[
                        styles.primaryNextBtn,
                        assessSelected === null && { opacity: 0.5 },
                      ]}
                      onPress={handleAssessSubmit}
                    >
                      <Text style={styles.primaryNextBtnText}>Check Answer</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.explBox}>
                      <Text
                        style={[
                          styles.explHeader,
                          {
                            color:
                              assessSelected === q.correct_index
                                ? "#15803D"
                                : "#B91C1C",
                          },
                        ]}
                      >
                        {assessSelected === q.correct_index
                          ? "✓ Correct!"
                          : "✗ Incorrect"}
                      </Text>
                      <Text style={styles.explBody}>
                        Option {String.fromCharCode(65 + q.correct_index)} is the correct answer.
                      </Text>

                      <Pressable
                        testID="btn-next-assess"
                        disabled={completing}
                        style={styles.primaryNextBtn}
                        onPress={handleAssessNext}
                      >
                        {completing ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <Text style={styles.primaryNextBtnText}>
                            {assessIdx < session.step6_assessment.length - 1
                              ? "Next Question ›"
                              : "Complete Recovery Session 🎉"}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* ================================================================= */}
        {/* COMPLETION SCREEN (Step 7)                                        */}
        {/* ================================================================= */}
        {currentStep === 7 && (
          <View style={styles.card}>
            <View style={styles.completionHeader}>
              <Text style={{ fontSize: 56, marginBottom: 8 }}>🎉</Text>
              <Text style={styles.completionTitle}>Session Complete!</Text>
              <Text style={styles.completionSub}>
                You have finished all 6 steps of the targeted recovery session for{" "}
                <Text style={{ fontWeight: "700", color: colors.onSurface }}>{topic}</Text>.
              </Text>
            </View>

            {/* Score Summary Box */}
            <View style={styles.scoreSummaryBox}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreNum}>{mcqScore}/5</Text>
                <Text style={styles.scoreLbl}>Practice MCQs</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreItem}>
                <Text style={styles.scoreNum}>{assessScore}/3</Text>
                <Text style={styles.scoreLbl}>Final Assessment</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreNum, { color: "#10B981" }]}>+50 XP</Text>
                <Text style={styles.scoreLbl}>Awarded</Text>
              </View>
            </View>

            <View style={styles.xpBadgeBox}>
              <Text style={styles.xpBadgeText}>🔥 +50 XP Mastered · Recovery Recorded</Text>
            </View>

            {/* Two Action Buttons */}
            <Pressable
              testID="btn-start-seven-day-plan"
              style={styles.planActionBtn}
              onPress={() =>
                router.push(
                  `/nclex/revision-plan?topic=${encodeURIComponent(topic)}` as any
                )
              }
            >
              <Text style={styles.planActionBtnText}>📅 Start 7-Day Plan for {topic} ›</Text>
            </Pressable>

            <Pressable
              testID="btn-back-nclex"
              style={styles.backNclexBtn}
              onPress={() => router.replace("/nclex" as any)}
            >
              <Text style={styles.backNclexBtnText}>Back to NCLEX Dashboard</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerBtn: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 32,
    color: colors.onSurface,
    lineHeight: 34,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },

  // Stepper
  stepperContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  stepperTrack: {
    height: 5,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  stepperFill: {
    height: 5,
    backgroundColor: colors.brandPrimary,
    borderRadius: 3,
  },
  stepsPillsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillPast: {
    backgroundColor: "#DCFCE7",
  },
  stepPillCurrent: {
    backgroundColor: colors.brandPrimary,
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
  },
  stepPillTextActive: {
    color: "#FFF",
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.onSurface,
    marginTop: 18,
    textAlign: "center",
  },
  loadingSub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.error,
    marginTop: 12,
  },
  errorSub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  retryBtnText: {
    color: "#FFF",
    fontWeight: "700",
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: 8,
  },
  stepBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: colors.brandPrimary,
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 4,
  },
  stepSub: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 16,
  },

  explanationBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  explanationText: {
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 22,
  },

  visualBox: {
    backgroundColor: "#0F172A",
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 18,
  },
  visualText: {
    fontSize: 12.5,
    color: "#38BDF8",
    fontFamily: "monospace",
    lineHeight: 18,
  },

  caseBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 18,
  },
  caseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  caseHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E40AF",
  },
  caseText: {
    fontSize: 13.5,
    color: "#1E3A8A",
    lineHeight: 20,
  },

  scenarioCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 16,
  },
  scenarioEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  scenarioText: {
    fontSize: 13.5,
    color: "#92400E",
    lineHeight: 20,
    fontWeight: "500",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: colors.onSurface,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  aiTutorBtn: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  aiTutorBtnText: {
    color: colors.brandPrimary,
    fontSize: 13,
    fontWeight: "700",
  },

  // MCQ UI
  mcqProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mcqScorePill: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  questionText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
    lineHeight: 21,
  },
  optCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
  },
  optLetter: {
    fontSize: 14,
    fontWeight: "800",
    width: 20,
  },
  optText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
  },
  explBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  explHeader: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  explBody: {
    fontSize: 13,
    color: colors.onSurfaceSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },

  // Buttons
  primaryNextBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  primaryNextBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  twoBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  prevBtn: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  prevBtnText: {
    color: colors.onSurfaceSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  nextBtn: {
    flex: 2,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  nextBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Completion Screen
  completionHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 6,
  },
  completionSub: {
    fontSize: 13.5,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
  },
  scoreSummaryBox: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreItem: {
    flex: 1,
    alignItems: "center",
  },
  scoreNum: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.brandPrimary,
  },
  scoreLbl: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
    marginTop: 2,
  },
  scoreDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.divider,
  },
  xpBadgeBox: {
    backgroundColor: "#F0FDF4",
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 20,
  },
  xpBadgeText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "700",
  },
  planActionBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  planActionBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  backNclexBtn: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  backNclexBtnText: {
    color: colors.onSurfaceSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
});
