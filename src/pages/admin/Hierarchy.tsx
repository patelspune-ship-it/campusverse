import { useEffect, useState } from "react";
import { AlertTriangle, Building2, Plus, Pencil, Trash2, Network, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/api";

const YEARS = ["FY", "SY", "TY", "BTech1", "BTech2", "BTech3", "BTech4"];

interface Institute  { _id: string; name: string; code: string }
interface Department { _id: string; name: string; code: string; institute_id: string | { _id: string; name: string } }
interface FacultyOpt  {
  _id: string;
  full_name: string;
  faculty_code: string;
  is_class_teacher_of?: { _id: string; name: string } | null;
}
interface Division {
  _id: string;
  name: string;
  year: string;
  academic_year: string;
  department_id: { _id: string; name: string; code: string };
  class_teacher_id: { _id: string; full_name: string; faculty_code: string } | null;
}

const Hierarchy = () => {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [instituteId, setInstituteId] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divisionsLoading, setDivisionsLoading] = useState(false);
  const [divisionDeptId, setDivisionDeptId] = useState("");

  const [faculty, setFaculty] = useState<FacultyOpt[]>([]);
  const [facultyUnavailable, setFacultyUnavailable] = useState(false);

  // Department dialog
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: "", code: "" });
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptDeleteTarget, setDeptDeleteTarget] = useState<Department | null>(null);

  // Division dialog
  const [divDialogOpen, setDivDialogOpen] = useState(false);
  const [editingDiv, setEditingDiv] = useState<Division | null>(null);
  const [divForm, setDivForm] = useState({ department_id: "", year: "", name: "", academic_year: "2025-26", class_teacher_id: "" });
  const [divSaving, setDivSaving] = useState(false);
  const [divDeleteTarget, setDivDeleteTarget] = useState<Division | null>(null);

  // ── Load institutes once ──────────────────────────────────
  useEffect(() => {
    apiRequest("/api/admin/institutes")
      .then((data) => { if (Array.isArray(data)) setInstitutes(data); })
      .catch(() => toast.error("Failed to load institutes"));
  }, []);

  // ── Load departments for selected institute ───────────────
  const loadDepartments = (instId: string) => {
    if (!instId) { setDepartments([]); return; }
    setDepartmentsLoading(true);
    apiRequest(`/api/admin/departments?institute_id=${instId}`)
      .then((data) => { if (Array.isArray(data)) setDepartments(data); })
      .catch(() => toast.error("Failed to load departments"))
      .finally(() => setDepartmentsLoading(false));
  };

  useEffect(() => { loadDepartments(instituteId); setDivisionDeptId(""); setDivisions([]); }, [instituteId]);

  // ── Load divisions for selected department ────────────────
  const loadDivisions = (deptId: string) => {
    if (!deptId) { setDivisions([]); return; }
    setDivisionsLoading(true);
    apiRequest(`/api/admin/divisions?department_id=${deptId}`)
      .then((data) => { if (Array.isArray(data)) setDivisions(data); })
      .catch(() => toast.error("Failed to load divisions"))
      .finally(() => setDivisionsLoading(false));
  };

  useEffect(() => { loadDivisions(divisionDeptId); }, [divisionDeptId]);

  // ── Load faculty list for class-teacher dropdown ───────────
  // NOTE: GET /api/admin/faculty does not exist in the backend yet.
  // We attempt it and degrade gracefully — class teacher assignment is
  // disabled with an explanatory note until that endpoint is added.
  useEffect(() => {
    apiRequest("/api/admin/faculty")
      .then((data) => {
        if (Array.isArray(data)) setFaculty(data);
        else setFacultyUnavailable(true);
      })
      .catch(() => setFacultyUnavailable(true));
  }, []);

  // ── Department CRUD ────────────────────────────────────────
  const openCreateDept = () => {
    setEditingDept(null);
    setDeptForm({ name: "", code: "" });
    setDeptDialogOpen(true);
  };
  const openEditDept = (d: Department) => {
    setEditingDept(d);
    setDeptForm({ name: d.name, code: d.code });
    setDeptDialogOpen(true);
  };
  const saveDept = async () => {
    if (!instituteId) { toast.error("Select an institute first"); return; }
    if (!deptForm.name.trim() || !deptForm.code.trim()) { toast.error("Name and code are required"); return; }
    setDeptSaving(true);
    try {
      if (editingDept) {
        await apiRequest(`/api/admin/departments/${editingDept._id}`, "PATCH", deptForm);
        toast.success("Department updated");
      } else {
        await apiRequest("/api/admin/departments", "POST", { ...deptForm, institute_id: instituteId });
        toast.success("Department created");
      }
      setDeptDialogOpen(false);
      loadDepartments(instituteId);
    } catch {
      toast.error("Failed to save department");
    } finally {
      setDeptSaving(false);
    }
  };
  const deleteDept = async () => {
    if (!deptDeleteTarget) return;
    try {
      const res = await apiRequest(`/api/admin/departments/${deptDeleteTarget._id}`, "DELETE");
      if (res?.message?.toLowerCase().includes("cannot")) {
        toast.error(res.message);
      } else {
        toast.success("Department deleted");
        loadDepartments(instituteId);
      }
    } catch {
      toast.error("Failed to delete department");
    } finally {
      setDeptDeleteTarget(null);
    }
  };

  // ── Division CRUD ──────────────────────────────────────────
  const openCreateDiv = () => {
    setEditingDiv(null);
    setDivForm({ department_id: divisionDeptId, year: "", name: "", academic_year: "2025-26", class_teacher_id: "" });
    setDivDialogOpen(true);
  };
  const openEditDiv = (d: Division) => {
    setEditingDiv(d);
    setDivForm({
      department_id: d.department_id._id,
      year: d.year,
      name: d.name,
      academic_year: d.academic_year,
      class_teacher_id: d.class_teacher_id?._id ?? "",
    });
    setDivDialogOpen(true);
  };
  const saveDiv = async () => {
    if (!divForm.department_id || !divForm.year || !divForm.name.trim() || !divForm.academic_year.trim()) {
      toast.error("Department, year, division name and academic year are required");
      return;
    }
    setDivSaving(true);
    try {
      const payload: any = {
        department_id: divForm.department_id,
        year: divForm.year,
        name: divForm.name.trim(),
        academic_year: divForm.academic_year.trim(),
      };
      if (divForm.class_teacher_id) payload.class_teacher_id = divForm.class_teacher_id;
      else if (editingDiv) payload.class_teacher_id = null;

      if (editingDiv) {
        await apiRequest(`/api/admin/divisions/${editingDiv._id}`, "PATCH", payload);
        toast.success("Division updated");
      } else {
        await apiRequest("/api/admin/divisions", "POST", payload);
        toast.success("Division created");
      }
      setDivDialogOpen(false);
      loadDivisions(divisionDeptId);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save division");
    } finally {
      setDivSaving(false);
    }
  };
  const deleteDiv = async () => {
    if (!divDeleteTarget) return;
    try {
      const res = await apiRequest(`/api/admin/divisions/${divDeleteTarget._id}`, "DELETE");
      if (res?.message?.toLowerCase().includes("cannot")) {
        toast.error(res.message);
      } else {
        toast.success("Division deleted");
        loadDivisions(divisionDeptId);
      }
    } catch {
      toast.error("Failed to delete division");
    } finally {
      setDivDeleteTarget(null);
    }
  };

  const noTeacherCount = divisions.filter((d) => !d.class_teacher_id).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Network className="w-6 h-6" />
          Hierarchy Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Institute → Department → Division → Class Teacher. This mapping is what attendance verification routes through.
        </p>
      </div>

      {facultyUnavailable && (
        <Card className="border-yellow-400/50 shadow-[var(--shadow-soft)]">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Class teacher assignment is disabled.</span>{" "}
              This page needs a faculty listing endpoint (<code className="text-xs bg-muted px-1 py-0.5 rounded">GET /api/admin/faculty</code>) that doesn't exist in the backend yet. Department and Division management below still work.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Institute selector */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-4 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
          <Label className="shrink-0">Institute</Label>
          <Select value={instituteId} onValueChange={setInstituteId}>
            <SelectTrigger className="h-10 max-w-sm">
              <SelectValue placeholder="Select an institute to manage" />
            </SelectTrigger>
            <SelectContent>
              {institutes.map((i) => (
                <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!instituteId ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Select an institute above to manage its departments and divisions.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="departments">
          <TabsList>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="divisions">Divisions</TabsTrigger>
          </TabsList>

          {/* ── DEPARTMENTS TAB ─────────────────────────────── */}
          <TabsContent value="departments" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {departmentsLoading ? "Loading…" : `${departments.length} department${departments.length !== 1 ? "s" : ""}`}
              </p>
              <Button size="sm" className="gap-2" onClick={openCreateDept}>
                <Plus className="w-4 h-4" /> New Department
              </Button>
            </div>

            <Card className="shadow-[var(--shadow-soft)]">
              <CardContent className="p-0">
                {departmentsLoading ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
                ) : departments.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">No departments yet for this institute.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((d) => (
                        <TableRow key={d._id}>
                          <TableCell className="font-medium text-sm">{d.name}</TableCell>
                          <TableCell><span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{d.code}</span></TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDept(d)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeptDeleteTarget(d)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DIVISIONS TAB ───────────────────────────────── */}
          <TabsContent value="divisions" className="space-y-4">
            <div className="flex items-center gap-3">
              <Label className="shrink-0">Department</Label>
              <Select value={divisionDeptId} onValueChange={setDivisionDeptId}>
                <SelectTrigger className="h-10 max-w-sm">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {divisionDeptId && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {divisionsLoading ? "Loading…" : `${divisions.length} division${divisions.length !== 1 ? "s" : ""}`}
                    {!divisionsLoading && noTeacherCount > 0 && (
                      <span className="text-yellow-600 font-medium ml-2">
                        · {noTeacherCount} without a class teacher
                      </span>
                    )}
                  </p>
                  <Button size="sm" className="gap-2" onClick={openCreateDiv}>
                    <Plus className="w-4 h-4" /> New Division
                  </Button>
                </div>

                <Card className="shadow-[var(--shadow-soft)]">
                  <CardContent className="p-0">
                    {divisionsLoading ? (
                      <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
                    ) : divisions.length === 0 ? (
                      <div className="py-16 text-center text-sm text-muted-foreground">No divisions yet for this department.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Year</TableHead>
                            <TableHead>Division</TableHead>
                            <TableHead>Academic Year</TableHead>
                            <TableHead>Class Teacher</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {divisions.map((d) => (
                            <TableRow key={d._id}>
                              <TableCell className="text-sm">{d.year}</TableCell>
                              <TableCell className="font-medium text-sm">Division {d.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{d.academic_year}</TableCell>
                              <TableCell>
                                {d.class_teacher_id ? (
                                  <span className="text-sm">
                                    {d.class_teacher_id.full_name}{" "}
                                    <span className="text-xs text-muted-foreground">({d.class_teacher_id.faculty_code})</span>
                                  </span>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs gap-1">
                                    <AlertTriangle className="w-3 h-3" /> No class teacher — routing will fail
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDiv(d)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDivDeleteTarget(d)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ── Department create/edit dialog ─────────────────── */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? "Edit Department" : "New Department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Computer Science & Engineering" value={deptForm.name} onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input placeholder="CSE" value={deptForm.code} onChange={(e) => setDeptForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDept} disabled={deptSaving}>{deptSaving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Division create/edit dialog ───────────────────── */}
      <Dialog open={divDialogOpen} onOpenChange={setDivDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDiv ? "Edit Division" : "New Division"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={divForm.department_id} onValueChange={(v) => setDivForm((f) => ({ ...f, department_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={divForm.year} onValueChange={(v) => setDivForm((f) => ({ ...f, year: v }))}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Division Name/No.</Label>
                <Input placeholder="20" value={divForm.name} onChange={(e) => setDivForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input placeholder="2025-26" value={divForm.academic_year} onChange={(e) => setDivForm((f) => ({ ...f, academic_year: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Class Teacher
              </Label>
              <Select
                value={divForm.class_teacher_id || "none"}
                onValueChange={(v) => setDivForm((f) => ({ ...f, class_teacher_id: v === "none" ? "" : v }))}
                disabled={facultyUnavailable}
              >
                <SelectTrigger>
                  <SelectValue placeholder={facultyUnavailable ? "Faculty list unavailable" : "Select class teacher"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {faculty.map((f) => {
                    const assignedElsewhere =
                      !!f.is_class_teacher_of && f.is_class_teacher_of._id !== editingDiv?._id;
                    return (
                      <SelectItem key={f._id} value={f._id}>
                        {f.full_name} ({f.faculty_code})
                        {assignedElsewhere ? ` — already class teacher of Division ${f.is_class_teacher_of!.name}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {facultyUnavailable && (
                <p className="text-xs text-muted-foreground">
                  Backend endpoint GET /api/admin/faculty is missing — assignment disabled.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDivDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDiv} disabled={divSaving}>{divSaving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmations ──────────────────────────── */}
      <AlertDialog open={!!deptDeleteTarget} onOpenChange={(o) => !o && setDeptDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deptDeleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Departments with divisions still attached can't be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDept} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!divDeleteTarget} onOpenChange={(o) => !o && setDivDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Division {divDeleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Divisions with students still assigned can't be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDiv} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Hierarchy;
