import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Filter, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";

interface AVR {
  _id: string;
  student_id: { name: string; userId: string; division_id?: { name: string; year: string } };
  event_id: { name: string; club_id?: { name: string } };
  event_name: string;
  event_date: string | null;
  event_entry_time: string | null;
  event_exit_time: string | null;
  event_duration_minutes: number | null;
  certificate_id: string | null;
  faculty_action_at: string;
}

const Approved = () => {
  const navigate = useNavigate();
  const [rows, setRows]     = useState<AVR[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  const fetchRows = () => {
    setLoading(true);
    const params = new URLSearchParams({ status: "approved" });
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo)   params.set("date_to",   dateTo);
    apiRequest(`/api/faculty/verifications?${params}`)
      .then((d) => { if (Array.isArray(d)) setRows(d); })
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = rows.filter((r) => {
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

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "—";

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Approved History</h1>
        <p className="text-sm text-muted-foreground mt-1">{loading ? "Loading…" : `${filtered.length} approved`}</p>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input type="date" className="h-10" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="h-10" value={dateTo}   onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={fetchRows} className="h-10">Apply</Button>
            <Button variant="outline" className="h-10" onClick={() => { setDateFrom(""); setDateTo(""); setSearch(""); }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((k) => <div key={k} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="py-16 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No approved verifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r._id} className="shadow-[var(--shadow-soft)]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{r.student_id?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.student_id?.userId}
                      {r.student_id?.division_id && ` · ${r.student_id.division_id.year} ${r.student_id.division_id.name}`}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">{r.event_id?.name ?? r.event_name}</span>
                      <span>{fmt(r.event_date)}</span>
                      <span>Entry–Exit: {fmtTime(r.event_entry_time)}–{fmtTime(r.event_exit_time)}</span>
                      {r.event_duration_minutes && <span>{r.event_duration_minutes} min</span>}
                      {r.certificate_id && (
                        <button
                          className="text-primary underline font-mono"
                          onClick={() => navigate(`/verify/${r.certificate_id}`)}
                        >
                          {r.certificate_id} <ExternalLink className="w-3 h-3 inline" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs shrink-0">
                    Approved
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Actioned: {fmt(r.faculty_action_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Approved;
