import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Calendar, ImageOff, XCircle, Search, Filter, Award } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Event {
  _id: string;
  name: string;
  date: string;
  status: string;
  category: string;
  poster_url: string | null;
  max_participants: number;
  registrationCount: number;
  is_past_event: boolean;
  club_id: { _id: string; name: string; logo_url: string | null } | null;
}

interface Club { _id: string; name: string }

const statusStyle: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const AllEvents = () => {
  const { refreshPendingCount } = useOutletContext<any>();
  const [events, setEvents]     = useState<Event[]>([]);
  const [clubs, setClubs]       = useState<Club[]>([]);
  const [loading, setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter]   = useState("all");
  const [clubFilter, setClubFilter]       = useState("all");
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");
  const [search, setSearch]               = useState("");

  const fetchEvents = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.append("status", statusFilter);
    if (clubFilter   !== "all") params.append("club_id", clubFilter);
    if (dateFrom)               params.append("date_from", dateFrom);
    if (dateTo)                 params.append("date_to",   dateTo);

    apiRequest(`/api/admin/events?${params}`)
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => toast.error("Failed to load events"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiRequest("/api/admin/clubs")
      .then((data) => { if (Array.isArray(data)) setClubs(data); })
      .catch(() => {});
    fetchEvents();
  }, []);

  const [generatingCert, setGeneratingCert] = useState<string | null>(null);

  const handleGenerateCerts = async (id: string) => {
    setGeneratingCert(id);
    try {
      const res = await apiRequest(`/api/admin/events/${id}/generate-certificates`, "POST");
      toast.success(res.message ?? "Certificates generated");
    } catch { toast.error("Certificate generation failed"); }
    finally { setGeneratingCert(null); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this event? This cannot be undone.")) return;
    setCancelling(id);
    try {
      const res = await apiRequest(`/api/club/events/${id}/cancel`, "PATCH");
      if (res.event) {
        setEvents((prev) => prev.map((e) => e._id === id ? { ...e, status: "cancelled" } : e));
        refreshPendingCount();
        toast.success("Event cancelled.");
      } else {
        toast.error(res.message ?? "Could not cancel");
      }
    } catch { toast.error("Server error."); }
    finally { setCancelling(null); }
  };

  const filtered = events.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.club_id?.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Events</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {loading ? "Loading…" : `${filtered.length} event${filtered.length !== 1 ? "s" : ""} found`}
        </p>
      </div>

      {/* Filter bar */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Club */}
            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Club" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {clubs.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date from */}
            <Input
              type="date"
              className="h-10"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />

            {/* Date to */}
            <Input
              type="date"
              className="h-10"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or club…"
                className="h-10 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={fetchEvents} className="h-10">Apply Filters</Button>
            <Button
              variant="outline"
              className="h-10"
              onClick={() => {
                setStatusFilter("all"); setClubFilter("all");
                setDateFrom(""); setDateTo(""); setSearch("");
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground text-sm">
              Loading events…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground text-sm">No events match these filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Poster</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Regs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell>
                        <div className="w-10 h-10 rounded overflow-hidden bg-muted border flex-shrink-0">
                          {event.poster_url ? (
                            <img src={event.poster_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="w-4 h-4 text-muted-foreground opacity-40" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm leading-tight">{event.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{event.category}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{event.club_id?.name ?? "—"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm whitespace-nowrap">
                          {new Date(event.date).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs font-medium px-2.5 py-1 rounded-full capitalize",
                          statusStyle[event.status] ?? ""
                        )}>
                          {event.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {event.registrationCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Generate Certificates — for past approved events */}
                          {event.status === "approved" && new Date(event.date) < new Date() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                              onClick={() => handleGenerateCerts(event._id)}
                              disabled={generatingCert === event._id}
                              title="Generate certificates for full-attendance students"
                            >
                              <Award className="w-3.5 h-3.5 mr-1" />
                              {generatingCert === event._id ? "…" : "Certs"}
                            </Button>
                          )}
                          {!["completed", "cancelled", "rejected"].includes(event.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => handleCancel(event._id)}
                              disabled={cancelling === event._id}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              {cancelling === event._id ? "…" : "Cancel"}
                            </Button>
                          )}
                        </div>
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

export default AllEvents;
