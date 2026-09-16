import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { getMyAttended, getMyRegistrations } from "../../services/registrations";
import type { AttendedEvent, RegisteredEvent } from "../../types/api";
import { colors, radius, spacing } from "../../theme/theme";

type Badge = "Registered" | "Attended" | "Full Attendance" | "Certificate Ready";

type ListItem = { _id: string; name: string; date: string; venue: string; badge: Badge; certificateReady: boolean };

function toBadge(status: "not_attended" | "partial" | "full", hasCertificate: boolean): Badge {
  if (hasCertificate) return "Certificate Ready";
  if (status === "full") return "Full Attendance";
  if (status === "partial") return "Attended";
  return "Registered";
}

const badgeColors: Record<Badge, { bg: string; text: string }> = {
  Registered: { bg: "#F6ECFB", text: "#7923A4" },
  Attended: { bg: "#FFF6DB", text: "#825700" },
  "Full Attendance": { bg: "#E6FAF2", text: "#1B8E63" },
  "Certificate Ready": { bg: "#E6FAF2", text: "#1B8E63" },
};

export function MyRegistrationsScreen() {
  const navigation = useNavigation<any>();
  const [upcoming, setUpcoming] = useState<RegisteredEvent[]>([]);
  const [attended, setAttended] = useState<AttendedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const [registeredData, attendedData] = await Promise.all([getMyRegistrations(), getMyAttended()]);
      setUpcoming(registeredData);
      setAttended(attendedData);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load your registrations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

  const sections = [
    {
      title: "Upcoming",
      data: upcoming.map((e): ListItem => ({ _id: e._id, name: e.name, date: e.date, venue: e.venue, badge: toBadge(e.attendance_status, false), certificateReady: false })),
    },
    {
      title: "Attended",
      data: attended.map((e): ListItem => ({ _id: e._id, name: e.name, date: e.date, venue: e.venue, badge: toBadge(e.attendance_status, !!e.certificate_path), certificateReady: !!e.certificate_path })),
    },
  ].filter((section) => section.data.length > 0);

  const handlePress = (item: ListItem) => {
    if (item.certificateReady) {
      navigation.navigate("Certificate", { eventId: item._id });
    } else {
      navigation.navigate("MyQR", { eventId: item._id, eventName: item.name });
    }
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
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
      renderItem={({ item }) => {
        const badgeColor = badgeColors[item.badge];
        return (
          <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => handlePress(item)}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.rowMeta}>{formatDate(item.date)} · {item.venue}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: badgeColor.bg }]}>
              <Text style={[styles.badgeText, { color: badgeColor.text }]}>{item.badge}</Text>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No registrations yet</Text>
          <Text style={styles.emptyCopy}>Events you register for will show up here.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  error: { color: colors.destructive, textAlign: "center", lineHeight: 21 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "800", marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  rowPressed: { opacity: 0.9 },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowMeta: { color: colors.mutedText, fontSize: 12 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  emptyCopy: { color: colors.mutedText, marginTop: 4, textAlign: "center" },
});
