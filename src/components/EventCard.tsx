import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Users, ImageOff, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

export interface EventCardProps {
  id: string;
  name: string;
  clubName: string;
  clubLogo?: string | null;
  date: string;             // ISO string
  start_time?: string;
  venue: string;
  description: string;
  category: string;
  poster_url?: string | null;
  max_participants: number;
  registrationCount: number;
  registration_fee: number;
  isRegistered?: boolean;
  onRegisterSuccess?: (eventId: string) => void;
}

const categoryColor: Record<string, string> = {
  technical: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cultural:  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  sports:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  social:    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  arts:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  other:     "bg-muted text-muted-foreground",
};

const EventCard = ({
  id, name, clubName, clubLogo, date, start_time, venue,
  description, category, poster_url, max_participants,
  registrationCount, registration_fee,
  isRegistered = false, onRegisterSuccess,
}: EventCardProps) => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [agreed, setAgreed]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [registered, setRegistered] = useState(isRegistered);

  const isPast  = new Date(date) < new Date();
  const isFull  = registrationCount >= max_participants;

  const handleRegisterClick = () => {
    const user = JSON.parse(localStorage.getItem("cv_user") || "null");
    if (!user) {
      toast.error("Please sign in to register for events");
      navigate("/auth");
      return;
    }
    if (user.role !== "student") {
      toast.error("Only students can register for events");
      return;
    }
    setDialogOpen(true);
    setAgreed(false);
  };

  const handleConfirm = async () => {
    if (!agreed) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/api/events/${id}/register`, "POST");
      if (res.registration || res.message === "Registered successfully!") {
        setRegistered(true);
        toast.success("Registered! Check your dashboard for details.");
        setDialogOpen(false);
        onRegisterSuccess?.(id);
      } else {
        toast.error(res.message ?? "Registration failed");
      }
    } catch {
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  let buttonContent: React.ReactNode;
  let buttonDisabled = false;
  let buttonClass    = "";

  if (registered) {
    buttonContent  = "✓ Registered";
    buttonDisabled = true;
    buttonClass    = "bg-green-600 hover:bg-green-600 text-white cursor-default";
  } else if (isPast) {
    buttonContent  = "Event Ended";
    buttonDisabled = true;
    buttonClass    = "bg-muted text-muted-foreground cursor-default";
  } else if (isFull) {
    buttonContent  = "Event Full";
    buttonDisabled = true;
    buttonClass    = "bg-muted text-muted-foreground cursor-default";
  } else {
    buttonContent = "Register Now";
  }

  return (
    <>
      <Card className="group hover:shadow-[var(--shadow-strong)] transition-all duration-300 flex flex-col">
        {/* Poster */}
        {poster_url ? (
          <div className="h-40 overflow-hidden rounded-t-lg">
            <img src={poster_url} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 rounded-t-lg flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-muted-foreground opacity-30" />
          </div>
        )}

        <CardHeader className="space-y-2 pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {name}
            </h3>
            <Badge className={`text-xs capitalize flex-shrink-0 ${categoryColor[category] ?? categoryColor.other}`}>
              {category}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-medium">{clubName}</p>
        </CardHeader>

        <CardContent className="space-y-2 flex-1 pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{formattedDate}{start_time ? ` · ${start_time}` : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{venue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {registrationCount}/{max_participants}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <IndianRupee className="w-3 h-3" />
                {registration_fee > 0 ? registration_fee : "Free"}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Button
            onClick={handleRegisterClick}
            disabled={buttonDisabled}
            className={`w-full font-semibold transition-all ${
              buttonClass || "shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)]"
            }`}
          >
            {buttonContent}
          </Button>
        </CardFooter>
      </Card>

      {/* Registration Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Registration</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">by {clubName}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formattedDate}
                </span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <IndianRupee className="w-3.5 h-3.5" />
                  {registration_fee > 0 ? `₹${registration_fee}` : "Free"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(!!v)}
                className="mt-0.5"
              />
              <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                I confirm I will attend this event and understand that spot reservations are binding.
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!agreed || loading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {loading ? "Registering…" : "Confirm Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventCard;
