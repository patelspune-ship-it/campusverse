import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { getClubEvents } from "../../services/club";
import type { ClubEvent, EventStatus } from "../../types/api";
import { colors, radius, spacing } from "../../theme/theme";

const statusColors: Record<EventStatus, { bg: string; text: string }> = {
  pending: { bg: "#FFF6DB", text: "#825700" },
  approved: { bg: "#E6FAF2", text: "#1B8E63" },
  rejected: { bg: "#FDE8E8", text: "#B42318" },
  completed: { bg: "#F1F1F3", text: "#4B4B55" },
  cancelled: { bg: "#F1F1F3", text: "#75757E" },
};
const defaultStatusColor = { bg: "#F1F1F3", text: "#4B4B55" };

export function ClubDashboardScreen() {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setEvents(await getClubEvents());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load your events.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Refresh whenever this tab regains focus (e.g. after creating an event).
  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

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
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={events}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>My Events</Text>
              <Text style={styles.copy}>Events created by your club.</Text>
            </View>
            <Pressable style={styles.createButton} onPress={() => navigation.navigate("ClubCreateEvent")}>
              <Text style={styles.createButtonText}>+ New</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const badge = statusColors[item.status] ?? defaultStatusColor;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => navigation.navigate("ClubEventRegistrations", { eventId: item._id, eventName: item.name })}
            >
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.rowMeta}>{formatDate(item.date)} · {item.venue}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{item.status}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyCopy}>Create your first event to get started.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  error: { color: colors.destructive, textAlign: "center", lineHeight: 21 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: spacing.sm, paddingBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  copy: { color: colors.mutedText, fontSize: 13, marginTop: 2 },
  createButton: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
  createButtonText: { color: "white", fontWeight: "800", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  rowPressed: { opacity: 0.9 },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowMeta: { color: colors.mutedText, fontSize: 12 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  emptyCopy: { color: colors.mutedText, marginTop: 4, textAlign: "center" },
});
