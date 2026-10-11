import { useEffect, useState } from "react";
import { Plus, Trash2, Wallet, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type RequestType = "annual" | "event";
type Status = "pending" | "approved" | "rejected" | "withdrawn";

interface BreakdownItem { item: string; cost: number; _id?: string }
interface BudgetRequest {
  _id: string;
  title: string;
  request_type: RequestType;
  event_id: { _id: string; name: string; date: string } | null;
  amount_requested: number;
  amount_approved: number | null;
  purpose: string;
  breakdown: BreakdownItem[];
  academic_year: string;
  status: Status;
  admin_remarks: string | null;
  created_at: string;
}

interface ClubEventOption { _id: string; name: string; date: string }

const statusStyle: Record<Status, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  withdrawn: "bg-muted text-muted-foreground",
};

type FormBreakdownRow = { item: string; cost: string };
interface FormState {
  title: string;
  request_type: RequestType;
  event_id: string;
  amount_requested: string;
  purpose: string;
  academic_year: string;
  breakdown: FormBreakdownRow[];
}

const emptyForm: FormState = {
  title: "", request_type: "annual", event_id: "",
  amount_requested: "", purpose: "", academic_year: "",
  breakdown: [],
};

const BudgetRequests = () => {
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [events, setEvents]     = useState<ClubEventOption[]>([]);

  // Create/edit dialog
  const [formOpen, setFormOpen]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [form, setForm]               = useState<FormState>(emptyForm);
  const [saving, setSaving]           = useState(false);

  // Withdraw confirmation
  const [withdrawTarget, setWithdrawTarget] = useState<BudgetRequest | null>(null);
  const [withdrawing, setWithdrawing]       = useState(false);

  const fetchRequests = () => {
    setLoading(true);
    apiRequest("/api/club/budget-requests")
      .then((data) => { if (Array.isArray(data)) setRequests(data); })
      .catch(() => toast.error("Failed to load budget requests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
    apiRequest("/api/club/events")
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {});
  }, []);

  const breakdownTotal = form.breakdown.reduce((sum, b) => sum + (Number(b.cost) || 0), 0);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (r: BudgetRequest) => {
    setEditingId(r._id);
    setForm({
      title: r.title,
      request_type: r.request_type,
      event_id: r.event_id?._id ?? "",
      amount_requested: String(r.amount_requested),
      purpose: r.purpose,
      academic_year: r.academic_year,
      breakdown: r.breakdown.map((b) => ({ item: b.item, cost: String(b.cost) })),
    });
    setFormOpen(true);
  };

  const addBreakdownRow = () => setForm((f) => ({ ...f, breakdown: [...f.breakdown, { item: "", cost: "" }] }));
  const removeBreakdownRow = (idx: number) =>
    setForm((f) => ({ ...f, breakdown: f.breakdown.filter((_, i) => i !== idx) }));
  const updateBreakdownRow = (idx: number, patch: Partial<FormBreakdownRow>) =>
    setForm((f) => ({ ...f, breakdown: f.breakdown.map((b, i) => (i === idx ? { ...b, ...patch } : b)) }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const amount = Number(form.amount_requested);
    if (!amount || amount <= 0) { toast.error("Amount must be greater than 0"); return; }
    if (!form.purpose.trim()) { toast.error("Purpose is required"); return; }
    if (!form.academic_year.trim()) { toast.error("Academic year is required"); return; }
    if (form.request_type === "event" && !form.event_id) { toast.error("Select the event this budget is for"); return; }

    const payload: any = {
      title: form.title.trim(),
      amount_requested: amount,
      purpose: form.purpose.trim(),
      academic_year: form.academic_year.trim(),
      breakdown: form.breakdown
        .filter((b) => b.item.trim() && b.cost)
        .map((b) => ({ item: b.item.trim(), cost: Number(b.cost) })),
    };
    if (!editingId) payload.request_type = form.request_type;
    if (form.request_type === "event") payload.event_id = form.event_id;

    setSaving(true);
    try {
      const res = editingId
        ? await apiRequest(`/api/club/budget-requests/${editingId}`, "PATCH", payload)
        : await apiRequest("/api/club/budget-requests", "POST", payload);

      if (res?.budgetRequest) {
        toast.success(editingId ? "Budget request updated" : "Budget request submitted");
        setFormOpen(false);
        fetchRequests();
      } else {
        toast.error(res?.message ?? "Failed to save budget request");
      }
    } catch {
      toast.error("Server error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawTarget) return;
    setWithdrawing(true);
    try {
      const res = await apiRequest(`/api/club/budget-requests/${withdrawTarget._id}`, "DELETE");
      if (res?.budgetRequest) {
        toast.success("Budget request withdrawn");
        setRequests((prev) => prev.map((r) => (r._id === withdrawTarget._id ? { ...r, status: "withdrawn" } : r)));
      } else {
        toast.error(res?.message ?? "Could not withdraw this request");
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setWithdrawing(false);
      setWithdrawTarget(null);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-muted-foreground text-sm">Loading budget requests…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Budget Requests</h1>
          <p className="text-muted-foreground mt-1 text-sm">Request annual or event budgets from the platform.</p>
        </div>
        <Button className="gap-2 shadow-[var(--shadow-soft)]" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          New Request
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="py-16 text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">No budget requests yet</p>
            <p className="text-sm text-muted-foreground mt-1">Submit your first request to get started.</p>
            <Button size="sm" className="gap-2 mt-4" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r._id} className="shadow-[var(--shadow-soft)]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold">{r.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="capitalize bg-muted px-2 py-0.5 rounded-full">{r.request_type}</span>
                      {r.event_id && <span>for {r.event_id.name}</span>}
                      <span>AY {r.academic_year}</span>
                      <span>Submitted {fmtDate(r.created_at)}</span>
                    </div>
                  </div>
                  <Badge className={`text-xs capitalize shrink-0 ${statusStyle[r.status]}`}>{r.status}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span><span className="text-muted-foreground">Requested:</span> <span className="font-semibold">{formatCurrency(r.amount_requested)}</span></span>
                  {r.status === "approved" && r.amount_approved != null && (
                    <span><span className="text-muted-foreground">Approved:</span> <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(r.amount_approved)}</span></span>
                  )}
                </div>

                {r.status === "rejected" && r.admin_remarks && (
                  <div className="mt-3 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded px-3 py-2">
                    <span className="font-medium">Admin remarks:</span> {r.admin_remarks}
                  </div>
                )}
                {r.status === "approved" && r.admin_remarks && (
                  <div className="mt-3 text-sm text-muted-foreground bg-muted/40 border rounded px-3 py-2">
                    <span className="font-medium text-foreground">Admin remarks:</span> {r.admin_remarks}
                  </div>
                )}

                {r.status === "pending" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => openEdit(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setWithdrawTarget(r)}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Withdraw
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Budget Request" : "New Budget Request"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Annual Budget 2026-27"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Request Type *</Label>
                <Select
                  value={form.request_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, request_type: v as RequestType, event_id: "" }))}
                  disabled={!!editingId}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
                {!!editingId && <p className="text-xs text-muted-foreground">Type can't be changed after submission.</p>}
              </div>
              <div className="space-y-2">
                <Label>Academic Year *</Label>
                <Input
                  placeholder="2026-27"
                  value={form.academic_year}
                  onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
                />
              </div>
            </div>

            {form.request_type === "event" && (
              <div className="space-y-2">
                <Label>Event *</Label>
                <Select value={form.event_id} onValueChange={(v) => setForm((f) => ({ ...f, event_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select one of your events" /></SelectTrigger>
                  <SelectContent>
                    {events.map((e) => (
                      <SelectItem key={e._id} value={e._id}>
                        {e.name} — {fmtDate(e.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {events.length === 0 && (
                  <p className="text-xs text-muted-foreground">You don't have any events yet — create one first.</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Amount Requested (₹) *</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={form.amount_requested}
                onChange={(e) => setForm((f) => ({ ...f, amount_requested: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Purpose *</Label>
              <Textarea
                placeholder="What is this budget for?"
                className="min-h-20 resize-none"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              />
            </div>

            {/* Itemized breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itemized Breakdown (optional)</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addBreakdownRow}>
                  <Plus className="w-3 h-3" /> Add item
                </Button>
              </div>
              {form.breakdown.length > 0 && (
                <div className="space-y-2">
                  {form.breakdown.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Item"
                        className="flex-1"
                        value={row.item}
                        onChange={(e) => updateBreakdownRow(idx, { item: e.target.value })}
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Cost"
                        className="w-28"
                        value={row.cost}
                        onChange={(e) => updateBreakdownRow(idx, { cost: e.target.value })}
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeBreakdownRow(idx)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Breakdown total</span>
                    <span className={breakdownTotal === Number(form.amount_requested) ? "font-semibold" : "font-semibold text-yellow-700 dark:text-yellow-400"}>
                      {formatCurrency(breakdownTotal)}
                      {form.amount_requested && breakdownTotal !== Number(form.amount_requested) && " (doesn't match amount requested)"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editingId ? "Save Changes" : "Submit Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw confirmation */}
      <AlertDialog open={!!withdrawTarget} onOpenChange={(o) => !o && setWithdrawTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw "{withdrawTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This request will be marked as withdrawn and removed from the admin review queue. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw} disabled={withdrawing} className="bg-destructive hover:bg-destructive/90">
              {withdrawing ? "Withdrawing…" : "Withdraw"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BudgetRequests;
