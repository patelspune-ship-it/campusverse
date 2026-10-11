import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { getMyApplications } from "../../services/recruitment";
import type { Application, ApplicationStage } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";

const stageLabel: Record<ApplicationStage, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview Scheduled",
  interviewed: "Interviewed",
  selected: "Selected",
  rejected: "Rejected",
};
const stageColors: Record<ApplicationStage, { bg: string; text: string }> = {
  applied: { bg: "#F1F1F3", text: "#4B4B55" },
  shortlisted: { bg: "#E8F0FE", text: "#1A56C4" },
  interview_scheduled: { bg: "#F3E8FD", text: "#7B2FC4" },
  interviewed: { bg: "#FFF6DB", text: "#825700" },
  selected: { bg: "#E6FAF2", text: "#1B8E63" },
  rejected: { bg: "#FDE8E8", text: "#B42318" },
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function MyApplicationsScreen() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setApplications(await getMyApplications());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load your applications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

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
      data={applications}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      renderItem={({ item }) => {
        const badge = stageColors[item.stage];
        const clubName = typeof item.club_id === "object" && item.club_id ? item.club_id.name : "Unknown club";
        const driveTitle = typeof item.drive_id === "object" && item.drive_id ? item.drive_id.title : "";
        return (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{clubName}</Text>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{stageLabel[item.stage]}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>{driveTitle} · {item.role_applied_for}</Text>

            {!!item.interview_slot?.date && (
              <View style={styles.interviewBox}>
                <Text style={styles.interviewTitle}>Interview: {formatDate(item.interview_slot.date)} at {item.interview_slot.time}</Text>
                {!!item.interview_slot.venue && <Text style={styles.interviewLine}>Venue: {item.interview_slot.venue}</Text>}
                {!!item.interview_slot.meeting_link && <Text style={styles.interviewLine}>{item.interview_slot.meeting_link}</Text>}
              </View>
            )}

            {!!item.final_remarks && (
              <Text style={[styles.remarks, item.stage === "rejected" ? styles.remarksRejected : styles.remarksSelected]}>
                {item.final_remarks}
              </Text>
            )}
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No applications yet</Text>
          <Text style={styles.emptyCopy}>Browse open recruitment drives to apply.</Text>
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
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "800", flex: 1 },
  cardMeta: { color: colors.mutedText, fontSize: 12, marginTop: 2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  interviewBox: { marginTop: spacing.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8 },
  interviewTitle: { color: colors.text, fontSize: 12.5, fontWeight: "700" },
  interviewLine: { color: colors.mutedText, fontSize: 12, marginTop: 2 },
  remarks: { fontSize: 12.5, marginTop: spacing.sm, borderRadius: radius.sm, padding: 8, lineHeight: 17 },
  remarksSelected: { color: "#1B8E63", backgroundColor: "#E6FAF2" },
  remarksRejected: { color: colors.destructive, backgroundColor: "#FDE8E8" },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  emptyCopy: { color: colors.mutedText, marginTop: 4, textAlign: "center" },
});
