import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ClubCard from "@/components/ClubCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { ClubCardProps } from "@/components/ClubCard";

interface Institute { _id: string; name: string; code: string }

const CATEGORIES = ["all", "technical", "cultural", "sports", "social", "arts", "other"];

const ClubSkeleton = () => (
  <div className="rounded-lg border bg-card animate-pulse overflow-hidden">
    <div className="p-4 space-y-3">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-muted rounded w-1/4" />
      <div className="h-12 bg-muted rounded" />
    </div>
    <div className="px-4 pb-4">
      <div className="h-9 bg-muted rounded" />
    </div>
  </div>
);

const Clubs = () => {
  const [clubs, setClubs]           = useState<ClubCardProps[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchQuery, setSearchQuery]         = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedInstitute, setSelectedInstitute] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const [clubsData, instData] = await Promise.all([
          apiRequest("/api/public/clubs"),
          apiRequest("/api/public/institutes"),
        ]);
        if (Array.isArray(clubsData))  setClubs(clubsData);
        if (Array.isArray(instData))   setInstitutes(instData);
      } catch {
        // empty state handles it
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = clubs.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.institute_id?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || c.category === selectedCategory;

    const matchesInstitute =
      selectedInstitute === "all" || c.institute_id?._id === selectedInstitute;

    return matchesSearch && matchesCategory && matchesInstitute;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-accent/5 via-secondary/20 to-primary/5 border-b">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent via-primary to-primary bg-clip-text text-transparent">
              Explore Campus Clubs
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover clubs across all institutes at MIT ADT University
            </p>

            <div className="max-w-2xl mx-auto space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search clubs by name or institute…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base shadow-[var(--shadow-soft)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <Select value={selectedInstitute} onValueChange={setSelectedInstitute}>
                    <SelectTrigger className="h-11 bg-card shadow-[var(--shadow-soft)]">
                      <SelectValue placeholder="All Institutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Institutes</SelectItem>
                      {institutes.map((i) => (
                        <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-11 bg-card shadow-[var(--shadow-soft)]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat === "all" ? "All Categories" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clubs Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">
            All Clubs
            {!loading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filtered.length})
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((k) => <ClubSkeleton key={k} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground font-medium">No clubs found.</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((club) => (
              <ClubCard key={club._id} {...club} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Clubs;
