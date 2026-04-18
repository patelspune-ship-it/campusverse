import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Upload, Mail, Instagram, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest, apiFormData } from "@/lib/api";

const schema = z.object({
  category:         z.string().min(1, "Category is required"),
  description:      z.string().min(10, "Description must be at least 10 characters"),
  founded_year:     z.coerce.number().min(1900).max(new Date().getFullYear()).optional().nullable(),
  institute_id:     z.string().optional().nullable(),
  instagram_handle: z.string().optional(),
  linkedin_url:     z.string().url("Must be a valid URL").optional().or(z.literal("")),
  club_email:       z.string().email("Must be a valid email").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Institute { _id: string; name: string; code: string }

const ClubProfile = () => {
  const { me, setMe } = useOutletContext<any>();
  const [institutes, setInstitutes]     = useState<Institute[]>([]);
  const [logoFile, setLogoFile]         = useState<File | null>(null);
  const [bannerFile, setBannerFile]     = useState<File | null>(null);
  const [logoPreview, setLogoPreview]   = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "", description: "", founded_year: null,
      institute_id: null, instagram_handle: "", linkedin_url: "", club_email: "",
    },
  });

  useEffect(() => {
    if (me?.club) {
      const c = me.club;
      form.reset({
        category:         c.category         ?? "",
        description:      c.description      ?? "",
        founded_year:     c.founded_year      ?? null,
        institute_id:     c.institute_id?._id ?? c.institute_id ?? null,
        instagram_handle: c.instagram_handle ?? "",
        linkedin_url:     c.linkedin_url     ?? "",
        club_email:       c.club_email       ?? "",
      });
      setLogoPreview(c.logo_url    ?? null);
      setBannerPreview(c.banner_url ?? null);
    }
  }, [me]);

  useEffect(() => {
    apiRequest("/api/club/institutes")
      .then((data) => { if (Array.isArray(data)) setInstitutes(data); })
      .catch(() => {});
  }, []);

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void,
  ) => {
    const file = e.target.files?.[0] ?? null;
    setFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") fd.append(k, String(v));
      });
      if (values.institute_id === null || values.institute_id === "")
        fd.append("institute_id", "null");
      if (logoFile)  fd.append("logo",   logoFile);
      if (bannerFile) fd.append("banner", bannerFile);

      const res = await apiFormData("/api/club/profile", "PATCH", fd);
      if (res.club) {
        setMe((prev: any) => ({ ...prev, club: res.club }));
        toast.success("Profile updated successfully!");
      } else {
        toast.error(res.message ?? "Update failed");
      }
    } catch {
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Club Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Complete your profile to make your club discoverable on CampusVerse.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Branding */}
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Club Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Logo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Club Logo</label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-lg object-cover border shadow-sm flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border flex-shrink-0">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-muted transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFile(e, setLogoFile, setLogoPreview)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5 MB. Square recommended.</p>
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Club Banner</label>
                {bannerPreview && (
                  <img src={bannerPreview} alt="Banner" className="w-full h-28 rounded-lg object-cover border shadow-sm mb-2" />
                )}
                <div>
                  <label
                    htmlFor="banner-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-muted transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {bannerPreview ? "Change Banner" : "Upload Banner"}
                  </label>
                  <input
                    id="banner-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e, setBannerFile, setBannerPreview)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5 MB. Wide / 16:9 recommended.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Core details */}
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Club Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="arts">Arts</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell students what your club is about, your goals, activities..."
                        className="min-h-28 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="founded_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Founded Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 2018"
                          className="h-11"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="institute_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institute</FormLabel>
                      <Select
                        value={field.value ?? "null"}
                        onValueChange={(v) => field.onChange(v === "null" ? null : v)}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select institute" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">University-wide</SelectItem>
                          {institutes.map((inst) => (
                            <SelectItem key={inst._id} value={inst._id}>
                              {inst.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact & Social */}
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Contact & Social</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="club_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="email" placeholder="club@mitadt.edu" className="h-11 pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instagram_handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram Handle</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="@yourclub" className="h-11 pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="https://linkedin.com/company/yourclub"
                          className="h-11 pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-all"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ClubProfile;
