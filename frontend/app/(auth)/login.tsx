import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useState } from "react";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { colors, spacing, radius } from "@/src/theme";

export default function Login() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr(""); setBusy(true);
    try { await login(email.trim(), password); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} testID="login-title">Welcome back</Text>
        <Text style={styles.subtitle}>Log in to continue your nursing journey.</Text>

        <View style={{ gap: 12, marginTop: 24 }}>
          <TextInput testID="login-email-input" placeholder="Email" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} />
          <TextInput testID="login-password-input" placeholder="Password" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
        </View>

        {!!err && <Text style={styles.err} testID="login-error">{err}</Text>}

        <Pressable testID="login-submit-btn" style={[styles.primary, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
          <Text style={styles.primaryText}>{busy ? "Logging in..." : "Log in"}</Text>
        </Pressable>

        <Link href="/(auth)/signup" style={styles.linkText} testID="go-signup">
          <Text style={styles.linkText}>New here? Create an account</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: 8 },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 15 },
  input: { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  primary: { backgroundColor: colors.brandPrimary, padding: 16, borderRadius: radius.lg, alignItems: "center", marginTop: 20 },
  primaryText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  err: { color: colors.error, marginTop: 8, fontSize: 14 },
  linkText: { color: colors.brandPrimary, textAlign: "center", marginTop: 20, fontSize: 15, fontWeight: "600" },
});
