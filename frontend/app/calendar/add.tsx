import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import dayjs from "dayjs";
import { api } from "@/src/api";
import { colors, radius, screenContentBottomPadding, spacing } from "@/src/theme";

const TYPES = [
  { key: "shift", label: "Duty shift", icon: "🩺" },
  { key: "cme", label: "CME", icon: "🎓" },
  { key: "class", label: "Online class", icon: "💻" },
  { key: "appointment", label: "Doctor / Appt", icon: "🏥" },
  { key: "task", label: "Task / Reminder", icon: "✅" },
  { key: "note", label: "Note", icon: "📝" },
];

const SHIFT_TYPES = [
  { key: "morning", label: "Morning", icon: "🌅", hours: 8 },
  { key: "evening", label: "Evening", icon: "🌇", hours: 8 },
  { key: "night", label: "Night", icon: "🌙", hours: 12 },
  { key: "off", label: "Off", icon: "🛌", hours: 0 },
];

export default function AddEvent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string; type?: string }>();

  const [date, setDate] = useState(params.date || dayjs().format("YYYY-MM-DD"));
  const [type, setType] = useState<string>(params.type || "shift");
  const [shiftType, setShiftType] = useState<string>("morning");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [hours, setHours] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [busy, setBusy] = useState(false);

  const suggestedTitle = () => {
    if (type === "shift") return `${shiftType.charAt(0).toUpperCase() + shiftType.slice(1)} shift`;
    if (type === "cme") return "CME class";
    if (type === "class") return "Online class";
    if (type === "appointment") return "Doctor appointment";
    if (type === "task") return "Task";
    if (type === "note") return "Note";
    return "";
  };

  const save = async () => {
    const t = title.trim() || suggestedTitle();
    if (!t) return Alert.alert("Add a title");
    setBusy(true);
    try {
      const payload: any = {
        date, type, title: t, notes: notes.trim(),
      };
      if (type === "shift") {
        payload.shift_type = shiftType;
        payload.hours = hours ? parseFloat(hours) : SHIFT_TYPES.find((s) => s.key === shiftType)?.hours || 8;
      } else {
        if (hours) payload.hours = parseFloat(hours);
      }
      if (startTime) payload.start_time = startTime;
      if (endTime) payload.end_time = endTime;
      await api.calCreateEvent(payload);
      router.back();
    } catch (e: any) {
      Alert.alert("Could not save", e.message);
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="add-close" onPress={() => router.back()}><Text style={styles.close}>✕</Text></Pressable>
        <Text style={styles.title}>New event</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 14, paddingBottom: screenContentBottomPadding(insets.bottom) }} keyboardShouldPersistTaps="handled">
        <Text style={styles.sec}>Type</Text>
        <View style={styles.typeGrid}>
          {TYPES.map((t) => (
            <Pressable
              key={t.key}
              testID={`type-${t.key}`}
              onPress={() => setType(t.key)}
              style={[styles.typeChip, type === t.key && styles.typeChipActive]}
            >
              <Text style={{ fontSize: 22 }}>{t.icon}</Text>
              <Text style={[styles.typeText, type === t.key && { color: "#FFF" }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {type === "shift" && (
          <>
            <Text style={styles.sec}>Shift type</Text>
            <View style={styles.typeGrid}>
              {SHIFT_TYPES.map((s) => (
                <Pressable
                  key={s.key}
                  testID={`shift-${s.key}`}
                  onPress={() => { setShiftType(s.key); setHours(String(s.hours)); }}
                  style={[styles.typeChip, shiftType === s.key && styles.typeChipActive]}
                >
                  <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                  <Text style={[styles.typeText, shiftType === s.key && { color: "#FFF" }]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sec}>Date</Text>
        <TextInput
          testID="add-date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.sec}>Title</Text>
        <TextInput
          testID="add-title"
          value={title}
          onChangeText={setTitle}
          placeholder={suggestedTitle()}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sec}>Start</Text>
            <TextInput testID="add-start" value={startTime} onChangeText={setStartTime} placeholder="e.g. 07:00" placeholderTextColor={colors.muted} style={styles.input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sec}>End</Text>
            <TextInput testID="add-end" value={endTime} onChangeText={setEndTime} placeholder="e.g. 19:00" placeholderTextColor={colors.muted} style={styles.input} />
          </View>
          <View style={{ width: 100 }}>
            <Text style={styles.sec}>Hours</Text>
            <TextInput testID="add-hours" value={hours} onChangeText={setHours} placeholder="8" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={styles.input} />
          </View>
        </View>

        <Text style={styles.sec}>Notes</Text>
        <TextInput
          testID="add-notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional details, ward, room, reminders…"
          placeholderTextColor={colors.muted}
          style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
          multiline
        />

        <Pressable testID="add-save" disabled={busy} onPress={save} style={[styles.primary, busy && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Save event</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  close: { color: colors.onSurface, fontSize: 22, fontWeight: "700", width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  sec: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { flexDirection: "column", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 92, gap: 4 },
  typeChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  typeText: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.onSurface },
  primary: { marginTop: 12, backgroundColor: colors.brandPrimary, padding: 16, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
