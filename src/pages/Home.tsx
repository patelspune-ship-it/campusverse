import { useState } from "react";
import Header from "@/components/Header";
import EventCard from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstitute, setSelectedInstitute] = useState("all");

  const institutes = [
    "All Institutes",
    "MIT School of Computing",
    "MIT School of Engineering",
    "MIT College of Management",
    "MIT School of Design",
    "MIT College of Arts & Science",
    "MIT Institute of Design"
  ];

  // Sample events data
  const events = [
    {
      id: "1",
      title: "AI & Machine Learning Workshop",
      club: "Synapse.AI",
      institute: "MIT School of Computing",
      date: "March 15, 2025 | 10:00 AM",
      venue: "Innovation Lab, Building A",
      description: "Hands-on workshop covering fundamentals of AI, machine learning algorithms, and practical implementation using Python and TensorFlow.",
      tags: ["AI", "Workshop", "Tech"],
      registeredCount: 87
    },
    {
      id: "2",
      title: "Tech Hackathon 2025",
      club: "GFG Student Chapter",
      institute: "MIT School of Computing",
      date: "March 20-21, 2025",
      venue: "Main Auditorium",
      description: "24-hour coding challenge with exciting problem statements. Build innovative solutions and win prizes worth ₹50,000.",
      tags: ["Hackathon", "Coding", "Competition"],
      registeredCount: 156
    },
    {
      id: "3",
      title: "Photography Exhibition: Campus Life",
      club: "Photography Club",
      institute: "MIT School of Design",
      date: "March 18, 2025 | 3:00 PM",
      venue: "Art Gallery, Student Center",
      description: "Showcase of the best student photography capturing everyday moments and beauty of campus life.",
      tags: ["Photography", "Exhibition", "Cultural"],
      registeredCount: 42
    },
    {
      id: "4",
      title: "Sustainability Summit",
      club: "EV Club",
      institute: "MIT School of Engineering",
      date: "March 25, 2025 | 11:00 AM",
      venue: "Conference Hall",
      description: "Discussion on sustainable practices, electric vehicles, and green energy initiatives on campus.",
      tags: ["Sustainability", "Environment", "Tech"],
      registeredCount: 63
    },
    {
      id: "5",
      title: "Cultural Fusion Night",
      club: "The Infusion Club",
      institute: "MIT College of Management",
      date: "March 28, 2025 | 6:00 PM",
      venue: "Open Air Theatre",
      description: "An evening celebrating diverse cultures through music, dance, and performances from students across the nation.",
      tags: ["Cultural", "Music", "Dance"],
      registeredCount: 234
    },
    {
      id: "6",
      title: "Dhol Tasha Performance",
      club: "Dhol Tasha Pathak",
      institute: "MIT College of Arts & Science",
      date: "March 30, 2025 | 4:00 PM",
      venue: "Sports Ground",
      description: "Traditional Maharashtrian percussion performance showcasing the energetic art of Dhol Tasha.",
      tags: ["Cultural", "Traditional", "Music"],
      registeredCount: 189
    }
  ];

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.club.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesInstitute = selectedInstitute === "all" || event.institute === selectedInstitute;
    
    return matchesSearch && matchesInstitute;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
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
                  placeholder="Search events by name, club, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base shadow-[var(--shadow-soft)]"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <Select value={selectedInstitute} onValueChange={setSelectedInstitute}>
                  <SelectTrigger className="h-11 bg-card shadow-[var(--shadow-soft)]">
                    <SelectValue placeholder="Select Institute" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">All Institutes</SelectItem>
                    {institutes.slice(1).map((institute) => (
                      <SelectItem key={institute} value={institute}>
                        {institute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="container mx-auto px-4 py-12">
        <Tabs defaultValue="all" className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Upcoming Events</h2>
            </div>
            <TabsList>
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="tech">Tech</TabsTrigger>
              <TabsTrigger value="cultural">Cultural</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tech" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents
                .filter(e => e.tags.some(tag => ["AI", "Tech", "Hackathon", "Coding", "Workshop"].includes(tag)))
                .map((event) => (
                  <EventCard key={event.id} {...event} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="cultural" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents
                .filter(e => e.tags.some(tag => ["Cultural", "Music", "Dance", "Traditional"].includes(tag)))
                .map((event) => (
                  <EventCard key={event.id} {...event} />
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default Home;