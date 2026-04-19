import { useEffect, useState, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  CheckCircle, XCircle, Clock, Search, Filter, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api";

interface AVR {
  _id: string;
  student_id: { name: string; userId: string; division_id?: { division_code: string } };
  faculty_id: { full_name: string; faculty_code: string };
  event_id: { name: string; club_id?: { name: string } };
  subject_name: string;
  lecture_date: string;
  lecture_start_time: string;
  lecture_end_time: string;
  event_duration_minutes: number | null;
  event_entry_time: string | null;
  event_exit_time: string | null;
  certificate_id: string | null;
  status: string;
}

const PendingVerifications = () => {
  const { refreshPending } = useOutletContext<any>();
  const navigate = useNavigate();
  const [rows, setRows]           = useState<AVR[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [actioning, setActioning] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Reject dialog
  const [rejectId, setRejectId]     = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Filters
  const [search, setSearch]       = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");

  const fetch = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: "pending" });
    if (subjectFilter !== "all") params.set("subject", subjectFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo)   params.set("date_to",   dateTo);
    if (search)   params.set("search",    search);

    apiRequest(`/api/faculty/verifications?${params}`)
      .then((d) => { if (Array.isArray(d)) setRows(d); })
      .catch(() => toast.error("Failed to load verifications"))
      .finally(() => setLoading(false));
  }, [subjectFilter, dateFrom, dateTo, search]);

  useEffect(() => { fetch(); }, []);

  const subjects = [...new Set(rows.map((r) => r.subject_name))].sort();

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      await apiRequest(`/api/faculty/verifications/${id}/approve`, "PATCH");
      setRows((p) => p.filter((r) => r._id !== id));
      setSelected((s) => { s.delete(id); return new Set(s); });
      refreshPending();
      toast.success("Approved");
    } catch { toast.error("Failed"); }
    finally { setActioning(null); }
  };

  const openReject = (id: string) => { setRejectId(id); setRejectReason(""); };

  const handleReject = async () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) { toast.error("Please provide a reason"); return; }
    setActioning(rejectId);
    try {
      await apiRequest(`/api/faculty/verifications/${rejectId}/reject`, "PATCH", { reason: rejectReason });
      setRows((p) => p.filter((r) => r._id !== rejectId));
      setSelected((s) => { s.delete(rejectId); return new Set(s); });
      refreshPending();
      toast.success("Rejected");
      setRejectId(null);
    } catch { toast.error("Failed"); }
    finally { setActioning(null); }
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await apiRequest("/api/faculty/verifications/bulk-approve", "POST", {
        ids: [...selected],
      });
      setRows((p) => p.filter((r) => !selected.has(r._id)));
      setSelected(new Set());
      refreshPending();
      toast.success(res.message ?? "Bulk approved");
    } catch { toast.error("Bulk approve failed"); }
    finally { setBulkLoading(false); }
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r._id)));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  const filtered = rows.filter((r) => {
    if (subjectFilter !== "all" && r.subject_name !== subjectFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.student_id?.name?.toLowerCase().includes(q) ||
        r.student_id?.userId?.toLowerCase().includes(q) ||
        r.event_id?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pending Verifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${filtered.length} pending request${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {selected.size > 0 && (
          <Button
            className="bg-green-600 hover:bg-green-700 gap-2"
            onClick={handleBulkApprove}
            disabled={bulkLoading}
          >
            <CheckCircle className="w-4 h-4" />
            {bulkLoading ? "…" : `Approve ${selected.size} Selected`}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="h-10"><SelectValue placeholder="All subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" className="h-10" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="h-10" value={dateTo}   onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search student or event…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={fetch} className="h-10">Apply</Button>
            <Button variant="outline" className="h-10" onClick={() => { setSubjectFilter("all"); setDateFrom(""); setDateTo(""); setSearch(""); }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((k) => <div key={k} className="h-28 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="py-16 text-center">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground text-sm">No pending verifications</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Select all */}
          <div className="flex items-center gap-2 pb-1">
            <Checkbox
              checked={selected.size === filtered.length && filtered.length > 0}
              onCheckedChange={toggleAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
              Select all ({filtered.length})
            </label>
          </div>

          <div className="space-y-3">
            {filtered.map((r) => (
              <Card key={r._id} className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selected.has(r._id)}
                      onCheckedChange={() => toggleSelect(r._id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{r.student_id?.name}</p>
                          <p className="text-xs text-muted-foreground">{r.student_id?.userId} · {r.student_id?.division_id?.division_code}</p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs shrink-0">
                          Pending
                        </Badge>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <span><span className="font-medium text-foreground">Subject:</span> {r.subject_name}</span>
                        <span><span className="font-medium text-foreground">Lecture:</span> {formatDate(r.lecture_date)} {r.lecture_start_time}–{r.lecture_end_time}</span>
                        <span><span className="font-medium text-foreground">Event:</span> {r.event_id?.name} ({r.event_id?.club_id?.name})</span>
                        <span><span className="font-medium text-foreground">Attended:</span> {r.event_duration_minutes ? `${r.event_duration_minutes} min` : "—"}
                          {" "}<span className="text-green-600 font-medium">(Entry + Exit scanned)</span>
                        </span>
                        {r.certificate_id && (
                          <span className="sm:col-span-2">
                            <span className="font-medium text-foreground">Certificate:</span>{" "}
                            <button
                              className="text-primary underline font-mono text-xs"
                              onClick={() => navigate(`/verify/${r.certificate_id}`)}
                            >
                              {r.certificate_id} <ExternalLink className="w-3 h-3 inline" />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(r._id)}
                        disabled={actioning === r._id}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        {actioning === r._id ? "…" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => openReject(r._id)}
                        disabled={actioning === r._id}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification Request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Please provide a reason. The student will be able to see this.
          </p>
          <Input
            placeholder="Reason for rejection…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleReject}
              disabled={actioning === rejectId}
            >
              {actioning === rejectId ? "…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingVerifications;
