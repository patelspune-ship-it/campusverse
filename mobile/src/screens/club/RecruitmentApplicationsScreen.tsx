import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError } from "../../api/client";
import {
  advanceStage, getClubApplications, getMyDrives, recordFeedback, scheduleInterview,
} from "../../services/recruitment";
import type { Application, ApplicationStage, RecruitmentDrive } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";

type Banner = { type: "success" | "error"; text: string };
type StageFilter = "all" | ApplicationStage;
type ActionMode = "reject" | "select" | "schedule" | "feedback" | null;

const STAGES: { key: StageFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview_scheduled", label: "Interview Scheduled" },
  { key: "interviewed", label: "Interviewed" },
  { key: "selected", label: "Selected" },
  { key: "rejected", label: "Rejected" },
];

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

export function RecruitmentApplicationsScreen() {
  const [drives, setDrives] = useState<RecruitmentDrive[]>([]);
  const [driveId, setDriveId] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState<Banner | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detail, setDetail] = useState<Application | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [remarksInput, setRemarksInput] = useState("");
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "", venue: "", meeting_link: "" });
  const [feedbackForm, setFeedbackForm] = useState({ rating: "3", notes: "" });
  const [actioning, setActioning] = useState(false);

  const showBanner = (next: Banner) => {
    setBanner(next);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 3000);
  };

  useEffect(() => {
    getMyDrives()
      .then((d) => { setDrives(d); if (d.length && !driveId) setDriveId(d[0]._id); else if (!d.length) setLoading(false); })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async (refresh = false) => {
    if (!driveId) { setLoading(false); return; }
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setApplications(await getClubApplications({ drive_id: driveId, stage: stageFilter }));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load applications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driveId, stageFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }, []);

  const openDetail = (a: Application) => { setDetail(a); setActionMode(null); setRemarksInput(""); };
  const closeDetail = () => { setDetail(null); setActionMode(null); };

  const afterAction = (message: string) => {
    showBanner({ type: "success", text: message });
    closeDetail();
    load(true);
  };
  const onActionError = (cause: unknown, fallback: string) => {
    showBanner({ type: "error", text: cause instanceof ApiError ? cause.message : fallback });
    closeDetail();
    load(true);
  };

  const handleShortlist = async () => {
    if (!detail) return;
    setActioning(true);
    try { await advanceStage(detail._id, "shortlisted"); afterAction("Shortlisted."); }
    catch (cause) { onActionError(cause, "Could not shortlist this application."); }
    finally { setActioning(false); }
  };

  const handleReject = async () => {
    if (!detail) return;
    setActioning(true);
    try { await advanceStage(detail._id, "rejected", remarksInput.trim()); afterAction("Application rejected."); }
    catch (cause) { onActionError(cause, "Could not reject this application."); }
    finally { setActioning(false); }
  };

  const handleSelect = async () => {
    if (!detail) return;
    setActioning(true);
    try { await advanceStage(detail._id, "selected", remarksInput.trim()); afterAction("Applicant selected."); }
    catch (cause) { onActionError(cause, "Could not select this applicant."); }
    finally { setActioning(false); }
  };

  const handleSchedule = async () => {
    if (!detail) return;
    if (!scheduleForm.date || !scheduleForm.time) { showBanner({ type: "error", text: "Date and time are required." }); return; }
    if (!scheduleForm.venue.trim() && !scheduleForm.meeting_link.trim()) { showBanner({ type: "error", text: "Provide a venue or a meeting link." }); return; }
    setActioning(true);
    try { await scheduleInterview(detail._id, scheduleForm); afterAction("Interview scheduled."); }
    catch (cause) { onActionError(cause, "Could not schedule the interview."); }
    finally { setActioning(false); }
  };

  const handleFeedback = async () => {
    if (!detail) return;
    setActioning(true);
    try { await recordFeedback(detail._id, { rating: Number(feedbackForm.rating), notes: feedbackForm.notes.trim() }); afterAction("Feedback recorded."); }
    catch (cause) { onActionError(cause, "Could not record feedback."); }
    finally { setActioning(false); }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={styles.screen}>
      {banner && (
        <View style={[styles.banner, banner.type === "success" ? styles.bannerSuccess : styles.bannerError]}>
          <Text style={styles.bannerText}>{banner.text}</Text>
        </View>
      )}

      <View style={styles.headerArea}>
        <Text style={styles.title}>Recruitment</Text>
        {drives.length === 0 ? (
          <Text style={styles.copy}>No recruitment drives yet — create one on the web dashboard.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={styles.filterRow}>
            {drives.map((d) => (
              <Pressable key={d._id} onPress={() => setDriveId(d._id)} style={[styles.driveChip, driveId === d._id && styles.chipActive]}>
                <Text style={[styles.chipText, driveId === d._id && styles.chipTextActive]} numberOfLines={1}>{d.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {drives.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={styles.filterRow}>
            {STAGES.map((s) => (
              <Pressable key={s.key} onPress={() => setStageFilter(s.key)} style={[styles.stageChip, stageFilter === s.key && styles.chipActive]}>
                <Text style={[styles.chipText, stageFilter === s.key && styles.chipTextActive]}>{s.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => load()}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={applications}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const badge = stageColors[item.stage];
            const studentName = typeof item.student_id === "object" ? (item.student_id.name ?? item.student_id.userId) : "";
            return (
              <Pressable style={styles.card} onPress={() => openDetail(item)}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{studentName}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{item.stage.replace(/_/g, " ")}</Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>{item.role_applied_for} · {formatDate(item.created_at)}</Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No applications</Text>
              <Text style={styles.emptyCopy}>Nothing matches this filter yet.</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={closeDetail}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ gap: spacing.sm }}>
            {detail && actionMode === null && (
              <>
                <Text style={styles.modalTitle}>{typeof detail.student_id === "object" ? (detail.student_id.name ?? detail.student_id.userId) : ""}</Text>
                <Text style={styles.modalMeta}>{typeof detail.student_id === "object" ? detail.student_id.userId : ""} · {detail.role_applied_for}</Text>
                <View style={[styles.badge, { backgroundColor: stageColors[detail.stage].bg, alignSelf: "flex-start" }]}>
                  <Text style={[styles.badgeText, { color: stageColors[detail.stage].text }]}>{detail.stage.replace(/_/g, " ")}</Text>
                </View>

                {detail.responses?.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.sectionLabel}>Responses</Text>
                    {detail.responses.map((r, idx) => (
                      <View key={idx} style={styles.responseBox}>
                        <Text style={styles.responseQuestion}>{r.question}</Text>
                        <Text style={styles.responseAnswer}>{r.answer || "—"}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {!!detail.interview_slot?.date && (
                  <Text style={styles.modalMeta}>Interview: {formatDate(detail.interview_slot.date)} at {detail.interview_slot.time}</Text>
                )}
                {!!detail.final_remarks && <Text style={styles.modalRemarks}>{detail.final_remarks}</Text>}

                {!["selected", "rejected"].includes(detail.stage) && (
                  <View style={styles.actionsGrid}>
                    <Pressable style={styles.rejectButton} onPress={() => setActionMode("reject")} disabled={actioning}>
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </Pressable>
                    {detail.stage === "applied" && (
                      <Pressable style={styles.approveButton} onPress={handleShortlist} disabled={actioning}>
                        {actioning ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.approveButtonText}>Shortlist</Text>}
                      </Pressable>
                    )}
                    {detail.stage === "shortlisted" && (
                      <Pressable style={styles.approveButton} onPress={() => setActionMode("schedule")} disabled={actioning}>
                        <Text style={styles.approveButtonText}>Schedule Interview</Text>
                      </Pressable>
                    )}
                    {detail.stage === "interview_scheduled" && (
                      <Pressable style={styles.approveButton} onPress={() => setActionMode("feedback")} disabled={actioning}>
                        <Text style={styles.approveButtonText}>Record Feedback</Text>
                      </Pressable>
                    )}
                    {detail.stage === "interviewed" && (
                      <Pressable style={styles.approveButton} onPress={() => setActionMode("select")} disabled={actioning}>
                        <Text style={styles.approveButtonText}>Select</Text>
                      </Pressable>
                    )}
                  </View>
                )}
                <Pressable style={styles.closeButton} onPress={closeDetail}><Text style={styles.closeButtonText}>Close</Text></Pressable>
              </>
            )}

            {detail && actionMode === "reject" && (
              <>
                <Text style={styles.modalTitle}>Reject Application</Text>
                <TextInput style={styles.modalInput} value={remarksInput} onChangeText={setRemarksInput} placeholder="Remarks (visible to student)…" placeholderTextColor={colors.mutedText} multiline />
                <View style={styles.modalActions}>
                  <Pressable style={styles.modalCancel} onPress={() => setActionMode(null)} disabled={actioning}><Text style={styles.modalCancelText}>Back</Text></Pressable>
                  <Pressable style={styles.rejectButton} onPress={handleReject} disabled={actioning}>
                    {actioning ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.rejectButtonText}>Confirm</Text>}
                  </Pressable>
                </View>
              </>
            )}

            {detail && actionMode === "select" && (
              <>
                <Text style={styles.modalTitle}>Select Applicant</Text>
                <TextInput style={styles.modalInput} value={remarksInput} onChangeText={setRemarksInput} placeholder="Remarks (visible to student)…" placeholderTextColor={colors.mutedText} multiline />
                <View style={styles.modalActions}>
                  <Pressable style={styles.modalCancel} onPress={() => setActionMode(null)} disabled={actioning}><Text style={styles.modalCancelText}>Back</Text></Pressable>
                  <Pressable style={styles.approveButton} onPress={handleSelect} disabled={actioning}>
                    {actioning ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.approveButtonText}>Confirm</Text>}
                  </Pressable>
                </View>
              </>
            )}

            {detail && actionMode === "schedule" && (
              <>
                <Text style={styles.modalTitle}>Schedule Interview</Text>
                <TextInput style={styles.modalInput} value={scheduleForm.date} onChangeText={(v) => setScheduleForm((f) => ({ ...f, date: v }))} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={colors.mutedText} />
                <TextInput style={styles.modalInput} value={scheduleForm.time} onChangeText={(v) => setScheduleForm((f) => ({ ...f, time: v }))} placeholder="Time (HH:MM)" placeholderTextColor={colors.mutedText} />
                <TextInput style={styles.modalInput} value={scheduleForm.venue} onChangeText={(v) => setScheduleForm((f) => ({ ...f, venue: v }))} placeholder="Venue (optional)" placeholderTextColor={colors.mutedText} />
                <TextInput style={styles.modalInput} value={scheduleForm.meeting_link} onChangeText={(v) => setScheduleForm((f) => ({ ...f, meeting_link: v }))} placeholder="Meeting link (optional)" placeholderTextColor={colors.mutedText} />
                <View style={styles.modalActions}>
                  <Pressable style={styles.modalCancel} onPress={() => setActionMode(null)} disabled={actioning}><Text style={styles.modalCancelText}>Back</Text></Pressable>
                  <Pressable style={styles.approveButton} onPress={handleSchedule} disabled={actioning}>
                    {actioning ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.approveButtonText}>Schedule</Text>}
                  </Pressable>
                </View>
              </>
            )}

            {detail && actionMode === "feedback" && (
              <>
                <Text style={styles.modalTitle}>Record Feedback</Text>
                <View style={styles.chipRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setFeedbackForm((f) => ({ ...f, rating: String(n) }))} style={[styles.ratingChip, feedbackForm.rating === String(n) && styles.chipActive]}>
                      <Text style={[styles.chipText, feedbackForm.rating === String(n) && styles.chipTextActive]}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput style={styles.modalInput} value={feedbackForm.notes} onChangeText={(v) => setFeedbackForm((f) => ({ ...f, notes: v }))} placeholder="Notes (internal only)…" placeholderTextColor={colors.mutedText} multiline />
                <View style={styles.modalActions}>
                  <Pressable style={styles.modalCancel} onPress={() => setActionMode(null)} disabled={actioning}><Text style={styles.modalCancelText}>Back</Text></Pressable>
                  <Pressable style={styles.approveButton} onPress={handleFeedback} disabled={actioning}>
                    {actioning ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.approveButtonText}>Save</Text>}
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
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
  headerArea: { padding: spacing.md, paddingBottom: spacing.xs, gap: spacing.xs },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  copy: { color: colors.mutedText, fontSize: 13, marginTop: 2 },
  filterRow: { marginTop: spacing.xs },
  driveChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface, maxWidth: 220 },
  stageChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface },
  ratingChip: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12.5, fontWeight: "700" },
  chipTextActive: { color: "white" },
  chipRow: { flexDirection: "row", gap: 8, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  cardMeta: { color: colors.mutedText, fontSize: 12, marginTop: 2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 10.5, fontWeight: "700", textTransform: "capitalize" },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", margin: spacing.md },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  emptyCopy: { color: colors.mutedText, marginTop: 4, textAlign: "center" },
  banner: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingVertical: 10, paddingHorizontal: spacing.md, alignItems: "center" },
  bannerSuccess: { backgroundColor: colors.accent },
  bannerError: { backgroundColor: colors.destructive },
  bannerText: { color: "white", fontWeight: "700", fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: spacing.lg },
  modalCard: { maxHeight: "85%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  modalMeta: { color: colors.mutedText, fontSize: 12.5, marginTop: 4 },
  modalRemarks: { color: colors.text, fontSize: 12.5, marginTop: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8 },
  sectionLabel: { color: colors.mutedText, fontSize: 11.5, fontWeight: "700", textTransform: "uppercase", marginTop: spacing.xs },
  responseBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8 },
  responseQuestion: { color: colors.mutedText, fontSize: 11.5 },
  responseAnswer: { color: colors.text, fontSize: 13, marginTop: 2 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  approveButton: { flex: 1, minWidth: 120, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  approveButtonText: { color: "white", fontWeight: "800", fontSize: 13 },
  rejectButton: { flex: 1, minWidth: 100, backgroundColor: colors.destructive, borderRadius: radius.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  rejectButtonText: { color: "white", fontWeight: "800", fontSize: 13 },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, color: colors.text, fontSize: 14, backgroundColor: colors.background, marginTop: spacing.xs },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  modalCancelText: { color: colors.text, fontWeight: "700" },
  closeButton: { alignSelf: "center", paddingVertical: spacing.sm, marginTop: spacing.xs },
  closeButtonText: { color: colors.mutedText, fontWeight: "700", fontSize: 13 },
});
