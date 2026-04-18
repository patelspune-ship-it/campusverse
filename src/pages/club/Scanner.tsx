import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  QrCode, Users, CheckCircle2, Clock, LogIn, LogOut,
  Camera, CameraOff, RefreshCw, Calendar, MapPin, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────
interface ScanEvent {
  _id: string;
  name: string;
  date: string;
  start_time?: string;
  venue: string;
}

interface ScanResult {
  id: string;
  scan_type: "entry" | "exit";
  student_name: string;
  student_prn: string;
  message: string;
  duration_minutes?: number;
  timestamp: Date;
  status: "success" | "error" | "duplicate";
}

interface LiveStats {
  total: number;
  entry_scanned: number;
  exit_scanned: number;
  full_attendance: number;
}

type CameraStatus = "off" | "requesting" | "active" | "error";

// ── Helpers ────────────────────────────────────────────────────

// Camera access via getUserMedia requires a secure context (HTTPS or localhost).
// http://192.168.x.x is NOT a secure context — Chrome Android will silently
// refuse the permission prompt. Detect this so we can warn the user.
const isInsecureNetworkOrigin =
  window.location.protocol !== "https:" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";

// ── Component ──────────────────────────────────────────────────
const Scanner = () => {
  const [events, setEvents]               = useState<ScanEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [scanMode, setScanMode]           = useState<"entry" | "exit">("entry");
  const [cameraStatus, setCameraStatus]   = useState<CameraStatus>("off");
  const [cameraError, setCameraError]     = useState<string>("");
  const [recentScans, setRecentScans]     = useState<ScanResult[]>([]);
  const [liveStats, setLiveStats]         = useState<LiveStats | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Use a ref — never stale, safe to access inside cleanup
  const scannerRef    = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  // Keep a ref for scanMode too so the scan callback never reads stale state
  const scanModeRef   = useRef<"entry" | "exit">("entry");

  const scanning = cameraStatus === "active";

  useEffect(() => { scanModeRef.current = scanMode; }, [scanMode]);

  // ── Load events ──────────────────────────────────────────────
  useEffect(() => {
    apiRequest("/api/club/events/scanner-list")
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => toast.error("Failed to load events"))
      .finally(() => setLoadingEvents(false));
  }, []);

  // ── Cleanup on unmount only (no state deps — uses ref directly) ──
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  // ── Live stats ───────────────────────────────────────────────
  const refreshStats = useCallback(async () => {
    if (!selectedEvent) return;
    try {
      const data = await apiRequest(`/api/club/events/${selectedEvent}/attendees`);
      if (data?.stats) setLiveStats(data.stats);
    } catch { /* silent */ }
  }, [selectedEvent]);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  // ── Scan success handler (reads scanModeRef — never stale) ───
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    const mode     = scanModeRef.current;
    const endpoint = mode === "entry" ? "/api/attendance/entry" : "/api/attendance/exit";

    try {
      const data = await apiRequest(endpoint, "POST", { qr_token: decodedText });

      if (data?.success) {
        const result: ScanResult = {
          id:               Date.now().toString(),
          scan_type:        mode,
          student_name:     data.student_name ?? "Unknown",
          student_prn:      data.student_prn  ?? "",
          message:          data.message ?? (mode === "entry" ? "Entry recorded" : "Exit recorded"),
          duration_minutes: data.duration_minutes,
          timestamp:        new Date(),
          status:           "success",
        };
        setRecentScans((prev) => [result, ...prev].slice(0, 20));
        toast.success(result.message, { duration: 2500 });
        refreshStats();
      } else {
        const msg   = data?.message ?? "Scan failed";
        const isDup = msg.toLowerCase().includes("already scanned");
        const result: ScanResult = {
          id:           Date.now().toString(),
          scan_type:    mode,
          student_name: data?.student_name ?? "",
          student_prn:  data?.student_prn  ?? "",
          message:      msg,
          timestamp:    new Date(),
          status:       isDup ? "duplicate" : "error",
        };
        setRecentScans((prev) => [result, ...prev].slice(0, 20));
        if (isDup) toast.warning(msg, { duration: 2500 });
        else       toast.error(msg,   { duration: 2500 });
      }
    } catch (err: any) {
      const msg = `Network error: ${err?.message ?? "unknown"}`;
      console.error("[Scanner] scan API error:", err);
      setRecentScans((prev) => [{
        id: Date.now().toString(), scan_type: mode,
        student_name: "", student_prn: "", message: msg,
        timestamp: new Date(), status: "error",
      }, ...prev].slice(0, 20));
      toast.error(msg);
    }

    setTimeout(() => { processingRef.current = false; }, 2000);
  }, [refreshStats]);

  // ── Start / Stop ─────────────────────────────────────────────
  const startScanner = async () => {
    if (!selectedEvent) {
      toast.error("Please select an event first");
      return;
    }

    setCameraError("");
    setCameraStatus("requesting");

    // Explicitly request permission first so we get a clear error if denied
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Got permission — release this test stream, html5-qrcode will open its own
      stream.getTracks().forEach((t) => t.stop());
    } catch (permErr: any) {
      const msg = permErr?.message ?? String(permErr);
      const friendly =
        permErr?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : permErr?.name === "NotFoundError"
          ? "No camera found on this device."
          : `Camera access failed: ${msg}`;

      console.error("[Scanner] getUserMedia failed:", permErr);
      setCameraStatus("error");
      setCameraError(friendly);
      toast.error(friendly, { duration: 5000 });
      return;
    }

    try {
      // #qr-reader must be in the DOM and EMPTY — no React children inside it.
      // html5-qrcode takes full ownership of that element.
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScanSuccess,
        (_errorMessage) => {
          // Called continuously while no QR in frame — intentionally ignored
        }
      );

      setCameraStatus("active");
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[Scanner] Html5Qrcode.start() failed:", err);

      // Clean up the partially-initialised instance
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }

      setCameraStatus("error");
      setCameraError(msg);
      toast.error(`Camera error: ${msg}`, { duration: 6000 });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setCameraStatus("off");
    setCameraError("");
  };

  // ── Helpers ──────────────────────────────────────────────────
  const selectedEventData = events.find((e) => e._id === selectedEvent);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const statusLabel: Record<CameraStatus, string> = {
    off:        "Camera: Off",
    requesting: "Camera: Requesting permission…",
    active:     "Camera: Active",
    error:      `Camera: Error`,
  };

  const statusColor: Record<CameraStatus, string> = {
    off:        "bg-muted text-muted-foreground",
    requesting: "bg-yellow-500 text-white",
    active:     scanMode === "entry" ? "bg-green-600 text-white" : "bg-orange-500 text-white",
    error:      "bg-destructive text-destructive-foreground",
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* HTTPS warning — shown when accessed over plain HTTP on a LAN IP */}
      {isInsecureNetworkOrigin && (
        <div className="rounded-lg border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-3 flex gap-3 items-start text-sm">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800 dark:text-yellow-400">
              Camera may be blocked — insecure origin
            </p>
            <p className="text-yellow-700 dark:text-yellow-500 mt-0.5">
              Chrome on Android blocks camera access on <code>http://</code> LAN addresses.
              Use <strong>https://</strong> or open this page on the same device as the server
              (<code>localhost:8080</code>) to enable camera.
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="w-6 h-6 text-primary" />
          QR Scanner
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scan student QR codes to record entry and exit attendance
        </p>
      </div>

      {/* Event selector + mode toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Select Event</label>
          <Select
            value={selectedEvent}
            onValueChange={(v) => { setSelectedEvent(v); if (scanning) stopScanner(); }}
            disabled={scanning || loadingEvents}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder={loadingEvents ? "Loading events…" : "Choose event to scan for"} />
            </SelectTrigger>
            <SelectContent>
              {events.length === 0 && !loadingEvents && (
                <SelectItem value="__none__" disabled>No active events found</SelectItem>
              )}
              {events.map((e) => (
                <SelectItem key={e._id} value={e._id}>
                  {e.name} —{" "}
                  {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  {e.start_time ? ` · ${e.start_time}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Scan Mode</label>
          <div className="flex gap-2 h-11">
            <Button
              variant={scanMode === "entry" ? "default" : "outline"}
              className={`flex-1 gap-2 h-full ${scanMode === "entry" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
              onClick={() => { setScanMode("entry"); if (scanning) stopScanner(); }}
              disabled={scanning}
            >
              <LogIn className="w-4 h-4" /> Entry
            </Button>
            <Button
              variant={scanMode === "exit" ? "default" : "outline"}
              className={`flex-1 gap-2 h-full ${scanMode === "exit" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={() => { setScanMode("exit"); if (scanning) stopScanner(); }}
              disabled={scanning}
            >
              <LogOut className="w-4 h-4" /> Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Selected event info */}
      {selectedEventData && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            {selectedEventData.name}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {new Date(selectedEventData.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
            {selectedEventData.start_time ? ` · ${selectedEventData.start_time}` : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {selectedEventData.venue}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Camera panel */}
        <div className="space-y-4">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Camera
                <Badge className={`ml-auto text-xs ${statusColor[cameraStatus]}`}>
                  {cameraStatus === "active"
                    ? (scanMode === "entry" ? "ENTRY MODE" : "EXIT MODE")
                    : statusLabel[cameraStatus]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">

              {/* Camera viewport
                  IMPORTANT: #qr-reader must remain an empty div — html5-qrcode
                  owns its innerHTML. The placeholder is a positioned sibling,
                  not a child, so React never overwrites what html5-qrcode injects. */}
              <div className="relative w-full rounded-lg overflow-hidden border-2 transition-colors"
                style={{
                  borderColor: cameraStatus === "active"
                    ? (scanMode === "entry" ? "#16a34a" : "#f97316")
                    : cameraStatus === "error" ? "#ef4444"
                    : "#e5e7eb",
                  minHeight: "280px",
                }}>

                {/* html5-qrcode target — always rendered, always empty */}
                <div id="qr-reader" className="w-full" />

                {/* Placeholder overlay — shown when camera is off or errored */}
                {cameraStatus !== "active" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/60 text-muted-foreground">
                    {cameraStatus === "requesting" ? (
                      <>
                        <Camera className="w-10 h-10 opacity-60 animate-pulse" />
                        <p className="text-sm font-medium">Requesting camera permission…</p>
                      </>
                    ) : cameraStatus === "error" ? (
                      <>
                        <CameraOff className="w-10 h-10 text-destructive opacity-70" />
                        <p className="text-sm font-medium text-destructive text-center px-4">{cameraError}</p>
                      </>
                    ) : (
                      <>
                        <CameraOff className="w-10 h-10 opacity-30" />
                        <p className="text-sm">Camera off — press Start Scanner</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Error detail (full message below viewport) */}
              {cameraStatus === "error" && cameraError && (
                <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2 break-words">
                  {cameraError}
                </p>
              )}

              <div className="flex gap-2">
                {cameraStatus !== "active" ? (
                  <Button
                    className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                    onClick={startScanner}
                    disabled={!selectedEvent || cameraStatus === "requesting"}
                  >
                    <Camera className="w-4 h-4" />
                    {cameraStatus === "requesting" ? "Starting…" : "Start Scanner"}
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1 gap-2" onClick={stopScanner}>
                    <CameraOff className="w-4 h-4" />
                    Stop Scanner
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={refreshStats} title="Refresh stats">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live stats */}
          {liveStats && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Users   className="w-5 h-5 text-muted-foreground" />, val: liveStats.total,           label: "Registered"      },
                { icon: <LogIn   className="w-5 h-5 text-green-600"        />, val: liveStats.entry_scanned,   label: "Entry Scanned"   },
                { icon: <LogOut  className="w-5 h-5 text-orange-500"       />, val: liveStats.exit_scanned,    label: "Exit Scanned"    },
                { icon: <CheckCircle2 className="w-5 h-5 text-accent"      />, val: liveStats.full_attendance, label: "Full Attendance" },
              ].map(({ icon, val, label }) => (
                <Card key={label} className="shadow-[var(--shadow-soft)]">
                  <CardContent className="p-4 text-center">
                    <div className="flex justify-center mb-1">{icon}</div>
                    <p className="text-2xl font-bold">{val}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent scans feed */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Recent Scans
          </h2>

          {recentScans.length === 0 ? (
            <Card className="shadow-[var(--shadow-soft)]">
              <CardContent className="py-12 text-center text-muted-foreground">
                <QrCode className="w-10 h-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm">No scans yet — start scanning to see results</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className={`rounded-lg border p-3 ${
                    scan.status === "success"
                      ? scan.scan_type === "entry"
                        ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20"
                        : "border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20"
                      : scan.status === "duplicate"
                        ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-950/20"
                        : "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {scan.status === "success"
                        ? scan.scan_type === "entry"
                          ? <LogIn  className="w-4 h-4 text-green-600 flex-shrink-0" />
                          : <LogOut className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        : <QrCode  className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                      <div>
                        <p className="font-semibold text-sm leading-tight">
                          {scan.student_name || scan.message}
                        </p>
                        {scan.student_prn && (
                          <p className="text-xs text-muted-foreground">{scan.student_prn}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className={`text-xs mb-1 ${
                        scan.status === "success"
                          ? scan.scan_type === "entry" ? "bg-green-600 text-white" : "bg-orange-500 text-white"
                          : scan.status === "duplicate" ? "bg-yellow-500 text-white"
                          : "bg-destructive text-destructive-foreground"
                      }`}>
                        {scan.status === "success"
                          ? (scan.scan_type === "entry" ? "Entry" : "Exit")
                          : scan.status === "duplicate" ? "Duplicate" : "Error"}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{formatTime(scan.timestamp)}</p>
                    </div>
                  </div>

                  {scan.status === "success" && scan.scan_type === "exit" && scan.duration_minutes != null && (
                    <p className="text-xs text-muted-foreground mt-1.5 ml-6">
                      Duration: {scan.duration_minutes} min
                    </p>
                  )}
                  {scan.status !== "success" && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6">{scan.message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;
