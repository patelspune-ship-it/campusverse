import { useEffect, useState } from "react";
import { Clock, CheckCircle, XCircle, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  subject_name: string;
  lecture_date: string;
  lecture_start_time: string;
  lecture_end_time: string;
  event_duration_minutes: number | null;
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
  const [rows, setRows]       = useState<AVR[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]             = useState("");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");

  const fetchRows = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo)   params.set("date_to",   dateTo);
    if (search)   params.set("search",    search);

    apiRequest(`/api/admin/verifications?${params}`)
      .then((d) => { if (Array.isArray(d)) setRows(d); })
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRows(); }, []);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="h-10" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="h-10" value={dateTo}   onChange={(e) => setDateTo(e.target.value)} />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search student or event…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchRows} className="h-10">Apply</Button>
            <Button variant="outline" className="h-10" onClick={() => { setStatusFilter("all"); setDateFrom(""); setDateTo(""); setSearch(""); }}>Reset</Button>
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
                    <TableHead>Faculty</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Lecture</TableHead>
                    <TableHead>Event</TableHead>
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
                      <TableCell className="text-sm">{r.subject_name}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {fmt(r.lecture_date)}<br />
                        <span className="text-xs text-muted-foreground">{r.lecture_start_time}–{r.lecture_end_time}</span>
                      </TableCell>
                      <TableCell className="text-sm">{r.event_id?.name}</TableCell>
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
