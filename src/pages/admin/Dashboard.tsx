import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Users, Building2, University, Calendar, Clock, TrendingUp,
  CheckCircle, XCircle, ImageOff, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Stats {
  students: number; clubs: number; institutes: number;
  events: number; pendingEvents: number; upcomingEvents: number;
}

interface PendingEvent {
  _id: string; name: string; date: string; poster_url: string | null;
  status: string; created_at: string;
  club_id: { _id: string; name: string; logo_url: string | null };
}

interface ClubPreview {
  _id: string; name: string; logo_url: string | null;
  category: string | null; eventCount: number; profile_completed: boolean;
}

const AdminDashboard = () => {
  const { refreshPendingCount } = useOutletContext<any>();
  const [stats, setStats]               = useState<Stats | null>(null);
  const [pending, setPending]           = useState<PendingEvent[]>([]);
  const [clubs, setClubs]               = useState<ClubPreview[]>([]);
  const [actioning, setActioning]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest("/api/admin/stats"),
      apiRequest("/api/admin/pending-events"),
      apiRequest("/api/admin/clubs"),
    ]).then(([s, p, c]) => {
      if (s.students !== undefined) setStats(s);
      if (Array.isArray(p)) setPending(p.slice(0, 5));
      if (Array.isArray(c)) setClubs(c);
    }).catch(() => toast.error("Failed to load dashboard data"));
  }, []);

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      const res = await apiRequest(`/api/admin/events/${id}/approve`, "PATCH");
      if (res.event) {
        setPending((prev) => prev.filter((e) => e._id !== id));
        setStats((prev) => prev ? { ...prev, pendingEvents: prev.pendingEvents - 1, upcomingEvents: prev.upcomingEvents + 1 } : prev);
        refreshPendingCount();
        toast.success("Event approved!");
      }
    } catch { toast.error("Server error"); }
    finally { setActioning(null); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason?.trim()) return;
    setActioning(id);
    try {
      const res = await apiRequest(`/api/admin/events/${id}/reject`, "PATCH", { rejection_reason: reason.trim() });
      if (res.event) {
        setPending((prev) => prev.filter((e) => e._id !== id));
        setStats((prev) => prev ? { ...prev, pendingEvents: prev.pendingEvents - 1 } : prev);
        refreshPendingCount();
        toast.success("Event rejected.");
      }
    } catch { toast.error("Server error"); }
    finally { setActioning(null); }
  };

  const categoryColor: Record<string, string> = {
    technical: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    cultural:  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    sports:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    social:    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    arts:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    other:     "bg-muted text-muted-foreground",
  };

  const metrics = [
    { label: "Total Students",      value: stats?.students      ?? "—", icon: Users,       sub: "registered on platform",      highlight: false },
    { label: "Total Clubs",         value: stats?.clubs         ?? "—", icon: Building2,   sub: "across all institutes",        highlight: false },
    { label: "Total Institutes",    value: stats?.institutes    ?? "—", icon: University,  sub: "linked institutes",            highlight: false },
    { label: "Total Events",        value: stats?.events        ?? "—", icon: Calendar,    sub: "created on platform",          highlight: false },
    { label: "Pending Approvals",   value: stats?.pendingEvents ?? "—", icon: Clock,       sub: "awaiting review",              highlight: (stats?.pendingEvents ?? 0) > 0 },
    { label: "Upcoming Events",     value: stats?.upcomingEvents ?? "—", icon: TrendingUp, sub: "approved & scheduled",         highlight: false },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Live stats across all 18 institutes and 40 clubs.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map(({ label, value, icon: Icon, sub, highlight }) => (
          <Card
            key={label}
            className={cn(
              "shadow-[var(--shadow-soft)]",
              highlight && "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={cn("w-4 h-4", highlight ? "text-yellow-500" : "text-primary")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", highlight && "text-yellow-700 dark:text-yellow-400")}>
                {value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Pending Events */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Pending Events</h2>
            <Link to="/admin/approvals">
              <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {pending.length === 0 ? (
            <Card className="shadow-[var(--shadow-soft)]">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No pending events — you're all caught up!
              </CardContent>
            </Card>
          ) : (
            pending.map((event) => (
              <Card key={event._id} className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-4">
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted border">
                      {event.poster_url ? (
                        <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-5 h-5 text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{event.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by <span className="font-medium">{event.club_id?.name}</span>
                        {" · "}
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                        onClick={() => handleApprove(event._id)}
                        disabled={actioning === event._id}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 gap-1"
                        onClick={() => handleReject(event._id)}
                        disabled={actioning === event._id}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick links */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Quick Links</h2>
          {[
            { label: "Pending Approvals", to: "/admin/approvals", icon: Clock,      count: stats?.pendingEvents },
            { label: "All Events",        to: "/admin/events",    icon: Calendar,   count: stats?.events        },
            { label: "All Clubs",         to: "/admin/clubs",     icon: Building2,  count: stats?.clubs         },
            { label: "All Students",      to: "/admin/students",  icon: Users,      count: stats?.students      },
            { label: "Institutes",        to: "/admin/institutes",icon: University, count: stats?.institutes    },
          ].map(({ label, to, icon: Icon, count }) => (
            <Link key={to} to={to}>
              <Card className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {count !== undefined && (
                      <span className="text-sm font-bold text-muted-foreground">{count}</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Clubs Overview Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Clubs Overview</h2>
          <Link to="/admin/clubs">
            <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {clubs.slice(0, 20).map((club) => (
            <Link key={club._id} to={`/admin/clubs`}>
              <Card className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted border flex-shrink-0 flex items-center justify-center">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-5 h-5 text-muted-foreground opacity-50" />
                    )}
                  </div>
                  <p className="text-xs font-semibold leading-tight line-clamp-2">{club.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {club.category && (
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full capitalize", categoryColor[club.category] ?? categoryColor.other)}>
                        {club.category}
                      </span>
                    )}
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {club.eventCount} events
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {clubs.length > 20 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing 20 of {clubs.length} clubs.{" "}
            <Link to="/admin/clubs" className="text-primary underline">View all</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
