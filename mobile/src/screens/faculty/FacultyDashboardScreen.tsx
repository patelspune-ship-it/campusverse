import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { approveVerification, getVerifications, rejectVerification } from "../../services/faculty";
import type { VerificationRequest } from "../../types/api";
import { VerificationCard } from "../../components/VerificationCard";
import { colors, radius, spacing } from "../../theme/theme";

type Banner = { type: "success" | "error"; text: string };

export function FacultyDashboardScreen() {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
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
      setRequests(await getVerifications("pending"));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load pending verifications.");
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
      await approveVerification(id);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      showBanner({ type: "success", text: "Approved." });
    } catch (cause) {
      showBanner({ type: "error", text: cause instanceof ApiError ? cause.message : "Could not approve this request." });
      load(true); // re-sync in case it was actioned elsewhere
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
      await rejectVerification(rejectTarget, rejectReason.trim());
      setRequests((prev) => prev.filter((r) => r._id !== rejectTarget));
      setRejectTarget(null);
      showBanner({ type: "success", text: "Rejected." });
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : "Could not reject this request.";
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
        data={requests}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Faculty Dashboard</Text>
              <Text style={styles.copy}>Attendance verification requests for your lectures.</Text>
            </View>
            <Pressable onPress={() => navigation.navigate("FacultyHistory")}>
              <Text style={styles.historyLink}>History</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <VerificationCard request={item}>
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
          </VerificationCard>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No pending verifications</Text>
            <Text style={styles.emptyCopy}>Requests will appear here when students attend events during your lecture hours.</Text>
          </View>
        }
      />

      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Verification Request</Text>
            <Text style={styles.modalCopy}>Please provide a reason. The student will be able to see this.</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason for rejection…"
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  error: { color: colors.destructive, textAlign: "center", lineHeight: 21 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: spacing.sm, paddingBottom: spacing.lg },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  copy: { color: colors.mutedText, fontSize: 13, marginTop: 2 },
  historyLink: { color: colors.primary, fontWeight: "800", fontSize: 14 },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
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
