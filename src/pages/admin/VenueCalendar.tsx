import { useEffect, useMemo, useState } from "react";
import {
  addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth, format,
} from "date-fns";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
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
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";
type Status = "pending" | "approved" | "rejected" | "cancelled";
type BookingType = "event" | "block";

interface Venue { _id: string; name: string; venue_type: string; capacity: number }
interface ClubOpt { _id: string; name: string }
interface EventOpt { _id: string; name: string; date: string }
interface Booking {
  _id: string;
  venue_id: { _id: string; name: string; venue_type: string } | null;
  booking_type: BookingType;
  event_id: { _id: string; name: string; status: string } | null;
  club_id: { _id: string; name: string } | null;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  status: Status;
  admin_remarks: string | null;
  created_by: { userId: string } | null;
  approved_by: { userId: string } | null;
}
interface Conflict { _id: string; title: string; booking_type: BookingType; club_name: string | null; event_name: string | null; start_time: string; end_time: string }

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const HOUR_PX = 48;

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}
function dateKey(d: Date | string) {
  return format(typeof d === "string" ? new Date(d) : d, "yyyy-MM-dd");
}

const statusStyle: Record<Status, string> = {
  pending:   "bg-yellow-100 border-yellow-400 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved:  "bg-green-100 border-green-400 text-green-900 dark:bg-green-900/30 dark:text-green-300",
  rejected:  "bg-red-100 border-red-400 text-red-900 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-muted border-border text-muted-foreground",
};

const VenueCalendar = () => {
  const [viewMode, setViewMode]   = useState<ViewMode>("day");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [venues, setVenues]       = useState<Venue[]>([]);
  const [venueFilter, setVenueFilter] = useState("all");
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);

  const [detail, setDetail] = useState<Booking | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", venue_id: "", date: "", start_time: "", end_time: "" });
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [actioning, setActioning] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [clubs, setClubs] = useState<ClubOpt[]>([]);
  const [clubEvents, setClubEvents] = useState<EventOpt[]>([]);
  const [newForm, setNewForm] = useState({
    booking_type: "block" as BookingType, venue_id: "", club_id: "", event_id: "",
    title: "", date: format(new Date(), "yyyy-MM-dd"), start_time: "", end_time: "", admin_remarks: "",
  });
  const [newConflicts, setNewConflicts] = useState<Conflict[]>([]);
  const [newSaving, setNewSaving] = useState(false);

  // ── Range for the current view ──────────────────────────────
  const range = useMemo(() => {
    if (viewMode === "day")   return { from: anchorDate, to: anchorDate };
    if (viewMode === "week")  return { from: startOfWeek(anchorDate, { weekStartsOn: 1 }), to: endOfWeek(anchorDate, { weekStartsOn: 1 }) };
    const from = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 });
    const to   = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 });
    return { from, to };
  }, [viewMode, anchorDate]);

  const days = useMemo(() => eachDayOfInterval({ start: range.from, end: range.to }), [range]);

  const loadBookings = () => {
    setLoading(true);
    const params = new URLSearchParams({
      date_from: dateKey(range.from),
      date_to:   dateKey(range.to),
    });
    if (venueFilter !== "all") params.set("venue_id", venueFilter);

    apiRequest(`/api/admin/venue-bookings?${params}`)
      .then((data) => { if (Array.isArray(data)) setBookings(data); })
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBookings(); }, [viewMode, anchorDate, venueFilter]);

  useEffect(() => {
    apiRequest("/api/admin/venues?is_active=true")
      .then((data) => { if (Array.isArray(data)) setVenues(data); })
      .catch(() => {});
    apiRequest("/api/admin/clubs")
      .then((data) => { if (Array.isArray(data)) setClubs(data); })
      .catch(() => {});
  }, []);

  // ── Conflict detection across the currently loaded set ─────
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    const approved = bookings.filter((b) => b.status === "approved");
    for (let i = 0; i < approved.length; i++) {
      for (let j = i + 1; j < approved.length; j++) {
        const a = approved[i], b = approved[j];
        if (a.venue_id?._id === b.venue_id?._id && dateKey(a.date) === dateKey(b.date) && overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) {
          ids.add(a._id); ids.add(b._id);
        }
      }
    }
    return ids;
  }, [bookings]);

  const dayVenues = venueFilter === "all" ? venues : venues.filter((v) => v._id === venueFilter);

  const goPrev = () => setAnchorDate((d) => (viewMode === "day" ? addDays(d, -1) : viewMode === "week" ? addWeeks(d, -1) : addMonths(d, -1)));
  const goNext = () => setAnchorDate((d) => (viewMode === "day" ? addDays(d, 1) : viewMode === "week" ? addWeeks(d, 1) : addMonths(d, 1)));
  const goToday = () => setAnchorDate(new Date());

  // ── Detail dialog ────────────────────────────────────────────
  const openDetail = (b: Booking) => {
    setDetail(b);
    setEditing(false);
    setRejectMode(false);
    setRejectRemarks("");
    setEditForm({
      title: b.title, venue_id: b.venue_id?._id ?? "",
      date: dateKey(b.date), start_time: b.start_time, end_time: b.end_time,
    });
  };
  const closeDetail = () => { setDetail(null); setEditing(false); setRejectMode(false); };

  const handleApprove = async () => {
    if (!detail) return;
    setActioning(true);
    try {
      const res = await apiRequest(`/api/admin/venue-bookings/${detail._id}/approve`, "PATCH");
      if (res?.booking) {
        toast.success("Booking approved");
        if (res.conflicts?.length) toast.warning(`Heads up: ${res.conflicts.length} conflicting approved booking(s) at this venue/time.`);
        closeDetail();
        loadBookings();
      } else {
        toast.error(res?.message ?? "Could not approve — it may have already been actioned.");
        closeDetail();
        loadBookings();
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async () => {
    if (!detail || !rejectRemarks.trim()) return;
    setActioning(true);
    try {
      const res = await apiRequest(`/api/admin/venue-bookings/${detail._id}/reject`, "PATCH", { admin_remarks: rejectRemarks.trim() });
      if (res?.booking) {
        toast.success("Booking rejected");
        closeDetail();
        loadBookings();
      } else {
        toast.error(res?.message ?? "Could not reject — it may have already been actioned.");
        closeDetail();
        loadBookings();
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setActioning(false);
    }
  };

  const handleCancel = async () => {
    if (!detail) return;
    setActioning(true);
    try {
      const res = await apiRequest(`/api/admin/venue-bookings/${detail._id}/cancel`, "PATCH");
      if (res?.booking) {
        toast.success("Booking cancelled");
        closeDetail();
        loadBookings();
      } else {
        toast.error(res?.message ?? "Could not cancel this booking.");
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setActioning(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!detail) return;
    setActioning(true);
    try {
      const res = await apiRequest(`/api/admin/venue-bookings/${detail._id}`, "PATCH", editForm);
      if (res?.booking) {
        toast.success("Booking updated");
        if (res.conflicts?.length) toast.warning(`Heads up: ${res.conflicts.length} conflicting approved booking(s) at this venue/time.`);
        closeDetail();
        loadBookings();
      } else {
        toast.error(res?.message ?? "Could not update this booking.");
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setActioning(false);
    }
  };

  // ── New booking dialog ───────────────────────────────────────
  const openNew = (presetDate?: Date, presetVenue?: string) => {
    setNewForm({
      booking_type: "block", venue_id: presetVenue ?? (venueFilter !== "all" ? venueFilter : ""), club_id: "", event_id: "",
      title: "", date: dateKey(presetDate ?? anchorDate), start_time: "", end_time: "", admin_remarks: "",
    });
    setClubEvents([]);
    setNewConflicts([]);
    setNewOpen(true);
  };

  useEffect(() => {
    if (!newOpen) return;
    if (newForm.booking_type !== "event" || !newForm.club_id) { setClubEvents([]); return; }
    apiRequest(`/api/admin/events?club_id=${newForm.club_id}`)
      .then((data) => { if (Array.isArray(data)) setClubEvents(data); })
      .catch(() => {});
  }, [newOpen, newForm.booking_type, newForm.club_id]);

  useEffect(() => {
    if (!newOpen) return;
    if (!newForm.venue_id || !newForm.date || !newForm.start_time || !newForm.end_time) { setNewConflicts([]); return; }
    const params = new URLSearchParams({
      venue_id: newForm.venue_id, date: newForm.date,
      start_time: newForm.start_time, end_time: newForm.end_time,
    });
    apiRequest(`/api/admin/venue-bookings/conflicts?${params}`)
      .then((res) => { if (Array.isArray(res?.conflicts)) setNewConflicts(res.conflicts); })
      .catch(() => {});
  }, [newOpen, newForm.venue_id, newForm.date, newForm.start_time, newForm.end_time]);

  const handleCreateBooking = async () => {
    if (!newForm.venue_id) { toast.error("Select a venue"); return; }
    if (!newForm.title.trim()) { toast.error("Title is required"); return; }
    if (!newForm.date || !newForm.start_time || !newForm.end_time) { toast.error("Date and time range are required"); return; }
    if (newForm.booking_type === "event" && !newForm.event_id) { toast.error("Select the event this booking is for"); return; }

    setNewSaving(true);
    try {
      const res = await apiRequest("/api/admin/venue-bookings", "POST", {
        booking_type: newForm.booking_type,
        venue_id: newForm.venue_id,
        club_id: newForm.club_id || undefined,
        event_id: newForm.booking_type === "event" ? newForm.event_id : undefined,
        title: newForm.title.trim(),
        date: newForm.date,
        start_time: newForm.start_time,
        end_time: newForm.end_time,
        admin_remarks: newForm.admin_remarks.trim() || undefined,
      });
      if (res?.booking) {
        toast.success("Booking created");
        if (res.conflicts?.length) toast.warning(`Heads up: ${res.conflicts.length} conflicting approved booking(s) at this venue/time.`);
        setNewOpen(false);
        loadBookings();
      } else {
        toast.error(res?.message ?? "Could not create booking");
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setNewSaving(false);
    }
  };

  const fmtDate = (d: string | Date) => format(typeof d === "string" ? new Date(d) : d, "d MMM yyyy");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Venue Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm">Bookings across all venues. Conflicts are flagged, never blocked.</p>
        </div>
        <Button className="gap-2 shadow-[var(--shadow-soft)]" onClick={() => openNew()}>
          <Plus className="w-4 h-4" /> New Booking
        </Button>
      </div>

      {/* Controls */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {(["day", "week", "month"] as ViewMode[]).map((m) => (
              <Button key={m} size="sm" variant={viewMode === m ? "default" : "outline"} className="capitalize h-8" onClick={() => setViewMode(m)}>
                {m}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={goPrev}><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={goToday}>Today</Button>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>
            <span className="text-sm font-medium ml-1">
              {viewMode === "day" ? fmtDate(anchorDate) : `${fmtDate(range.from)} – ${fmtDate(range.to)}`}
            </span>
          </div>
          <Select value={venueFilter} onValueChange={setVenueFilter}>
            <SelectTrigger className="h-8 w-56"><SelectValue placeholder="All venues" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {venues.map((v) => <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-100 border border-green-400 inline-block" /> Approved</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-400 inline-block" /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-400 inline-block" /> Rejected</span>
        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Conflict</span>
      </div>

      {loading ? (
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      ) : viewMode === "day" ? (
        <DayGrid
          date={anchorDate}
          venues={dayVenues}
          bookings={bookings}
          conflictIds={conflictIds}
          onSelect={openDetail}
        />
      ) : (
        <div className={cn("grid gap-3", viewMode === "week" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-7")}>
          {days.map((day) => {
            const dayBookings = bookings
              .filter((b) => isSameDay(new Date(b.date), day))
              .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
            const dimmed = viewMode === "month" && !isSameMonth(day, anchorDate);
            return (
              <Card key={day.toISOString()} className={cn("shadow-[var(--shadow-soft)]", dimmed && "opacity-50", isSameDay(day, new Date()) && "border-primary")}>
                <CardContent className="p-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">{format(day, "EEE d MMM")}</p>
                  {dayBookings.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 py-2">No bookings</p>
                  ) : (
                    dayBookings.slice(0, viewMode === "month" ? 3 : undefined).map((b) => (
                      <button
                        key={b._id}
                        onClick={() => openDetail(b)}
                        className={cn("w-full text-left rounded-md border px-2 py-1.5 text-xs", statusStyle[b.status], conflictIds.has(b._id) && "ring-2 ring-destructive")}
                      >
                        <div className="flex items-center gap-1 font-semibold truncate">
                          {conflictIds.has(b._id) && <AlertTriangle className="w-3 h-3 shrink-0" />}
                          {b.title}
                        </div>
                        <div className="truncate opacity-80">{b.venue_id?.name} · {b.start_time}–{b.end_time}</div>
                        {b.club_id && <div className="truncate opacity-70">{b.club_id.name}</div>}
                      </button>
                    ))
                  )}
                  {viewMode === "month" && dayBookings.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{dayBookings.length - 3} more</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="sm:max-w-md">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Booking" : detail.title}</DialogTitle>
              </DialogHeader>

              {!editing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn("text-xs capitalize", statusStyle[detail.status])}>{detail.status}</Badge>
                    <span className="capitalize text-xs bg-muted px-2 py-0.5 rounded-full">{detail.booking_type}</span>
                    {conflictIds.has(detail._id) && (
                      <span className="text-xs text-destructive font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Conflicts with another approved booking</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Venue</p><p className="font-medium">{detail.venue_id?.name ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Club</p><p className="font-medium">{detail.club_id?.name ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{fmtDate(detail.date)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Time</p><p className="font-medium">{detail.start_time}–{detail.end_time}</p></div>
                    {detail.event_id && <div className="col-span-2"><p className="text-xs text-muted-foreground">Event</p><p className="font-medium">{detail.event_id.name}</p></div>}
                  </div>
                  {detail.admin_remarks && (
                    <div className="text-sm bg-muted/40 border rounded px-3 py-2">
                      <span className="font-medium">Remarks:</span> {detail.admin_remarks}
                    </div>
                  )}

                  {rejectMode ? (
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Reason for rejection *</Label>
                      <Textarea className="min-h-20 resize-none" value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} placeholder="Why is this being rejected?" />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setRejectMode(false)} disabled={actioning}>Back</Button>
                        <Button variant="destructive" size="sm" onClick={handleReject} disabled={actioning || !rejectRemarks.trim()}>
                          {actioning ? "Rejecting…" : "Confirm Rejection"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <DialogFooter className="gap-2 flex-wrap">
                      {detail.status === "pending" && (
                        <>
                          <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setRejectMode(true)} disabled={actioning}>Reject</Button>
                          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={actioning}>{actioning ? "…" : "Approve"}</Button>
                        </>
                      )}
                      {["pending", "approved"].includes(detail.status) && (
                        <>
                          <Button variant="outline" onClick={() => setEditing(true)} disabled={actioning}>Edit</Button>
                          <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={handleCancel} disabled={actioning}>Cancel Booking</Button>
                        </>
                      )}
                    </DialogFooter>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Venue</Label>
                    <Select value={editForm.venue_id} onValueChange={(v) => setEditForm((f) => ({ ...f, venue_id: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {venues.map((v) => <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Start</Label>
                      <Input type="time" value={editForm.start_time} onChange={(e) => setEditForm((f) => ({ ...f, start_time: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>End</Label>
                      <Input type="time" value={editForm.end_time} onChange={(e) => setEditForm((f) => ({ ...f, end_time: e.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setEditing(false)} disabled={actioning}>Cancel</Button>
                    <Button onClick={handleSaveEdit} disabled={actioning}>{actioning ? "Saving…" : "Save Changes"}</Button>
                  </DialogFooter>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New booking dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Venue Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={newForm.booking_type} onValueChange={(v) => setNewForm((f) => ({ ...f, booking_type: v as BookingType, event_id: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Standalone Block (e.g. Maintenance)</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="e.g. Maintenance, Convocation, Hackathon" value={newForm.title} onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Club {newForm.booking_type === "event" ? "*" : "(optional — pre-allocate to a club)"}</Label>
              <Select value={newForm.club_id || "none"} onValueChange={(v) => setNewForm((f) => ({ ...f, club_id: v === "none" ? "" : v, event_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="No club" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {clubs.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {newForm.booking_type === "event" && (
              <div className="space-y-2">
                <Label>Event *</Label>
                <Select value={newForm.event_id} onValueChange={(v) => setNewForm((f) => ({ ...f, event_id: v }))} disabled={!newForm.club_id}>
                  <SelectTrigger><SelectValue placeholder={newForm.club_id ? "Select event" : "Select a club first"} /></SelectTrigger>
                  <SelectContent>
                    {clubEvents.map((e) => <SelectItem key={e._id} value={e._id}>{e.name} — {fmtDate(e.date)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Venue *</Label>
              <Select value={newForm.venue_id} onValueChange={(v) => setNewForm((f) => ({ ...f, venue_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
                <SelectContent>
                  {venues.map((v) => <SelectItem key={v._id} value={v._id}>{v.name} (cap. {v.capacity})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={newForm.date} onChange={(e) => setNewForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Start *</Label>
                <Input type="time" value={newForm.start_time} onChange={(e) => setNewForm((f) => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End *</Label>
                <Input type="time" value={newForm.end_time} onChange={(e) => setNewForm((f) => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>

            {newConflicts.length > 0 && (
              <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded px-3 py-2 space-y-1">
                <p className="font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {newConflicts.length} conflicting approved booking(s) — you can still submit:</p>
                {newConflicts.map((c) => (
                  <p key={c._id}>• {c.title} ({c.club_name ?? "no club"}) {c.start_time}–{c.end_time}</p>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea className="min-h-16 resize-none" value={newForm.admin_remarks} onChange={(e) => setNewForm((f) => ({ ...f, admin_remarks: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)} disabled={newSaving}>Cancel</Button>
            <Button onClick={handleCreateBooking} disabled={newSaving}>{newSaving ? "Creating…" : "Create Booking"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Day view: venue columns × hourly timeline ─────────────────
function DayGrid({ date, venues, bookings, conflictIds, onSelect }: {
  date: Date; venues: Venue[]; bookings: Booking[]; conflictIds: Set<string>; onSelect: (b: Booking) => void;
}) {
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
  const gridHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX;
  const dayBookings = bookings.filter((b) => isSameDay(new Date(b.date), date));

  if (venues.length === 0) {
    return (
      <Card className="shadow-[var(--shadow-soft)]"><CardContent className="py-16 text-center text-sm text-muted-foreground">
        <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" /> No active venues to display.
      </CardContent></Card>
    );
  }

  return (
    <Card className="shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="overflow-x-auto">
        <div className="flex" style={{ minWidth: 80 + venues.length * 200 }}>
          {/* Hour gutter */}
          <div className="shrink-0 w-20 border-r">
            <div className="h-10 border-b" />
            <div style={{ height: gridHeight }} className="relative">
              {hours.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 text-[11px] text-muted-foreground px-2 -translate-y-1/2" style={{ top: i * HOUR_PX }}>
                  {h}:00
                </div>
              ))}
            </div>
          </div>
          {/* Venue columns */}
          {venues.map((v) => {
            const colBookings = dayBookings.filter((b) => b.venue_id?._id === v._id);
            return (
              <div key={v._id} className="shrink-0 w-[200px] border-r">
                <div className="h-10 border-b flex items-center px-2">
                  <p className="text-xs font-semibold truncate">{v.name}</p>
                </div>
                <div className="relative" style={{ height: gridHeight }}>
                  {hours.slice(0, -1).map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-dashed border-border/60" style={{ top: i * HOUR_PX }} />
                  ))}
                  {colBookings.map((b) => {
                    const startMin = Math.max(toMinutes(b.start_time), DAY_START_HOUR * 60);
                    const endMin   = Math.min(toMinutes(b.end_time), DAY_END_HOUR * 60);
                    const top    = ((startMin - DAY_START_HOUR * 60) / 60) * HOUR_PX;
                    const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 22);
                    return (
                      <button
                        key={b._id}
                        onClick={() => onSelect(b)}
                        className={cn(
                          "absolute left-1 right-1 rounded-md border px-1.5 py-1 text-left text-[11px] overflow-hidden",
                          statusStyle[b.status],
                          conflictIds.has(b._id) && "ring-2 ring-destructive"
                        )}
                        style={{ top, height }}
                      >
                        <div className="flex items-center gap-1 font-semibold truncate">
                          {conflictIds.has(b._id) && <AlertTriangle className="w-3 h-3 shrink-0" />}
                          {b.title}
                        </div>
                        <div className="truncate opacity-80">{b.start_time}–{b.end_time}</div>
                        {b.club_id && <div className="truncate opacity-70">{b.club_id.name}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default VenueCalendar;
