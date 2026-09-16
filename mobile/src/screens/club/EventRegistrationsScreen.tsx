import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { getEventAttendees } from "../../services/club";
import type { Attendee, AttendeeStats } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";

const statusBadge: Record<Attendee["attendance_status"], { label: string; bg: string; text: string }> = {
  not_attended: { label: "Not Attended", bg: "#F1F1F3", text: "#4B4B55" },
  partial: { label: "Entry Scanned", bg: "#FFF6DB", text: "#825700" },
  full: { label: "Full Attendance", bg: "#E6FAF2", text: "#1B8E63" },
};
const defaultStatusBadge = { label: "Unknown", bg: "#F1F1F3", text: "#4B4B55" };

export function EventRegistrationsScreen() {
  const route = useRoute<any>();
  const { eventId, eventName } = route.params ?? {};

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [stats, setStats] = useState<AttendeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (!eventId) { setError("Missing event information."); setLoading(false); return; }
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const data = await getEventAttendees(eventId);
      setAttendees(data.attendees);
      setStats(data.stats);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load registrations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.retry} onPress={() => load()}><Text style={styles.retryText}>Try again</Text></Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={attendees}
      keyExtractor={(item) => item.registration_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>{eventName}</Text>
          {stats && (
            <View style={styles.statsRow}>
              <Stat label="Registered" value={stats.total} />
              <Stat label="Entered" value={stats.entry_scanned} />
              <Stat label="Exited" value={stats.exit_scanned} />
              <Stat label="Full" value={stats.full_attendance} />
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const badge = statusBadge[item.attendance_status] ?? defaultStatusBadge;
        return (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{item.student_name}</Text>
              <Text style={styles.rowMeta}>{item.student_prn}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No registrations yet</Text>
        </View>
      }
    />
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  error: { color: colors.destructive, textAlign: "center", lineHeight: 21 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: spacing.md },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", ...shadow },
  statValue: { color: colors.primary, fontSize: 18, fontWeight: "800" },
  statLabel: { color: colors.mutedText, fontSize: 10, fontWeight: "600", marginTop: 2, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  rowMeta: { color: colors.mutedText, fontSize: 12 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
});
