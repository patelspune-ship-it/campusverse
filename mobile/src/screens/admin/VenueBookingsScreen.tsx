import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ApiError } from "../../api/client";
import { approveVenueBooking, cancelVenueBooking, getAdminVenueBookings, getAdminVenues, rejectVenueBooking } from "../../services/venues";
import type { Venue, VenueBooking, VenueBookingStatus } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";

type Banner = { type: "success" | "error"; text: string };

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

const statusColors: Record<VenueBookingStatus, { bg: string; text: string }> = {
  pending: { bg: "#FFF6DB", text: "#825700" },
  approved: { bg: "#E6FAF2", text: "#1B8E63" },
  rejected: { bg: "#FDE8E8", text: "#B42318" },
  cancelled: { bg: "#F1F1F3", text: "#75757E" },
};

export function VenueBookingsScreen() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState<Banner | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detail, setDetail] = useState<VenueBooking | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
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
      const day = isoDate(date);
      const [b, v] = await Promise.all([
        getAdminVenueBookings({ date_from: day, date_to: day }),
        venues.length ? Promise.resolve(venues) : getAdminVenues(),
      ]);
      setBookings(b);
      if (!venues.length) setVenues(v);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load venue bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }, []);

  const conflictIds = new Set<string>();
  const approved = bookings.filter((b) => b.status === "approved");
  for (let i = 0; i < approved.length; i++) {
    for (let j = i + 1; j < approved.length; j++) {
      const a = approved[i], b = approved[j];
      const aVenue = typeof a.venue_id === "object" ? a.venue_id?._id : a.venue_id;
      const bVenue = typeof b.venue_id === "object" ? b.venue_id?._id : b.venue_id;
      if (aVenue && aVenue === bVenue && overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) {
        conflictIds.add(a._id); conflictIds.add(b._id);
      }
    }
  }

  const grouped = venues
    .map((v) => ({ venue: v, items: bookings.filter((b) => (typeof b.venue_id === "object" ? b.venue_id?._id : b.venue_id) === v._id) }))
    .filter((g) => g.items.length > 0);

  const openDetail = (b: VenueBooking) => {
    setDetail(b);
    setRejectMode(false);
    setRejectRemarks("");
  };
  const closeDetail = () => { setDetail(null); setRejectMode(false); };

  const handleApprove = async () => {
    if (!detail) return;
    setActioning(true);
    try {
      const res = await approveVenueBooking(detail._id);
      showBanner({ type: "success", text: res.conflicts?.length ? `Approved — ${res.conflicts.length} conflicting booking(s) exist.` : "Booking approved." });
      closeDetail();
      load(true);
    } catch (cause) {
      showBanner({ type: "error", text: cause instanceof ApiError ? cause.message : "Could not approve — it may have already been actioned." });
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
      await rejectVenueBooking(detail._id, rejectRemarks.trim());
      showBanner({ type: "success", text: "Booking rejected." });
      closeDetail();
      load(true);
    } catch (cause) {
      showBanner({ type: "error", text: cause instanceof ApiError ? cause.message : "Could not reject — it may have already been actioned." });
      closeDetail();
      load(true);
    } finally {
      setActioning(false);
    }
  };

  const handleCancel = async () => {
    if (!detail) return;
    setActioning(true);
    try {
      await cancelVenueBooking(detail._id);
      showBanner({ type: "success", text: "Booking cancelled." });
      closeDetail();
      load(true);
    } catch (cause) {
      showBanner({ type: "error", text: cause instanceof ApiError ? cause.message : "Could not cancel this booking." });
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

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}>
        <Text style={styles.title}>Venue Bookings</Text>
        <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateButtonText}>{date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Text>
        </Pressable>

        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No bookings this day</Text>
            <Text style={styles.emptyCopy}>Nothing is booked across any venue on this date.</Text>
          </View>
        ) : (
          grouped.map(({ venue, items }) => (
            <View key={venue._id} style={styles.venueGroup}>
              <Text style={styles.venueGroupTitle}>{venue.name}</Text>
              {items
                .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
                .map((b) => {
                  const badge = statusColors[b.status];
                  return (
                    <Pressable key={b._id} style={styles.card} onPress={() => openDetail(b)}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{b.title}</Text>
                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.badgeText, { color: badge.text }]}>{b.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardMeta}>
                        {b.start_time}–{b.end_time} · {b.booking_type}{b.club_id ? ` · ${b.club_id.name}` : ""}
                      </Text>
                      {conflictIds.has(b._id) && <Text style={styles.conflictTag}>⚠ Conflicts with another approved booking</Text>}
                    </Pressable>
                  );
                })}
            </View>
          ))
        )}
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event, selected) => {
            setShowPicker(Platform.OS === "ios");
            if (selected) setDate(selected);
          }}
        />
      )}
      {showPicker && Platform.OS === "ios" && (
        <Pressable style={styles.doneButton} onPress={() => setShowPicker(false)}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      )}

      {/* Detail modal */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={closeDetail}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {detail && !rejectMode && (
              <>
                <Text style={styles.modalTitle}>{detail.title}</Text>
                <Text style={styles.modalMeta}>
                  {typeof detail.venue_id === "object" ? detail.venue_id?.name : ""} · {detail.start_time}–{detail.end_time}
                </Text>
                <Text style={styles.modalMeta}>{detail.booking_type}{detail.club_id ? ` · ${detail.club_id.name}` : ""}</Text>
                {detail.event_id && <Text style={styles.modalMeta}>Event: {detail.event_id.name}</Text>}
                {detail.admin_remarks && <Text style={styles.modalRemarks}>Remarks: {detail.admin_remarks}</Text>}
                {conflictIds.has(detail._id) && <Text style={styles.modalConflict}>⚠ Conflicts with another approved booking</Text>}

                <View style={styles.modalActions}>
                  {detail.status === "pending" && (
                    <>
                      <Pressable style={styles.modalReject} onPress={() => setRejectMode(true)} disabled={actioning}>
                        <Text style={styles.modalRejectText}>Reject</Text>
                      </Pressable>
                      <Pressable style={styles.modalApprove} onPress={handleApprove} disabled={actioning}>
                        {actioning ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalApproveText}>Approve</Text>}
                      </Pressable>
                    </>
                  )}
                </View>
                {["pending", "approved"].includes(detail.status) && (
                  <Pressable style={styles.cancelBookingButton} onPress={handleCancel} disabled={actioning}>
                    <Text style={styles.cancelBookingButtonText}>{actioning ? "…" : "Cancel Booking"}</Text>
                  </Pressable>
                )}
                <Pressable style={styles.closeButton} onPress={closeDetail}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </>
            )}

            {detail && rejectMode && (
              <>
                <Text style={styles.modalTitle}>Reject Booking</Text>
                <Text style={styles.modalMeta}>Please provide a reason. The club admin will be able to see this.</Text>
                <TextInput
                  style={styles.modalInput}
                  value={rejectRemarks}
                  onChangeText={setRejectRemarks}
                  placeholder="Reason for rejection…"
                  placeholderTextColor={colors.mutedText}
                  multiline
                />
                <View style={styles.modalActions}>
                  <Pressable style={styles.modalCancel} onPress={() => setRejectMode(false)} disabled={actioning}>
                    <Text style={styles.modalCancelText}>Back</Text>
                  </Pressable>
                  <Pressable style={styles.modalReject} onPress={handleReject} disabled={actioning || !rejectRemarks.trim()}>
                    {actioning ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalRejectText}>Confirm Rejection</Text>}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  error: { color: colors.destructive, textAlign: "center", lineHeight: 21 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: spacing.sm },
  dateButton: { marginTop: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 14 },
  dateButtonText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  venueGroup: { marginBottom: spacing.md },
  venueGroupTitle: { color: colors.mutedText, fontSize: 11.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.xs, ...shadow },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  cardMeta: { color: colors.mutedText, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  conflictTag: { color: colors.destructive, fontSize: 11, fontWeight: "700", marginTop: 4 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 10.5, fontWeight: "700", textTransform: "capitalize" },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  emptyCopy: { color: colors.mutedText, marginTop: 4, textAlign: "center" },
  banner: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingVertical: 10, paddingHorizontal: spacing.md, alignItems: "center" },
  bannerSuccess: { backgroundColor: colors.accent },
  bannerError: { backgroundColor: colors.destructive },
  bannerText: { color: "white", fontWeight: "700", fontSize: 13 },
  doneButton: { alignSelf: "flex-end", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  doneButtonText: { color: colors.primary, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  modalCard: { width: "100%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  modalMeta: { color: colors.mutedText, fontSize: 12.5, marginTop: 4, textTransform: "capitalize" },
  modalRemarks: { color: colors.text, fontSize: 12.5, marginTop: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8 },
  modalConflict: { color: colors.destructive, fontSize: 12, fontWeight: "700", marginTop: 8 },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginTop: spacing.md, minHeight: 70, textAlignVertical: "top", color: colors.text, fontSize: 14 },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  modalCancelText: { color: colors.text, fontWeight: "700" },
  modalApprove: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  modalApproveText: { color: "white", fontWeight: "800" },
  modalReject: { flex: 1, backgroundColor: colors.destructive, borderRadius: radius.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  modalRejectText: { color: "white", fontWeight: "800" },
  cancelBookingButton: { marginTop: spacing.sm, borderWidth: 1, borderColor: colors.destructive, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  cancelBookingButtonText: { color: colors.destructive, fontWeight: "700" },
  closeButton: { alignSelf: "center", paddingVertical: spacing.sm, marginTop: spacing.xs },
  closeButtonText: { color: colors.mutedText, fontWeight: "700", fontSize: 13 },
});
