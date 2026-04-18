import { useEffect, useState } from "react";
import { University } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/api";

interface Institute {
  _id: string;
  name: string;
  code: string;
  studentCount: number;
  clubCount: number;
}

const Institutes = () => {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    apiRequest("/api/admin/institutes")
      .then((data) => { if (Array.isArray(data)) setInstitutes(data); })
      .catch(() => toast.error("Failed to load institutes"))
      .finally(() => setLoading(false));
  }, []);

  const totalStudents = institutes.reduce((acc, i) => acc + i.studentCount, 0);
  const totalClubs    = institutes.reduce((acc, i) => acc + i.clubCount, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Institutes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {loading ? "Loading…" : `${institutes.length} institutes on the platform`}
        </p>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Institutes", value: institutes.length },
            { label: "Total Students",   value: totalStudents      },
            { label: "Total Clubs",      value: totalClubs         },
          ].map(({ label, value }) => (
            <Card key={label} className="shadow-[var(--shadow-soft)]">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-3xl font-bold mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground text-sm">Loading institutes…</div>
          ) : institutes.length === 0 ? (
            <div className="py-20 text-center">
              <University className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground text-sm">No institutes found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Institute Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Clubs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutes.map((inst, idx) => (
                  <TableRow key={inst._id}>
                    <TableCell>
                      <span className="text-sm text-muted-foreground font-medium">{idx + 1}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <University className="w-4 h-4 text-primary" />
                        </div>
                        <p className="font-medium text-sm">{inst.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{inst.code}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-semibold">{inst.studentCount}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-semibold">{inst.clubCount}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Institutes;
