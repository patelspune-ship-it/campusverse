import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { EventCard } from "../../components/EventCard";
import { getUpcomingEvents } from "../../services/events";
import { colors, radius, spacing } from "../../theme/theme";
import type { Event } from "../../types/api";

export function EventsScreen() {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<Event[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => { refresh ? setRefreshing(true) : setLoading(true); setError(""); try { setEvents(await getUpcomingEvents()); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Could not load events."); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.loadingText}>Loading live events…</Text></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable style={styles.retry} onPress={() => load()}><Text style={styles.retryText}>Try again</Text></Pressable></View>;
  return <FlatList style={styles.screen} contentContainerStyle={styles.content} data={events} keyExtractor={(item) => item._id} renderItem={({ item }) => <EventCard event={item} onPress={() => navigation.navigate("EventDetail", { event: item })} />} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />} ListHeaderComponent={<View style={styles.header}><Text style={styles.title}>Explore events</Text><Text style={styles.copy}>Approved upcoming events from CampusVerse clubs.</Text></View>} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No upcoming events</Text><Text style={styles.copy}>New activities will appear here when approved.</Text></View>} />;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 }, header: { paddingTop: spacing.md, paddingBottom: spacing.lg }, title: { color: colors.text, fontSize: 27, fontWeight: "800" }, copy: { color: colors.mutedText, lineHeight: 20, marginTop: 4 }, center: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.md }, loadingText: { color: colors.mutedText }, error: { color: colors.destructive, textAlign: "center", lineHeight: 21 }, retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 }, retryText: { color: "white", fontWeight: "800" }, empty: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, alignItems: "center" }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "800" } });
