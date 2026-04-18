import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Award, Download, ExternalLink, Calendar, MapPin,
  Clock, ImageOff, ArrowLeft,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

interface Certificate {
  _id: string;
  name: string;
  date: string;
  venue: string;
  category: string;
  poster_url: string | null;
  club_name: string;
  club_logo: string | null;
  certificate_path: string;
  certificate_id: string;
  certificate_generated_at: string;
  duration_minutes: number | null;
}

const Certificates = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("cv_user") || "null");

  const [certs, setCerts]     = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "student") { navigate("/auth"); return; }

    apiRequest("/api/student/my-certificates")
      .then((data) => { if (Array.isArray(data)) setCerts(data); })
      .catch(() => toast.error("Failed to load certificates"))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (cert: Certificate) => {
    try {
      const res  = await fetch(cert.certificate_path);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Certificate_${cert.name.replace(/\s+/g, "_")}_${cert.certificate_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(cert.certificate_path, "_blank");
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-6">

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-500" />
              My Certificates
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Certificates earned for full attendance at events
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map((k) => (
              <div key={k} className="h-56 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : certs.length === 0 ? (
          <Card className="shadow-[var(--shadow-soft)]">
            <CardContent className="py-16 text-center space-y-3">
              <Award className="w-12 h-12 mx-auto text-muted-foreground opacity-20" />
              <p className="font-semibold text-muted-foreground">No certificates yet</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Attend events with both entry and exit scans to earn certificates.
                Certificates are generated within 24 hours after the event ends.
              </p>
              <Button variant="outline" onClick={() => navigate("/")}>
                Browse Events
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {certs.map((cert) => (
              <Card key={cert._id} className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-all overflow-hidden">
                {/* Poster / header */}
                <div className="h-32 relative overflow-hidden bg-gradient-to-br from-primary/10 to-yellow-500/10">
                  {cert.poster_url ? (
                    <img
                      src={cert.poster_url}
                      alt={cert.name}
                      className="w-full h-full object-cover opacity-60"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-8 h-8 text-muted-foreground opacity-20" />
                    </div>
                  )}
                  {/* Certificate badge overlay */}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500 text-white text-xs gap-1 shadow">
                      <Award className="w-3 h-3" /> Certified
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-semibold leading-tight line-clamp-2">{cert.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{cert.club_name}</p>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(cert.date)}
                    </span>
                    {cert.duration_minutes != null && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {cert.duration_minutes} min attendance
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 font-mono text-primary/70">
                      <Award className="w-3.5 h-3.5" />
                      {cert.certificate_id}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => handleDownload(cert)}
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => window.open(cert.certificate_path, "_blank")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-xs px-2"
                      onClick={() => navigate(`/verify/${cert.certificate_id}`)}
                      title="Verify this certificate"
                    >
                      Verify
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Certificates;
