import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { getMyBudgetRequests, withdrawBudgetRequest } from "../../services/budget";
import type { BudgetRequest, BudgetStatus } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import { formatCurrency } from "../../utils/format";

const statusColors: Record<BudgetStatus, { bg: string; text: string }> = {
  pending: { bg: "#FFF6DB", text: "#825700" },
  approved: { bg: "#E6FAF2", text: "#1B8E63" },
  rejected: { bg: "#FDE8E8", text: "#B42318" },
  withdrawn: { bg: "#F1F1F3", text: "#75757E" },
};

function formatDate(iso: string) {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function BudgetRequestsScreen() {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setRequests(await getMyBudgetRequests());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load budget requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh whenever this screen regains focus (e.g. after creating/editing a request).
  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const confirmWithdraw = (item: BudgetRequest) => {
    Alert.alert(
      "Withdraw request?",
      `"${item.title}" will be marked as withdrawn and removed from the admin review queue. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Withdraw", style: "destructive", onPress: () => handleWithdraw(item._id) },
      ]
    );
  };

  const handleWithdraw = async (id: string) => {
    setWithdrawingId(id);
    try {
      await withdrawBudgetRequest(id);
      setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: "withdrawn" } : r)));
    } catch (cause) {
      Alert.alert("Couldn't withdraw", cause instanceof ApiError ? cause.message : "Please try again.");
    } finally {
      setWithdrawingId(null);
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
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={requests}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Budget Requests</Text>
              <Text style={styles.copy}>Request annual or event budgets from the platform.</Text>
            </View>
            <Pressable style={styles.createButton} onPress={() => navigation.navigate("ClubBudgetForm", {})}>
              <Text style={styles.createButtonText}>+ New</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const badge = statusColors[item.status];
          return (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {item.request_type === "event" ? "Event" : "Annual"} · AY {item.academic_year} · {formatDate(item.created_at)}
              </Text>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Requested: <Text style={styles.amountValue}>{formatCurrency(item.amount_requested)}</Text></Text>
                {item.status === "approved" && item.amount_approved != null && (
                  <Text style={styles.amountLabel}>Approved: <Text style={[styles.amountValue, { color: "#1B8E63" }]}>{formatCurrency(item.amount_approved)}</Text></Text>
                )}
              </View>

              {item.status === "rejected" && item.admin_remarks && (
                <Text style={styles.remarksRejected}><Text style={styles.remarksLabel}>Admin remarks: </Text>{item.admin_remarks}</Text>
              )}
              {item.status === "approved" && item.admin_remarks && (
                <Text style={styles.remarksNeutral}><Text style={styles.remarksLabel}>Admin remarks: </Text>{item.admin_remarks}</Text>
              )}

              {item.status === "pending" && (
                <View style={styles.actionsRow}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => navigation.navigate("ClubBudgetForm", { request: item })}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.withdrawButton, withdrawingId === item._id && styles.buttonDisabled]}
                    onPress={() => confirmWithdraw(item)}
                    disabled={withdrawingId === item._id}
                  >
                    {withdrawingId === item._id ? <ActivityIndicator color={colors.destructive} size="small" /> : <Text style={styles.withdrawButtonText}>Withdraw</Text>}
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No budget requests yet</Text>
            <Text style={styles.emptyCopy}>Submit your first request to get started.</Text>
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
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "800", flex: 1 },
  meta: { color: colors.mutedText, fontSize: 12, marginTop: 3, textTransform: "capitalize" },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  amountRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, flexWrap: "wrap" },
  amountLabel: { color: colors.mutedText, fontSize: 13 },
  amountValue: { color: colors.text, fontWeight: "800" },
  remarksRejected: { color: colors.destructive, fontSize: 12.5, marginTop: spacing.sm, backgroundColor: "#FDE8E8", borderRadius: radius.sm, padding: 8, lineHeight: 17 },
  remarksNeutral: { color: colors.mutedText, fontSize: 12.5, marginTop: spacing.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8, lineHeight: 17 },
  remarksLabel: { fontWeight: "700", color: colors.text },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  editButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 9, alignItems: "center", justifyContent: "center" },
  editButtonText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  withdrawButton: { flex: 1, borderWidth: 1, borderColor: colors.destructive, borderRadius: radius.sm, paddingVertical: 9, alignItems: "center", justifyContent: "center" },
  withdrawButtonText: { color: colors.destructive, fontWeight: "700", fontSize: 13 },
  buttonDisabled: { opacity: 0.6 },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  emptyCopy: { color: colors.mutedText, marginTop: 4, textAlign: "center" },
});
