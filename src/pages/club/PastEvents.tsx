import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History, Plus, ImageOff, Calendar, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";

interface PastEvent {
  _id: string;
  name: string;
  date: string;
  venue: string;
  category: string;
  poster_url: string | null;
  past_event_attendees_count: number | null;
  past_event_summary: string | null;
  is_past_event: boolean;
}

const PastEvents = () => {
  const [events, setEvents]   = useState<PastEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/api/club/events")
      .then((data) => {
        if (Array.isArray(data)) setEvents(data.filter((e) => e.is_past_event === true));
      })
      .catch(() => toast.error("Failed to load past events"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-muted-foreground text-sm">Loading past events…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Past Events</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Events that have already taken place — your club's history.
          </p>
        </div>
        <Link to="/club/events/add-past">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Past Event
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="py-16 text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">No past events recorded</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add events that already happened to build your club's history.
            </p>
            <Link to="/club/events/add-past" className="inline-block mt-4">
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Past Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
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
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">
                        {event.category}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                      {event.past_event_attendees_count != null && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {event.past_event_attendees_count} attendees
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{event.venue}</p>
                    {event.past_event_summary && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
                        "{event.past_event_summary}"
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PastEvents;
