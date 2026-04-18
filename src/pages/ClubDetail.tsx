import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, ExternalLink } from "lucide-react";
import EventCard from "@/components/EventCard";

const ClubDetail = () => {
  const { id } = useParams();

  // Sample club data - in production this would come from API/database
  const clubData = {
    gfg: {
      name: "GFG Student Chapter",
      institute: "MIT School of Computing",
      description: "GeeksforGeeks student chapter at MIT ADT University is a community of passionate coders and tech enthusiasts. We focus on competitive programming, data structures & algorithms, and helping students prepare for technical interviews at top tech companies.",
      mission: "To create a strong coding culture on campus and help students excel in competitive programming and technical interviews.",
      category: "Tech",
      recruitmentOpen: true,
      memberCount: 245,
      teamMembers: [
        { name: "Rahul Sharma", role: "President", linkedin: "#" },
        { name: "Priya Patel", role: "Vice President", linkedin: "#" },
        { name: "Arjun Mehta", role: "Technical Lead", linkedin: "#" },
        { name: "Sneha Reddy", role: "Event Coordinator", linkedin: "#" }
      ],
      upcomingEvents: [
        {
          id: "2",
          title: "Tech Hackathon 2025",
          club: "GFG Student Chapter",
          date: "March 20-21, 2025",
          venue: "Main Auditorium",
          description: "24-hour coding challenge with exciting problem statements.",
          tags: ["Hackathon", "Coding", "Competition"],
          registeredCount: 156
        }
      ]
    }
  };

  const club = clubData[id as keyof typeof clubData] || clubData.gfg;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-secondary/20 to-accent/5 border-b">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-accent text-accent-foreground">{club.category}</Badge>
              {club.recruitmentOpen && (
                <Badge variant="secondary">Currently Recruiting</Badge>
              )}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {club.name}
            </h1>
            
            <p className="text-lg text-muted-foreground">{club.institute}</p>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              <span className="text-lg font-medium">{club.memberCount} members</span>
            </div>
            
            {club.recruitmentOpen && (
              <Button size="lg" className="bg-accent hover:bg-accent/90 font-semibold shadow-[var(--shadow-strong)]">
                Join This Club
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* About Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-[var(--shadow-soft)]">
              <CardHeader>
                <CardTitle>About Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">{club.description}</p>
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Our Mission</h3>
                  <p className="text-muted-foreground">{club.mission}</p>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Upcoming Events</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {club.upcomingEvents.map((event) => (
                  <EventCard key={event.id} {...event} />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="shadow-[var(--shadow-soft)]">
              <CardHeader>
                <CardTitle>Core Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {club.teamMembers.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-soft)] bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle>Get Involved</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Interested in joining our club? We welcome students from all backgrounds!
                </p>
                {club.recruitmentOpen ? (
                  <Button className="w-full bg-accent hover:bg-accent/90">
                    Apply Now
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full">
                    Recruitment Closed
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubDetail;