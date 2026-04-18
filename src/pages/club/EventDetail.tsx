import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Users, LogIn, LogOut, CheckCircle2, Clock,
  Calendar, MapPin, Search, Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

interface Attendee {
  registration_id: string;
  student_name: string;
  student_prn: string;
  student_email: string;
  registered_at: string | null;
  attendance_status: "not_attended" | "partial" | "full";
  entry_scanned: boolean;
  entry_scanned_at: string | null;
  exit_scanned: boolean;
  exit_scanned_at: string | null;
  duration_minutes: number | null;
}

interface Stats {
  total: number;
  entry_scanned: number;
  exit_scanned: number;
  full_attendance: number;
  partial: number;
}

interface EventInfo {
  _id: string;
  name: string;
  date: string;
  start_time?: string;
  venue: string;
  max_participants: number;
}

const statusBadge = (status: Attendee["attendance_status"]) => {
  if (status === "full")
    return <Badge className="bg-green-600 text-white text-xs gap-1"><CheckCircle2 className="w-3 h-3" />Full</Badge>;
  if (status === "partial")
    return <Badge className="bg-orange-500 text-white text-xs gap-1"><Clock className="w-3 h-3" />Partial</Badge>;
  return <Badge variant="secondary" className="text-xs">Not Attended</Badge>;
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent]       = useState<EventInfo | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    if (!id) return;
    apiRequest(`/api/club/events/${id}/attendees`)
      .then((data) => {
        if (data?.event)    setEvent(data.event);
        if (data?.attendees) setAttendees(data.attendees);
        if (data?.stats)    setStats(data.stats);
      })
      .catch(() => toast.error("Failed to load attendee data"))
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = attendees.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.student_name.toLowerCase().includes(q) ||
      a.student_prn.toLowerCase().includes(q)   ||
      a.student_email.toLowerCase().includes(q)
    );
  });

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const exportCsv = () => {
    const rows = [
      ["Name", "PRN", "Email", "Registered At", "Status", "Entry Time", "Exit Time", "Duration (min)"],
      ...attendees.map((a) => [
        a.student_name,
        a.student_prn,
        a.student_email,
        a.registered_at ? new Date(a.registered_at).toLocaleString("en-IN") : "",
        a.attendance_status,
        a.entry_scanned_at ? new Date(a.entry_scanned_at).toLocaleString("en-IN") : "",
        a.exit_scanned_at  ? new Date(a.exit_scanned_at).toLocaleString("en-IN")  : "",
        a.duration_minutes ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${event?.name ?? "event"}_attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1,2,3].map((k) => <div key={k} className="h-20 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/club/events")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{event?.name ?? "Event Detail"}</h1>
          {event && (
            <p className="text-sm text-muted-foreground flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(event.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                {event.start_time ? ` · ${event.start_time}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {event.venue}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Registered</p>
            </CardContent>
          </Card>
          <Card className="shadow-[var(--shadow-soft)]">
            <CardContent className="p-4 text-center">
              <LogIn className="w-5 h-5 mx-auto text-green-600 mb-1" />
              <p className="text-2xl font-bold">{stats.entry_scanned}</p>
              <p className="text-xs text-muted-foreground">Entered</p>
            </CardContent>
          </Card>
          <Card className="shadow-[var(--shadow-soft)]">
            <CardContent className="p-4 text-center">
              <LogOut className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <p className="text-2xl font-bold">{stats.exit_scanned}</p>
              <p className="text-xs text-muted-foreground">Exited</p>
            </CardContent>
          </Card>
          <Card className="shadow-[var(--shadow-soft)]">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto text-accent mb-1" />
              <p className="text-2xl font-bold">{stats.full_attendance}</p>
              <p className="text-xs text-muted-foreground">Full Attendance</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search + Export */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, PRN, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Button variant="outline" className="gap-2 h-10" onClick={exportCsv}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Attendee table */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Registrations ({filtered.length}{filtered.length !== attendees.length ? ` / ${attendees.length}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto opacity-20 mb-2" />
              <p className="text-sm">{attendees.length === 0 ? "No registrations yet" : "No results match your search"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Entry</TableHead>
                    <TableHead className="text-center">Exit</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.registration_id}>
                      <TableCell>
                        <p className="font-medium text-sm leading-tight">{a.student_name}</p>
                        <p className="text-xs text-muted-foreground">{a.student_prn}</p>
                      </TableCell>
                      <TableCell>{statusBadge(a.attendance_status)}</TableCell>
                      <TableCell className="text-center text-sm">
                        {a.entry_scanned ? (
                          <span className="text-green-600 font-medium">{formatDateTime(a.entry_scanned_at)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {a.exit_scanned ? (
                          <span className="text-orange-500 font-medium">{formatDateTime(a.exit_scanned_at)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {a.duration_minutes != null ? (
                          <span className="font-medium">{a.duration_minutes} min</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventDetail;
