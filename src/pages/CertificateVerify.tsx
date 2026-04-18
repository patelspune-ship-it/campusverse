import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Award, CheckCircle2, XCircle, Calendar, MapPin,
  Clock, User, ExternalLink, GraduationCap,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface VerifyResult {
  valid: boolean;
  student_name: string;
  student_prn: string;
  event_name: string;
  event_date: string;
  venue: string;
  club_name: string;
  duration_minutes: number | null;
  certificate_id: string;
  issued_at: string;
  certificate_url: string;
}

const CertificateVerify = () => {
  const { certId } = useParams<{ certId: string }>();
  const [result, setResult]   = useState<VerifyResult | null>(null);
  const [error, setError]     = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!certId) { setError("No certificate ID provided"); setLoading(false); return; }

    apiRequest(`/api/public/verify/${certId}`)
      .then((data) => {
        if (data?.valid) setResult(data);
        else setError(data?.message ?? "Certificate not found or invalid");
      })
      .catch(() => setError("Could not connect to server. Please try again."))
      .finally(() => setLoading(false));
  }, [certId]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CampusVerse
          </span>
        </Link>
        <span className="text-sm text-muted-foreground">Certificate Verification</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">

          {loading ? (
            <Card className="shadow-[var(--shadow-soft)]">
              <CardContent className="py-16 text-center">
                <Award className="w-12 h-12 mx-auto text-primary opacity-30 animate-pulse mb-4" />
                <p className="text-muted-foreground">Verifying certificate…</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{certId}</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="shadow-[var(--shadow-soft)] border-destructive/30">
              <CardContent className="py-12 text-center space-y-3">
                <XCircle className="w-14 h-14 mx-auto text-destructive opacity-70" />
                <p className="text-xl font-bold text-destructive">Certificate Not Found</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-md inline-block">
                  {certId}
                </p>
                <p className="text-xs text-muted-foreground pt-2">
                  If you believe this is a mistake, contact the event organizer.
                </p>
              </CardContent>
            </Card>
          ) : result ? (
            <>
              {/* Valid badge */}
              <div className="flex justify-center">
                <div className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Valid Certificate
                </div>
              </div>

              {/* Main card */}
              <Card className="shadow-[var(--shadow-strong)] border-green-200 dark:border-green-900/30">
                <CardContent className="p-6 space-y-5">
                  {/* Certificate ID */}
                  <div className="text-center space-y-1 pb-4 border-b">
                    <Award className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Certificate ID</p>
                    <p className="font-mono font-bold text-lg text-primary">{result.certificate_id}</p>
                    <p className="text-xs text-muted-foreground">
                      Issued on {formatDate(result.issued_at)}
                    </p>
                  </div>

                  {/* Student */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Student</p>
                      <p className="font-semibold">{result.student_name}</p>
                      <p className="text-sm text-muted-foreground">{result.student_prn}</p>
                    </div>
                  </div>

                  {/* Event */}
                  <div className="rounded-lg bg-muted/40 border p-4 space-y-2">
                    <p className="font-semibold text-base">{result.event_name}</p>
                    <p className="text-sm text-muted-foreground">by {result.club_name}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(result.event_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {result.venue}
                      </span>
                      {result.duration_minutes != null && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {result.duration_minutes} min attendance
                        </span>
                      )}
                    </div>
                  </div>

                  {/* View PDF */}
                  <Button
                    className="w-full gap-2"
                    onClick={() => window.open(result.certificate_url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Certificate PDF
                  </Button>
                </CardContent>
              </Card>

              <p className="text-center text-xs text-muted-foreground">
                This certificate was issued by CampusVerse · MIT-ADT University
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CertificateVerify;
