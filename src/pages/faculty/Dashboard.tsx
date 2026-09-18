import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Clock, CheckCircle, XCircle, Users, GraduationCap, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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
  student_id: { name: string; userId: string; division_id?: { name: string; year: string } };
  event_name: string;
  event_date: string | null;
  event_id: { name: string; club_id?: { name: string } };
  event_duration_minutes: number | null;
  status: string;
}

interface MyDivision {
  _id: string;
  year: string;
  name: string;
  academic_year: string;
  department_id?: { name: string; code: string; institute_id?: { name: string; code: string } };
}

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const { refreshPending } = useOutletContext<any>();
  const [stats, setStats]         = useState<Stats | null>(null);
  const [pending, setPending]     = useState<AVR[]>([]);
  const [myDivisions, setMyDivisions] = useState<MyDivision[]>([]);
  const [divisionsLoading, setDivisionsLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest("/api/faculty/stats"),
      apiRequest("/api/faculty/verifications?status=pending"),
      apiRequest("/api/faculty/my-division"),
    ])
      .then(([s, v, d]) => {
        setStats(s);
        if (Array.isArray(v)) setPending(v.slice(0, 5));
        if (Array.isArray(d)) setMyDivisions(d);
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setDivisionsLoading(false));
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

  const formatDay = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "—";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Faculty Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Attendance verification requests routed to you as class teacher</p>
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
                      <p className="text-xs text-muted-foreground">
                        {r.student_id?.userId}
                        {r.student_id?.division_id && ` · ${r.student_id.division_id.year} ${r.student_id.division_id.name}`}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{r.event_id?.name ?? r.event_name}</span>
                        <span>·</span>
                        <span>{formatDay(r.event_date)}</span>
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

        {/* Class teacher of */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Class Teacher Of
          </h2>
          {divisionsLoading ? (
            <div className="h-20 bg-muted animate-pulse rounded-xl" />
          ) : myDivisions.length === 0 ? (
            <Card className="shadow-[var(--shadow-soft)]">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                You are not currently assigned as class teacher of any division.
              </CardContent>
            </Card>
          ) : (
            myDivisions.map((d) => (
              <Card key={d._id} className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-4">
                  <p className="font-medium text-sm">
                    {d.year} {d.department_id?.name ?? ""} Division {d.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.department_id?.institute_id?.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Academic year {d.academic_year}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
            Attendance verified for your students routes here automatically — subject faculty are informed offline.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
