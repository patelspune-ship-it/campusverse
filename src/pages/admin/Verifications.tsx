import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Filter, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AVR {
  _id: string;
  student_id: { name: string; userId: string };
  faculty_id: { full_name: string; faculty_code: string };
  event_id: { name: string };
  event_name: string;
  event_date: string | null;
  event_entry_time: string | null;
  event_exit_time: string | null;
  event_duration_minutes: number | null;
  certificate_id: string | null;
  status: string;
  faculty_action_at: string | null;
  rejection_reason: string | null;
}

const statusStyle: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const AdminVerifications = () => {
  const navigate = useNavigate();
  const [rows, setRows]       = useState<AVR[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]             = useState("");

  // NOTE: date_from/date_to are intentionally not sent — the backend
  // /api/admin/verifications route still filters on a removed `lecture_date`
  // field (a leftover from the class-teacher routing refactor), so a date
  // range currently returns zero rows. Needs a backend fix (filter on
  // `event_date` instead) before a date filter can be reintroduced here.

  const fetchRows = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search)   params.set("search",    search);

    apiRequest(`/api/admin/verifications?${params}`)
      .then((d) => { if (Array.isArray(d)) setRows(d); })
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRows(); }, []);

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verification Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Loading…" : `${rows.length} request${rows.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search student or event…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchRows} className="h-10">Apply</Button>
            <Button variant="outline" className="h-10" onClick={() => { setStatusFilter("all"); setSearch(""); }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">No requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class Teacher</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Entry–Exit</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>
                        <p className="font-medium text-sm">{r.student_id?.name}</p>
                        <p className="text-xs text-muted-foreground">{r.student_id?.userId}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{r.faculty_id?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{r.faculty_id?.faculty_code}</p>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {r.event_id?.name ?? r.event_name}<br />
                        <span className="text-xs text-muted-foreground">{fmt(r.event_date)}</span>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {fmtTime(r.event_entry_time)}–{fmtTime(r.event_exit_time)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.event_duration_minutes ? `${r.event_duration_minutes} min` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.certificate_id ? (
                          <button
                            className="text-primary underline font-mono text-xs"
                            onClick={() => navigate(`/verify/${r.certificate_id}`)}
                          >
                            {r.certificate_id} <ExternalLink className="w-3 h-3 inline" />
                          </button>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full capitalize", statusStyle[r.status])}>
                          {r.status}
                        </span>
                        {r.status === "rejected" && r.rejection_reason && (
                          <p className="text-xs text-destructive mt-1 max-w-[160px] truncate" title={r.rejection_reason}>
                            {r.rejection_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.faculty_action_at ? fmt(r.faculty_action_at) : "—"}
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

export default AdminVerifications;
