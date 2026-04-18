import { useEffect, useState } from "react";
import { Building2, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Club {
  _id: string;
  name: string;
  category: string | null;
  logo_url: string | null;
  profile_completed: boolean;
  eventCount: number;
  institute_id: { _id: string; name: string; code: string } | null;
  admin: { userId: string; email: string } | null;
}

interface Institute { _id: string; name: string; code: string }

const categoryStyle: Record<string, string> = {
  technical: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cultural:  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  sports:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  social:    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  arts:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  other:     "bg-muted text-muted-foreground",
};

const AllClubs = () => {
  const [clubs, setClubs]             = useState<Club[]>([]);
  const [institutes, setInstitutes]   = useState<Institute[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [instFilter, setInstFilter]   = useState("all");
  const [catFilter, setCatFilter]     = useState("all");

  useEffect(() => {
    Promise.all([
      apiRequest("/api/admin/clubs"),
      apiRequest("/api/admin/institutes"),
    ])
      .then(([c, i]) => {
        if (Array.isArray(c)) setClubs(c);
        if (Array.isArray(i)) setInstitutes(i);
      })
      .catch(() => toast.error("Failed to load clubs"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clubs.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchInst   = instFilter === "all" || c.institute_id?._id === instFilter;
    const matchCat    = catFilter  === "all" || c.category === catFilter;
    return matchSearch && matchInst && matchCat;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Clubs</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {loading ? "Loading…" : `${filtered.length} of ${clubs.length} clubs`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clubs…"
            className="h-10 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={instFilter} onValueChange={setInstFilter}>
          <SelectTrigger className="h-10 w-52">
            <SelectValue placeholder="Institute" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Institutes</SelectItem>
            <SelectItem value="null">University-wide</SelectItem>
            {institutes.map((i) => (
              <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-10 w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="cultural">Cultural</SelectItem>
            <SelectItem value="sports">Sports</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="arts">Arts</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-sm">Loading clubs…</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground text-sm">No clubs match these filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((club) => (
            <Card key={club._id} className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-shadow">
              <CardContent className="p-4">
                {/* Logo + name */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted border flex-shrink-0 flex items-center justify-center">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-5 h-5 text-muted-foreground opacity-50" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight line-clamp-2">{club.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {club.institute_id?.name ?? "University-wide"}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {club.category ? (
                    <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize font-medium", categoryStyle[club.category] ?? categoryStyle.other)}>
                      {club.category}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">No category</span>
                  )}
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    club.profile_completed
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  )}>
                    {club.profile_completed ? "Profile complete" : "Incomplete profile"}
                  </span>
                </div>

                {/* Stats */}
                <div className="border-t pt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Events</span>
                    <span className="font-semibold">{club.eventCount}</span>
                  </div>
                  {club.admin && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Admin</span>
                      <span className="font-medium truncate max-w-32 text-right">{club.admin.email ?? club.admin.userId}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllClubs;
