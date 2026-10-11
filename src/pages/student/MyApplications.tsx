import { useEffect, useState } from "react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CalendarClock } from "lucide-react";
import { apiRequest } from "@/lib/api";

type Stage = "applied" | "shortlisted" | "interview_scheduled" | "interviewed" | "selected" | "rejected";

interface InterviewSlot { date: string | null; time: string | null; venue: string | null; meeting_link: string | null }
interface Application {
  _id: string;
  club_id: { _id: string; name: string; logo_url: string | null } | null;
  drive_id: { _id: string; title: string } | null;
  role_applied_for: string;
  stage: Stage;
  interview_slot: InterviewSlot;
  final_remarks: string | null;
  created_at: string;
}

const stageLabel: Record<Stage, string> = {
  applied:             "Applied",
  shortlisted:         "Shortlisted",
  interview_scheduled: "Interview Scheduled",
  interviewed:         "Interviewed",
  selected:            "Selected",
  rejected:            "Rejected",
};

const stageStyle: Record<Stage, string> = {
  applied:             "bg-muted text-muted-foreground",
  shortlisted:         "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  interview_scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  interviewed:         "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  selected:            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const MyApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/api/student/applications")
      .then((data) => { if (Array.isArray(data)) setApplications(data); })
      .catch(() => toast.error("Failed to load your applications"))
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">My Applications</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track your club recruitment applications.</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map((k) => <div key={k} className="h-28 bg-muted animate-pulse rounded-xl" />)}</div>
        ) : applications.length === 0 ? (
          <Card className="shadow-[var(--shadow-soft)]">
            <CardContent className="py-16 text-center">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="font-medium text-muted-foreground">No applications yet</p>
              <p className="text-sm text-muted-foreground mt-1">Browse clubs to find open recruitment drives.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {applications.map((a) => (
              <Card key={a._id} className="shadow-[var(--shadow-soft)]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold">{a.club_id?.name ?? "Unknown club"}</p>
                      <p className="text-sm text-muted-foreground">{a.drive_id?.title} · {a.role_applied_for}</p>
                      <p className="text-xs text-muted-foreground mt-1">Applied {fmtDate(a.created_at)}</p>
                    </div>
                    <Badge className={`text-xs shrink-0 ${stageStyle[a.stage]}`}>{stageLabel[a.stage]}</Badge>
                  </div>

                  {a.interview_slot?.date && (
                    <div className="mt-3 text-sm bg-muted/40 border rounded-lg px-3 py-2 flex items-start gap-2">
                      <CalendarClock className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                      <div>
                        <p className="font-medium">Interview: {fmtDate(a.interview_slot.date)} at {a.interview_slot.time}</p>
                        {a.interview_slot.venue && <p className="text-muted-foreground text-xs">Venue: {a.interview_slot.venue}</p>}
                        {a.interview_slot.meeting_link && (
                          <a href={a.interview_slot.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                            {a.interview_slot.meeting_link}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {a.final_remarks && (
                    <div className={`mt-3 text-sm rounded-lg px-3 py-2 border ${a.stage === "rejected" ? "text-destructive bg-destructive/5 border-destructive/20" : "bg-green-50 dark:bg-green-900/10 border-green-400/30"}`}>
                      <span className="font-medium">Remarks:</span> {a.final_remarks}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;
