import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import { toast } from "sonner";

interface EventCardProps {
  eventId: string;      // ✅ NEW
  title: string;
  club: string;
  date: string;
  venue: string;
  description: string;
  tags: string[];
  registeredCount?: number;
}

const EventCard = ({ eventId, title, club, date, venue, description, tags, registeredCount = 0 }: EventCardProps) => {

  const handleRegister = async () => {
    const user = JSON.parse(localStorage.getItem("cv_user"));

    if (!user) {
      toast.error("Please login to register");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrn: user.prn,
          eventId
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Registered Successfully 🎉");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Server error, please try again later.");
    }
  };

  return (
    <Card className="group hover:shadow-[var(--shadow-strong)] transition-all duration-300">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">{club}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{venue}</span>
          </div>
          {registeredCount > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{registeredCount} registered</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          onClick={handleRegister} 
          className="w-full font-semibold shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-all"
        >
          Register Now
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
