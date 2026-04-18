import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Calendar, Users, Award, TrendingUp, Plus, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";

interface Event {
  _id: string;
  name: string;
  date: string;
  status: string;
}

const ClubDashboard = () => {
  const { me } = useOutletContext<any>();
  const [events, setEvents] = useState<Event[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem("cv_profile_banner_dismissed") === "true"
  );

  useEffect(() => {
    apiRequest("/api/club/events")
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {});
  }, []);

  const total      = events.length;
  const upcoming   = events.filter((e) => e.status === "approved" && new Date(e.date) > new Date()).length;
  const cancelled  = events.filter((e) => e.status === "cancelled").length;
  const completed  = events.filter((e) => e.status === "completed").length;

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem("cv_profile_banner_dismissed", "true");
  };

  const metrics = [
    { label: "Total Events",        value: total,     icon: Calendar,   sub: "created on platform"     },
    { label: "Upcoming Events",      value: upcoming,  icon: TrendingUp, sub: "approved & scheduled"    },
    { label: "Total Registrations",  value: 0,         icon: Users,      sub: "across all events"       },
    { label: "Certificates Issued",  value: 0,         icon: Award,      sub: "sent to participants"    },
  ];

  const recentEvents = events.slice(0, 5);

  const statusStyle: Record<string, string> = {
    pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved:  "bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400",
    rejected:  "bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400",
    completed: "bg-secondary  text-secondary-foreground",
    cancelled: "bg-muted      text-muted-foreground",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back,{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {me?.club?.name ?? "Club Admin"}
          </span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Here's an overview of your club's activity.
        </p>
      </div>

      {/* Profile completion banner */}
      {!bannerDismissed && me?.club && !me.club.profile_completed && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium">
            Complete your club profile to make your club more discoverable.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/club/profile">
              <Button size="sm" className="shadow-[var(--shadow-soft)] h-8 text-xs">
                Complete Now →
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={dismissBanner}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, sub }) => (
          <Card key={label} className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <Card className="lg:col-span-2 shadow-[var(--shadow-soft)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Events</CardTitle>
            <Link to="/club/events">
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No events yet</p>
                <p className="text-xs mt-1">Create your first event to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div
                    key={event._id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{event.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusStyle[event.status] ?? ""}`}>
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/club/events/create" className="block">
              <Button className="w-full justify-start gap-2 shadow-[var(--shadow-soft)]">
                <Plus className="w-4 h-4" />
                Create New Event
              </Button>
            </Link>
            <Link to="/club/events/add-past" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <History className="w-4 h-4" />
                Add Past Event
              </Button>
            </Link>
            <Link to="/club/profile" className="block">
              <Button variant="secondary" className="w-full justify-start gap-2">
                <Users className="w-4 h-4" />
                Edit Club Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClubDashboard;
