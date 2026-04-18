import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, CheckCircle2, Clock, MapPin, QrCode, ImageOff } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface Stats {
  eventsRegistered: number;
  eventsAttended: number;
  certificatesEarned: number;
  activeRegistrations: number;
}

interface RegisteredEvent {
  _id: string;
  name: string;
  date: string;
  start_time: string;
  venue: string;
  category: string;
  poster_url: string | null;
  club_id: { name: string } | null;
  registration_fee: number;
}

interface AttendedEvent {
  _id: string;
  name: string;
  date: string;
  venue: string;
  category: string;
  poster_url: string | null;
  club_id: { name: string } | null;
  attended_at: string | null;
}

const categoryColor: Record<string, string> = {
  technical: "bg-blue-100 text-blue-700",
  cultural:  "bg-pink-100 text-pink-700",
  sports:    "bg-orange-100 text-orange-700",
  social:    "bg-teal-100 text-teal-700",
  arts:      "bg-purple-100 text-purple-700",
  other:     "bg-muted text-muted-foreground",
};

const Dashboard = () => {
  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem("cv_user") || "null");

  const [stats, setStats]             = useState<Stats | null>(null);
  const [registered, setRegistered]   = useState<RegisteredEvent[]>([]);
  const [attended, setAttended]       = useState<AttendedEvent[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!user || user.role !== "student") {
      navigate("/auth");
      return;
    }
    const load = async () => {
      try {
        const [statsData, regData, attData] = await Promise.all([
          apiRequest("/api/student/stats"),
          apiRequest("/api/student/my-registrations"),
          apiRequest("/api/student/my-attended"),
        ]);
        if (statsData?.eventsRegistered !== undefined) setStats(statsData);
        if (Array.isArray(regData))  setRegistered(regData);
        if (Array.isArray(attData))  setAttended(attData);
      } catch {
        // silent — empty state handles it
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground">Here's your campus activity overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Events Registered</CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? <span className="animate-pulse">—</span> : (stats?.eventsRegistered ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {loading ? "" : `${stats?.activeRegistrations ?? 0} upcoming`}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Events Attended</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? <span className="animate-pulse">—</span> : (stats?.eventsAttended ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Verified attendance</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Certificates Earned</CardTitle>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? <span className="animate-pulse">—</span> : (stats?.certificatesEarned ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Downloadable certificates</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Registrations</CardTitle>
              <Clock className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? <span className="animate-pulse">—</span> : (stats?.activeRegistrations ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upcoming events</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Registered Events */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Events I'm Registered For
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(k => (
                <div key={k} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : registered.length === 0 ? (
            <Card className="shadow-[var(--shadow-soft)]">
              <CardContent className="py-12 text-center space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
                <p className="text-muted-foreground font-medium">No upcoming registrations</p>
                <p className="text-sm text-muted-foreground">Browse events on the home page and register!</p>
                <Button variant="outline" className="mt-2" onClick={() => navigate("/")}>
                  Discover Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {registered.map((event) => (
                <Card key={event._id} className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-all">
                  <CardContent className="p-4 flex gap-4 items-start">
                    {/* Poster thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border">
                      {event.poster_url ? (
                        <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageOff className="w-5 h-5 text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold leading-tight line-clamp-2">{event.name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${categoryColor[event.category] ?? categoryColor.other}`}>
                          {event.category}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.club_id?.name}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(event.date)}{event.start_time ? ` · ${event.start_time}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{event.venue}</span>
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="flex-shrink-0 gap-1.5 text-xs opacity-60"
                      title="QR code feature coming soon"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      QR
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past Attended Events */}
        {!loading && attended.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              Events I Attended
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attended.map((event) => (
                <Card key={event._id} className="shadow-[var(--shadow-soft)] opacity-80 hover:opacity-100 transition-opacity">
                  <CardContent className="p-4 flex gap-4 items-start">
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border">
                      {event.poster_url ? (
                        <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover grayscale" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageOff className="w-5 h-5 text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-semibold leading-tight line-clamp-1">{event.name}</p>
                      <p className="text-sm text-muted-foreground">{event.club_id?.name}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(event.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{event.venue}</span>
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0 gap-1 text-xs">
                      <CheckCircle2 className="w-3 h-3 text-accent" />
                      Attended
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
