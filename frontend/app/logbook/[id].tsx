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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import {
  colors,
  minTouchTarget,
  screenContentBottomPadding,
  spacing,
  radius,
} from "@/src/theme";

export default function LogbookDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: entry, isLoading, refetch } = useQuery({
    queryKey: ["logbook", id],
    queryFn: () => api.logbookEntry(id as string),
    enabled: !!id,
  });

  // Edit state
  const [editPlacement, setEditPlacement] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editPatients, setEditPatients] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [editReflection, setEditReflection] = useState("");

  const startEditing = () => {
    if (!entry) return;
    setEditPlacement(entry.clinical_placement || "");
    setEditDept(entry.hospital_department || "");
    setEditDate(entry.date || "");
    setEditHours(String(entry.clinical_hours ?? ""));
    setEditPatients(String(entry.patients_encountered ?? ""));
    setEditFeedback(entry.supervisor_feedback || "");
    setEditReflection(entry.reflection || "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    if (!editPlacement.trim() || !editDept.trim()) {
      Alert.alert("Missing Information", "Placement and department cannot be empty.");
      return;
    }
    const numHours = parseFloat(editHours);
    if (isNaN(numHours) || numHours <= 0) {
      Alert.alert("Invalid Hours", "Please enter valid clinical hours.");
      return;
    }
    const numPatients = parseInt(editPatients, 10);
    if (isNaN(numPatients) || numPatients < 0) {
      Alert.alert("Invalid Patients", "Please enter the number of patients.");
      return;
    }

    setSaving(true);
    try {
      const patch = {
        clinical_placement: editPlacement.trim(),
        hospital_department: editDept.trim(),
        date: editDate.trim(),
        clinical_hours: numHours,
        patients_encountered: numPatients,
        supervisor_feedback: editFeedback.trim(),
        reflection: editReflection.trim(),
      };
      await api.updateLogbookEntry(id, patch);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["logbook"] });
      setIsEditing(false);
      Alert.alert("Updated", "Clinical entry updated successfully.");
    } catch (err: any) {
      Alert.alert("Update Error", err?.message || "Failed to update entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Clinical Entry",
      "Are you sure you want to delete this logbook entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await api.deleteLogbookEntry(id);
              await queryClient.invalidateQueries({ queryKey: ["logbook"] });
              router.back();
            } catch (err: any) {
              Alert.alert("Delete Failed", err?.message || "Could not delete entry.");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {}
    return dateStr;
  };

  if (isLoading || deleting) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
        <Text style={styles.loadingText}>
          {deleting ? "Deleting entry..." : "Loading entry details..."}
        </Text>
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>Entry not found.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="detail-back"
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Entry" : "Shift Details"}
        </Text>
        {isEditing ? (
          <Pressable
            testID="detail-save-edit"
            onPress={handleSaveEdit}
            disabled={saving}
            style={styles.headerActionBtn}
          >
            <Text style={styles.headerActionText}>{saving ? "..." : "Done"}</Text>
          </Pressable>
        ) : (
          <Pressable
            testID="detail-edit-toggle"
            onPress={startEditing}
            style={styles.headerActionBtn}
          >
            <Text style={styles.headerActionText}>Edit</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: screenContentBottomPadding(insets.bottom) + minTouchTarget,
        }}
      >
        {isEditing ? (
          /* EDIT MODE */
          <View>
            <Text style={styles.sectionHeading}>Placement Details</Text>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Clinical Placement</Text>
              <TextInput
                style={styles.input}
                value={editPlacement}
                onChangeText={setEditPlacement}
              />
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Department</Text>
              <TextInput
                style={styles.input}
                value={editDept}
                onChangeText={setEditDept}
              />
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={editDate}
                onChangeText={setEditDate}
              />
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Hours</Text>
                  <TextInput
                    style={styles.input}
                    value={editHours}
                    onChangeText={setEditHours}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Patients</Text>
                  <TextInput
                    style={styles.input}
                    value={editPatients}
                    onChangeText={setEditPatients}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.sectionHeading}>Supervisor Feedback</Text>
            <View style={styles.card}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editFeedback}
                onChangeText={setEditFeedback}
                multiline
                numberOfLines={3}
              />
            </View>

            <Text style={styles.sectionHeading}>Student Reflection</Text>
            <View style={styles.card}>
              <TextInput
                style={[styles.input, styles.textArea, { minHeight: 90 }]}
                value={editReflection}
                onChangeText={setEditReflection}
                multiline
                numberOfLines={5}
              />
            </View>

            <Pressable
              style={styles.saveEditBtn}
              onPress={handleSaveEdit}
              disabled={saving}
            >
              <Text style={styles.saveEditBtnText}>
                {saving ? "Saving Changes..." : "Save Changes"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelEditBtn}
              onPress={() => setIsEditing(false)}
            >
              <Text style={styles.cancelEditBtnText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          /* READ MODE */
          <View>
            {/* Top Placement Card */}
            <View style={styles.mainCard}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>{formatDate(entry.date)}</Text>
              </View>
              <Text style={styles.heroPlacement}>{entry.clinical_placement}</Text>
              <Text style={styles.heroDept}>{entry.hospital_department}</Text>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{Number(entry.clinical_hours).toFixed(1)}</Text>
                  <Text style={styles.heroStatLabel}>Hours Logged</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{entry.patients_encountered}</Text>
                  <Text style={styles.heroStatLabel}>Patients Seen</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{entry.skills_achieved?.length || 0}</Text>
                  <Text style={styles.heroStatLabel}>Skills Validated</Text>
                </View>
              </View>
            </View>

            {/* Procedures Performed */}
            <Text style={styles.sectionHeading}>Procedures Performed (Hands-On)</Text>
            <View style={styles.card}>
              {entry.procedures_performed?.length > 0 ? (
                <View style={styles.itemsWrap}>
                  {entry.procedures_performed.map((proc: string, i: number) => (
                    <View key={i} style={styles.performedChip}>
                      <Text style={styles.performedChipEmoji}>⚡️</Text>
                      <Text style={styles.performedChipText}>{proc}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noneText}>No hands-on procedures logged for this shift.</Text>
              )}
            </View>

            {/* Procedures Observed */}
            <Text style={styles.sectionHeading}>Procedures Observed</Text>
            <View style={styles.card}>
              {entry.procedures_observed?.length > 0 ? (
                <View style={styles.itemsWrap}>
                  {entry.procedures_observed.map((proc: string, i: number) => (
                    <View key={i} style={styles.observedChip}>
                      <Text style={styles.observedChipEmoji}>👁</Text>
                      <Text style={styles.observedChipText}>{proc}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noneText}>No observed procedures recorded.</Text>
              )}
            </View>

            {/* Skills Achieved */}
            <Text style={styles.sectionHeading}>Skills & Competencies Achieved</Text>
            <View style={styles.card}>
              {entry.skills_achieved?.length > 0 ? (
                <View style={styles.itemsWrap}>
                  {entry.skills_achieved.map((sk: string, i: number) => (
                    <View key={i} style={styles.skillChip}>
                      <Text style={styles.skillChipEmoji}>⭐️</Text>
                      <Text style={styles.skillChipText}>{sk}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noneText}>No specific competencies flagged.</Text>
              )}
            </View>

            {/* Supervisor Feedback */}
            <Text style={styles.sectionHeading}>Supervisor / Preceptor Feedback</Text>
            <View style={[styles.card, styles.feedbackCard]}>
              <Text style={styles.quoteIcon}>“</Text>
              <Text style={styles.feedbackText}>
                {entry.supervisor_feedback?.trim() || "No supervisor feedback recorded for this entry."}
              </Text>
            </View>

            {/* Reflection */}
            <Text style={styles.sectionHeading}>Student Clinical Reflection</Text>
            <View style={[styles.card, styles.reflectionCard]}>
              <Text style={styles.reflectionIcon}>📝</Text>
              <Text style={styles.reflectionText}>
                {entry.reflection?.trim() || "No reflection documented."}
              </Text>
            </View>

            {/* Delete button */}
            <Pressable
              testID="btn-delete-entry"
              style={styles.deleteBtn}
              onPress={handleDelete}
            >
              <Text style={styles.deleteBtnText}>Delete This Entry</Text>
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
    justifyContent: "space-between",
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
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "800",
  },
  headerActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
  },
  headerActionText: {
    color: colors.brandPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
  },
  notFoundText: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  backBtnText: {
    color: "#FFF",
    fontWeight: "700",
  },
  sectionHeading: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 8,
    marginTop: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dateBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginBottom: 8,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  heroPlacement: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 2,
  },
  heroDept: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: "600",
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.brandPrimary,
  },
  heroStatLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.divider,
  },
  itemsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  performedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  performedChipEmoji: {
    fontSize: 12,
  },
  performedChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#047857",
  },
  observedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  observedChipEmoji: {
    fontSize: 12,
  },
  observedChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FDF2F8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  skillChipEmoji: {
    fontSize: 12,
  },
  skillChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#BE185D",
  },
  noneText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: "italic",
  },
  feedbackCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    position: "relative",
  },
  quoteIcon: {
    fontSize: 32,
    color: "#F59E0B",
    lineHeight: 28,
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 13.5,
    color: "#78350F",
    lineHeight: 20,
    fontWeight: "500",
  },
  reflectionCard: {
    backgroundColor: colors.surface,
  },
  reflectionIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  reflectionText: {
    fontSize: 13.5,
    color: colors.onSurfaceSecondary,
    lineHeight: 21,
  },
  deleteBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
  },
  deleteBtnText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 5,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    color: colors.onSurface,
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: "top",
  },
  saveEditBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  saveEditBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelEditBtn: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  cancelEditBtnText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
});
