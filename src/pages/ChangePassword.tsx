import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";

const schema = z
  .object({
    newPassword:     z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const ChangePassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const res = await apiRequest("/api/auth/change-password", "POST", {
        newPassword: values.newPassword,
      });

      if (res.message === "Password changed successfully") {
        const stored = JSON.parse(localStorage.getItem("cv_user") || "{}");
        stored.must_change_password = false;
        localStorage.setItem("cv_user", JSON.stringify(stored));

        toast.success("Password updated. Welcome to CampusVerse!");

        // Redirect to the correct dashboard based on role
        const role = stored.role;
        if (role === "super_admin") navigate("/admin/dashboard");
        else if (role === "club_admin") navigate("/club/dashboard");
        else navigate("/dashboard");
      } else {
        toast.error(res.message || "Something went wrong");
      }
    } catch {
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-[var(--shadow-strong)]">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-[var(--shadow-soft)]">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Set Your Password
          </CardTitle>
          <CardDescription className="text-base">
            Your account was created with a temporary password. Please set a
            new password before continuing.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Minimum 8 characters"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Repeat your password"
                        className="h-11"
                        {...field}
                      />
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
                {loading ? "Saving..." : "Set Password & Continue"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
