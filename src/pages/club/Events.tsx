import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Plus, ImageOff, XCircle, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";

interface Event {
  _id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status: string;
  category: string;
  poster_url: string | null;
  max_participants: number;
  is_past_event: boolean;
}

const statusStyle: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const ClubEvents = () => {
  const [events, setEvents]       = useState<Event[]>([]);
  const [loading, setLoading]     = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    apiRequest("/api/club/events")
      .then((data) => {
        if (Array.isArray(data)) setEvents(data.filter((e) => !e.is_past_event));
      })
      .catch(() => toast.error("Failed to load events"))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this event? This cannot be undone.")) return;
    setCancelling(id);
    try {
      const res = await apiRequest(`/api/club/events/${id}/cancel`, "PATCH");
      if (res.event) {
        setEvents((prev) =>
          prev.map((e) => (e._id === id ? { ...e, status: "cancelled" } : e))
        );
        toast.success("Event cancelled.");
      } else {
        toast.error(res.message ?? "Could not cancel event");
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setCancelling(null);
    }
  };

  const active   = events.filter((e) => !["completed", "cancelled"].includes(e.status));
  const inactive = events.filter((e) =>  ["completed", "cancelled"].includes(e.status));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-muted-foreground text-sm">Loading events…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your upcoming and active events.</p>
        </div>
        <Link to="/club/events/create">
          <Button className="gap-2 shadow-[var(--shadow-soft)]">
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">No events yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first event to get started.</p>
            <Link to="/club/events/create" className="inline-block mt-4">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {[
            { title: "Active Events",     list: active },
            { title: "Completed / Cancelled", list: inactive },
          ].map(
            ({ title, list }) =>
              list.length > 0 && (
                <section key={title}>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    {title}
                  </h2>
                  <div className="space-y-3">
                    {list.map((event) => (
                      <Card key={event._id} className="shadow-[var(--shadow-soft)]">
                        <CardContent className="p-4">
                          <div className="flex gap-4 items-start">
                            {/* Poster thumbnail */}
                            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted border">
                              {event.poster_url ? (
                                <img
                                  src={event.poster_url}
                                  alt={event.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageOff className="w-6 h-6 text-muted-foreground opacity-50" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <p className="font-semibold truncate">{event.name}</p>
                                <span
                                  className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                                    statusStyle[event.status] ?? ""
                                  }`}
                                >
                                  {event.status}
                                </span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(event.date).toLocaleDateString("en-IN", {
                                    day: "numeric", month: "short", year: "numeric",
                                  })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {event.start_time} – {event.end_time}
                                </span>
                                <span className="capitalize bg-muted px-2 py-0.5 rounded-full">
                                  {event.category}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{event.venue}</p>
                            </div>
                          </div>

                          {/* Actions */}
                          {!["cancelled"].includes(event.status) && (
                            <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
                              {event.status === "approved" && (
                                <Link to={`/club/events/${event._id}`}>
                                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                                    <Users className="w-3.5 h-3.5" />
                                    View Attendees
                                  </Button>
                                </Link>
                              )}
                              {!["completed", "cancelled"].includes(event.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleCancel(event._id)}
                                  disabled={cancelling === event._id}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  {cancelling === event._id ? "Cancelling…" : "Cancel Event"}
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )
          )}
        </div>
      )}
    </div>
  );
};

export default ClubEvents;
