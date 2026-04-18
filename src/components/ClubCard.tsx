import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ClubCardProps {
  id: string;
  name: string;
  institute: string;
  description: string;
  category: string;
  recruitmentOpen: boolean;
  memberCount?: number;
}

const ClubCard = ({ id, name, institute, description, category, recruitmentOpen, memberCount = 0 }: ClubCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="group hover:shadow-[var(--shadow-strong)] transition-all duration-300">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground">{institute}</p>
          </div>
          {recruitmentOpen && (
            <Badge className="bg-accent text-accent-foreground">
              Recruiting
            </Badge>
          )}
        </div>
        
        <Badge variant="secondary" className="w-fit">
          {category}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
        
        {memberCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{memberCount} members</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => navigate(`/clubs/${id}`)}
        >
          View Details
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
        {recruitmentOpen && (
          <Button className="flex-1 bg-accent hover:bg-accent/90">
            Join Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ClubCard;