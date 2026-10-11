import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError } from "../../api/client";
import { approveBudgetRequest, getAllBudgetRequests, rejectBudgetRequest } from "../../services/budget";
import type { BudgetRequest, BudgetStatus } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import { formatCurrency } from "../../utils/format";

type Banner = { type: "success" | "error"; text: string };
type StatusFilter = "all" | BudgetStatus;

const FILTERS: StatusFilter[] = ["all", "pending", "approved", "rejected", "withdrawn"];

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
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [banner, setBanner] = useState<Banner | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detail, setDetail] = useState<BudgetRequest | null>(null);
  const [actionMode, setActionMode] = useState<"approve" | "reject" | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveRemarks, setApproveRemarks] = useState("");
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [actioning, setActioning] = useState(false);

  const showBanner = (next: Banner) => {
    setBanner(next);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 3000);
  };

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setRequests(await getAllBudgetRequests(statusFilter === "all" ? undefined : { status: statusFilter }));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load budget requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }, []);

  const openDetail = (r: BudgetRequest) => {
    setDetail(r);
    setActionMode(null);
    setApproveAmount(String(r.amount_requested));
    setApproveRemarks("");
    setRejectRemarks("");
  };

  const closeDetail = () => {
    setDetail(null);
    setActionMode(null);
  };

  // "Already actioned" race: another admin acted on this request first.
  // Same handling as the faculty verification screens — show the message
  // and re-sync the list instead of leaving a dead button behind.
  const handleApprove = async () => {
    if (!detail) return;
    setActioning(true);
    try {
      await approveBudgetRequest(
        detail._id,
        approveAmount ? Number(approveAmount) : undefined,
        approveRemarks.trim() || undefined
      );
      showBanner({ type: "success", text: "Budget request approved." });
      closeDetail();
      load(true);
    } catch (cause) {
      showBanner({ type: "error", text: cause instanceof ApiError ? cause.message : "Could not approve this request." });
      closeDetail();
      load(true);
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async () => {
    if (!detail || !rejectRemarks.trim()) return;
    setActioning(true);
    try {
      await rejectBudgetRequest(detail._id, rejectRemarks.trim());
      showBanner({ type: "success", text: "Budget request rejected." });
      closeDetail();
      load(true);
    } catch (cause) {
      showBanner({ type: "error", text: cause instanceof ApiError ? cause.message : "Could not reject this request." });
      closeDetail();
      load(true);
    } finally {
      setActioning(false);
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
      {banner && (
        <View style={[styles.banner, banner.type === "success" ? styles.bannerSuccess : styles.bannerError]}>
          <Text style={styles.bannerText}>{banner.text}</Text>
        </View>
      )}

      <FlatList
        contentContainerStyle={styles.content}
        data={requests}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Budget Requests</Text>
            <Text style={styles.copy}>{requests.length} request{requests.length !== 1 ? "s" : ""}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8 }}>
              {FILTERS.map((f) => (
                <Pressable key={f} onPress={() => setStatusFilter(f)} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => {
          const badge = statusColors[item.status];
          const clubName = typeof item.club_id === "object" && item.club_id ? item.club_id.name : "Unknown club";
          return (
            <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => openDetail(item)}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.meta}>{clubName} · {item.request_type} · AY {item.academic_year}</Text>
              <Text style={styles.amount}>Requested: <Text style={styles.amountValue}>{formatCurrency(item.amount_requested)}</Text></Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyCopy}>Nothing matches this filter right now.</Text>
          </View>
        }
      />

      {/* Detail modal */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={closeDetail}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ gap: spacing.sm }}>
            {detail && (
              <>
                <Text style={styles.modalTitle}>{detail.title}</Text>
                <View style={[styles.badge, { backgroundColor: statusColors[detail.status].bg, alignSelf: "flex-start" }]}>
                  <Text style={[styles.badgeText, { color: statusColors[detail.status].text }]}>{detail.status}</Text>
                </View>

                <DetailRow label="Club" value={typeof detail.club_id === "object" && detail.club_id ? detail.club_id.name : "Unknown"} />
                <DetailRow label="Type" value={`${detail.request_type} · AY ${detail.academic_year}`} />
                {detail.event_id && <DetailRow label="Event" value={`${detail.event_id.name} — ${formatDate(detail.event_id.date)}`} />}
                <DetailRow label="Requested" value={formatCurrency(detail.amount_requested)} />
                {detail.amount_approved != null && <DetailRow label="Approved" value={formatCurrency(detail.amount_approved)} />}
                <DetailRow label="Submitted" value={formatDate(detail.created_at)} />

                <Text style={styles.sectionLabel}>Purpose</Text>
                <Text style={styles.purposeText}>{detail.purpose}</Text>

                {detail.breakdown.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Itemized Breakdown</Text>
                    <View style={styles.breakdownBox}>
                      {detail.breakdown.map((b, idx) => (
                        <View key={b._id ?? idx} style={styles.breakdownItemRow}>
                          <Text style={styles.breakdownItemText}>{b.item}</Text>
                          <Text style={styles.breakdownItemCost}>{formatCurrency(b.cost)}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {detail.admin_remarks && (
                  <View style={detail.status === "rejected" ? styles.remarksRejected : styles.remarksNeutral}>
                    <Text style={styles.remarksLabel}>Admin remarks</Text>
                    <Text style={styles.remarksText}>{detail.admin_remarks}</Text>
                  </View>
                )}

                {detail.status === "pending" && actionMode === null && (
                  <View style={styles.actionsRow}>
                    <Pressable style={styles.rejectButton} onPress={() => setActionMode("reject")}>
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </Pressable>
                    <Pressable style={styles.approveButton} onPress={() => setActionMode("approve")}>
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </Pressable>
                  </View>
                )}

                {actionMode === "approve" && (
                  <View style={styles.actionForm}>
                    <Text style={styles.label}>Approved Amount (₹)</Text>
                    <TextInput style={styles.input} value={approveAmount} onChangeText={setApproveAmount} keyboardType="number-pad" placeholderTextColor={colors.mutedText} />
                    <Text style={styles.label}>Remarks (optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={approveRemarks}
                      onChangeText={setApproveRemarks}
                      placeholder="Any notes for the club…"
                      placeholderTextColor={colors.mutedText}
                      multiline
                    />
                    <View style={styles.modalActions}>
                      <Pressable style={styles.modalCancel} onPress={() => setActionMode(null)} disabled={actioning}>
                        <Text style={styles.modalCancelText}>Back</Text>
                      </Pressable>
                      <Pressable style={styles.modalApprove} onPress={handleApprove} disabled={actioning}>
                        {actioning ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalApproveText}>Confirm Approval</Text>}
                      </Pressable>
                    </View>
                  </View>
                )}

                {actionMode === "reject" && (
                  <View style={styles.actionForm}>
                    <Text style={styles.label}>Reason for rejection *</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={rejectRemarks}
                      onChangeText={setRejectRemarks}
                      placeholder="e.g. Missing itemization, exceeds club's annual cap…"
                      placeholderTextColor={colors.mutedText}
                      multiline
                    />
                    <Text style={styles.helperText}>This will be visible to the club admin.</Text>
                    <View style={styles.modalActions}>
                      <Pressable style={styles.modalCancel} onPress={() => setActionMode(null)} disabled={actioning}>
                        <Text style={styles.modalCancelText}>Back</Text>
                      </Pressable>
                      <Pressable style={styles.modalReject} onPress={handleReject} disabled={actioning || !rejectRemarks.trim()}>
                        {actioning ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalRejectText}>Confirm Rejection</Text>}
                      </Pressable>
                    </View>
                  </View>
                )}

                {actionMode === null && (
                  <Pressable style={styles.closeButton} onPress={closeDetail}>
                    <Text style={styles.closeButtonText}>Close</Text>
                  </Pressable>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  header: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  copy: { color: colors.mutedText, fontSize: 13, marginTop: 2, marginBottom: spacing.sm },
  filterRow: { marginTop: spacing.xs },
  filterChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.text, fontSize: 12.5, fontWeight: "700", textTransform: "capitalize" },
  filterChipTextActive: { color: "white" },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  cardPressed: { opacity: 0.9 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "800", flex: 1 },
  meta: { color: colors.mutedText, fontSize: 12, marginTop: 3, textTransform: "capitalize" },
  amount: { color: colors.mutedText, fontSize: 13, marginTop: spacing.sm },
  amountValue: { color: colors.text, fontWeight: "800" },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  emptyCopy: { color: colors.mutedText, marginTop: 4, textAlign: "center" },
  banner: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingVertical: 10, paddingHorizontal: spacing.md, alignItems: "center" },
  bannerSuccess: { backgroundColor: colors.accent },
  bannerError: { backgroundColor: colors.destructive },
  bannerText: { color: "white", fontWeight: "700", fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: spacing.lg },
  modalCard: { maxHeight: "85%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  detailLabel: { color: colors.mutedText, fontSize: 12.5 },
  detailValue: { color: colors.text, fontSize: 12.5, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  sectionLabel: { color: colors.mutedText, fontSize: 11.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, marginTop: spacing.xs },
  purposeText: { color: colors.text, fontSize: 13.5, lineHeight: 19 },
  breakdownBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: "hidden" },
  breakdownItemRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  breakdownItemText: { color: colors.text, fontSize: 13 },
  breakdownItemCost: { color: colors.text, fontSize: 13, fontWeight: "700" },
  remarksRejected: { backgroundColor: "#FDE8E8", borderRadius: radius.sm, padding: 10 },
  remarksNeutral: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10 },
  remarksLabel: { color: colors.text, fontWeight: "700", fontSize: 12 },
  remarksText: { color: colors.text, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  approveButton: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
  approveButtonText: { color: "white", fontWeight: "800", fontSize: 13 },
  rejectButton: { flex: 1, borderWidth: 1, borderColor: colors.destructive, borderRadius: radius.sm, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
  rejectButtonText: { color: colors.destructive, fontWeight: "800", fontSize: 13 },
  actionForm: { marginTop: spacing.xs, gap: 6 },
  label: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, color: colors.text, fontSize: 14, backgroundColor: colors.background },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  helperText: { color: colors.mutedText, fontSize: 11.5 },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  modalCancelText: { color: colors.text, fontWeight: "700" },
  modalApprove: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  modalApproveText: { color: "white", fontWeight: "800" },
  modalReject: { flex: 1, backgroundColor: colors.destructive, borderRadius: radius.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  modalRejectText: { color: "white", fontWeight: "800" },
  closeButton: { alignSelf: "center", paddingVertical: spacing.sm, marginTop: spacing.xs },
  closeButtonText: { color: colors.mutedText, fontWeight: "700", fontSize: 13 },
});
