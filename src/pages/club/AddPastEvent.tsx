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

const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

const schema = z.object({
  name:             z.string().min(3,  "Event name must be at least 3 characters"),
  description:      z.string().min(10, "Description must be at least 10 characters"),
  date:             z.string().refine((d) => new Date(d) < new Date(), {
    message: "Date must be in the past",
  }),
  start_time:       z.string().min(1, "Start time is required"),
  end_time:         z.string().min(1, "End time is required"),
  venue:            z.string().min(2, "Venue is required"),
  max_participants: z.coerce.number().min(1, "Must be at least 1"),
  registration_fee: z.coerce.number().min(0).default(0),
  category:         z.string().min(1, "Category is required"),
  past_event_attendees_count: z.coerce.number().min(0).optional().nullable(),
  past_event_summary:         z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const AddPastEvent = () => {
  const navigate = useNavigate();
  const [posterFile, setPosterFile]       = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", description: "", date: "", start_time: "", end_time: "",
      venue: "", max_participants: 50, registration_fee: 0, category: "",
      past_event_attendees_count: null, past_event_summary: "",
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
      Object.entries(values).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") fd.append(k, String(v));
      });
      if (posterFile) fd.append("poster", posterFile);

      const res = await apiFormData("/api/club/events/past", "POST", fd);
      if (res.event) {
        toast.success("Past event added successfully!");
        navigate("/club/events/past");
      } else {
        toast.error(res.message ?? "Failed to add past event");
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
        <Link to="/club/events/past">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Past Event</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Record an event that has already taken place.
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
                      <Input placeholder="e.g. Hackathon 2024" className="h-11" {...field} />
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
                        placeholder="Describe what happened at the event…"
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
                    <FormLabel>Event Date * (must be in the past)</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11" max={yesterday} {...field} />
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

          {/* Outcome */}
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Event Outcome</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="past_event_attendees_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Attendee Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="How many people actually attended?"
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
                name="past_event_summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Summary</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A short note about how the event went, highlights, outcomes…"
                        className="min-h-24 resize-none"
                        {...field}
                      />
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
            {loading ? "Saving…" : "Add Past Event"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AddPastEvent;
