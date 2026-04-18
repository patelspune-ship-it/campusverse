import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Building2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface ClubCardProps {
  _id: string;
  name: string;
  category: string | null;
  logo_url: string | null;
  description: string | null;
  institute_id: { _id?: string; name: string; code: string } | null;
  eventCount?: number;
  profile_completed?: boolean;
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

const ClubCard = ({ _id, name, category, logo_url, description, institute_id, eventCount = 0 }: ClubCardProps) => {
  const navigate = useNavigate();
  const colorClass = avatarColor[name.charCodeAt(0) % avatarColor.length];

  return (
    <Card className="group hover:shadow-[var(--shadow-strong)] transition-all duration-300 flex flex-col">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start gap-3">
          {/* Logo or initial avatar */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border shadow-sm">
            {logo_url ? (
              <img src={logo_url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                <span className="text-white font-bold text-lg">{name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {institute_id?.name ?? "University-wide"}
            </p>
          </div>
        </div>

        {category && (
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full w-fit capitalize", categoryColor[category] ?? categoryColor.other)}>
            {category}
          </span>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-3 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {description || "No description available yet."}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{eventCount} event{eventCount !== 1 ? "s" : ""}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          variant="outline"
          className="w-full gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={() => navigate(`/clubs/${_id}`)}
        >
          View Details
          <ExternalLink className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClubCard;
