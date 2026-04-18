import { useEffect, useState } from "react";
import Header from "@/components/Header";
import EventCard, { EventCardProps } from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Search, Building2, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api";

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
  club_id: { _id: string; name: string; logo_url: string | null } | null;
}

interface Institute { _id: string; name: string; code: string }

// Simple skeleton
const EventSkeleton = () => (
  <div className="rounded-lg border bg-card animate-pulse overflow-hidden">
    <div className="h-40 bg-muted" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-2/3" />
    </div>
    <div className="px-4 pb-4">
      <div className="h-9 bg-muted rounded" />
    </div>
  </div>
);

const Home = () => {
  const [events, setEvents]             = useState<RawEvent[]>([]);
  const [institutes, setInstitutes]     = useState<Institute[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState("");
  const [selectedInstitute, setSelectedInstitute] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsData, institutesData] = await Promise.all([
          apiRequest("/api/public/events/upcoming"),
          apiRequest("/api/public/institutes"),
        ]);
        if (Array.isArray(eventsData))    setEvents(eventsData);
        if (Array.isArray(institutesData)) setInstitutes(institutesData);

        // Fetch registered event IDs if logged in as student
        const user = JSON.parse(localStorage.getItem("cv_user") || "null");
        if (user?.role === "student") {
          const ids = await apiRequest("/api/student/my-event-ids");
          if (Array.isArray(ids)) setRegisteredIds(new Set(ids));
        }
      } catch {
        // silently fail — empty state handles it
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRegisterSuccess = (eventId: string) => {
    setRegisteredIds((prev) => new Set([...prev, eventId]));
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      !searchQuery ||
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.club_id?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesInstitute =
      selectedInstitute === "all" ||
      event.club_id?._id === selectedInstitute;

    return matchesSearch && matchesInstitute;
  });

  const techEvents     = filteredEvents.filter((e) => e.category === "technical");
  const culturalEvents = filteredEvents.filter((e) => e.category === "cultural");
  const sportsEvents   = filteredEvents.filter((e) => e.category === "sports");

  const toCardProps = (e: RawEvent): EventCardProps => ({
    id:                e._id,
    name:              e.name,
    clubName:          e.club_id?.name ?? "Unknown Club",
    clubLogo:          e.club_id?.logo_url,
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

  const EventGrid = ({ list }: { list: RawEvent[] }) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((k) => <EventSkeleton key={k} />)}
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="col-span-full py-16 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground font-medium">No upcoming events found.</p>
          <p className="text-sm text-muted-foreground mt-1">Check back later or try a different filter.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((e) => <EventCard key={e._id} {...toCardProps(e)} />)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/5 via-secondary/20 to-accent/5 border-b">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Discover Campus Events
            </h1>
            <p className="text-lg text-muted-foreground">
              Your central hub for all events, clubs, and activities at MIT ADT University
            </p>

            <div className="max-w-2xl mx-auto space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search events by name, club, or category…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base shadow-[var(--shadow-soft)]"
                />
              </div>

              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <Select value={selectedInstitute} onValueChange={setSelectedInstitute}>
                  <SelectTrigger className="h-11 bg-card shadow-[var(--shadow-soft)]">
                    <SelectValue placeholder="Select Institute" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Institutes</SelectItem>
                    {institutes.map((i) => (
                      <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="container mx-auto px-4 py-12">
        <Tabs defaultValue="all" className="space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">
                Upcoming Events
                {!loading && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredEvents.length})
                  </span>
                )}
              </h2>
            </div>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="tech">Technical</TabsTrigger>
              <TabsTrigger value="cultural">Cultural</TabsTrigger>
              <TabsTrigger value="sports">Sports</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            <EventGrid list={filteredEvents} />
          </TabsContent>
          <TabsContent value="tech">
            <EventGrid list={techEvents} />
          </TabsContent>
          <TabsContent value="cultural">
            <EventGrid list={culturalEvents} />
          </TabsContent>
          <TabsContent value="sports">
            <EventGrid list={sportsEvents} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default Home;
