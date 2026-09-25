import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import {
  colors,
  minTouchTarget,
  screenContentBottomPadding,
  spacing,
  radius,
} from "@/src/theme";

const COMMON_DEPARTMENTS = [
  "Internal Medicine",
  "Intensive Care Unit (ICU)",
  "Emergency Department",
  "Surgical Ward",
  "Pediatrics",
  "Obstetrics & Gynecology",
  "Cardiology",
  "Neurology",
  "Oncology",
  "Operating Room (OR)",
];

const SUGGESTED_PROCEDURES = [
  "Vital Signs Assessment",
  "IV Cannulation",
  "Medication Administration",
  "Blood Glucose Check",
  "Wound Dressing",
  "Urinary Catheterization",
  "NG Tube Insertion",
  "12-Lead ECG",
  "Airway Suctioning",
  "Phlebotomy",
];

const SUGGESTED_SKILLS = [
  "Aseptic Technique",
  "Patient Communication",
  "Safe Medication Dispensing",
  "Clinical Prioritization",
  "SBAR Handover",
  "Fluid Balance Management",
  "Pain Assessment",
  "Infection Control",
];

export default function NewLogbookEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  // 10 Fields
  const todayStr = new Date().toISOString().split("T")[0];
  const [placement, setPlacement] = useState("");
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState(todayStr);
  const [hours, setHours] = useState("8.0");
  const [patients, setPatients] = useState("4");
  const [feedback, setFeedback] = useState("");
  const [reflection, setReflection] = useState("");

  // List fields
  const [observedList, setObservedList] = useState<string[]>([]);
  const [newObserved, setNewObserved] = useState("");

  const [performedList, setPerformedList] = useState<string[]>([]);
  const [newPerformed, setNewPerformed] = useState("");

  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const [saving, setSaving] = useState(false);

  // Add tag helper
  const addTag = (
    text: string,
    list: string[],
    setList: (l: string[]) => void,
    clearInput: () => void
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    clearInput();
  };

  const removeTag = (index: number, list: string[], setList: (l: string[]) => void) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validate
    if (!placement.trim()) {
      Alert.alert("Validation Error", "Please enter the clinical placement name (e.g. Ward 4B).");
      return;
    }
    if (!department.trim()) {
      Alert.alert("Validation Error", "Please enter the hospital department.");
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date.trim())) {
      Alert.alert("Invalid Date", "Date must be formatted as YYYY-MM-DD (e.g. 2026-09-22).");
      return;
    }
    const numHours = parseFloat(hours);
    if (isNaN(numHours) || numHours <= 0) {
      Alert.alert("Invalid Hours", "Please enter valid clinical hours (e.g. 8.0).");
      return;
    }
    const numPatients = parseInt(patients, 10);
    if (isNaN(numPatients) || numPatients < 0) {
      Alert.alert("Invalid Patients", "Please enter the number of patients encountered.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clinical_placement: placement.trim(),
        hospital_department: department.trim(),
        date: date.trim(),
        procedures_observed: observedList,
        procedures_performed: performedList,
        patients_encountered: numPatients,
        clinical_hours: numHours,
        skills_achieved: skillsList,
        supervisor_feedback: feedback.trim(),
        reflection: reflection.trim(),
      };

      await api.createLogbookEntry(payload);
      // Invalidate queries so list & portfolio update
      await queryClient.invalidateQueries({ queryKey: ["logbook"] });
      await queryClient.invalidateQueries({ queryKey: ["gam"] });

      Alert.alert("Entry Saved", "Your shift was logged successfully and +10 XP awarded! 🎉", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error Saving Entry", err?.message || "Could not save logbook entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="new-log-cancel"
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Clinical Entry</Text>
        <Pressable
          testID="new-log-save-top"
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveHeaderText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: screenContentBottomPadding(insets.bottom) + minTouchTarget,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner */}
        <View style={styles.bannerBox}>
          <Text style={styles.bannerEmoji}>🩺</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Shift Verification & XP</Text>
            <Text style={styles.bannerText}>
              Every verified shift adds to your Student Nursing Portfolio and earns 10 XP.
            </Text>
          </View>
        </View>

        {/* Section 1: Placement & Date */}
        <Text style={styles.sectionHeading}>Placement Details</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Clinical Placement / Unit *</Text>
          <TextInput
            testID="input-placement"
            style={styles.input}
            placeholder="e.g. Ward 3B, Acute Care Unit"
            placeholderTextColor={colors.muted}
            value={placement}
            onChangeText={setPlacement}
          />

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Hospital Department *</Text>
          <TextInput
            testID="input-department"
            style={styles.input}
            placeholder="e.g. Internal Medicine, ICU"
            placeholderTextColor={colors.muted}
            value={department}
            onChangeText={setDepartment}
          />
          {/* Quick department chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickChipsScroll}>
            {COMMON_DEPARTMENTS.map((dept) => (
              <Pressable
                key={dept}
                style={[
                  styles.quickChip,
                  department === dept && styles.quickChipActive,
                ]}
                onPress={() => setDepartment(dept)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    department === dept && styles.quickChipTextActive,
                  ]}
                >
                  {dept}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Shift Date (YYYY-MM-DD) *</Text>
          <TextInput
            testID="input-date"
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            value={date}
            onChangeText={setDate}
            keyboardType="numbers-and-punctuation"
          />

          <View style={styles.rowTwo}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Clinical Hours *</Text>
              <TextInput
                testID="input-hours"
                style={styles.input}
                placeholder="e.g. 8.0"
                placeholderTextColor={colors.muted}
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Patients Seen *</Text>
              <TextInput
                testID="input-patients"
                style={styles.input}
                placeholder="e.g. 4"
                placeholderTextColor={colors.muted}
                value={patients}
                onChangeText={setPatients}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Section 2: Procedures Performed */}
        <Text style={styles.sectionHeading}>Procedures Performed (Hands-On)</Text>
        <View style={styles.card}>
          <Text style={styles.fieldSub}>Add clinical interventions you performed yourself.</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              testID="input-new-performed"
              style={[styles.input, { flex: 1 }]}
              placeholder="e.g. IV Cannulation"
              placeholderTextColor={colors.muted}
              value={newPerformed}
              onChangeText={setNewPerformed}
              onSubmitEditing={() =>
                addTag(newPerformed, performedList, setPerformedList, () => setNewPerformed(""))
              }
            />
            <Pressable
              testID="btn-add-performed"
              style={styles.addTagBtn}
              onPress={() =>
                addTag(newPerformed, performedList, setPerformedList, () => setNewPerformed(""))
              }
            >
              <Text style={styles.addTagBtnText}>+ Add</Text>
            </Pressable>
          </View>

          {/* Quick suggestions */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickChipsScroll}>
            {SUGGESTED_PROCEDURES.map((proc) => (
              <Pressable
                key={proc}
                style={[
                  styles.quickChip,
                  performedList.includes(proc) && styles.quickChipActive,
                ]}
                onPress={() => {
                  if (performedList.includes(proc)) {
                    setPerformedList(performedList.filter((p) => p !== proc));
                  } else {
                    setPerformedList([...performedList, proc]);
                  }
                }}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    performedList.includes(proc) && styles.quickChipTextActive,
                  ]}
                >
                  {performedList.includes(proc) ? "✓ " : "+ "}
                  {proc}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Tag cloud */}
          <View style={styles.tagWrap}>
            {performedList.map((tag, idx) => (
              <View key={idx} style={styles.tagBubble}>
                <Text style={styles.tagText}>{tag}</Text>
                <Pressable onPress={() => removeTag(idx, performedList, setPerformedList)}>
                  <Text style={styles.tagRemove}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Section 3: Procedures Observed */}
        <Text style={styles.sectionHeading}>Procedures Observed</Text>
        <View style={styles.card}>
          <Text style={styles.fieldSub}>Procedures or complex interventions you shadowed or assisted.</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              testID="input-new-observed"
              style={[styles.input, { flex: 1 }]}
              placeholder="e.g. Chest Tube Insertion"
              placeholderTextColor={colors.muted}
              value={newObserved}
              onChangeText={setNewObserved}
              onSubmitEditing={() =>
                addTag(newObserved, observedList, setObservedList, () => setNewObserved(""))
              }
            />
            <Pressable
              testID="btn-add-observed"
              style={styles.addTagBtn}
              onPress={() =>
                addTag(newObserved, observedList, setObservedList, () => setNewObserved(""))
              }
            >
              <Text style={styles.addTagBtnText}>+ Add</Text>
            </Pressable>
          </View>

          {/* Tag cloud */}
          <View style={styles.tagWrap}>
            {observedList.map((tag, idx) => (
              <View key={idx} style={[styles.tagBubble, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                <Text style={[styles.tagText, { color: "#1D4ED8" }]}>{tag}</Text>
                <Pressable onPress={() => removeTag(idx, observedList, setObservedList)}>
                  <Text style={[styles.tagRemove, { color: "#1D4ED8" }]}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Section 4: Skills Achieved */}
        <Text style={styles.sectionHeading}>Clinical Skills & Competencies</Text>
        <View style={styles.card}>
          <Text style={styles.fieldSub}>Nursing competencies validated during this rotation.</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              testID="input-new-skill"
              style={[styles.input, { flex: 1 }]}
              placeholder="e.g. SBAR Handover"
              placeholderTextColor={colors.muted}
              value={newSkill}
              onChangeText={setNewSkill}
              onSubmitEditing={() =>
                addTag(newSkill, skillsList, setSkillsList, () => setNewSkill(""))
              }
            />
            <Pressable
              testID="btn-add-skill"
              style={styles.addTagBtn}
              onPress={() =>
                addTag(newSkill, skillsList, setSkillsList, () => setNewSkill(""))
              }
            >
              <Text style={styles.addTagBtnText}>+ Add</Text>
            </Pressable>
          </View>

          {/* Suggested skills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickChipsScroll}>
            {SUGGESTED_SKILLS.map((sk) => (
              <Pressable
                key={sk}
                style={[
                  styles.quickChip,
                  skillsList.includes(sk) && styles.quickChipActive,
                ]}
                onPress={() => {
                  if (skillsList.includes(sk)) {
                    setSkillsList(skillsList.filter((s) => s !== sk));
                  } else {
                    setSkillsList([...skillsList, sk]);
                  }
                }}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    skillsList.includes(sk) && styles.quickChipTextActive,
                  ]}
                >
                  {skillsList.includes(sk) ? "✓ " : "+ "}
                  {sk}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Tag cloud */}
          <View style={styles.tagWrap}>
            {skillsList.map((tag, idx) => (
              <View key={idx} style={[styles.tagBubble, { backgroundColor: "#FDF2F8", borderColor: "#FBCFE8" }]}>
                <Text style={[styles.tagText, { color: "#BE185D" }]}>{tag}</Text>
                <Pressable onPress={() => removeTag(idx, skillsList, setSkillsList)}>
                  <Text style={[styles.tagRemove, { color: "#BE185D" }]}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Section 5: Supervisor Feedback */}
        <Text style={styles.sectionHeading}>Supervisor / Preceptor Feedback</Text>
        <View style={styles.card}>
          <Text style={styles.fieldSub}>Direct quotes or notes from your clinical mentor.</Text>
          <TextInput
            testID="input-feedback"
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Preceptor noted excellent sterile technique during catheterization..."
            placeholderTextColor={colors.muted}
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Section 6: Student Reflection */}
        <Text style={styles.sectionHeading}>Student Clinical Reflection</Text>
        <View style={styles.card}>
          <Text style={styles.fieldSub}>What went well? What would you do differently next time?</Text>
          <TextInput
            testID="input-reflection"
            style={[styles.input, styles.textArea, { minHeight: 90 }]}
            placeholder="Write at least 4-5 sentences reflecting on clinical decisions, patient interactions, and areas for improvement..."
            placeholderTextColor={colors.muted}
            value={reflection}
            onChangeText={setReflection}
            multiline
            numberOfLines={5}
          />
        </View>

        {/* Bottom Save Button */}
        <Pressable
          testID="btn-save-bottom"
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Entry & Award 10 XP 🎯</Text>
          )}
        </Pressable>
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600",
  },
  headerTitle: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "800",
  },
  saveHeaderBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  saveHeaderText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  bannerBox: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 20,
    alignItems: "center",
    gap: 12,
  },
  bannerEmoji: {
    fontSize: 28,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#166534",
  },
  bannerText: {
    fontSize: 12,
    color: "#15803D",
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 8,
    marginTop: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 6,
  },
  fieldSub: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 10,
    lineHeight: 16,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.onSurface,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  rowTwo: {
    flexDirection: "row",
    marginTop: 14,
  },
  quickChipsScroll: {
    marginTop: 8,
    marginBottom: 4,
  },
  quickChip: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipActive: {
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brandPrimary,
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  quickChipTextActive: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  tagInputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  addTagBtn: {
    backgroundColor: colors.brandSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addTagBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tagBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
  },
  tagRemove: {
    fontSize: 11,
    fontWeight: "800",
    color: "#047857",
    paddingLeft: 2,
  },
  saveBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
