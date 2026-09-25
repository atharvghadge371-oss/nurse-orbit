import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import dayjs from "dayjs";
import { api } from "@/src/api";
import { colors, radius, screenContentBottomPadding, spacing } from "@/src/theme";

const TYPE_INFO: Record<string, { color: string; icon: string }> = {
  morning: { color: "#F59E0B", icon: "🌅" },
  evening: { color: "#8B5CF6", icon: "🌇" },
  night: { color: "#1E3A8A", icon: "🌙" },
  off: { color: "#94A3B8", icon: "🛌" },
  cme: { color: "#0D9488", icon: "🎓" },
  class: { color: "#0D9488", icon: "💻" },
  appointment: { color: "#EF4444", icon: "🏥" },
  task: { color: "#3B82F6", icon: "✅" },
  note: { color: "#64748B", icon: "📝" },
  leave: { color: "#10B981", icon: "🏖️" },
};

function infoFor(ev: any) {
  if (ev.type === "shift") return TYPE_INFO[ev.shift_type || "off"] || TYPE_INFO.off;
  return TYPE_INFO[ev.type] || { color: colors.brandPrimary, icon: "•" };
}

export default function DayDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();
  const day = date || dayjs().format("YYYY-MM-DD");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.calListEvents(day, day);
      setEvents(r.events || []);
    } catch {} finally { setLoading(false); }
  }, [day]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = (id: string) => {
    Alert.alert("Delete event?", "This cannot be undone.", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await api.calDeleteEvent(id); load(); } catch (e: any) { Alert.alert("Failed", e.message); }
      } },
    ]);
  };

  const toggleDone = async (ev: any) => {
    try { await api.calUpdateEvent(ev.id, { completed: !ev.completed }); load(); } catch (e: any) { Alert.alert("Failed", e.message); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="dd-back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View>
          <Text style={styles.title}>{dayjs(day).format("dddd")}</Text>
          <Text style={styles.subtitle}>{dayjs(day).format("MMM D, YYYY")}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: screenContentBottomPadding(insets.bottom) }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brandPrimary} />}
      >
        {loading && events.length === 0 && <ActivityIndicator color={colors.brandPrimary} />}
        {!loading && events.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>🗓️</Text>
            <Text style={styles.emptyTitle}>Nothing on this day</Text>
            <Text style={styles.emptySub}>Add a shift, class, appointment or task.</Text>
          </View>
        )}
        {events.map((ev) => {
          const info = infoFor(ev);
          const done = ev.completed;
          return (
            <View key={ev.id} style={[styles.card, done && { opacity: 0.55 }]}>
              <View style={[styles.tag, { backgroundColor: info.color }]}>
                <Text style={{ fontSize: 20 }}>{info.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.evTitle, done && { textDecorationLine: "line-through" }]}>{ev.title}</Text>
                <Text style={styles.evMeta}>
                  {ev.type === "shift" ? (ev.shift_type ? ev.shift_type[0].toUpperCase() + ev.shift_type.slice(1) : "Shift") : (ev.type[0].toUpperCase() + ev.type.slice(1))}
                  {ev.hours ? `  ·  ${ev.hours}h` : ""}
                  {ev.start_time ? `  ·  ${ev.start_time}${ev.end_time ? `–${ev.end_time}` : ""}` : ""}
                </Text>
                {!!ev.notes && <Text style={styles.evNotes}>{ev.notes}</Text>}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  {(ev.type === "task" || ev.type === "appointment" || ev.type === "cme" || ev.type === "class") && (
                    <Pressable testID={`dd-toggle-${ev.id}`} onPress={() => toggleDone(ev)} style={[styles.smallBtn, done ? { backgroundColor: colors.surfaceTertiary } : { backgroundColor: colors.success }]}>
                      <Text style={[styles.smallBtnText, done ? { color: colors.onSurface } : { color: "#FFF" }]}>{done ? "Undo" : "Done"}</Text>
                    </Pressable>
                  )}
                  <Pressable testID={`dd-del-${ev.id}`} onPress={() => remove(ev.id)} style={[styles.smallBtn, { backgroundColor: "#FEE2E2" }]}>
                    <Text style={[styles.smallBtnText, { color: "#B91C1C" }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 12 }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable testID="dd-add-shift" onPress={() => router.replace({ pathname: "/calendar/add", params: { date: day, type: "shift" } } as any)} style={[styles.addBtn, { backgroundColor: colors.brandPrimary }]}><Text style={styles.addTxt}>+ Shift</Text></Pressable>
          <Pressable testID="dd-add-cme" onPress={() => router.replace({ pathname: "/calendar/add", params: { date: day, type: "cme" } } as any)} style={[styles.addBtn, { backgroundColor: colors.brandSecondary }]}><Text style={styles.addTxt}>+ CME</Text></Pressable>
          <Pressable testID="dd-add-task" onPress={() => router.replace({ pathname: "/calendar/add", params: { date: day, type: "task" } } as any)} style={[styles.addBtn, { backgroundColor: "#334155" }]}><Text style={styles.addTxt}>+ Task</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { color: colors.onSurface, fontSize: 30, width: 32 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center" },
  card: { flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tag: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  evTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  evMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  evNotes: { color: colors.onSurfaceSecondary, fontSize: 12, marginTop: 6, lineHeight: 17 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  smallBtnText: { fontSize: 11, fontWeight: "800" },
  empty: { padding: 32, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  emptySub: { color: colors.muted, fontSize: 12, textAlign: "center" },
  addBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: "center" },
  addTxt: { color: "#FFF", fontSize: 13, fontWeight: "800" },
});
