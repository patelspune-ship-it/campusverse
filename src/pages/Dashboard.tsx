import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar, Trophy, CheckCircle2, Clock, MapPin,
  QrCode, Download, ImageOff, X, LogIn, LogOut, Award, GraduationCap,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface Stats {
  eventsRegistered: number;
  eventsAttended: number;
  certificatesEarned: number;
  activeRegistrations: number;
}

interface RegisteredEvent {
  _id: string;
  name: string;
  date: string;
  start_time: string;
  venue: string;
  category: string;
  poster_url: string | null;
  club_id: { name: string } | null;
  registration_fee: number;
  registration_id: string | null;
  qr_code_path: string | null;
  qr_token: string | null;
  registered_at: string | null;
  attendance_status: "not_attended" | "partial" | "full";
  entry_scanned: boolean;
  exit_scanned: boolean;
}

interface VerificationRequest {
  _id: string;
  subject_name: string;
  lecture_date: string;
  lecture_start_time: string;
  lecture_end_time: string;
  event_id: { name: string } | null;
  faculty_id: { full_name: string; faculty_code: string } | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
}

interface AttendedEvent {
  _id: string;
  name: string;
  date: string;
  venue: string;
  category: string;
  poster_url: string | null;
  club_id: { name: string } | null;
  attendance_status: "partial" | "full";
  duration_minutes: number | null;
  certificate_path: string | null;
  certificate_id: string | null;
}

interface QrDialogData {
  qr_code_path: string;
  event_name: string;
  date: string;
  venue: string;
  start_time?: string;
  student_name: string;
  student_prn: string;
}

const categoryColor: Record<string, string> = {
  technical: "bg-blue-100 text-blue-700",
  cultural:  "bg-pink-100 text-pink-700",
  sports:    "bg-orange-100 text-orange-700",
  social:    "bg-teal-100 text-teal-700",
  arts:      "bg-purple-100 text-purple-700",
  other:     "bg-muted text-muted-foreground",
};

// ── QR Dialog ─────────────────────────────────────────────────
const QrDialog = ({
  open, onClose, data,
}: { open: boolean; onClose: () => void; data: QrDialogData | null }) => {
  if (!data) return null;

  const handleDownload = async () => {
    try {
      const res   = await fetch(data.qr_code_path);
      const blob  = await res.blob();
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      a.href      = url;
      a.download  = `QR_${data.event_name.replace(/\s+/g, "_")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(data.qr_code_path, "_blank");
    }
  };

  const formattedDate = new Date(data.date).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Your Event QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* QR Image */}
          <div className="p-3 bg-white rounded-xl border-2 border-primary/20 shadow-[var(--shadow-soft)]">
            <img
              src={data.qr_code_path}
              alt="Event QR Code"
              className="w-52 h-52 object-contain"
            />
          </div>

          {/* Event info */}
          <div className="w-full space-y-2 text-center">
            <p className="font-bold text-base leading-tight">{data.event_name}</p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formattedDate}{data.start_time ? ` · ${data.start_time}` : ""}
              </span>
            </div>
            <div className="flex justify-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{data.venue}</span>
            </div>
          </div>

          {/* Student info */}
          <div className="w-full rounded-lg bg-muted/40 border px-4 py-2.5 text-center space-y-0.5">
            <p className="font-semibold text-sm">{data.student_name}</p>
            <p className="text-xs text-muted-foreground">{data.student_prn}</p>
          </div>

          {/* Instruction */}
          <p className="text-xs text-center text-muted-foreground leading-relaxed px-2">
            Show this QR at the event entrance to mark your attendance.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 gap-2" onClick={onClose}>
            <X className="w-4 h-4" /> Close
          </Button>
          <Button
            className="flex-1 gap-2 bg-primary hover:bg-primary/90"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" /> Download QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Dashboard ──────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("cv_user") || "null");

  const [stats, setStats]                 = useState<Stats | null>(null);
  const [registered, setRegistered]       = useState<RegisteredEvent[]>([]);
  const [attended, setAttended]           = useState<AttendedEvent[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [qrDialog, setQrDialog]           = useState<QrDialogData | null>(null);

  useEffect(() => {
    if (!user || user.role !== "student") {
      navigate("/auth");
      return;
    }
    const load = async () => {
      try {
        const [statsData, regData, attData, vrData] = await Promise.all([
          apiRequest("/api/student/stats"),
          apiRequest("/api/student/my-registrations"),
          apiRequest("/api/student/my-attended"),
          apiRequest("/api/student/my-verifications"),
        ]);
        if (statsData?.eventsRegistered !== undefined) setStats(statsData);
        if (Array.isArray(regData))  setRegistered(regData);
        if (Array.isArray(attData))  setAttended(attData);
        if (Array.isArray(vrData))   setVerifications(vrData);
      } catch {
        // silent — empty state handles it
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openQr = (event: RegisteredEvent) => {
    if (!event.qr_code_path) return;
    setQrDialog({
      qr_code_path: event.qr_code_path,
      event_name:   event.name,
      date:         event.date,
      venue:        event.venue,
      start_time:   event.start_time,
      student_name: user?.name ?? "Student",
      student_prn:  user?.userId ?? "",
    });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <QrDialog open={!!qrDialog} onClose={() => setQrDialog(null)} data={qrDialog} />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground">Here's your campus activity overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Events Registered</CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? <span className="animate-pulse">—</span> : (stats?.eventsRegistered ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {loading ? "" : `${stats?.activeRegistrations ?? 0} upcoming`}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Events Attended</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? <span className="animate-pulse">—</span> : (stats?.eventsAttended ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Verified attendance</p>
            </CardContent>
          </Card>

          <Card
            className="shadow-[var(--shadow-soft)] cursor-pointer hover:shadow-[var(--shadow-strong)] transition-all"
            onClick={() => navigate("/certificates")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Certificates Earned</CardTitle>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? <span className="animate-pulse">—</span> : (stats?.certificatesEarned ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Click to view all</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Registrations</CardTitle>
              <Clock className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? <span className="animate-pulse">—</span> : (stats?.activeRegistrations ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upcoming events</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Registered Events */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Events I'm Registered For
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(k => <div key={k} className="h-24 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : registered.length === 0 ? (
            <Card className="shadow-[var(--shadow-soft)]">
              <CardContent className="py-12 text-center space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
                <p className="text-muted-foreground font-medium">No upcoming registrations</p>
                <p className="text-sm text-muted-foreground">Browse events on the home page and register!</p>
                <Button variant="outline" className="mt-2" onClick={() => navigate("/")}>
                  Discover Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {registered.map((event) => (
                <Card key={event._id} className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-all">
                  <CardContent className="p-4 flex gap-4 items-start">
                    {/* Poster thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border">
                      {event.poster_url ? (
                        <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageOff className="w-5 h-5 text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold leading-tight line-clamp-2">{event.name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${categoryColor[event.category] ?? categoryColor.other}`}>
                          {event.category}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.club_id?.name}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(event.date)}{event.start_time ? ` · ${event.start_time}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{event.venue}</span>
                        </span>
                      </div>
                    </div>

                    {/* Attendance + QR */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {event.attendance_status === "full" && (
                        <Badge className="bg-green-600 text-white text-xs gap-1 py-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Full
                        </Badge>
                      )}
                      {event.attendance_status === "partial" && (
                        <Badge className="bg-orange-500 text-white text-xs gap-1 py-0.5">
                          <LogIn className="w-3 h-3" /> Entered
                        </Badge>
                      )}
                      <Button
                        variant={event.qr_code_path ? "outline" : "ghost"}
                        size="sm"
                        disabled={!event.qr_code_path}
                        onClick={() => openQr(event)}
                        className="gap-1.5 text-xs h-7 px-2"
                        title={event.qr_code_path ? "View QR Code" : "QR generating…"}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        {event.qr_code_path ? "QR" : "…"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Faculty Attendance Verification Status */}
        {!loading && verifications.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-600" />
              Faculty Attendance Status
            </h2>
            <p className="text-sm text-muted-foreground -mt-2">
              Faculty need to verify your attendance for lectures missed during club events.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {verifications.map((vr) => (
                <Card key={vr._id} className="shadow-[var(--shadow-soft)]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{vr.subject_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {vr.faculty_id?.full_name} · {new Date(vr.lecture_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} {vr.lecture_start_time}–{vr.lecture_end_time}
                        </p>
                        <p className="text-xs text-muted-foreground">{vr.event_id?.name}</p>
                        {vr.status === "rejected" && vr.rejection_reason && (
                          <p className="text-xs text-destructive mt-1 bg-destructive/5 border border-destructive/20 rounded px-2 py-1">
                            Rejected: {vr.rejection_reason}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          vr.status === "approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs shrink-0"
                            : vr.status === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs shrink-0"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs shrink-0"
                        }
                      >
                        {vr.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {vr.status === "pending"  && <Clock className="w-3 h-3 mr-1" />}
                        {vr.status.charAt(0).toUpperCase() + vr.status.slice(1)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Past Attended Events */}
        {!loading && attended.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              Events I Attended
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attended.map((event) => (
                <Card key={event._id} className="shadow-[var(--shadow-soft)] opacity-80 hover:opacity-100 transition-opacity">
                  <CardContent className="p-4 flex gap-4 items-start">
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border">
                      {event.poster_url ? (
                        <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover grayscale" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageOff className="w-5 h-5 text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-semibold leading-tight line-clamp-1">{event.name}</p>
                      <p className="text-sm text-muted-foreground">{event.club_id?.name}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(event.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{event.venue}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {event.attendance_status === "full" ? (
                        <Badge className="bg-green-600 text-white text-xs gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Full
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-500 text-white text-xs gap-1">
                          <LogIn className="w-3 h-3" /> Partial
                        </Badge>
                      )}
                      {event.duration_minutes != null && (
                        <span className="text-xs text-muted-foreground">{event.duration_minutes} min</span>
                      )}
                      {event.attendance_status === "full" && (
                        event.certificate_path ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1 text-primary border-primary/40"
                            onClick={() => window.open(event.certificate_path!, "_blank")}
                          >
                            <Award className="w-3 h-3" /> Certificate
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled className="h-7 px-2 text-xs gap-1 opacity-50">
                            <Award className="w-3 h-3" /> Pending
                          </Button>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
