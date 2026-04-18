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
  Camera, CameraOff, RefreshCw, Calendar, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

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
  error_message?: string;
}

interface LiveStats {
  total: number;
  entry_scanned: number;
  exit_scanned: number;
  full_attendance: number;
}

const Scanner = () => {
  const [events, setEvents]         = useState<ScanEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [scanMode, setScanMode]     = useState<"entry" | "exit">("entry");
  const [scanning, setScanning]     = useState(false);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [liveStats, setLiveStats]   = useState<LiveStats | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const scannerRef  = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  // Load events for scanner dropdown
  useEffect(() => {
    apiRequest("/api/club/events/scanner-list")
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
      })
      .catch(() => toast.error("Failed to load events"))
      .finally(() => setLoadingEvents(false));
  }, []);

  // Refresh live stats whenever event changes or a scan completes
  const refreshStats = useCallback(async () => {
    if (!selectedEvent) return;
    try {
      const data = await apiRequest(`/api/club/events/${selectedEvent}/attendees`);
      if (data?.stats) setLiveStats(data.stats);
    } catch { /* silent */ }
  }, [selectedEvent]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Stop scanner when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [scanning]);

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    const endpoint = scanMode === "entry" ? "/api/attendance/entry" : "/api/attendance/exit";

    try {
      const data = await apiRequest(endpoint, "POST", { qr_token: decodedText });

      if (data?.success) {
        const result: ScanResult = {
          id:              Date.now().toString(),
          scan_type:       scanMode,
          student_name:    data.student_name ?? "Unknown",
          student_prn:     data.student_prn  ?? "",
          message:         data.message      ?? (scanMode === "entry" ? "Entry recorded" : "Exit recorded"),
          duration_minutes: data.duration_minutes,
          timestamp:       new Date(),
          status:          "success",
        };
        setRecentScans((prev) => [result, ...prev].slice(0, 20));
        toast.success(result.message, { duration: 2500 });
        refreshStats();
      } else {
        const msg   = data?.message ?? "Scan failed";
        const isDup = msg.toLowerCase().includes("already scanned");
        const result: ScanResult = {
          id:            Date.now().toString(),
          scan_type:     scanMode,
          student_name:  data?.student_name ?? "",
          student_prn:   data?.student_prn  ?? "",
          message:       msg,
          timestamp:     new Date(),
          status:        isDup ? "duplicate" : "error",
          error_message: msg,
        };
        setRecentScans((prev) => [result, ...prev].slice(0, 20));
        if (isDup) toast.warning(msg, { duration: 2500 });
        else       toast.error(msg,   { duration: 2500 });
      }
    } catch {
      const msg = "Network error — could not process scan";
      setRecentScans((prev) => [{
        id: Date.now().toString(), scan_type: scanMode,
        student_name: "", student_prn: "", message: msg,
        timestamp: new Date(), status: "error", error_message: msg,
      }, ...prev].slice(0, 20));
      toast.error(msg);
    }

    // Debounce — don't process another scan for 2s
    setTimeout(() => { processingRef.current = false; }, 2000);
  }, [scanMode, refreshStats]);

  const startScanner = async () => {
    if (!selectedEvent) {
      toast.error("Please select an event first");
      return;
    }
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        handleScanSuccess,
        () => { /* ignore intermediate errors */ }
      );
      setScanning(true);
    } catch (err: any) {
      toast.error("Could not access camera. Check browser permissions.");
      console.error("Camera error:", err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const selectedEventData = events.find((e) => e._id === selectedEvent);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
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
                  {e.name} — {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
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
                {scanning && (
                  <Badge className={`ml-auto text-xs ${scanMode === "entry" ? "bg-green-600" : "bg-orange-500"}`}>
                    {scanMode === "entry" ? "ENTRY MODE" : "EXIT MODE"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* QR reader target div — always rendered so html5-qrcode can find it */}
              <div
                id="qr-reader"
                className={`w-full rounded-lg overflow-hidden border-2 transition-colors ${
                  scanning
                    ? scanMode === "entry" ? "border-green-500" : "border-orange-400"
                    : "border-dashed border-muted-foreground/30"
                }`}
                style={{ minHeight: scanning ? undefined : "260px" }}
              >
                {!scanning && (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                    <CameraOff className="w-10 h-10 opacity-30" />
                    <p className="text-sm">Camera off</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!scanning ? (
                  <Button
                    className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                    onClick={startScanner}
                    disabled={!selectedEvent}
                  >
                    <Camera className="w-4 h-4" />
                    Start Scanner
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={stopScanner}
                  >
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
              <Card className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-4 text-center">
                  <Users className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold">{liveStats.total}</p>
                  <p className="text-xs text-muted-foreground">Registered</p>
                </CardContent>
              </Card>
              <Card className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-4 text-center">
                  <LogIn className="w-5 h-5 mx-auto text-green-600 mb-1" />
                  <p className="text-2xl font-bold">{liveStats.entry_scanned}</p>
                  <p className="text-xs text-muted-foreground">Entry Scanned</p>
                </CardContent>
              </Card>
              <Card className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-4 text-center">
                  <LogOut className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <p className="text-2xl font-bold">{liveStats.exit_scanned}</p>
                  <p className="text-xs text-muted-foreground">Exit Scanned</p>
                </CardContent>
              </Card>
              <Card className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 mx-auto text-accent mb-1" />
                  <p className="text-2xl font-bold">{liveStats.full_attendance}</p>
                  <p className="text-xs text-muted-foreground">Full Attendance</p>
                </CardContent>
              </Card>
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
                  className={`rounded-lg border p-3 transition-all ${
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
                      {scan.status === "success" ? (
                        scan.scan_type === "entry"
                          ? <LogIn className="w-4 h-4 text-green-600 flex-shrink-0" />
                          : <LogOut className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      ) : (
                        <QrCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
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
                      <Badge
                        className={`text-xs mb-1 ${
                          scan.status === "success"
                            ? scan.scan_type === "entry"
                              ? "bg-green-600 text-white"
                              : "bg-orange-500 text-white"
                            : scan.status === "duplicate"
                              ? "bg-yellow-500 text-white"
                              : "bg-destructive text-destructive-foreground"
                        }`}
                      >
                        {scan.status === "success"
                          ? scan.scan_type === "entry" ? "Entry" : "Exit"
                          : scan.status === "duplicate" ? "Duplicate" : "Error"}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{formatTime(scan.timestamp)}</p>
                    </div>
                  </div>

                  {scan.status === "success" && scan.scan_type === "exit" && scan.duration_minutes !== undefined && (
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
