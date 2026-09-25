import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/src/api";
import { colors, screenContentBottomPadding, spacing, radius } from "@/src/theme";

const CATS = ["Clinical", "Professional Development", "Education", "Mandatory Training", "Other"];

export default function CME() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["cme"], queryFn: api.cme });
  const [showAdd, setShowAdd] = useState(false);

  const total = data?.total ?? 0;
  const required = data?.required ?? 40;
  const pct = Math.min(100, Math.round((total / required) * 100));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="cme-back" onPress={() => router.back()}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.title}>CME / CPD</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
        <View style={styles.dashboard}>
          <View style={styles.ring}>
            <Text style={styles.ringPct}>{pct}%</Text>
            <Text style={styles.ringMeta}>completed</Text>
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Stat label="Required" value={`${required} hrs`} />
            <Stat label="Completed" value={`${total} hrs`} color={colors.success} />
            <Stat label="Remaining" value={`${Math.max(0, required - total)} hrs`} color={colors.warning} />
          </View>
        </View>

        <Pressable testID="cme-add" style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add CME hours</Text>
        </Pressable>

        <Text style={styles.sec}>Recent activity</Text>
        {(data?.records || []).length === 0 ? (
          <Text style={styles.empty}>No records yet. Add your first CME entry above.</Text>
        ) : (
          (data?.records || []).map((r: any) => (
            <View key={r.id} style={styles.record}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitle}>{r.title}</Text>
                <Text style={styles.recMeta}>{r.category}{r.provider ? ` · ${r.provider}` : ""}</Text>
              </View>
              <Text style={styles.recHours}>{r.hours} hrs</Text>
            </View>
          ))
        )}
      </ScrollView>

      <AddCMEModal visible={showAdd} onClose={() => setShowAdd(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["cme"] }); qc.invalidateQueries({ queryKey: ["home"] }); }} />
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: color || colors.onSurface, fontSize: 15, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

function AddCMEModal({ visible, onClose, onSaved }: any) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Clinical");
  const [hours, setHours] = useState("");
  const [provider, setProvider] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title || !hours) return;
    setBusy(true);
    try {
      await api.addCME({ title, category, hours: parseFloat(hours), provider });
      setTitle(""); setHours(""); setProvider(""); onSaved(); onClose();
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
        <View style={styles.modal}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.modalTitle}>Add CME Entry</Text>
            <Pressable testID="cme-modal-close" onPress={onClose}><Text style={{ fontSize: 20 }}>✕</Text></Pressable>
          </View>
          <TextInput testID="cme-title" value={title} onChangeText={setTitle} placeholder="Activity title" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput testID="cme-provider" value={provider} onChangeText={setProvider} placeholder="Provider (optional)" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput testID="cme-hours" value={hours} onChangeText={setHours} placeholder="Hours" keyboardType="decimal-pad" placeholderTextColor={colors.muted} style={styles.input} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, height: 44, alignItems: "center" }}>
            {CATS.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
                <Text style={[styles.chipText, category === c && { color: "#FFF" }]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable testID="cme-save" disabled={busy} style={[styles.saveBtn, busy && { opacity: 0.6 }]} onPress={save}>
            <Text style={styles.saveBtnText}>{busy ? "Saving..." : "Save"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backIcon: { fontSize: 30, color: colors.onSurface, width: 30 },
  title: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  dashboard: { flexDirection: "row", gap: 16, backgroundColor: colors.surface, padding: 20, borderRadius: radius.lg, alignItems: "center" },
  ring: { width: 110, height: 110, borderRadius: 55, borderWidth: 10, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  ringPct: { color: colors.brandPrimary, fontSize: 24, fontWeight: "800" },
  ringMeta: { color: colors.muted, fontSize: 11 },
  addBtn: { padding: 16, borderRadius: radius.md, backgroundColor: colors.brandSecondary, alignItems: "center", marginTop: 16 },
  addBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  sec: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: 24, marginBottom: 12 },
  record: { flexDirection: "row", padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8, alignItems: "center" },
  recTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  recMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  recHours: { color: colors.brandSecondary, fontSize: 15, fontWeight: "800" },
  empty: { color: colors.muted, textAlign: "center", padding: 20 },
  modalWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modal: { backgroundColor: colors.surface, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 },
  modalTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.onSurface, borderWidth: 1, borderColor: colors.border },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  saveBtn: { backgroundColor: colors.brandPrimary, padding: 16, borderRadius: radius.lg, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
