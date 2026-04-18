import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";
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
import { apiFormData } from "@/lib/api";

const today = new Date().toISOString().split("T")[0];

const schema = z.object({
  name:             z.string().min(3,  "Event name must be at least 3 characters"),
  description:      z.string().min(10, "Description must be at least 10 characters"),
  date:             z.string().refine((d) => new Date(d) > new Date(), {
    message: "Date must be in the future",
  }),
  start_time:       z.string().min(1, "Start time is required"),
  end_time:         z.string().min(1, "End time is required"),
  venue:            z.string().min(2, "Venue is required"),
  max_participants: z.coerce.number().min(1, "Must allow at least 1 participant"),
  registration_fee: z.coerce.number().min(0).default(0),
  category:         z.string().min(1, "Category is required"),
});

type FormValues = z.infer<typeof schema>;

const CreateEvent = () => {
  const navigate = useNavigate();
  const [posterFile, setPosterFile]     = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", description: "", date: "", start_time: "", end_time: "",
      venue: "", max_participants: 50, registration_fee: 0, category: "",
    },
  });

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPosterFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPosterPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => fd.append(k, String(v)));
      if (posterFile) fd.append("poster", posterFile);

      const res = await apiFormData("/api/club/events", "POST", fd);
      if (res.event) {
        toast.success("Event submitted for approval!");
        navigate("/club/events");
      } else {
        toast.error(res.message ?? "Failed to create event");
      }
    } catch {
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/club/events">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Event</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            New events are submitted for admin approval before going live.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Poster */}
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Event Poster</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {posterPreview && (
                <img
                  src={posterPreview}
                  alt="Poster preview"
                  className="w-full max-h-48 object-cover rounded-lg border"
                />
              )}
              <div>
                <label
                  htmlFor="poster-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-muted transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {posterPreview ? "Change Poster" : "Upload Poster"}
                </label>
                <input
                  id="poster-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePosterChange}
                />
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5 MB.</p>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Hackathon 2025" className="h-11" {...field} />
                    </FormControl>
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
                        placeholder="Describe the event, what attendees can expect…"
                        className="min-h-24 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Schedule & Venue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date *</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11" min={today} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time *</FormLabel>
                      <FormControl>
                        <Input type="time" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time *</FormLabel>
                      <FormControl>
                        <Input type="time" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Seminar Hall, Block A" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Capacity */}
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Capacity & Registration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_participants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Participants *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registration_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Fee (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="0 = free" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transition-all"
            disabled={loading}
          >
            {loading ? "Submitting…" : "Submit Event for Approval"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateEvent;
