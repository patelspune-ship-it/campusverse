import { useEffect, useState } from "react";
import { Search, Download, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/api";

interface Student {
  _id: string;
  userId: string;
  email: string;
  mobile: string;
  registrationCount: number;
  institute_id: { _id: string; name: string; code: string } | null;
}

interface Institute { _id: string; name: string; code: string }

const AllStudents = () => {
  const [students, setStudents]       = useState<Student[]>([]);
  const [institutes, setInstitutes]   = useState<Institute[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [instFilter, setInstFilter]   = useState("all");
  const [applied, setApplied]         = useState({ search: "", instFilter: "all" });

  const fetchStudents = (s: string, inst: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (s)            params.append("search",       s);
    if (inst !== "all") params.append("institute_id", inst);

    apiRequest(`/api/admin/students?${params}`)
      .then((data) => { if (Array.isArray(data)) setStudents(data); })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiRequest("/api/admin/institutes")
      .then((data) => { if (Array.isArray(data)) setInstitutes(data); })
      .catch(() => {});
    fetchStudents("", "all");
  }, []);

  const applyFilters = () => {
    setApplied({ search, instFilter });
    fetchStudents(search, instFilter);
  };

  const resetFilters = () => {
    setSearch(""); setInstFilter("all");
    setApplied({ search: "", instFilter: "all" });
    fetchStudents("", "all");
  };

  const exportCSV = () => {
    if (students.length === 0) { toast.error("No data to export"); return; }

    const headers = ["PRN", "Email", "Mobile", "Institute", "Events Registered"];
    const rows = students.map((s) => [
      s.userId,
      s.email ?? "",
      s.mobile ?? "",
      s.institute_id?.name ?? "N/A",
      s.registrationCount,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob  = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url   = URL.createObjectURL(blob);
    const link  = document.createElement("a");
    link.href   = url;
    link.download = `campusverse_students_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${students.length} students`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">All Students</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {loading ? "Loading…" : `${students.length} student${students.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={exportCSV}
          disabled={loading || students.length === 0}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by PRN or email…"
            className="h-10 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>
        <Select value={instFilter} onValueChange={setInstFilter}>
          <SelectTrigger className="h-10 w-52">
            <SelectValue placeholder="Institute" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Institutes</SelectItem>
            {institutes.map((i) => (
              <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="h-10" onClick={applyFilters}>Search</Button>
        <Button variant="outline" className="h-10" onClick={resetFilters}>Reset</Button>
      </div>

      {/* Table */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground text-sm">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground text-sm">No students found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PRN / ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Institute</TableHead>
                    <TableHead className="text-right">Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell>
                        <p className="font-mono text-sm font-medium">{s.userId}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{s.email ?? "—"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{s.mobile ?? "—"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{s.institute_id?.name ?? "—"}</p>
                        {s.institute_id?.code && (
                          <p className="text-xs text-muted-foreground">{s.institute_id.code}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold">{s.registrationCount}</span>
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

export default AllStudents;
