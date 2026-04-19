import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Clock, CheckCircle, XCircle, Users, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Stats {
  pending: number;
  approvedMonth: number;
  rejectedMonth: number;
  totalStudents: number;
}

interface AVR {
  _id: string;
  student_id: { name: string; userId: string; division_id?: { division_code: string } };
  subject_name: string;
  lecture_date: string;
  lecture_start_time: string;
  lecture_end_time: string;
  event_id: { name: string; club_id?: { name: string } };
  event_duration_minutes: number | null;
  status: string;
}

interface TimetableSlot {
  _id: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  room_number: string | null;
  division_id: { division_code: string; year: string };
}

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const { refreshPending } = useOutletContext<any>();
  const [stats, setStats]         = useState<Stats | null>(null);
  const [pending, setPending]     = useState<AVR[]>([]);
  const [schedule, setSchedule]   = useState<TimetableSlot[]>([]);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest("/api/faculty/stats"),
      apiRequest("/api/faculty/verifications?status=pending"),
      apiRequest("/api/faculty/today-schedule"),
    ])
      .then(([s, v, t]) => {
        setStats(s);
        if (Array.isArray(v)) setPending(v.slice(0, 5));
        if (Array.isArray(t)) setSchedule(t);
      })
      .catch(() => toast.error("Failed to load dashboard"));
  }, []);

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      await apiRequest(`/api/faculty/verifications/${id}/approve`, "PATCH");
      setPending((p) => p.filter((r) => r._id !== id));
      setStats((s) => s ? { ...s, pending: s.pending - 1, approvedMonth: s.approvedMonth + 1 } : s);
      refreshPending();
      toast.success("Approved");
    } catch { toast.error("Failed to approve"); }
    finally { setActioning(null); }
  };

  const formatDay = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Faculty Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Attendance verification requests for your lectures</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn("shadow-[var(--shadow-soft)]", stats?.pending && stats.pending > 0 ? "border-yellow-400/50" : "")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Clock className={cn("w-5 h-5", stats?.pending ? "text-yellow-500" : "text-muted-foreground")} />
              {stats?.pending ? (
                <Badge className="bg-yellow-500 text-white text-xs">{stats.pending}</Badge>
              ) : null}
            </div>
            <p className="text-2xl font-bold">{stats?.pending ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
          </CardContent>
        </Card>
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-2xl font-bold">{stats?.approvedMonth ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Approved this month</p>
          </CardContent>
        </Card>
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <XCircle className="w-5 h-5 text-destructive mb-2" />
            <p className="text-2xl font-bold">{stats?.rejectedMonth ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Rejected this month</p>
          </CardContent>
        </Card>
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <Users className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{stats?.totalStudents ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Students you teach</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent pending */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent Pending Verifications</h2>
            <Button variant="link" size="sm" className="text-xs" onClick={() => navigate("/faculty/pending")}>
              View all
            </Button>
          </div>

          {pending.length === 0 ? (
            <Card className="shadow-[var(--shadow-soft)]">
              <CardContent className="py-10 text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500 opacity-40" />
                <p className="text-sm text-muted-foreground">No pending verifications</p>
              </CardContent>
            </Card>
          ) : (
            pending.map((r) => (
              <Card key={r._id} className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.student_id?.name}</p>
                      <p className="text-xs text-muted-foreground">{r.student_id?.userId}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{r.subject_name}</span>
                        <span>·</span>
                        <span>{formatDay(r.lecture_date)} {r.lecture_start_time}–{r.lecture_end_time}</span>
                        <span>·</span>
                        <span>{r.event_id?.name}</span>
                        {r.event_duration_minutes && <span>({r.event_duration_minutes} min)</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 bg-green-600 hover:bg-green-700 text-white shrink-0"
                      onClick={() => handleApprove(r._id)}
                      disabled={actioning === r._id}
                    >
                      {actioning === r._id ? "…" : "Approve"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Today's schedule */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Today's Schedule
          </h2>
          {schedule.length === 0 ? (
            <Card className="shadow-[var(--shadow-soft)]">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No lectures today
              </CardContent>
            </Card>
          ) : (
            schedule.map((slot) => (
              <Card key={slot._id} className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-3">
                  <p className="font-medium text-sm">{slot.subject_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {slot.start_time}–{slot.end_time}
                    {slot.room_number && ` · ${slot.room_number}`}
                  </p>
                  <p className="text-xs text-primary mt-0.5">
                    {slot.division_id?.division_code}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
