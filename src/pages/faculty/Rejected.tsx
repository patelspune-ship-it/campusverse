import { useEffect, useState } from "react";
import { XCircle, Filter, Search } from "lucide-react";
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
  rejection_reason: string | null;
  faculty_action_at: string;
}

const Rejected = () => {
  const [rows, setRows]     = useState<AVR[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  const fetchRows = () => {
    setLoading(true);
    apiRequest("/api/faculty/verifications?status=rejected")
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
        r.student_id?.userId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "—";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rejected History</h1>
        <p className="text-sm text-muted-foreground mt-1">{loading ? "Loading…" : `${filtered.length} rejected`}</p>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search student…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" className="h-10" onClick={() => setSearch("")}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((k) => <div key={k} className="h-28 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="py-16 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No rejected verifications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r._id} className="shadow-[var(--shadow-soft)]">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{r.student_id?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.student_id?.userId}
                      {r.student_id?.division_id && ` · ${r.student_id.division_id.year} ${r.student_id.division_id.name}`}
                    </p>
                  </div>
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs shrink-0">
                    Rejected
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{r.event_id?.name ?? r.event_name}</span>
                  <span>{fmt(r.event_date)}</span>
                </div>
                {r.rejection_reason && (
                  <div className="mt-1 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded px-3 py-1.5">
                    <span className="font-medium">Reason:</span> {r.rejection_reason}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Actioned: {fmt(r.faculty_action_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Rejected;
