import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Wallet, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { apiRequest } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type RequestType = "annual" | "event";
type Status = "pending" | "approved" | "rejected" | "withdrawn";

interface BreakdownItem { item: string; cost: number; _id?: string }
interface BudgetRequest {
  _id: string;
  club_id: { _id: string; name: string; logo_url: string | null } | null;
  requested_by: { _id: string; userId: string; email: string } | null;
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
  actioned_by: { _id: string; userId: string; email: string } | null;
  actioned_at: string | null;
  created_at: string;
}

const statusStyle: Record<Status, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  withdrawn: "bg-muted text-muted-foreground",
};

const AdminBudgetRequests = () => {
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter]     = useState("");

  // Detail dialog (also hosts approve/reject)
  const [detail, setDetail] = useState<BudgetRequest | null>(null);

  // Approve dialog
  const [approveOpen, setApproveOpen]     = useState(false);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveRemarks, setApproveRemarks] = useState("");
  const [approving, setApproving]         = useState(false);

  // Reject dialog
  const [rejectOpen, setRejectOpen]       = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [rejecting, setRejecting]         = useState(false);

  const fetchRequests = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (yearFilter.trim()) params.set("academic_year", yearFilter.trim());

    apiRequest(`/api/admin/budget-requests?${params}`)
      .then((data) => { if (Array.isArray(data)) setRequests(data); })
      .catch(() => toast.error("Failed to load budget requests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  const openDetail = (r: BudgetRequest) => setDetail(r);

  const openApprove = () => {
    if (!detail) return;
    setApproveAmount(String(detail.amount_requested));
    setApproveRemarks("");
    setApproveOpen(true);
  };

  const openReject = () => {
    setRejectRemarks("");
    setRejectOpen(true);
  };

  const handleApprove = async () => {
    if (!detail) return;
    setApproving(true);
    try {
      const res = await apiRequest(`/api/admin/budget-requests/${detail._id}/approve`, "PATCH", {
        amount_approved: approveAmount ? Number(approveAmount) : undefined,
        admin_remarks: approveRemarks.trim() || undefined,
      });
      if (res?.budgetRequest) {
        toast.success("Budget request approved");
        setApproveOpen(false);
        setDetail(null);
        fetchRequests();
      } else {
        toast.error(res?.message ?? "Could not approve this request");
        setApproveOpen(false);
        setDetail(null);
        fetchRequests();
      }
    } catch {
      // "Request not found or already actioned" race, or a network error either way —
      // refresh the list so no dead button is left behind.
      toast.error("Could not approve this request — it may have already been actioned.");
      setApproveOpen(false);
      setDetail(null);
      fetchRequests();
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!detail || !rejectRemarks.trim()) return;
    setRejecting(true);
    try {
      const res = await apiRequest(`/api/admin/budget-requests/${detail._id}/reject`, "PATCH", {
        admin_remarks: rejectRemarks.trim(),
      });
      if (res?.budgetRequest) {
        toast.success("Budget request rejected");
        setRejectOpen(false);
        setDetail(null);
        fetchRequests();
      } else {
        toast.error(res?.message ?? "Could not reject this request");
        setRejectOpen(false);
        setDetail(null);
        fetchRequests();
      }
    } catch {
      toast.error("Could not reject this request — it may have already been actioned.");
      setRejectOpen(false);
      setDetail(null);
      fetchRequests();
    } finally {
      setRejecting(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Budget Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Loading…" : `${requests.length} request${requests.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Academic year, e.g. 2026-27" className="h-10 pl-9" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchRequests} className="h-10">Apply</Button>
            <Button variant="outline" className="h-10" onClick={() => { setStatusFilter("all"); setYearFilter(""); }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((k) => <div key={k} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : requests.length === 0 ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="py-16 text-center">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No budget requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card
              key={r._id}
              className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-shadow cursor-pointer"
              onClick={() => openDetail(r)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm">{r.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="text-primary font-medium">{r.club_id?.name ?? "Unknown club"}</span>
                      <span className="capitalize bg-muted px-2 py-0.5 rounded-full">{r.request_type}</span>
                      <span>AY {r.academic_year}</span>
                      <span>{fmtDate(r.created_at)}</span>
                    </div>
                  </div>
                  <Badge className={`text-xs capitalize shrink-0 ${statusStyle[r.status]}`}>{r.status}</Badge>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Requested:</span> <span className="font-semibold">{formatCurrency(r.amount_requested)}</span>
                  {r.status === "approved" && r.amount_approved != null && (
                    <span className="ml-4"><span className="text-muted-foreground">Approved:</span> <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(r.amount_approved)}</span></span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs capitalize ${statusStyle[detail.status]}`}>{detail.status}</Badge>
                  <span className="capitalize text-xs bg-muted px-2 py-0.5 rounded-full">{detail.request_type}</span>
                  <span className="text-xs text-muted-foreground">AY {detail.academic_year}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Club</p>
                    <p className="font-medium">{detail.club_id?.name ?? "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium">{fmtDate(detail.created_at)}</p>
                  </div>
                  {detail.event_id && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Event</p>
                      <p className="font-medium">{detail.event_id.name} — {fmtDate(detail.event_id.date)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Amount Requested</p>
                    <p className="font-semibold">{formatCurrency(detail.amount_requested)}</p>
                  </div>
                  {detail.amount_approved != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Amount Approved</p>
                      <p className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(detail.amount_approved)}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Purpose</p>
                  <p className="text-sm leading-relaxed">{detail.purpose}</p>
                </div>

                {detail.breakdown.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Itemized Breakdown</p>
                    <div className="border rounded-lg divide-y">
                      {detail.breakdown.map((b, idx) => (
                        <div key={b._id ?? idx} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span>{b.item}</span>
                          <span className="font-medium">{formatCurrency(b.cost)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.admin_remarks && (
                  <div className={`text-sm rounded px-3 py-2 border ${detail.status === "rejected" ? "text-destructive bg-destructive/5 border-destructive/20" : "bg-muted/40"}`}>
                    <span className="font-medium">Admin remarks:</span> {detail.admin_remarks}
                  </div>
                )}

                {detail.actioned_by && detail.actioned_at && (
                  <p className="text-xs text-muted-foreground">
                    Actioned by {detail.actioned_by.userId} on {fmtDate(detail.actioned_at)}
                  </p>
                )}
              </div>

              {detail.status === "pending" && (
                <DialogFooter className="gap-2">
                  <Button variant="outline" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={openReject}>
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={openApprove}>
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Budget Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Approved Amount (₹)</Label>
              <Input type="number" min={0} value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea
                placeholder="Any notes for the club…"
                className="min-h-20 resize-none"
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={approving}>Cancel</Button>
            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={approving}>
              <CheckCircle className="w-4 h-4" />
              {approving ? "Approving…" : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Budget Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reject-remarks">
              Reason for rejection <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-remarks"
              placeholder="e.g. Missing itemization, exceeds club's annual cap…"
              className="min-h-28 resize-none"
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">This will be visible to the club admin.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>Cancel</Button>
            <Button variant="destructive" className="gap-2" onClick={handleReject} disabled={rejecting || !rejectRemarks.trim()}>
              <XCircle className="w-4 h-4" />
              {rejecting ? "Rejecting…" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBudgetRequests;
