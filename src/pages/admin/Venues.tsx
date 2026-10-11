import { useEffect, useState } from "react";
import { Building2, Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";

const VENUE_TYPES = ["auditorium", "seminar_hall", "classroom", "lab", "open_ground", "sports_facility", "other"];

interface Institute { _id: string; name: string; code: string }
interface Venue {
  _id: string;
  name: string;
  code: string | null;
  institute_id: { _id: string; name: string; code: string } | null;
  capacity: number;
  venue_type: string;
  location: string | null;
  amenities: string[];
  is_active: boolean;
}

interface FormState {
  name: string; code: string; institute_id: string; capacity: string;
  venue_type: string; location: string; amenities: string;
}

const emptyForm: FormState = { name: "", code: "", institute_id: "", capacity: "", venue_type: "", location: "", amenities: "" };

const Venues = () => {
  const [venues, setVenues]         = useState<Venue[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading]       = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<Venue | null>(null);
  const [form, setForm]             = useState<FormState>(emptyForm);
  const [saving, setSaving]         = useState(false);

  const loadVenues = () => {
    setLoading(true);
    apiRequest("/api/admin/venues")
      .then((data) => { if (Array.isArray(data)) setVenues(data); })
      .catch(() => toast.error("Failed to load venues"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVenues();
    apiRequest("/api/admin/institutes")
      .then((data) => { if (Array.isArray(data)) setInstitutes(data); })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (v: Venue) => {
    setEditing(v);
    setForm({
      name: v.name,
      code: v.code ?? "",
      institute_id: v.institute_id?._id ?? "",
      capacity: String(v.capacity),
      venue_type: v.venue_type,
      location: v.location ?? "",
      amenities: v.amenities.join(", "),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.institute_id) { toast.error("Select an institute"); return; }
    const capacity = Number(form.capacity);
    if (!capacity || capacity <= 0) { toast.error("Capacity must be greater than 0"); return; }
    if (!form.venue_type) { toast.error("Select a venue type"); return; }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      institute_id: form.institute_id,
      capacity,
      venue_type: form.venue_type,
      location: form.location.trim() || null,
      amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean),
    };

    setSaving(true);
    try {
      const res = editing
        ? await apiRequest(`/api/admin/venues/${editing._id}`, "PATCH", payload)
        : await apiRequest("/api/admin/venues", "POST", payload);

      if (res?._id) {
        toast.success(editing ? "Venue updated" : "Venue created");
        setDialogOpen(false);
        loadVenues();
      } else {
        toast.error(res?.message ?? "Failed to save venue");
      }
    } catch {
      toast.error("Server error.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (v: Venue) => {
    try {
      const res = v.is_active
        ? await apiRequest(`/api/admin/venues/${v._id}/deactivate`, "PATCH")
        : await apiRequest(`/api/admin/venues/${v._id}`, "PATCH", { is_active: true });
      if (res?.venue || res?._id) {
        toast.success(v.is_active ? "Venue deactivated" : "Venue activated");
        loadVenues();
      } else {
        toast.error(res?.message ?? "Failed to update venue");
      }
    } catch {
      toast.error("Server error.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Venues</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage bookable spaces across campus.</p>
        </div>
        <Button className="gap-2 shadow-[var(--shadow-soft)]" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          New Venue
        </Button>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
          ) : venues.length === 0 ? (
            <div className="py-20 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground text-sm">No venues yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Institute</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.map((v) => (
                  <TableRow key={v._id} className={!v.is_active ? "opacity-60" : ""}>
                    <TableCell>
                      <p className="font-medium text-sm">{v.name}</p>
                      {v.code && <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{v.code}</span>}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{v.venue_type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm">{v.capacity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.location ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.institute_id?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={v.is_active
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs"
                        : "bg-muted text-muted-foreground text-xs"}>
                        {v.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(v)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(v)} title={v.is_active ? "Deactivate" : "Activate"}>
                        <Power className={`w-3.5 h-3.5 ${v.is_active ? "text-destructive" : "text-green-600"}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Venue" : "New Venue"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input placeholder="Seminar Hall S518" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input placeholder="S518" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Institute *</Label>
              <Select value={form.institute_id} onValueChange={(v) => setForm((f) => ({ ...f, institute_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select institute" /></SelectTrigger>
                <SelectContent>
                  {institutes.map((i) => <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.venue_type} onValueChange={(v) => setForm((f) => ({ ...f, venue_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {VENUE_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacity *</Label>
                <Input type="number" min={1} placeholder="120" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="School of Computing, 5th Floor" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Amenities</Label>
              <Input placeholder="Projector, AC, Whiteboard (comma-separated)" value={form.amenities} onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Venues;
