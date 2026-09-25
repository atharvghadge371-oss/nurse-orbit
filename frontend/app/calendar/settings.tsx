import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { api } from "@/src/api";
import { colors, radius, screenContentBottomPadding, spacing } from "@/src/theme";

export default function LeaveSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [alRate, setAlRate] = useState("1.5");
  const [sickRate, setSickRate] = useState("15");
  const [workStart, setWorkStart] = useState("");
  const [alCarry, setAlCarry] = useState("0");
  const [sickCarry, setSickCarry] = useState("0");
  const [country, setCountry] = useState("");
  const [airport, setAirport] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.calLeaveConfig();
        setAlRate(String(cfg.al_rate_per_month ?? 1.5));
        setSickRate(String(cfg.sick_rate_per_year ?? 15));
        setWorkStart(cfg.work_start_date || "");
        setAlCarry(String(cfg.al_carry_over ?? 0));
        setSickCarry(String(cfg.sick_carry_over ?? 0));
        setCountry(cfg.country || "");
        setAirport(cfg.home_airport || "");
      } catch (e: any) {
        console.log(e.message);
      } finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    if (!workStart || !/^\d{4}-\d{2}-\d{2}$/.test(workStart)) {
      return Alert.alert("Enter work start date as YYYY-MM-DD");
    }
    setSaving(true);
    try {
      await api.calSaveLeaveConfig({
        al_rate_per_month: parseFloat(alRate) || 0,
        sick_rate_per_year: parseFloat(sickRate) || 0,
        work_start_date: workStart,
        al_carry_over: parseFloat(alCarry) || 0,
        sick_carry_over: parseFloat(sickCarry) || 0,
        country: country.trim() || null,
        home_airport: airport.trim().toUpperCase() || null,
      });
      Alert.alert("Saved", "Your leave settings are updated");
      router.back();
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
      <ActivityIndicator color={colors.brandPrimary} />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="set-close" onPress={() => router.back()}><Text style={styles.close}>✕</Text></Pressable>
        <Text style={styles.title}>Leave settings</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 14, paddingBottom: screenContentBottomPadding(insets.bottom) }}>
        <Text style={styles.help}>Tell us how leave accrues at your workplace so we can compute AL, sick balance and suggest windows.</Text>

        <Text style={styles.sec}>Work start date *</Text>
        <TextInput testID="set-work-start" value={workStart} onChangeText={setWorkStart} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />

        <Text style={styles.sec}>AL rate (days per completed month)</Text>
        <TextInput testID="set-al-rate" value={alRate} onChangeText={setAlRate} keyboardType="decimal-pad" style={styles.input} placeholder="1.5" placeholderTextColor={colors.muted} />
        <Text style={styles.helpSmall}>Only working days count against AL. Off days in an AL window are free.</Text>

        <Text style={styles.sec}>Sick leave (days per year)</Text>
        <TextInput testID="set-sick-rate" value={sickRate} onChangeText={setSickRate} keyboardType="decimal-pad" style={styles.input} placeholder="15" placeholderTextColor={colors.muted} />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sec}>AL carried over</Text>
            <TextInput testID="set-al-carry" value={alCarry} onChangeText={setAlCarry} keyboardType="decimal-pad" style={styles.input} placeholder="0" placeholderTextColor={colors.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sec}>Sick carried over</Text>
            <TextInput testID="set-sick-carry" value={sickCarry} onChangeText={setSickCarry} keyboardType="decimal-pad" style={styles.input} placeholder="0" placeholderTextColor={colors.muted} />
          </View>
        </View>

        <Text style={styles.sec}>Home country (for holidays)</Text>
        <TextInput testID="set-country" value={country} onChangeText={setCountry} style={styles.input} placeholder="e.g. India" placeholderTextColor={colors.muted} />

        <Text style={styles.sec}>Home airport IATA (for flight compare)</Text>
        <TextInput testID="set-airport" value={airport} onChangeText={setAirport} style={styles.input} placeholder="e.g. COK, DEL, BLR" placeholderTextColor={colors.muted} autoCapitalize="characters" />

        <Pressable testID="set-save" disabled={saving} onPress={save} style={[styles.primary, saving && { opacity: 0.5 }]}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Save settings</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  close: { color: colors.onSurface, fontSize: 22, fontWeight: "700", width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  help: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  helpSmall: { color: colors.muted, fontSize: 11, marginTop: 4 },
  sec: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.onSurface },
  primary: { marginTop: 16, backgroundColor: colors.brandPrimary, padding: 16, borderRadius: radius.lg, alignItems: "center" },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
