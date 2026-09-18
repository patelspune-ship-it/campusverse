import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, API_URL } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { resetMyDivisionCache } from "@/hooks/useMyDivision";

// ── Schemas ─────────────────────────────────────────────────
const loginSchema = z.object({
  role:     z.string().min(1),
  userId:   z.string().min(1, "User ID is required"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z
  .object({
    name:          z.string().min(2, "Full name is required"),
    email:         z.string().email("Enter a valid email"),
    userId:        z.string().min(3, "College ID / PRN is required"),
    password:      z.string().min(8, "Password must be at least 8 characters"),
    confirm:       z.string().min(1, "Please confirm your password"),
    institute_id:  z.string().min(1, "Select your institute"),
    department_id: z.string().min(1, "Select your department"),
    year:          z.string().min(1, "Select your year"),
    division_id:   z.string().min(1, "Select your division"),
    mobile:        z.string().optional(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type LoginValues  = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

interface Institute  { _id: string; name: string; code: string }
interface Department { _id: string; name: string; code: string; institute_id: string }
interface Division   { _id: string; name: string; year: string; academic_year: string }

const YEARS = ["FY", "SY", "TY", "BTech1", "BTech2", "BTech3", "BTech4"];

const Auth = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [isLogin, setIsLogin]         = useState(true);
  const [institutes, setInstitutes]   = useState<Institute[]>([]);
  const [institutesLoading, setInstitutesLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [divisions, setDivisions]     = useState<Division[]>([]);
  const [divisionsLoading, setDivisionsLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  useEffect(() => {
    apiRequest("/api/public/institutes")
      .then((data) => { if (Array.isArray(data)) setInstitutes(data); })
      .catch(() => {})
      .finally(() => setInstitutesLoading(false));
  }, []);

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "", email: "", userId: "", password: "", confirm: "",
      institute_id: "", department_id: "", year: "", division_id: "", mobile: "",
    },
  });

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: "student", userId: "", password: "" },
  });

  const instituteId  = signupForm.watch("institute_id");
  const departmentId = signupForm.watch("department_id");
  const year          = signupForm.watch("year");

  // Institute changed → reset department/year/division, fetch departments
  useEffect(() => {
    signupForm.setValue("department_id", "");
    signupForm.setValue("year", "");
    signupForm.setValue("division_id", "");
    setDepartments([]);
    setDivisions([]);
    if (!instituteId) return;

    setDepartmentsLoading(true);
    apiRequest(`/api/public/departments?institute_id=${instituteId}`)
      .then((data) => { if (Array.isArray(data)) setDepartments(data); })
      .catch(() => toast.error("Failed to load departments"))
      .finally(() => setDepartmentsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteId]);

  // Department or year changed → reset division, fetch divisions once both are set
  useEffect(() => {
    signupForm.setValue("division_id", "");
    setDivisions([]);
    if (!departmentId || !year) return;

    setDivisionsLoading(true);
    apiRequest(`/api/public/divisions?department_id=${departmentId}&year=${year}`)
      .then((data) => { if (Array.isArray(data)) setDivisions(data); })
      .catch(() => toast.error("Failed to load divisions"))
      .finally(() => setDivisionsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, year]);

  const roleValue         = loginForm.watch("role");
  const userIdLabel       = roleValue === "student" ? "PRN / College ID" : "Email Address";
  const userIdPlaceholder = roleValue === "student" ? "e.g. ADT24SOCB0126" : "you@mitadt.edu";

  // ── Login submit ──────────────────────────────────────────
  const onLogin = async (values: LoginValues) => {
    const res = await login({ userId: values.userId, password: values.password });
    if (res.success) {
      toast.success("Welcome back!");
      const user = JSON.parse(localStorage.getItem("cv_user") || "{}");
      if (user.must_change_password)       navigate("/change-password");
      else if (user.role === "super_admin") navigate("/admin/dashboard");
      else if (user.role === "club_admin")  navigate("/club/dashboard");
      else if (user.role === "faculty")     navigate("/faculty/dashboard");
      else                                  navigate("/dashboard");
    } else {
      toast.error(res.message);
    }
  };

  // ── Signup submit ─────────────────────────────────────────
  const onSignup = async (values: SignupValues) => {
    setSignupLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userId:       values.userId,
          email:        values.email,
          mobile:       values.mobile || null,
          password:     values.password,
          name:         values.name,
          institute_id: values.institute_id,
          division_id:  values.division_id,
        }),
      });

      let data: any;
      try { data = await res.json(); } catch { data = {}; }

      if (!res.ok) {
        toast.error(data.message || `Error ${res.status}`);
        return;
      }
      if (data.token) {
        localStorage.setItem("cv_token", data.token);
        localStorage.setItem("cv_user",  JSON.stringify(data.user));
        resetMyDivisionCache();
        toast.success("Account created! Welcome to CampusVerse!");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err?.message || "Network error. Is the server running?");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-[var(--shadow-strong)]">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-[var(--shadow-soft)]">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CampusVerse
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin ? "Welcome back to your campus hub" : "Create your student account"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* ── LOGIN FORM ─────────────────────────────────── */}
          {isLogin ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                <FormField
                  control={loginForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>I am a</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="club_admin">Club Admin</SelectItem>
                          <SelectItem value="faculty">Faculty Coordinator</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{userIdLabel}</FormLabel>
                      <FormControl>
                        <Input placeholder={userIdPlaceholder} className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-all"
                  disabled={loading}
                >
                  {loading ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            </Form>
          ) : (
            /* ── SIGNUP FORM ──────────────────────────────── */
            <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="s-name">Full Name *</Label>
                <Input id="s-name" placeholder="Rohan Sharma" className="h-11" {...signupForm.register("name")} />
                {signupForm.formState.errors.name && (
                  <p className="text-sm font-medium text-destructive">{signupForm.formState.errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="s-email">Email Address *</Label>
                <Input id="s-email" type="email" placeholder="you@mitadt.edu" className="h-11" {...signupForm.register("email")} />
                {signupForm.formState.errors.email && (
                  <p className="text-sm font-medium text-destructive">{signupForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* College ID */}
              <div className="space-y-2">
                <Label htmlFor="s-userId">College ID / PRN *</Label>
                <Input id="s-userId" placeholder="ADT24SOCB0126" className="h-11" {...signupForm.register("userId")} />
                {signupForm.formState.errors.userId && (
                  <p className="text-sm font-medium text-destructive">{signupForm.formState.errors.userId.message}</p>
                )}
              </div>

              {/* Password + Confirm */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="s-password">Password *</Label>
                  <Input id="s-password" type="password" placeholder="Min 8 chars" className="h-11" {...signupForm.register("password")} />
                  {signupForm.formState.errors.password && (
                    <p className="text-sm font-medium text-destructive">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-confirm">Confirm *</Label>
                  <Input id="s-confirm" type="password" placeholder="Repeat" className="h-11" {...signupForm.register("confirm")} />
                  {signupForm.formState.errors.confirm && (
                    <p className="text-sm font-medium text-destructive">{signupForm.formState.errors.confirm.message}</p>
                  )}
                </div>
              </div>

              {/* Institute */}
              <div className="space-y-2">
                <Label>Institute *</Label>
                <Select
                  value={signupForm.watch("institute_id")}
                  onValueChange={(v) => signupForm.setValue("institute_id", v, { shouldValidate: true })}
                  disabled={institutesLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={institutesLoading ? "Loading institutes…" : "Select your institute"} />
                  </SelectTrigger>
                  <SelectContent>
                    {institutes.map((i) => (
                      <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {signupForm.formState.errors.institute_id && (
                  <p className="text-sm font-medium text-destructive">{signupForm.formState.errors.institute_id.message}</p>
                )}
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select
                  value={signupForm.watch("department_id")}
                  onValueChange={(v) => signupForm.setValue("department_id", v, { shouldValidate: true })}
                  disabled={!instituteId || departmentsLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue
                      placeholder={
                        !instituteId ? "Select an institute first"
                        : departmentsLoading ? "Loading departments…"
                        : departments.length === 0 ? "No departments found"
                        : "Select your department"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {signupForm.formState.errors.department_id && (
                  <p className="text-sm font-medium text-destructive">{signupForm.formState.errors.department_id.message}</p>
                )}
              </div>

              {/* Year */}
              <div className="space-y-2">
                <Label>Year *</Label>
                <Select
                  value={signupForm.watch("year")}
                  onValueChange={(v) => signupForm.setValue("year", v, { shouldValidate: true })}
                  disabled={!departmentId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={!departmentId ? "Select a department first" : "Select your year"} />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                {signupForm.formState.errors.year && (
                  <p className="text-sm font-medium text-destructive">{signupForm.formState.errors.year.message}</p>
                )}
              </div>

              {/* Division */}
              <div className="space-y-2">
                <Label>Division *</Label>
                <Select
                  value={signupForm.watch("division_id")}
                  onValueChange={(v) => signupForm.setValue("division_id", v, { shouldValidate: true })}
                  disabled={!departmentId || !year || divisionsLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue
                      placeholder={
                        !departmentId || !year ? "Select department + year first"
                        : divisionsLoading ? "Loading divisions…"
                        : divisions.length === 0 ? "No divisions found"
                        : "Select your division"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d._id} value={d._id}>Division {d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {signupForm.formState.errors.division_id && (
                  <p className="text-sm font-medium text-destructive">{signupForm.formState.errors.division_id.message}</p>
                )}
              </div>

              {/* Mobile */}
              <div className="space-y-2">
                <Label htmlFor="s-mobile">Phone (optional)</Label>
                <Input id="s-mobile" type="tel" placeholder="9876543210" className="h-11" {...signupForm.register("mobile")} />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-all"
                disabled={signupLoading}
              >
                {signupLoading ? "Creating account…" : "Create Account & Continue"}
              </Button>
            </form>
          )}

          <div className="text-center mt-5">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); loginForm.reset(); signupForm.reset(); }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "New student? Create your account →"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
