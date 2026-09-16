import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { Event } from "../types/api";
import { colors, radius, shadow, spacing } from "../theme/theme";
type Props = { event: Event; onPress: () => void };
export function EventCard({ event, onPress }: Props) {
  const date = new Date(event.date);
  return <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
    {event.poster_url ? <Image source={{ uri: event.poster_url }} style={styles.poster} /> : <View style={styles.posterPlaceholder}><Text style={styles.posterMark}>CV</Text></View>}
    <View style={styles.content}>
      <View style={styles.row}><Text style={styles.category}>{event.category}</Text><Text style={styles.date}>{isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</Text></View>
      <Text style={styles.title} numberOfLines={2}>{event.name}</Text>
      <Text style={styles.club} numberOfLines={1}>{event.club_id?.name || "CampusVerse Club"}</Text>
      <Text style={styles.meta} numberOfLines={1}>{event.start_time} · {event.venue}</Text>
      <Text style={styles.people}>{event.registrationCount ?? 0} registered · {event.max_participants} places</Text>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadow }, cardPressed: { opacity: 0.9 }, poster: { height: 145, width: "100%" }, posterPlaceholder: { height: 110, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }, posterMark: { color: colors.primary, fontSize: 28, fontWeight: "800" }, content: { padding: spacing.md, gap: 6 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, category: { color: colors.primary, backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }, date: { color: colors.mutedText, fontSize: 12, fontWeight: "600" }, title: { color: colors.text, fontSize: 18, fontWeight: "800", lineHeight: 23 }, club: { color: colors.primary, fontSize: 13, fontWeight: "700" }, meta: { color: colors.text, fontSize: 13 }, people: { color: colors.mutedText, fontSize: 12 } });
