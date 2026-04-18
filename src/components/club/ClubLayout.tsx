import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, User, Calendar, History,
  QrCode, Settings, LogOut, GraduationCap, Menu, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";

interface Club {
  _id: string;
  name: string;
  logo_url: string | null;
  profile_completed: boolean;
}

interface Me {
  club: Club;
  user: { userId: string };
}

const navItems = [
  { label: "Dashboard",   icon: LayoutDashboard, to: "/club/dashboard"       },
  { label: "My Profile",  icon: User,            to: "/club/profile"         },
  { label: "Events",      icon: Calendar,        to: "/club/events"          },
  { label: "Past Events", icon: History,         to: "/club/events/past"     },
  { label: "Scanner",     icon: QrCode,          to: "/club/scanner"         },
  { label: "Settings",    icon: Settings,        to: "/club/settings"        },
];

const ClubLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Guard: must be logged in as club_admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("cv_user") || "null");
    if (!user) { navigate("/auth"); return; }
    if (user.role !== "club_admin") { navigate("/dashboard"); return; }
    if (user.must_change_password) { navigate("/change-password"); return; }

    apiRequest("/api/club/me")
      .then((data) => {
        if (data.club) setMe(data);
      })
      .catch(() => toast.error("Could not load club data"));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_user");
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-card border-r">
      {/* Logo / Club name */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          {me?.club.logo_url ? (
            <img
              src={me.club.logo_url}
              alt={me.club.name}
              className="w-10 h-10 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Club Admin</p>
            <p className="text-sm font-bold truncate">{me?.club.name ?? "Loading..."}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ label, icon: Icon, to }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b bg-background/80 backdrop-blur-lg">
        <span className="text-base font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          CampusVerse
        </span>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:z-40">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="w-60 flex flex-col">
              <Sidebar />
            </div>
            <div
              className="flex-1 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-60 min-h-screen">
          <Outlet context={{ me, setMe }} />
        </main>
      </div>
    </div>
  );
};

export default ClubLayout;
