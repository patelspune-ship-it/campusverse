import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Clock, CheckCircle, XCircle,
  CalendarDays, Settings, LogOut, GraduationCap, Menu, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";

const FacultyLayout = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [facultyName, setFacultyName]   = useState("");

  const fetchPending = () => {
    apiRequest("/api/faculty/stats")
      .then((d) => { if (typeof d.pending === "number") setPendingCount(d.pending); })
      .catch(() => {});
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("cv_user") || "null");
    if (!user) { navigate("/auth"); return; }
    if (user.role !== "faculty") { navigate("/dashboard"); return; }
    if (user.must_change_password) { navigate("/change-password"); return; }
    setFacultyName(user.name || "Faculty");
    fetchPending();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_user");
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const navItems = [
    { label: "Dashboard",              icon: LayoutDashboard, to: "/faculty/dashboard"           },
    { label: "Pending Verifications",  icon: Clock,           to: "/faculty/pending", badge: pendingCount },
    { label: "Approved",               icon: CheckCircle,     to: "/faculty/approved"             },
    { label: "Rejected",               icon: XCircle,         to: "/faculty/rejected"             },
    { label: "My Timetable",           icon: CalendarDays,    to: "/faculty/timetable"            },
    { label: "Settings",               icon: Settings,        to: "/faculty/settings"             },
  ];

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-card border-r">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Faculty Portal</p>
            <p className="text-sm font-bold truncate">{facultyName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, to, badge }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <span className="ml-auto bg-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

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
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b bg-background/80 backdrop-blur-lg">
        <span className="text-base font-bold text-teal-600">CampusVerse Faculty</span>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      <div className="flex">
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-40">
          <Sidebar />
        </div>

        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="w-64 flex flex-col"><Sidebar /></div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        <main className="flex-1 lg:ml-64 min-h-screen">
          <Outlet context={{ refreshPending: fetchPending }} />
        </main>
      </div>
    </div>
  );
};

export default FacultyLayout;
