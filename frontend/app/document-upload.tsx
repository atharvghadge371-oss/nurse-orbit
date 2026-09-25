import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL, getToken } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

const CATEGORIES = ["Identity", "Education", "Licensing", "Certifications", "Experience", "Language", "CME", "Career"];

export default function DocumentUpload() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Certifications");
  const [issuer, setIssuer] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async () => {
    setErr("");
    const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
    if (!r.canceled && r.assets?.[0]) setFile(r.assets[0]);
  };

  const submit = async () => {
    if (!name.trim()) { setErr("Please enter a document name"); return; }
    setBusy(true); setErr("");
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("category", category);
      form.append("issuer", issuer);
      form.append("certificate_number", certNumber);
      form.append("issue_date", issueDate);
      form.append("expiry_date", expiryDate);
      form.append("notes", notes);
      if (file) {
        if (Platform.OS === "web") {
          const blob = await (await fetch(file.uri)).blob();
          form.append("file", blob, file.name);
        } else {
          form.append("file", { uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" } as any);
        }
      }
      const token = await getToken();
      const res = await fetch(`${API_URL}/passport/documents`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      router.back();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="upload-close" onPress={() => router.back()}><Text style={styles.close}>✕</Text></Pressable>
        <Text style={styles.headerTitle}>Add Document</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Label>Document name*</Label>
        <TextInput testID="doc-name" value={name} onChangeText={setName} style={styles.input} placeholder="e.g. ACLS Certificate" placeholderTextColor={colors.muted} />

        <Label>Category</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} testID={`cat-${c}`} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Label>Issuer</Label>
        <TextInput testID="doc-issuer" value={issuer} onChangeText={setIssuer} style={styles.input} placeholder="e.g. American Heart Association" placeholderTextColor={colors.muted} />

        <Label>Certificate number</Label>
        <TextInput testID="doc-cert" value={certNumber} onChangeText={setCertNumber} style={styles.input} placeholder="Optional" placeholderTextColor={colors.muted} />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Label>Issue date</Label>
            <TextInput testID="doc-issue" value={issueDate} onChangeText={setIssueDate} style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Label>Expiry date</Label>
            <TextInput testID="doc-expiry" value={expiryDate} onChangeText={setExpiryDate} style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />
          </View>
        </View>

        <Label>Notes</Label>
        <TextInput testID="doc-notes" value={notes} onChangeText={setNotes} style={[styles.input, { height: 80 }]} multiline placeholder="Optional" placeholderTextColor={colors.muted} />

        <Pressable testID="doc-pick-file" style={styles.filePick} onPress={pick}>
          <Text style={{ fontSize: 22, marginRight: 8 }}>📎</Text>
          <Text style={styles.filePickText}>{file ? file.name : "Attach PDF or image"}</Text>
        </Pressable>

        {!!err && <Text style={styles.err}>{err}</Text>}

        <Pressable testID="doc-submit" disabled={busy} style={[styles.primary, busy && { opacity: 0.6 }]} onPress={submit}>
          <Text style={styles.primaryText}>{busy ? "Saving..." : "Save Document"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ children }: any) { return <Text style={styles.label}>{children}</Text>; }

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  close: { fontSize: 22, color: colors.onSurface, width: 30 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  label: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  chipRow: { gap: 8, paddingVertical: 4, height: 44, alignItems: "center" },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: "#FFF" },
  filePick: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 18, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brandPrimary, marginTop: 20 },
  filePickText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700" },
  err: { color: colors.error, marginTop: 12, fontSize: 13 },
  primary: { backgroundColor: colors.brandPrimary, padding: 16, borderRadius: radius.lg, alignItems: "center", marginTop: 24 },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
