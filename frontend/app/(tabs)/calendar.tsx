import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { api } from "@/src/api";
import { colors, minTouchTarget, radius, spacing, tabContentBottomPadding } from "@/src/theme";

type Ev = {
  id: string;
  date: string;
  type: string;
  shift_type?: string;
  leave_kind?: string;
  title: string;
  notes?: string;
  hours?: number;
  start_time?: string;
  end_time?: string;
};

const SHIFT_STYLE: Record<string, { bg: string; fg: string; label: string; long: string }> = {
  morning: { bg: "#FBBF24", fg: "#78350F", label: "D",   long: "Day" },
  evening: { bg: "#A78BFA", fg: "#3B0764", label: "E",   long: "Evening" },
  night:   { bg: "#1E3A8A", fg: "#FFFFFF", label: "N",   long: "Night" },
  off:     { bg: "#E2E8F0", fg: "#475569", label: "OFF", long: "Off" },
};
const LEAVE_STYLE = { bg: "#10B981", fg: "#FFFFFF", label: "AL", long: "Annual leave" };
const SICK_STYLE  = { bg: "#EF4444", fg: "#FFFFFF", label: "SL", long: "Sick leave" };

const OTHER_ICON: Record<string, string> = {
  cme: "🎓",
  class: "💻",
  appointment: "🏥",
  task: "✅",
  note: "📝",
};

function styleForCell(evs: Ev[]) {
  const shift = evs.find((e) => e.type === "shift");
  const leave = evs.find((e) => e.type === "leave");
  if (leave) {
    const k = leave.leave_kind === "SICK" ? SICK_STYLE : LEAVE_STYLE;
    return { ...k, isEmpty: false };
  }
  if (shift) {
    const st = SHIFT_STYLE[shift.shift_type || "off"] || SHIFT_STYLE.off;
    return { ...st, isEmpty: false };
  }
  return { bg: "transparent", fg: colors.onSurface, label: "", long: "", isEmpty: true };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ShiftRoster() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [selected, setSelected] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [events, setEvents] = useState<Ev[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = dayjs(month + "-01").startOf("month").subtract(7, "day").format("YYYY-MM-DD");
      const to = dayjs(month + "-01").endOf("month").add(7, "day").format("YYYY-MM-DD");
      const [ev, sm] = await Promise.all([api.calListEvents(from, to), api.calSummary()]);
      setEvents(ev.events || []);
      setSummary(sm);
    } catch (e: any) {
      console.log("shift-roster load", e.message);
    } finally { setLoading(false); }
  }, [month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const byDate = useMemo(() => {
    const m: Record<string, Ev[]> = {};
    for (const e of events) (m[e.date] = m[e.date] || []).push(e);
    return m;
  }, [events]);

  const monthStart = useMemo(() => dayjs(month + "-01").startOf("month"), [month]);
  const gridStart = useMemo(() => monthStart.startOf("week"), [monthStart]);   // Sunday
  const cells = useMemo(() => {
    const arr: { date: string; inMonth: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = gridStart.add(i, "day");
      arr.push({
        date: d.format("YYYY-MM-DD"),
        inMonth: d.format("YYYY-MM") === month,
        isToday: d.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD"),
      });
    }
    return arr;
  }, [gridStart, month]);

  const dayEvents = (byDate[selected] || []).slice().sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  const goPrev = () => setMonth(dayjs(month + "-01").subtract(1, "month").format("YYYY-MM"));
  const goNext = () => setMonth(dayjs(month + "-01").add(1, "month").format("YYYY-MM"));
  const goToday = () => { const t = dayjs().format("YYYY-MM-DD"); setSelected(t); setMonth(dayjs().format("YYYY-MM")); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Shift Roster</Text>
          <Text style={styles.subtitle} numberOfLines={1}>Shifts, leave &amp; CME</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable testID="cal-today" onPress={goToday} style={styles.pillBtn}><Text style={styles.pillBtnText}>Today</Text></Pressable>
          <Pressable testID="cal-settings" onPress={() => router.push("/calendar/settings" as any)} style={styles.iconBtn}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: tabContentBottomPadding(insets.bottom), gap: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brandPrimary} />}
      >
        {summary && (
          <Pressable testID="cal-summary-card" onPress={() => router.push("/calendar/summary" as any)} style={styles.summaryCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.summaryTitle}>Leave & CME summary</Text>
              <Text style={{ color: colors.brandPrimary, fontWeight: "800", fontSize: 12 }}>Open ›</Text>
            </View>
            <View style={styles.summaryRow}>
              <Metric label="AL remaining" value={String(summary.al_remaining)} accent={colors.success} />
              <Metric label="Sick remaining" value={String(summary.sick_remaining)} accent="#EF4444" />
              <Metric label="Nights (6mo)" value={String(summary.night_shifts_6mo)} accent={colors.brandPrimary} />
              <Metric label="CME hrs YTD" value={String(summary.cme_hours_ytd)} accent={colors.brandSecondary} />
            </View>
          </Pressable>
        )}

        {/* ---- Month header + navigation ---- */}
        <View style={styles.calCard}>
          <View style={styles.monthNav}>
            <Pressable testID="prev-month" onPress={goPrev} hitSlop={12} style={styles.navBtn}><Text style={styles.navBtnTxt}>‹</Text></Pressable>
            <Text style={styles.monthTitle}>{dayjs(month + "-01").format("MMMM YYYY")}</Text>
            <Pressable testID="next-month" onPress={goNext} hitSlop={12} style={styles.navBtn}><Text style={styles.navBtnTxt}>›</Text></Pressable>
          </View>

          {/* ---- Weekday row ---- */}
          <View style={styles.weekRow}>
            {DAYS.map((d) => (
              <View key={d} style={styles.weekCol}>
                <Text style={styles.weekTxt}>{d}</Text>
              </View>
            ))}
          </View>

          {/* ---- Shift grid ---- */}
          <View style={styles.grid}>
            {cells.map((c) => {
              const evs = byDate[c.date] || [];
              const s = styleForCell(evs);
              const isSel = c.date === selected;
              const others = evs.filter((e) => e.type !== "shift" && e.type !== "leave");
              const dayNum = dayjs(c.date).date();
              return (
                <Pressable
                  key={c.date}
                  testID={`day-${c.date}`}
                  onPress={() => setSelected(c.date)}
                  onLongPress={() => router.push({ pathname: "/calendar/day/[date]", params: { date: c.date } } as any)}
                  style={[
                    styles.cell,
                    { backgroundColor: s.isEmpty ? (c.inMonth ? colors.surface : colors.surfaceTertiary) : s.bg },
                    !c.inMonth && { opacity: 0.35 },
                    isSel && styles.cellSelected,
                    c.isToday && !isSel && styles.cellToday,
                  ]}
                >
                  <Text style={[styles.dayNum, { color: s.isEmpty ? colors.onSurface : s.fg }]}>{dayNum}</Text>
                  {!s.isEmpty && <Text style={[styles.shiftLabel, { color: s.fg }]}>{s.label}</Text>}
                  {others.length > 0 && (
                    <Text style={styles.otherRow} numberOfLines={1}>
                      {others.slice(0, 3).map((e) => OTHER_ICON[e.type] || "•").join("")}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* ---- Legend ---- */}
          <View style={styles.legend}>
            {[
              { c: SHIFT_STYLE.morning.bg, fg: SHIFT_STYLE.morning.fg, l: "D", full: "Day" },
              { c: SHIFT_STYLE.evening.bg, fg: SHIFT_STYLE.evening.fg, l: "E", full: "Evening" },
              { c: SHIFT_STYLE.night.bg,   fg: SHIFT_STYLE.night.fg,   l: "N", full: "Night" },
              { c: SHIFT_STYLE.off.bg,     fg: SHIFT_STYLE.off.fg,     l: "OFF", full: "Off" },
              { c: LEAVE_STYLE.bg,         fg: LEAVE_STYLE.fg,         l: "AL",  full: "Leave" },
              { c: SICK_STYLE.bg,          fg: SICK_STYLE.fg,          l: "SL",  full: "Sick" },
            ].map((it) => (
              <View key={it.l} style={styles.legendItem}>
                <View style={[styles.legendChip, { backgroundColor: it.c }]}><Text style={[styles.legendChipTxt, { color: it.fg }]}>{it.l}</Text></View>
                <Text style={styles.legendText}>{it.full}</Text>
              </View>
            ))}
            <View style={styles.legendItem}>
              <Text style={{ fontSize: 12 }}>🎓 💻 🏥 ✅</Text>
              <Text style={styles.legendText}>CME / class / appt / task</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable testID="cal-add-shift" onPress={() => router.push({ pathname: "/calendar/add", params: { date: selected, type: "shift" } } as any)} style={[styles.actionBtn, { backgroundColor: colors.brandPrimary }]}>
            <Text style={styles.actionText}>+ Shift</Text>
          </Pressable>
          <Pressable testID="cal-add-cme" onPress={() => router.push({ pathname: "/calendar/add", params: { date: selected, type: "cme" } } as any)} style={[styles.actionBtn, { backgroundColor: colors.brandSecondary }]}>
            <Text style={styles.actionText}>+ CME / Class</Text>
          </Pressable>
          <Pressable testID="cal-add-task" onPress={() => router.push({ pathname: "/calendar/add", params: { date: selected, type: "task" } } as any)} style={[styles.actionBtn, { backgroundColor: "#334155" }]}>
            <Text style={styles.actionText}>+ Task / Appt</Text>
          </Pressable>
        </View>

        <View style={styles.toolsRow}>
          <Pressable testID="cal-pattern" onPress={() => router.push("/calendar/pattern" as any)} style={styles.toolBtn}>
            <Text style={styles.toolIcon}>🔁</Text>
            <Text style={styles.toolText}>Shift pattern</Text>
          </Pressable>
          <Pressable testID="cal-apply-al" onPress={() => router.push("/calendar/apply-leave" as any)} style={styles.toolBtn}>
            <Text style={styles.toolIcon}>🏖️</Text>
            <Text style={styles.toolText}>Apply leave</Text>
          </Pressable>
          <Pressable testID="cal-day-detail" onPress={() => router.push({ pathname: "/calendar/day/[date]", params: { date: selected } } as any)} style={styles.toolBtn}>
            <Text style={styles.toolIcon}>📋</Text>
            <Text style={styles.toolText}>Day detail</Text>
          </Pressable>
        </View>

        <Text style={styles.dayHeader}>
          {dayjs(selected).format("dddd, MMM D")}
          {dayEvents.length > 0 ? `  ·  ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : "  ·  nothing scheduled"}
        </Text>

        {dayEvents.length === 0 && !loading && (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 34 }}>🗓️</Text>
            <Text style={styles.emptyTitle}>No events on this day</Text>
            <Text style={styles.emptySub}>Tap +Shift, +CME or +Task above to add one.</Text>
          </View>
        )}

        {dayEvents.map((ev) => {
          const info = ev.type === "shift" ? SHIFT_STYLE[ev.shift_type || "off"] || SHIFT_STYLE.off
                     : ev.type === "leave" ? (ev.leave_kind === "SICK" ? SICK_STYLE : LEAVE_STYLE)
                     : { bg: colors.brandTertiary, fg: colors.brandPrimary, label: (OTHER_ICON[ev.type] || "•"), long: ev.type };
          return (
            <Pressable
              key={ev.id}
              testID={`ev-${ev.id}`}
              onPress={() => router.push({ pathname: "/calendar/day/[date]", params: { date: selected } } as any)}
              style={styles.evCard}
            >
              <View style={[styles.evTag, { backgroundColor: info.bg }]}>
                <Text style={[styles.evTagText, { color: info.fg }]}>{info.label}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.evTitle}>{ev.title}</Text>
                <Text style={styles.evMeta}>
                  {ev.start_time ? `${ev.start_time}${ev.end_time ? ` – ${ev.end_time}` : ""}` : ""}
                  {ev.hours ? `${ev.start_time ? "  ·  " : ""}${ev.hours}h` : ""}
                  {ev.notes ? `${(ev.start_time || ev.hours) ? "  ·  " : ""}${ev.notes.slice(0, 40)}` : ""}
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 20 }}>›</Text>
            </Pressable>
          );
        })}

        {loading && dayEvents.length === 0 && <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 12 }} />}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: 10,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", flexShrink: 0, gap: 8 },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  iconBtn: { width: minTouchTarget, height: minTouchTarget, borderRadius: minTouchTarget / 2, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  pillBtn: { paddingHorizontal: 12, minHeight: minTouchTarget, borderRadius: minTouchTarget / 2, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  pillBtnText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },

  summaryCard: { backgroundColor: colors.surface, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: 12 },
  summaryTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  metric: { flex: 1, alignItems: "center" },
  metricValue: { fontSize: 20, fontWeight: "800" },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 2, textAlign: "center" },

  calCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 8, borderWidth: 1, borderColor: colors.border },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 8 },
  monthTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  navBtn: { width: minTouchTarget, height: minTouchTarget, borderRadius: minTouchTarget / 2, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  navBtnTxt: { color: colors.brandPrimary, fontSize: 24, fontWeight: "800", marginTop: -3 },
  weekRow: { flexDirection: "row", paddingHorizontal: 4, paddingBottom: 6 },
  weekCol: { flex: 1, alignItems: "center" },
  weekTxt: { color: colors.muted, fontSize: 11, fontWeight: "800" },

  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 4 },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.85,
    padding: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "flex-start",
    marginVertical: 2,
  },
  cellSelected: { borderColor: colors.brandPrimary, borderWidth: 2 },
  cellToday: { borderColor: colors.brandSecondary, borderWidth: 1.5, borderStyle: "dashed" },
  dayNum: { fontSize: 11, fontWeight: "700", alignSelf: "flex-start", paddingLeft: 2 },
  shiftLabel: { fontSize: 15, fontWeight: "900", marginTop: 2, letterSpacing: 0.3 },
  otherRow: { fontSize: 9, marginTop: 2 },

  legend: { flexDirection: "row", flexWrap: "wrap", padding: 10, gap: 12, borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendChip: { minWidth: 24, height: 20, paddingHorizontal: 5, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  legendChipTxt: { fontSize: 10, fontWeight: "800" },
  legendText: { color: colors.muted, fontSize: 11, fontWeight: "700" },

  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, minHeight: minTouchTarget, justifyContent: "center", paddingVertical: 8, borderRadius: radius.md, alignItems: "center" },
  actionText: { color: "#FFF", fontSize: 12, fontWeight: "800", textAlign: "center" },

  toolsRow: { flexDirection: "row", gap: 8 },
  toolBtn: { flex: 1, minHeight: 76, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 4 },
  toolIcon: { fontSize: 20 },
  toolText: { color: colors.onSurface, fontSize: 11, fontWeight: "700", textAlign: "center" },

  dayHeader: { color: colors.onSurface, fontSize: 15, fontWeight: "800", marginTop: 8 },
  emptyCard: { padding: 24, backgroundColor: colors.surface, borderRadius: radius.lg, alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  emptySub: { color: colors.muted, fontSize: 12, textAlign: "center" },

  evCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  evTag: { minWidth: 46, height: 46, paddingHorizontal: 6, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  evTagText: { fontSize: 15, fontWeight: "900" },
  evTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  evMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
