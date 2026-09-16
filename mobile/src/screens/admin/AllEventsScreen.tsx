import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../../api/client";
import { getAllEvents } from "../../services/admin";
import type { AdminEvent, EventStatus } from "../../types/api";
import { colors, radius, spacing } from "../../theme/theme";

const FILTERS: { label: string; value: EventStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const statusColors: Record<EventStatus, { bg: string; text: string }> = {
  pending: { bg: "#FFF6DB", text: "#825700" },
  approved: { bg: "#E6FAF2", text: "#1B8E63" },
  rejected: { bg: "#FDE8E8", text: "#B42318" },
  completed: { bg: "#F1F1F3", text: "#4B4B55" },
  cancelled: { bg: "#F1F1F3", text: "#75757E" },
};

function formatDate(iso: string) {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function AllEventsScreen() {
  const [statusFilter, setStatusFilter] = useState<EventStatus | undefined>(undefined);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setEvents(await getAllEvents(statusFilter));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load events.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.screen}>
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterChip, statusFilter === item.value && styles.filterChipActive]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text style={[styles.filterChipText, statusFilter === item.value && styles.filterChipTextActive]}>{item.label}</Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => load()}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={events}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const badge = statusColors[item.status];
            return (
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.rowMeta}>{item.club_id?.name ?? "Unknown club"} · {formatDate(item.date)}</Text>
                  <Text style={styles.rowMeta}>{item.registrationCount} registered</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{item.status}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No events match this filter</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filterRow: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  filterList: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 8 },
  filterChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  filterChipTextActive: { color: "white" },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  error: { color: colors.destructive, textAlign: "center", lineHeight: 21 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowMeta: { color: colors.mutedText, fontSize: 12 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", marginTop: spacing.md },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
});
