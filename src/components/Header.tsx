import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Home, LayoutDashboard, Users, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("cv_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("cv_user");
    localStorage.removeItem("cv_token");
    toast.success("Logged out successfully ✅");
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/top.png" alt="MIT ADT Logo" className="w-10 h-10 object-contain rounded-lg shadow-sm" />

          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CampusVerse
          </span>
        </Link>

        {/* NAVIGATION LINKS */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            <Home className="w-4 h-4" />
            Events
          </Link>
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link to="/clubs" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            <Users className="w-4 h-4" />
            Clubs
          </Link>
        </nav>

        {/* AUTH / USER STATE */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Show User ID + Role */}
              <span className="text-sm font-semibold text-gray-600">
                {user.userId} | {user.role.toUpperCase()}
              </span>

              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;
