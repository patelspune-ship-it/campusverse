import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trophy, Users, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome back, Student!</h1>
          <p className="text-muted-foreground">Here's your campus activity overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Events Registered
              </CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">8</div>
              <p className="text-xs text-muted-foreground mt-1">3 upcoming</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clubs Joined
              </CardTitle>
              <Users className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">4</div>
              <p className="text-xs text-muted-foreground mt-1">Active member</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Achievements
              </CardTitle>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">12</div>
              <p className="text-xs text-muted-foreground mt-1">Certificates earned</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Participation Score
              </CardTitle>
              <Star className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">850</div>
              <p className="text-xs text-muted-foreground mt-1">Top 15%</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle>Your Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "AI Workshop", club: "Synapse.AI", date: "March 15, 2025", status: "confirmed" },
                { name: "Tech Hackathon", club: "GFG Chapter", date: "March 20, 2025", status: "confirmed" },
                { name: "Cultural Night", club: "Infusion Club", date: "March 28, 2025", status: "pending" }
              ].map((event, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <p className="font-semibold">{event.name}</p>
                    <p className="text-sm text-muted-foreground">{event.club} • {event.date}</p>
                  </div>
                  <Badge variant={event.status === "confirmed" ? "default" : "secondary"}>
                    {event.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle>Your Clubs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Synapse.AI", role: "Member", activity: "Active" },
                { name: "Photography Club", role: "Core Team", activity: "Active" },
                { name: "GFG Student Chapter", role: "Member", activity: "Active" },
                { name: "Music Club", role: "Member", activity: "Moderate" }
              ].map((club, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <p className="font-semibold">{club.name}</p>
                    <p className="text-sm text-muted-foreground">{club.role}</p>
                  </div>
                  <Badge variant="outline">{club.activity}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle>Recommended For You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Data Science Workshop", club: "Analytics Club", reason: "Based on your interests" },
                { title: "Photography Walk", club: "Photo Club", reason: "Your club event" },
                { title: "Coding Competition", club: "GFG Chapter", reason: "Popular in your circle" }
              ].map((rec, idx) => (
                <div key={idx} className="p-4 rounded-lg border space-y-2 hover:shadow-[var(--shadow-soft)] transition-all">
                  <p className="font-semibold">{rec.title}</p>
                  <p className="text-sm text-muted-foreground">{rec.club}</p>
                  <Badge variant="secondary" className="text-xs">
                    {rec.reason}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;