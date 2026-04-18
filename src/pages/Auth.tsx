import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  const [prn, setPrn] = useState("");
  const [email, setEmail] = useState(""); // Only used during register
  const [mobile, setMobile] = useState(""); // Only used during register
  const [password, setPassword] = useState("");

  const [role, setRole] = useState("student");

  const navigate = useNavigate();
  const { login, register, loading } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      // ✅ LOGIN USING PRN + PASSWORD
      const res = await login({ prn, password });
      if (res.success) {
        toast.success("Welcome back 🎉");
        navigate("/");
      } else {
        toast.error(res.message);
      }
    } else {
      // ✅ REGISTER USER
      const res = await register({ prn, email, mobile, password, role });
      if (res.success) {
        toast.success("Account Created ✅ Please Login Now");
        setIsLogin(true);
      } else {
        toast.error(res.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-[var(--shadow-strong)]">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-[var(--shadow-soft)]">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CampusVerse
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin ? "Welcome back to your campus hub" : "Join your campus community"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAuth} className="space-y-5">

            {/* PRN FIELD ALWAYS SHOWN */}
            <div className="space-y-2">
              <Label htmlFor="prn">PRN Number</Label>
              <Input
                id="prn"
                placeholder="ADT24SOCB0126"
                value={prn}
                onChange={(e) => setPrn(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {/* SHOWN ONLY DURING REGISTER */}
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Student Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@mitadt.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!isLogin}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required={!isLogin}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="club_admin">Club Admin</SelectItem>
                      <SelectItem value="faculty">Faculty Coordinator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* PASSWORD FIELD */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-all"
              disabled={loading}
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
