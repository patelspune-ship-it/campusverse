import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Clock, Calendar, Building2, Users,
  University, Settings, LogOut, ShieldCheck, Menu, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";

interface AdminContext {
  pendingCount: number;
  refreshPendingCount: () => void;
}

const AdminLayout = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const fetchPendingCount = () => {
    apiRequest("/api/admin/stats")
      .then((data) => { if (typeof data.pendingEvents === "number") setPendingCount(data.pendingEvents); })
      .catch(() => {});
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("cv_user") || "null");
    if (!user) { navigate("/auth"); return; }
    if (user.role !== "super_admin") { navigate("/dashboard"); return; }
    if (user.must_change_password)   { navigate("/change-password"); return; }
    fetchPendingCount();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_user");
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const navItems = [
    { label: "Dashboard",          icon: LayoutDashboard, to: "/admin/dashboard" },
    { label: "Pending Approvals",  icon: Clock,           to: "/admin/approvals", badge: pendingCount },
    { label: "All Events",         icon: Calendar,        to: "/admin/events"    },
    { label: "All Clubs",          icon: Building2,       to: "/admin/clubs"     },
    { label: "All Students",       icon: Users,           to: "/admin/students"  },
    { label: "Institutes",         icon: University,      to: "/admin/institutes"},
    { label: "Settings",           icon: Settings,        to: "/admin/settings"  },
  ];

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-card border-r">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Super Admin</p>
            <p className="text-sm font-bold truncate">CampusVerse</p>
          </div>
        </div>
      </div>

      {/* Nav */}
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
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {badge}
                </span>
              )}
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

  const outletContext: AdminContext = {
    pendingCount,
    refreshPendingCount: fetchPendingCount,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b bg-background/80 backdrop-blur-lg">
        <span className="text-base font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          CampusVerse Admin
        </span>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-40">
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="w-64 flex flex-col">
              <Sidebar />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-64 min-h-screen">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
