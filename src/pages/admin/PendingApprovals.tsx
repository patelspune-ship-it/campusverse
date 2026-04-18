import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CheckCircle, XCircle, ImageOff, Calendar, MapPin,
  Users, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";

interface PendingEvent {
  _id: string;
  name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  max_participants: number;
  category: string;
  poster_url: string | null;
  created_at: string;
  club_id: { _id: string; name: string; logo_url: string | null };
}

const PendingApprovals = () => {
  const { refreshPendingCount } = useOutletContext<any>();
  const [events, setEvents]               = useState<PendingEvent[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actioning, setActioning]         = useState<string | null>(null);
  const [expandedDesc, setExpandedDesc]   = useState<Set<string>>(new Set());

  // Reject modal state
  const [rejectTarget, setRejectTarget]   = useState<string | null>(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  useEffect(() => {
    apiRequest("/api/admin/pending-events")
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => toast.error("Failed to load pending events"))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      const res = await apiRequest(`/api/admin/events/${id}/approve`, "PATCH");
      if (res.event) {
        setEvents((prev) => prev.filter((e) => e._id !== id));
        refreshPendingCount();
        toast.success("Event approved and published!");
      } else {
        toast.error(res.message ?? "Failed to approve");
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setActioning(null);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectTarget(id);
    setRejectReason("");
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setRejectLoading(true);
    try {
      const res = await apiRequest(`/api/admin/events/${rejectTarget}/reject`, "PATCH", {
        rejection_reason: rejectReason.trim(),
      });
      if (res.event) {
        setEvents((prev) => prev.filter((e) => e._id !== rejectTarget));
        refreshPendingCount();
        toast.success("Event rejected.");
        setRejectTarget(null);
        setRejectReason("");
      } else {
        toast.error(res.message ?? "Failed to reject");
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setRejectLoading(false);
    }
  };

  const toggleDesc = (id: string) => {
    setExpandedDesc((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-muted-foreground text-sm">Loading pending events…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {events.length === 0
            ? "All caught up — no pending events."
            : `${events.length} event${events.length !== 1 ? "s" : ""} awaiting your review.`}
        </p>
      </div>

      {events.length === 0 ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="py-20 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-60" />
            <p className="font-medium">No pending events</p>
            <p className="text-sm text-muted-foreground mt-1">
              When clubs submit events, they will appear here for review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const isExpanded = expandedDesc.has(event._id);
            const shortDesc  = event.description.slice(0, 120);
            const needsMore  = event.description.length > 120;

            return (
              <Card key={event._id} className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    {/* Poster */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted border">
                      {event.poster_url ? (
                        <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-7 h-7 text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Title + club */}
                      <div>
                        <p className="font-bold text-base leading-tight">{event.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {event.club_id?.logo_url ? (
                            <img src={event.club_id.logo_url} alt="" className="w-4 h-4 rounded object-cover" />
                          ) : null}
                          <p className="text-sm text-primary font-medium">{event.club_id?.name}</p>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                            {event.category}
                          </span>
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(event.date).toLocaleDateString("en-IN", {
                            weekday: "short", day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {event.start_time} – {event.end_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {event.venue}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {event.max_participants} max
                        </span>
                      </div>

                      {/* Description */}
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        {isExpanded ? event.description : shortDesc}
                        {needsMore && !isExpanded && "…"}
                        {needsMore && (
                          <button
                            type="button"
                            onClick={() => toggleDesc(event._id)}
                            className="ml-1.5 text-primary text-xs font-medium inline-flex items-center gap-0.5 hover:underline"
                          >
                            {isExpanded ? (<><ChevronUp className="w-3 h-3" />Less</>) : (<><ChevronDown className="w-3 h-3" />More</>)}
                          </button>
                        )}
                      </div>

                      {/* Submitted date */}
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(event.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    <Button
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                      onClick={() => handleApprove(event._id)}
                      disabled={actioning === event._id}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {actioning === event._id ? "Approving…" : "Approve"}
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => openRejectModal(event._id)}
                      disabled={actioning === event._id}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reject-reason">
              Reason for rejection{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Missing venue details, duplicate event, policy violation…"
              className="min-h-28 resize-none"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be visible to the club admin.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={rejectLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleReject}
              disabled={rejectLoading || !rejectReason.trim()}
            >
              <XCircle className="w-4 h-4" />
              {rejectLoading ? "Rejecting…" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingApprovals;
