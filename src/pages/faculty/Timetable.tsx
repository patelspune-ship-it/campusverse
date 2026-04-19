import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Slot {
  _id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  room_number: string | null;
  division_id: { division_code: string; year: string; department: string; semester: number };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const FacultyTimetable = () => {
  const [slots, setSlots]     = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const today = DAYS[new Date().getDay() - 1] ?? "";

  useEffect(() => {
    apiRequest("/api/faculty/timetable")
      .then((d) => { if (Array.isArray(d)) setSlots(d); })
      .catch(() => toast.error("Failed to load timetable"))
      .finally(() => setLoading(false));
  }, []);

  const byDay = DAYS.reduce<Record<string, Slot[]>>((acc, d) => {
    acc[d] = slots.filter((s) => s.day === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
    return acc;
  }, {} as Record<string, Slot[]>);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-6 h-6" />
          My Timetable
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Weekly lecture schedule</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS.map((d) => <div key={d} className="h-40 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS.map((day) => (
            <Card
              key={day}
              className={cn(
                "shadow-[var(--shadow-soft)]",
                today === day && "ring-2 ring-teal-500/50"
              )}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  {day}
                  {today === day && (
                    <Badge className="bg-teal-600 text-white text-xs">Today</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {byDay[day].length === 0 ? (
                  <p className="text-xs text-muted-foreground">No lectures</p>
                ) : (
                  byDay[day].map((slot) => (
                    <div key={slot._id} className="bg-muted/40 border rounded-md px-3 py-2">
                      <p className="font-medium text-sm leading-tight">{slot.subject_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {slot.start_time}–{slot.end_time}
                        {slot.room_number && ` · ${slot.room_number}`}
                      </p>
                      <p className="text-xs text-teal-600 mt-0.5">
                        {slot.division_id?.division_code}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FacultyTimetable;
