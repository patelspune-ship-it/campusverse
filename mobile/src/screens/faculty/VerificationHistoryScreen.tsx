import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../../api/client";
import { getVerifications } from "../../services/faculty";
import type { VerificationRequest } from "../../types/api";
import { VerificationCard } from "../../components/VerificationCard";
import { colors, radius, spacing } from "../../theme/theme";

function formatDate(iso: string) {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function VerificationHistoryScreen() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const [approved, rejected] = await Promise.all([getVerifications("approved"), getVerifications("rejected")]);
      const merged = [...approved, ...rejected].sort((a, b) => {
        const at = a.faculty_action_at ? new Date(a.faculty_action_at).getTime() : 0;
        const bt = b.faculty_action_at ? new Date(b.faculty_action_at).getTime() : 0;
        return bt - at;
      });
      setRequests(merged);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load verification history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
      data={requests}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <VerificationCard request={item}>
          <View style={styles.footer}>
            <View style={[styles.badge, item.status === "approved" ? styles.badgeApproved : styles.badgeRejected]}>
              <Text style={[styles.badgeText, item.status === "approved" ? styles.badgeTextApproved : styles.badgeTextRejected]}>
                {item.status === "approved" ? "Approved" : "Rejected"}
              </Text>
            </View>
            {item.faculty_action_at && <Text style={styles.actionedAt}>Actioned {formatDate(item.faculty_action_at)}</Text>}
          </View>
          {item.status === "rejected" && !!item.rejection_reason && (
            <Text style={styles.reason}><Text style={styles.reasonLabel}>Reason: </Text>{item.rejection_reason}</Text>
          )}
        </VerificationCard>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptyCopy}>Approved and rejected requests will show up here.</Text>
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
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeApproved: { backgroundColor: "#E6FAF2" },
  badgeRejected: { backgroundColor: "#FDE8E8" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeTextApproved: { color: "#1B8E63" },
  badgeTextRejected: { color: "#B42318" },
  actionedAt: { color: colors.mutedText, fontSize: 11 },
  reason: { color: colors.destructive, fontSize: 12, marginTop: 6, backgroundColor: "#FDE8E8", borderRadius: radius.sm, padding: 8 },
  reasonLabel: { fontWeight: "700" },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  emptyCopy: { color: colors.mutedText, marginTop: 4, textAlign: "center" },
});
