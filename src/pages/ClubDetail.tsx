import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import EventCard, { EventCardProps } from "@/components/EventCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, ImageOff, Instagram, Linkedin, Mail, ArrowLeft, Users } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ClubData {
  _id: string;
  name: string;
  description: string | null;
  category: string | null;
  logo_url: string | null;
  banner_url: string | null;
  founded_year: number | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_email: string | null;
  institute_id: { _id: string; name: string; code: string } | null;
  upcomingEvents: RawEvent[];
  pastEvents: PastEvent[];
}

interface RawEvent {
  _id: string;
  name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  category: string;
  poster_url: string | null;
  max_participants: number;
  registrationCount: number;
  registration_fee: number;
}

interface PastEvent {
  _id: string;
  name: string;
  date: string;
  venue: string;
  category: string;
  poster_url: string | null;
  past_event_attendees_count: number;
  past_event_summary: string | null;
}

const categoryColor: Record<string, string> = {
  technical: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cultural:  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  sports:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  social:    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  arts:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  other:     "bg-muted text-muted-foreground",
};

const avatarColor = [
  "from-violet-500 to-purple-600",
  "from-teal-500 to-cyan-600",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-orange-600",
  "from-blue-500 to-indigo-600",
  "from-green-500 to-emerald-600",
];

const ClubDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [club, setClub]               = useState<ClubData | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const data = await apiRequest(`/api/public/clubs/${id}`);
        if (data?._id) {
          setClub(data);
        } else {
          setNotFound(true);
        }

        const user = JSON.parse(localStorage.getItem("cv_user") || "null");
        if (user?.role === "student") {
          const ids = await apiRequest("/api/student/my-event-ids");
          if (Array.isArray(ids)) setRegisteredIds(new Set(ids));
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleRegisterSuccess = (eventId: string) => {
    setRegisteredIds((prev) => new Set([...prev, eventId]));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 space-y-6">
          <div className="h-48 bg-muted animate-pulse rounded-xl" />
          <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          <div className="grid grid-cols-3 gap-6">
            {[1,2,3].map(k => <div key={k} className="h-48 bg-muted animate-pulse rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !club) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center space-y-4">
          <Users className="w-16 h-16 mx-auto text-muted-foreground opacity-30" />
          <h2 className="text-2xl font-bold">Club not found</h2>
          <p className="text-muted-foreground">This club doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/clubs")} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Clubs
          </Button>
        </div>
      </div>
    );
  }

  const colorClass = avatarColor[club.name.charCodeAt(0) % avatarColor.length];

  const toCardProps = (e: RawEvent): EventCardProps => ({
    id:                e._id,
    name:              e.name,
    clubName:          club.name,
    clubLogo:          club.logo_url,
    date:              e.date,
    start_time:        e.start_time,
    venue:             e.venue,
    description:       e.description,
    category:          e.category,
    poster_url:        e.poster_url,
    max_participants:  e.max_participants,
    registrationCount: e.registrationCount,
    registration_fee:  e.registration_fee,
    isRegistered:      registeredIds.has(e._id),
    onRegisterSuccess: handleRegisterSuccess,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Banner */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        {club.banner_url ? (
          <img src={club.banner_url} alt="banner" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${colorClass} opacity-40`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate("/clubs")}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-sm bg-background/80 backdrop-blur rounded-full px-3 py-1.5 hover:bg-background transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Clubs
        </button>

        {/* Club identity overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 flex items-end gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-background shadow-[var(--shadow-strong)] flex-shrink-0">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                <span className="text-white font-bold text-3xl">{club.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight drop-shadow">{club.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{club.institute_id?.name ?? "University-wide"}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-10">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3">
          {club.category && (
            <span className={cn("text-xs font-semibold px-3 py-1 rounded-full capitalize", categoryColor[club.category] ?? categoryColor.other)}>
              {club.category}
            </span>
          )}
          {club.founded_year && (
            <span className="text-xs text-muted-foreground border rounded-full px-3 py-1">
              Est. {club.founded_year}
            </span>
          )}
          {/* Social links */}
          <div className="flex items-center gap-2 ml-auto">
            {club.social_instagram && (
              <a href={club.social_instagram} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {club.social_linkedin && (
              <a href={club.social_linkedin} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {club.social_email && (
              <a href={`mailto:${club.social_email}`}
                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Mail className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* About */}
        {club.description && (
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader><CardTitle>About</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{club.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">
              Upcoming Events
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({club.upcomingEvents.length})
              </span>
            </h2>
          </div>
          {club.upcomingEvents.length === 0 ? (
            <div className="py-10 text-center border rounded-lg">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">No upcoming events from this club.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {club.upcomingEvents.map((e) => (
                <EventCard key={e._id} {...toCardProps(e)} />
              ))}
            </div>
          )}
        </div>

        {/* Past Events */}
        {club.pastEvents.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-muted-foreground" />
              <h2 className="text-xl font-bold text-muted-foreground">
                Past Events
                <span className="ml-2 text-sm font-normal">({club.pastEvents.length})</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {club.pastEvents.map((e) => (
                <Card key={e._id} className="overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                  {e.poster_url ? (
                    <div className="h-32 overflow-hidden">
                      <img src={e.poster_url} alt={e.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-32 bg-muted flex items-center justify-center">
                      <ImageOff className="w-8 h-8 text-muted-foreground opacity-30" />
                    </div>
                  )}
                  <CardContent className="pt-3 pb-4 space-y-2">
                    <p className="font-semibold text-sm leading-tight">{e.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{e.venue}</span>
                    </div>
                    {e.past_event_attendees_count > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{e.past_event_attendees_count} attended</span>
                      </div>
                    )}
                    {e.past_event_summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pt-1">{e.past_event_summary}</p>
                    )}
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

export default ClubDetail;
