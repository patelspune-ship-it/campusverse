import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError } from "../../api/client";
import { approveEvent, getPendingEvents, rejectEvent } from "../../services/admin";
import type { PendingAdminEvent } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";

type Banner = { type: "success" | "error"; text: string };

function formatDate(iso: string) {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function PendingApprovalsScreen() {
  const [events, setEvents] = useState<PendingAdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [banner, setBanner] = useState<Banner | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = (next: Banner) => {
    setBanner(next);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 3000);
  };

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setEvents(await getPendingEvents());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load pending events.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }, []);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      await approveEvent(id);
      setEvents((prev) => prev.filter((e) => e._id !== id));
      showBanner({ type: "success", text: "Event approved and published." });
    } catch (cause) {
      showBanner({ type: "error", text: cause instanceof ApiError ? cause.message : "Could not approve this event." });
      load(true);
    } finally {
      setActioningId(null);
    }
  };

  const openReject = (id: string) => {
    setRejectTarget(id);
    setRejectReason("");
    setRejectError("");
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError("Please provide a reason.");
      return;
    }
    setActioningId(rejectTarget);
    try {
      await rejectEvent(rejectTarget, rejectReason.trim());
      setEvents((prev) => prev.filter((e) => e._id !== rejectTarget));
      setRejectTarget(null);
      showBanner({ type: "success", text: "Event rejected." });
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : "Could not reject this event.";
      setRejectError(message);
      load(true);
    } finally {
      setActioningId(null);
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
        data={events}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Pending Approvals</Text>
            <Text style={styles.copy}>
              {events.length === 0 ? "All caught up." : `${events.length} event${events.length !== 1 ? "s" : ""} awaiting review.`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.club_id?.name ?? "Unknown club"} · {item.category}</Text>
            <View style={styles.detailBlock}>
              <Detail label="Date" value={`${formatDate(item.date)} · ${item.start_time}–${item.end_time}`} />
              <Detail label="Venue" value={item.venue} />
              <Detail label="Capacity" value={`${item.max_participants} max`} />
            </View>
            <Text style={styles.description} numberOfLines={4}>{item.description}</Text>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.approveButton, actioningId === item._id && styles.buttonDisabled]}
                onPress={() => handleApprove(item._id)}
                disabled={actioningId === item._id}
              >
                {actioningId === item._id ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.approveButtonText}>Approve</Text>}
              </Pressable>
              <Pressable
                style={[styles.rejectButton, actioningId === item._id && styles.buttonDisabled]}
                onPress={() => openReject(item._id)}
                disabled={actioningId === item._id}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No pending events</Text>
            <Text style={styles.emptyCopy}>When clubs submit events, they'll appear here for review.</Text>
          </View>
        }
      />

      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Event</Text>
            <Text style={styles.modalCopy}>Please provide a reason. The club admin will be able to see this.</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Missing venue details, duplicate event…"
              placeholderTextColor={colors.mutedText}
              multiline
            />
            {!!rejectError && <Text style={styles.modalError}>{rejectError}</Text>}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setRejectTarget(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalReject} onPress={handleReject} disabled={actioningId === rejectTarget}>
                {actioningId === rejectTarget ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalRejectText}>Reject</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  error: { color: colors.destructive, textAlign: "center", lineHeight: 21 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.lg },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  copy: { color: colors.mutedText, fontSize: 13, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  name: { color: colors.text, fontSize: 16, fontWeight: "800" },
  meta: { color: colors.mutedText, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  detailBlock: { marginTop: spacing.sm, gap: 3 },
  detailLine: { color: colors.text, fontSize: 12.5, lineHeight: 18 },
  detailLabel: { color: colors.mutedText, fontWeight: "700" },
  description: { color: colors.text, fontSize: 13, lineHeight: 18, marginTop: spacing.sm },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  approveButton: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  approveButtonText: { color: "white", fontWeight: "800", fontSize: 13 },
  rejectButton: { flex: 1, borderWidth: 1, borderColor: colors.destructive, borderRadius: radius.sm, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  rejectButtonText: { color: colors.destructive, fontWeight: "800", fontSize: 13 },
  buttonDisabled: { opacity: 0.6 },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  emptyCopy: { color: colors.mutedText, marginTop: 4, textAlign: "center" },
  banner: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingVertical: 10, paddingHorizontal: spacing.md, alignItems: "center" },
  bannerSuccess: { backgroundColor: colors.accent },
  bannerError: { backgroundColor: colors.destructive },
  bannerText: { color: "white", fontWeight: "700", fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  modalCard: { width: "100%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  modalCopy: { color: colors.mutedText, fontSize: 13, marginTop: 6, lineHeight: 18 },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginTop: spacing.md, minHeight: 70, textAlignVertical: "top", color: colors.text, fontSize: 14 },
  modalError: { color: colors.destructive, fontSize: 12, marginTop: 6 },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  modalCancelText: { color: colors.text, fontWeight: "700" },
  modalReject: { flex: 1, backgroundColor: colors.destructive, borderRadius: radius.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  modalRejectText: { color: "white", fontWeight: "800" },
});
