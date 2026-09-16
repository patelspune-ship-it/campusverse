import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ApiError } from "../../api/client";
import { scanEntry, scanExit } from "../../services/attendance";
import { getEventAttendees, getScannerEvents } from "../../services/club";
import { enqueueScan, getQueueCount } from "../../services/offlineQueue";
import { processQueue, setSyncListener, type SyncState } from "../../services/syncService";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import type { AttendeeStats, ScannerEvent } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";

type ScanMode = "entry" | "exit";
type ScanStatus = "success" | "error" | "duplicate" | "queued";
type ScanResult = { id: string; scan_type: ScanMode; student_name: string; student_prn: string; message: string; duration_minutes?: number; timestamp: Date; status: ScanStatus };

const MAX_RECENT_SCANS = 20;
const RESCAN_LOCK_MS = 2000;

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  const [events, setEvents] = useState<ScannerEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("entry");
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [liveStats, setLiveStats] = useState<AttendeeStats | null>(null);

  const isOnline = useNetworkStatus();
  const [queueCount, setQueueCount] = useState(0);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const wasOnlineRef = useRef(isOnline);

  // Never stale — read synchronously inside the scan callback, same pattern as the web scanner.
  const processingRef = useRef(false);

  const refreshQueueCount = useCallback(() => {
    getQueueCount().then(setQueueCount).catch(() => {});
  }, []);

  useEffect(() => {
    getScannerEvents()
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, []);

  // Subscribe to sync progress for the "Syncing X scans…" indicator, and
  // refresh the queue count whenever a sync run finishes.
  useEffect(() => {
    setSyncListener((state) => {
      setSyncState(state);
      if (!state.syncing) refreshQueueCount();
    });
    return () => setSyncListener(null);
  }, [refreshQueueCount]);

  // Safety net: re-check the queue every time this screen gains focus.
  useFocusEffect(
    useCallback(() => {
      refreshQueueCount();
      processQueue();
    }, [refreshQueueCount])
  );

  // Auto-sync the moment connectivity comes back.
  useEffect(() => {
    if (!wasOnlineRef.current && isOnline) processQueue();
    wasOnlineRef.current = isOnline;
  }, [isOnline]);

  const refreshStats = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const data = await getEventAttendees(selectedEventId);
      setLiveStats(data.stats);
    } catch {
      // silent — live stats are best-effort
    }
  }, [selectedEventId]);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const addResult = (partial: Omit<ScanResult, "id" | "timestamp">) => {
    setRecentScans((prev) => [{ ...partial, id: `${Date.now()}-${Math.random()}`, timestamp: new Date() }, ...prev].slice(0, MAX_RECENT_SCANS));
  };

  const queueOfflineScan = async (qrToken: string, mode: ScanMode, eventId: string, reason: string) => {
    const { alreadyQueued } = await enqueueScan(qrToken, mode, eventId);
    addResult({
      scan_type: mode,
      student_name: "",
      student_prn: "",
      message: alreadyQueued ? "Already queued — waiting to sync." : reason,
      status: "queued",
    });
    refreshQueueCount();
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (processingRef.current || !selectedEventId) return;
    processingRef.current = true;
    const mode = scanMode;
    const eventId = selectedEventId;

    if (!isOnline) {
      // Known offline — skip the API call entirely and queue straight away.
      await queueOfflineScan(data, mode, eventId, "Queued — will sync when back online.");
    } else {
      try {
        const response = mode === "entry" ? await scanEntry(data) : await scanExit(data);
        addResult({
          scan_type: mode,
          student_name: response.student_name,
          student_prn: response.student_prn,
          message: response.message,
          duration_minutes: response.duration_minutes,
          status: "success",
        });
        refreshStats();
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 0) {
          // A genuine network failure (not a business-logic error) — connectivity
          // may have dropped mid-scan, so fall back to queuing instead of losing it.
          await queueOfflineScan(data, mode, eventId, "Connection lost — queued for sync.");
        } else if (cause instanceof ApiError) {
          const info = cause.data ?? {};
          const isDuplicate = cause.message.toLowerCase().includes("already scanned");
          addResult({
            scan_type: mode,
            student_name: info.student_name ?? "",
            student_prn: info.student_prn ?? "",
            message: cause.message,
            duration_minutes: info.duration_minutes,
            status: isDuplicate ? "duplicate" : "error",
          });
        } else {
          addResult({ scan_type: mode, student_name: "", student_prn: "", message: "Something went wrong. Please try again.", status: "error" });
        }
      }
    }

    setTimeout(() => { processingRef.current = false; }, RESCAN_LOCK_MS);
  };

  const selectedEvent = events.find((e) => e._id === selectedEventId);

  const banner = syncState?.syncing
    ? { style: styles.bannerSyncing, text: `Syncing ${syncState.completed}/${syncState.total} scan${syncState.total !== 1 ? "s" : ""}…` }
    : !isOnline
    ? { style: styles.bannerOffline, text: queueCount > 0 ? `Offline · ${queueCount} scan${queueCount !== 1 ? "s" : ""} queued — will sync automatically` : "Offline — scans will be queued and synced automatically" }
    : queueCount > 0
    ? { style: styles.bannerPending, text: `Online · ${queueCount} scan${queueCount !== 1 ? "s" : ""} waiting to sync` }
    : { style: styles.bannerOnline, text: "Online" };

  return (
    <View style={styles.screen}>
      <View style={[styles.banner, banner.style]}>
        <Text style={styles.bannerText}>{banner.text}</Text>
        {!syncState?.syncing && isOnline && queueCount > 0 && (
          <Pressable onPress={() => processQueue()}>
            <Text style={styles.bannerAction}>Sync now</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={recentScans}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>QR Scanner</Text>
            <Text style={styles.copy}>Scan student QR codes to record entry and exit attendance.</Text>

            <View style={styles.selectorRow}>
              <View style={styles.selectorHalf}>
                <Text style={styles.label}>Event</Text>
                <Pressable style={styles.selectorButton} onPress={() => setPickerOpen(true)}>
                  <Text style={styles.selectorButtonText} numberOfLines={1}>
                    {loadingEvents ? "Loading events…" : selectedEvent ? selectedEvent.name : "Choose event"}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.selectorHalf}>
                <Text style={styles.label}>Mode</Text>
                <View style={styles.modeToggle}>
                  <Pressable
                    style={[styles.modeButton, scanMode === "entry" && styles.modeButtonEntryActive]}
                    onPress={() => setScanMode("entry")}
                  >
                    <Text style={[styles.modeButtonText, scanMode === "entry" && styles.modeButtonTextActive]}>Entry</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modeButton, scanMode === "exit" && styles.modeButtonExitActive]}
                    onPress={() => setScanMode("exit")}
                  >
                    <Text style={[styles.modeButtonText, scanMode === "exit" && styles.modeButtonTextActive]}>Exit</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {selectedEvent && (
              <View style={styles.eventInfo}>
                <Text style={styles.eventInfoText}>{formatEventDate(selectedEvent.date)}{selectedEvent.start_time ? ` · ${selectedEvent.start_time}` : ""} · {selectedEvent.venue}</Text>
              </View>
            )}

            <View style={[styles.cameraBox, { borderColor: scanMode === "entry" ? colors.accent : "#F97316" }]}>
              {!selectedEventId ? (
                <View style={styles.cameraPlaceholder}>
                  <Text style={styles.cameraPlaceholderText}>Select an event to start scanning</Text>
                </View>
              ) : !permission ? (
                <View style={styles.cameraPlaceholder}><ActivityIndicator color={colors.primary} /></View>
              ) : !permission.granted ? (
                <View style={styles.cameraPlaceholder}>
                  <Text style={styles.cameraPlaceholderText}>
                    {permission.canAskAgain ? "Camera permission is required to scan QR codes." : "Camera permission was denied. Enable it in Settings to scan QR codes."}
                  </Text>
                  <Pressable
                    style={styles.permissionButton}
                    onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
                  >
                    <Text style={styles.permissionButtonText}>{permission.canAskAgain ? "Grant permission" : "Open Settings"}</Text>
                  </Pressable>
                </View>
              ) : (
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={handleBarcodeScanned}
                />
              )}
              {!!selectedEventId && permission?.granted && (
                <View style={[styles.modeBadge, { backgroundColor: scanMode === "entry" ? colors.accent : "#F97316" }]}>
                  <Text style={styles.modeBadgeText}>{scanMode === "entry" ? "ENTRY MODE" : "EXIT MODE"}</Text>
                </View>
              )}
            </View>

            {liveStats && (
              <View style={styles.statsRow}>
                <Stat label="Registered" value={liveStats.total} />
                <Stat label="Entered" value={liveStats.entry_scanned} />
                <Stat label="Exited" value={liveStats.exit_scanned} />
                <Stat label="Full" value={liveStats.full_attendance} />
              </View>
            )}

            <Text style={styles.sectionTitle}>Recent Scans</Text>
          </View>
        }
        renderItem={({ item }) => <ScanRow item={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No scans yet — start scanning to see results.</Text>
          </View>
        }
      />

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Event</Text>
            <FlatList
              data={events}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <Pressable style={styles.modalRow} onPress={() => { setSelectedEventId(item._id); setLiveStats(null); setPickerOpen(false); }}>
                  <Text style={styles.modalRowTitle}>{item.name}</Text>
                  <Text style={styles.modalRowMeta}>{formatEventDate(item.date)}{item.start_time ? ` · ${item.start_time}` : ""} · {item.venue}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>{loadingEvents ? "Loading…" : "No active events found"}</Text>}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function ScanRow({ item }: { item: ScanResult }) {
  const palette =
    item.status === "success"
      ? item.scan_type === "entry" ? { bg: "#E6FAF2", border: colors.accent, badge: colors.accent, badgeText: "Entry" } : { bg: "#FFF1E6", border: "#F97316", badge: "#F97316", badgeText: "Exit" }
      : item.status === "duplicate"
      ? { bg: "#FFF6DB", border: "#F5D87E", badge: "#EBA10D", badgeText: "Duplicate" }
      : item.status === "queued"
      ? { bg: "#F1F1F3", border: "#C7C7CE", badge: "#6B6B76", badgeText: "Queued" }
      : { bg: "#FDE8E8", border: colors.destructive, badge: colors.destructive, badgeText: "Error" };

  const formatTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <View style={[styles.scanRow, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={styles.scanRowTop}>
        <View style={styles.scanRowInfo}>
          <Text style={styles.scanRowName}>{item.student_name || item.message}</Text>
          {!!item.student_prn && <Text style={styles.scanRowPrn}>{item.student_prn}</Text>}
        </View>
        <View style={styles.scanRowRight}>
          <View style={[styles.scanBadge, { backgroundColor: palette.badge }]}>
            <Text style={styles.scanBadgeText}>{palette.badgeText}</Text>
          </View>
          <Text style={styles.scanTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
      {item.status === "success" ? (
        item.scan_type === "exit" && item.duration_minutes != null ? <Text style={styles.scanMessage}>Duration: {item.duration_minutes} min</Text> : null
      ) : item.student_name ? (
        // Only show the message separately when the name line above isn't already showing it.
        <Text style={styles.scanMessage}>{item.message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  banner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: spacing.md },
  bannerOnline: { backgroundColor: colors.accentLight },
  bannerOffline: { backgroundColor: "#FDE8E8" },
  bannerPending: { backgroundColor: "#FFF6DB" },
  bannerSyncing: { backgroundColor: colors.primaryLight },
  bannerText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  bannerAction: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  copy: { color: colors.mutedText, fontSize: 13, marginTop: 2, marginBottom: spacing.md },
  label: { color: colors.text, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  selectorRow: { flexDirection: "row", gap: spacing.sm },
  selectorHalf: { flex: 1 },
  selectorButton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: colors.surface, minHeight: 48, justifyContent: "center" },
  selectorButtonText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  modeToggle: { flexDirection: "row", gap: 6, minHeight: 48 },
  modeButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  modeButtonEntryActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  modeButtonExitActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  modeButtonText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  modeButtonTextActive: { color: "white" },
  eventInfo: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginTop: spacing.sm },
  eventInfoText: { color: colors.mutedText, fontSize: 12, fontWeight: "600" },
  cameraBox: { marginTop: spacing.md, borderWidth: 2, borderRadius: radius.lg, overflow: "hidden", minHeight: 300, backgroundColor: "#000" },
  camera: { flex: 1, minHeight: 300 },
  cameraPlaceholder: { minHeight: 300, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md, backgroundColor: colors.primaryLight },
  cameraPlaceholderText: { color: colors.mutedText, textAlign: "center", fontSize: 13, lineHeight: 19 },
  permissionButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 12 },
  permissionButtonText: { color: "white", fontWeight: "800" },
  modeBadge: { position: "absolute", top: spacing.sm, right: spacing.sm, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  modeBadgeText: { color: "white", fontSize: 10, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", ...shadow },
  statValue: { color: colors.primary, fontSize: 18, fontWeight: "800" },
  statLabel: { color: colors.mutedText, fontSize: 10, fontWeight: "600", marginTop: 2, textAlign: "center" },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyText: { color: colors.mutedText, textAlign: "center" },
  scanRow: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  scanRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  scanRowInfo: { flex: 1 },
  scanRowName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  scanRowPrn: { color: colors.mutedText, fontSize: 12, marginTop: 1 },
  scanRowRight: { alignItems: "flex-end" },
  scanBadge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 3 },
  scanBadgeText: { color: "white", fontSize: 10, fontWeight: "800" },
  scanTime: { color: colors.mutedText, fontSize: 10 },
  scanMessage: { color: colors.mutedText, fontSize: 12, marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "70%", padding: spacing.md },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: "800", marginBottom: spacing.sm },
  modalRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalRowTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  modalRowMeta: { color: colors.mutedText, fontSize: 12, marginTop: 2 },
  modalEmpty: { color: colors.mutedText, textAlign: "center", paddingVertical: spacing.lg },
});
