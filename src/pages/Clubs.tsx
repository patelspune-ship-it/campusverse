import { useState } from "react";
import Header from "@/components/Header";
import ClubCard from "@/components/ClubCard";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Clubs = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const clubs = [
    {
      id: "gfg",
      name: "GFG Student Chapter",
      institute: "MIT School of Computing",
      description: "GeeksforGeeks student chapter focusing on competitive programming, DSA, and interview preparation. Regular coding contests and workshops.",
      category: "Tech",
      recruitmentOpen: true,
      memberCount: 245
    },
    {
      id: "synapse",
      name: "Synapse.AI",
      institute: "MIT School of Computing",
      description: "Artificial Intelligence and Machine Learning club. Explore cutting-edge AI technologies, build ML models, and participate in AI competitions.",
      category: "Tech",
      recruitmentOpen: true,
      memberCount: 189
    },
    {
      id: "infusion",
      name: "The Infusion Club",
      institute: "MIT College of Management",
      description: "Cultural club celebrating diversity through music, dance, drama, and various cultural events throughout the year.",
      category: "Cultural",
      recruitmentOpen: false,
      memberCount: 312
    },
    {
      id: "photography",
      name: "Photography Club",
      institute: "MIT School of Design",
      description: "For photography enthusiasts to learn, practice, and showcase their work. Regular photo walks and exhibitions.",
      category: "Arts",
      recruitmentOpen: true,
      memberCount: 156
    },
    {
      id: "ev",
      name: "EV Club",
      institute: "MIT School of Engineering",
      description: "Focused on electric vehicles, sustainable transportation, and green energy solutions. Build and race electric vehicles.",
      category: "Tech",
      recruitmentOpen: true,
      memberCount: 98
    },
    {
      id: "music",
      name: "Music Club",
      institute: "Student Center",
      description: "For all music lovers - from classical to contemporary. Jam sessions, concerts, and music production workshops.",
      category: "Cultural",
      recruitmentOpen: false,
      memberCount: 203
    },
    {
      id: "dhol",
      name: "Dhol Tasha Pathak",
      institute: "Student Center",
      description: "Traditional Maharashtrian percussion group performing at university events and festivals. No prior experience needed.",
      category: "Cultural",
      recruitmentOpen: true,
      memberCount: 67
    }
  ];

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.institute.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-accent/5 via-secondary/20 to-primary/5 border-b">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent via-primary to-primary bg-clip-text text-transparent">
              Explore Campus Clubs
            </h1>
            <p className="text-lg text-muted-foreground">
              Join clubs, connect with like-minded students, and enhance your college experience
            </p>
            
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search clubs by name, institute, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base shadow-[var(--shadow-soft)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Clubs Section */}
      <section className="container mx-auto px-4 py-12">
        <Tabs defaultValue="all" className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">All Clubs</h2>
            </div>
            <TabsList>
              <TabsTrigger value="all">All Clubs</TabsTrigger>
              <TabsTrigger value="tech">Tech</TabsTrigger>
              <TabsTrigger value="cultural">Cultural</TabsTrigger>
              <TabsTrigger value="recruiting">Recruiting</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.map((club) => (
                <ClubCard key={club.id} {...club} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tech" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.filter(c => c.category === "Tech").map((club) => (
                <ClubCard key={club.id} {...club} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cultural" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.filter(c => c.category === "Cultural").map((club) => (
                <ClubCard key={club.id} {...club} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recruiting" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.filter(c => c.recruitmentOpen).map((club) => (
                <ClubCard key={club.id} {...club} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default Clubs;