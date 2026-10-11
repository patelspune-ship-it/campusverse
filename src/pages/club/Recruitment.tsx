import { useEffect, useState } from "react";
import {
  Plus, Trash2, Pencil, Users, CheckCircle, XCircle, CalendarClock, Star, History,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";

type DriveStatus = "draft" | "open" | "closed";
type Stage = "applied" | "shortlisted" | "interview_scheduled" | "interviewed" | "selected" | "rejected";

interface DriveQuestion { question: string; required: boolean }
interface Drive {
  _id: string;
  title: string;
  description: string | null;
  roles_open: string[];
  questions: DriveQuestion[];
  application_deadline: string;
  status: DriveStatus;
  created_at: string;
}

interface StudentInfo { _id: string; name: string | null; userId: string; email: string | null; mobile: string | null }
interface Answer { question: string; answer: string }
interface InterviewSlot { date: string | null; time: string | null; venue: string | null; meeting_link: string | null }
interface InterviewFeedback { rating: number | null; notes: string | null; recorded_by?: { userId: string } | null; recorded_at: string | null }
interface StageHistoryEntry { stage: string; changed_by: { userId: string } | null; changed_at: string; note: string | null }
interface Application {
  _id: string;
  student_id: StudentInfo;
  role_applied_for: string;
  responses: Answer[];
  stage: Stage;
  interview_slot: InterviewSlot;
  interview_feedback: InterviewFeedback;
  stage_history: StageHistoryEntry[];
  final_remarks: string | null;
  created_at: string;
}

const STAGES: { key: Stage; label: string }[] = [
  { key: "applied",              label: "Applied" },
  { key: "shortlisted",          label: "Shortlisted" },
  { key: "interview_scheduled",  label: "Interview Scheduled" },
  { key: "interviewed",          label: "Interviewed" },
  { key: "selected",             label: "Selected" },
  { key: "rejected",             label: "Rejected" },
];

const stageStyle: Record<Stage, string> = {
  applied:             "bg-muted text-muted-foreground",
  shortlisted:         "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  interview_scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  interviewed:         "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  selected:            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const emptyDriveForm = {
  title: "", description: "", roles_open: "", application_deadline: "",
  status: "draft" as DriveStatus, questions: [] as DriveQuestion[],
};

const Recruitment = () => {
  const [drives, setDrives]   = useState<Drive[]>([]);
  const [driveId, setDriveId] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingDrives, setLoadingDrives] = useState(true);
  const [loadingApps, setLoadingApps]     = useState(false);
  const [activeStage, setActiveStage]     = useState<Stage>("applied");
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading]     = useState(false);

  // Drive dialog
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);
  const [editingDrive, setEditingDrive]       = useState<Drive | null>(null);
  const [driveForm, setDriveForm]             = useState(emptyDriveForm);
  const [savingDrive, setSavingDrive]         = useState(false);

  // Application detail
  const [detail, setDetail] = useState<Application | null>(null);
  const [actioning, setActioning] = useState(false);

  // Contextual dialogs
  const [rejectOpen, setRejectOpen]   = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [selectOpen, setSelectOpen]   = useState(false);
  const [selectRemarks, setSelectRemarks] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "", venue: "", meeting_link: "", note: "" });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ rating: "3", notes: "", note: "" });

  const loadDrives = () => {
    setLoadingDrives(true);
    apiRequest("/api/club/recruitment-drives")
      .then((data) => {
        if (Array.isArray(data)) {
          setDrives(data);
          if (!driveId && data.length > 0) setDriveId(data[0]._id);
        }
      })
      .catch(() => toast.error("Failed to load recruitment drives"))
      .finally(() => setLoadingDrives(false));
  };

  useEffect(() => { loadDrives(); }, []);

  const loadApplications = () => {
    if (!driveId) { setApplications([]); return; }
    setLoadingApps(true);
    apiRequest(`/api/club/applications?drive_id=${driveId}`)
      .then((data) => { if (Array.isArray(data)) setApplications(data); })
      .catch(() => toast.error("Failed to load applications"))
      .finally(() => setLoadingApps(false));
  };

  useEffect(() => { loadApplications(); setSelected(new Set()); }, [driveId]);

  const currentDrive = drives.find((d) => d._id === driveId) ?? null;
  const stageCount = (stage: Stage) => applications.filter((a) => a.stage === stage).length;
  const stageApps = applications.filter((a) => a.stage === activeStage);

  // ── Drive CRUD ────────────────────────────────────────────
  const openCreateDrive = () => {
    setEditingDrive(null);
    setDriveForm(emptyDriveForm);
    setDriveDialogOpen(true);
  };
  const openEditDrive = (d: Drive) => {
    setEditingDrive(d);
    setDriveForm({
      title: d.title,
      description: d.description ?? "",
      roles_open: d.roles_open.join(", "),
      application_deadline: d.application_deadline.slice(0, 10),
      status: d.status,
      questions: d.questions,
    });
    setDriveDialogOpen(true);
  };
  const addQuestion = () => setDriveForm((f) => ({ ...f, questions: [...f.questions, { question: "", required: false }] }));
  const updateQuestion = (idx: number, patch: Partial<DriveQuestion>) =>
    setDriveForm((f) => ({ ...f, questions: f.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)) }));
  const removeQuestion = (idx: number) =>
    setDriveForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));

  const handleSaveDrive = async () => {
    if (!driveForm.title.trim()) { toast.error("Title is required"); return; }
    if (!driveForm.application_deadline) { toast.error("Application deadline is required"); return; }

    const payload = {
      title: driveForm.title.trim(),
      description: driveForm.description.trim() || null,
      roles_open: driveForm.roles_open.split(",").map((r) => r.trim()).filter(Boolean),
      application_deadline: driveForm.application_deadline,
      status: driveForm.status,
      questions: driveForm.questions.filter((q) => q.question.trim()),
    };

    setSavingDrive(true);
    try {
      const res = editingDrive
        ? await apiRequest(`/api/club/recruitment-drives/${editingDrive._id}`, "PATCH", payload)
        : await apiRequest("/api/club/recruitment-drives", "POST", payload);

      if (res?.drive) {
        toast.success(editingDrive ? "Drive updated" : "Drive created");
        setDriveDialogOpen(false);
        loadDrives();
        if (!editingDrive) setDriveId(res.drive._id);
      } else {
        toast.error(res?.message ?? "Failed to save drive");
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setSavingDrive(false);
    }
  };

  // ── Application detail + actions ───────────────────────────
  const openDetail = (a: Application) => setDetail(a);
  const closeDetail = () => setDetail(null);

  const refreshAfterAction = (updated?: Application) => {
    loadApplications();
    if (updated) setDetail(updated);
    else closeDetail();
  };

  const handleShortlist = async (id: string) => {
    setActioning(true);
    try {
      const res = await apiRequest(`/api/club/applications/${id}/stage`, "PATCH", { stage: "shortlisted" });
      if (res?.application) { toast.success("Shortlisted"); refreshAfterAction(res.application); }
      else toast.error(res?.message ?? "Failed to shortlist");
    } catch { toast.error("Server error."); }
    finally { setActioning(false); }
  };

  const openReject = () => { setRejectRemarks(""); setRejectOpen(true); };
  const handleReject = async () => {
    if (!detail) return;
    setActioning(true);
    try {
      const res = await apiRequest(`/api/club/applications/${detail._id}/stage`, "PATCH", { stage: "rejected", note: rejectRemarks.trim() });
      if (res?.application) { toast.success("Application rejected"); setRejectOpen(false); refreshAfterAction(res.application); }
      else toast.error(res?.message ?? "Failed to reject");
    } catch { toast.error("Server error."); }
    finally { setActioning(false); }
  };

  const openSelect = () => { setSelectRemarks(""); setSelectOpen(true); };
  const handleSelectApplicant = async () => {
    if (!detail) return;
    setActioning(true);
    try {
      const res = await apiRequest(`/api/club/applications/${detail._id}/stage`, "PATCH", { stage: "selected", note: selectRemarks.trim() });
      if (res?.application) { toast.success("Applicant selected"); setSelectOpen(false); refreshAfterAction(res.application); }
      else toast.error(res?.message ?? "Failed to select");
    } catch { toast.error("Server error."); }
    finally { setActioning(false); }
  };

  const openSchedule = () => { setScheduleForm({ date: "", time: "", venue: "", meeting_link: "", note: "" }); setScheduleOpen(true); };
  const handleSchedule = async () => {
    if (!detail) return;
    if (!scheduleForm.date || !scheduleForm.time) { toast.error("Date and time are required"); return; }
    if (!scheduleForm.venue.trim() && !scheduleForm.meeting_link.trim()) { toast.error("Provide a venue or a meeting link"); return; }
    setActioning(true);
    try {
      const res = await apiRequest(`/api/club/applications/${detail._id}/schedule-interview`, "PATCH", scheduleForm);
      if (res?.application) { toast.success("Interview scheduled"); setScheduleOpen(false); refreshAfterAction(res.application); }
      else toast.error(res?.message ?? "Failed to schedule interview");
    } catch { toast.error("Server error."); }
    finally { setActioning(false); }
  };

  const openFeedback = () => { setFeedbackForm({ rating: "3", notes: "", note: "" }); setFeedbackOpen(true); };
  const handleFeedback = async () => {
    if (!detail) return;
    setActioning(true);
    try {
      const res = await apiRequest(`/api/club/applications/${detail._id}/feedback`, "PATCH", feedbackForm);
      if (res?.application) { toast.success("Feedback recorded"); setFeedbackOpen(false); refreshAfterAction(res.application); }
      else toast.error(res?.message ?? "Failed to record feedback");
    } catch { toast.error("Server error."); }
    finally { setActioning(false); }
  };

  // ── Bulk shortlist ──────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleBulkShortlist = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await apiRequest("/api/club/applications/bulk-shortlist", "POST", { ids: [...selected] });
      toast.success(res?.message ?? "Bulk shortlisted");
      setSelected(new Set());
      loadApplications();
    } catch {
      toast.error("Server error.");
    } finally {
      setBulkLoading(false);
    }
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtDateTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Recruitment</h1>
          <p className="text-muted-foreground mt-1 text-sm">Run recruitment drives and manage your applicant pipeline.</p>
        </div>
        <Button className="gap-2 shadow-[var(--shadow-soft)]" onClick={openCreateDrive}>
          <Plus className="w-4 h-4" /> New Drive
        </Button>
      </div>

      {loadingDrives ? (
        <div className="h-16 bg-muted animate-pulse rounded-xl" />
      ) : drives.length === 0 ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">No recruitment drives yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create one to start accepting applications.</p>
            <Button size="sm" className="gap-2 mt-4" onClick={openCreateDrive}><Plus className="w-4 h-4" /> New Drive</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-[var(--shadow-soft)]">
            <CardContent className="p-4 flex items-center gap-3 flex-wrap">
              <Label className="shrink-0">Drive</Label>
              <Select value={driveId} onValueChange={setDriveId}>
                <SelectTrigger className="h-10 max-w-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {drives.map((d) => <SelectItem key={d._id} value={d._id}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
              {currentDrive && (
                <>
                  <Badge className={currentDrive.status === "open" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                    {currentDrive.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Deadline {fmtDate(currentDrive.application_deadline)}</span>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 ml-auto" onClick={() => openEditDrive(currentDrive)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit Drive
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Tabs value={activeStage} onValueChange={(v) => { setActiveStage(v as Stage); setSelected(new Set()); }}>
            <TabsList className="flex-wrap h-auto">
              {STAGES.map((s) => (
                <TabsTrigger key={s.key} value={s.key} className="gap-1.5">
                  {s.label} <span className="text-xs text-muted-foreground">({stageCount(s.key)})</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {STAGES.map((s) => (
              <TabsContent key={s.key} value={s.key} className="space-y-3 mt-4">
                {s.key === "applied" && selected.size > 0 && (
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleBulkShortlist} disabled={bulkLoading}>
                    <CheckCircle className="w-4 h-4" /> {bulkLoading ? "…" : `Shortlist ${selected.size} Selected`}
                  </Button>
                )}
                {loadingApps ? (
                  <div className="space-y-3">{[1,2].map((k) => <div key={k} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
                ) : stageApps.length === 0 ? (
                  <Card className="shadow-[var(--shadow-soft)]"><CardContent className="py-12 text-center text-sm text-muted-foreground">No applications in this stage.</CardContent></Card>
                ) : (
                  <div className="space-y-2">
                    {stageApps.map((a) => (
                      <Card key={a._id} className="shadow-[var(--shadow-soft)]">
                        <CardContent className="p-4 flex items-center gap-3">
                          {s.key === "applied" && (
                            <Checkbox checked={selected.has(a._id)} onCheckedChange={() => toggleSelect(a._id)} />
                          )}
                          <button className="flex-1 min-w-0 text-left" onClick={() => openDetail(a)}>
                            <p className="font-medium text-sm">{a.student_id?.name ?? a.student_id?.userId}</p>
                            <p className="text-xs text-muted-foreground">{a.student_id?.userId} · {a.role_applied_for}</p>
                          </button>
                          <span className="text-xs text-muted-foreground shrink-0">{fmtDate(a.created_at)}</span>
                          <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => openDetail(a)}>View</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      {/* Drive create/edit dialog */}
      <Dialog open={driveDialogOpen} onOpenChange={setDriveDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDrive ? "Edit Drive" : "New Recruitment Drive"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="ACES Core Team Recruitment 2026" value={driveForm.title} onChange={(e) => setDriveForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea className="min-h-20 resize-none" value={driveForm.description} onChange={(e) => setDriveForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Roles Open</Label>
              <Input placeholder="Technical Lead, Design Head (comma-separated)" value={driveForm.roles_open} onChange={(e) => setDriveForm((f) => ({ ...f, roles_open: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Application Deadline *</Label>
                <Input type="date" value={driveForm.application_deadline} onChange={(e) => setDriveForm((f) => ({ ...f, application_deadline: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={driveForm.status} onValueChange={(v) => setDriveForm((f) => ({ ...f, status: v as DriveStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Application Questions</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addQuestion}>
                  <Plus className="w-3 h-3" /> Add question
                </Button>
              </div>
              {driveForm.questions.map((q, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input placeholder="Question" className="flex-1" value={q.question} onChange={(e) => updateQuestion(idx, { question: e.target.value })} />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Checkbox checked={q.required} onCheckedChange={(v) => updateQuestion(idx, { required: !!v })} /> Required
                  </label>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeQuestion(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriveDialogOpen(false)} disabled={savingDrive}>Cancel</Button>
            <Button onClick={handleSaveDrive} disabled={savingDrive}>{savingDrive ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader><DialogTitle>{detail.student_id?.name ?? detail.student_id?.userId}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={stageStyle[detail.stage]}>{STAGES.find((s) => s.key === detail.stage)?.label}</Badge>
                  <span className="text-xs text-muted-foreground">{detail.role_applied_for}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">PRN</p><p className="font-medium">{detail.student_id?.userId}</p></div>
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium truncate">{detail.student_id?.email ?? "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Mobile</p><p className="font-medium">{detail.student_id?.mobile ?? "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Applied</p><p className="font-medium">{fmtDate(detail.created_at)}</p></div>
                </div>

                {detail.responses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Responses</p>
                    {detail.responses.map((r, idx) => (
                      <div key={idx} className="text-sm border rounded-lg px-3 py-2">
                        <p className="text-xs text-muted-foreground">{r.question}</p>
                        <p>{r.answer || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}

                {detail.interview_slot?.date && (
                  <div className="text-sm bg-muted/40 border rounded-lg px-3 py-2 space-y-0.5">
                    <p className="font-medium flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Interview</p>
                    <p className="text-muted-foreground">{fmtDate(detail.interview_slot.date)} at {detail.interview_slot.time}</p>
                    {detail.interview_slot.venue && <p className="text-muted-foreground">Venue: {detail.interview_slot.venue}</p>}
                    {detail.interview_slot.meeting_link && <p className="text-muted-foreground truncate">Link: {detail.interview_slot.meeting_link}</p>}
                  </div>
                )}

                {detail.interview_feedback?.rating != null && (
                  <div className="text-sm bg-muted/40 border rounded-lg px-3 py-2 space-y-0.5">
                    <p className="font-medium flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Interview Feedback</p>
                    <p className="text-muted-foreground">Rating: {detail.interview_feedback.rating}/5</p>
                    {detail.interview_feedback.notes && <p className="text-muted-foreground">{detail.interview_feedback.notes}</p>}
                  </div>
                )}

                {detail.final_remarks && (
                  <div className={`text-sm rounded-lg px-3 py-2 border ${detail.stage === "rejected" ? "text-destructive bg-destructive/5 border-destructive/20" : "bg-green-50 dark:bg-green-900/10 border-green-400/30"}`}>
                    <span className="font-medium">Final remarks:</span> {detail.final_remarks}
                  </div>
                )}

                {detail.stage_history.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Stage History</p>
                    {detail.stage_history.map((h, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        <span className="capitalize font-medium text-foreground">{h.stage.replace(/_/g, " ")}</span> by {h.changed_by?.userId ?? "—"} · {fmtDateTime(h.changed_at)}
                        {h.note && ` — ${h.note}`}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {!["selected", "rejected"].includes(detail.stage) && (
                <DialogFooter className="gap-2 flex-wrap">
                  <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={openReject} disabled={actioning}>
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                  {detail.stage === "applied" && (
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleShortlist(detail._id)} disabled={actioning}>
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Shortlist
                    </Button>
                  )}
                  {detail.stage === "shortlisted" && (
                    <Button onClick={openSchedule} disabled={actioning}><CalendarClock className="w-4 h-4 mr-1.5" /> Schedule Interview</Button>
                  )}
                  {detail.stage === "interview_scheduled" && (
                    <Button onClick={openFeedback} disabled={actioning}><Star className="w-4 h-4 mr-1.5" /> Record Feedback</Button>
                  )}
                  {detail.stage === "interviewed" && (
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={openSelect} disabled={actioning}>
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Select
                    </Button>
                  )}
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject Application</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Remarks (visible to the student)</Label>
            <Textarea className="min-h-24 resize-none" value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} placeholder="Optional — e.g. thanks for applying, we went with other candidates" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={actioning}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actioning}>{actioning ? "…" : "Confirm Rejection"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select dialog */}
      <Dialog open={selectOpen} onOpenChange={setSelectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Select Applicant</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Remarks (visible to the student)</Label>
            <Textarea className="min-h-24 resize-none" value={selectRemarks} onChange={(e) => setSelectRemarks(e.target.value)} placeholder="Optional — e.g. welcome to the team!" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectOpen(false)} disabled={actioning}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSelectApplicant} disabled={actioning}>{actioning ? "…" : "Confirm Selection"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule interview dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Time *</Label><Input type="time" value={scheduleForm.time} onChange={(e) => setScheduleForm((f) => ({ ...f, time: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Venue</Label><Input placeholder="Room 204, Block A" value={scheduleForm.venue} onChange={(e) => setScheduleForm((f) => ({ ...f, venue: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Meeting Link</Label><Input placeholder="https://meet.google.com/…" value={scheduleForm.meeting_link} onChange={(e) => setScheduleForm((f) => ({ ...f, meeting_link: e.target.value }))} /></div>
            <p className="text-xs text-muted-foreground">Provide a venue or a meeting link (or both).</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={actioning}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={actioning}>{actioning ? "…" : "Schedule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Record Interview Feedback</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Rating (1–5) *</Label>
              <Select value={feedbackForm.rating} onValueChange={(v) => setFeedbackForm((f) => ({ ...f, rating: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (internal only)</Label>
              <Textarea className="min-h-24 resize-none" value={feedbackForm.notes} onChange={(e) => setFeedbackForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFeedbackOpen(false)} disabled={actioning}>Cancel</Button>
            <Button onClick={handleFeedback} disabled={actioning}>{actioning ? "…" : "Save Feedback"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recruitment;
