import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { createEvent } from "../../services/club";
import { getVenueAvailability, getVenues } from "../../services/venues";
import type { EventCategory, Venue, VenueBooking } from "../../types/api";
import { colors, radius, spacing } from "../../theme/theme";

const CATEGORIES: EventCategory[] = ["technical", "cultural", "sports", "other"];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

export function CreateEventScreen() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory | "">("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("50");
  const [registrationFee, setRegistrationFee] = useState("0");

  const [date, setDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState<"date" | "start" | "end" | null>(null);

  const [availability, setAvailability] = useState<VenueBooking[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getVenues().then(setVenues).catch(() => {});
  }, []);

  useEffect(() => {
    if (!venueId) { setAvailability([]); return; }
    setAvailabilityLoading(true);
    getVenueAvailability(venueId, isoDate(date))
      .then(setAvailability)
      .catch(() => setAvailability([]))
      .finally(() => setAvailabilityLoading(false));
  }, [venueId, date]);

  const startTimeStr = formatTime(startTime);
  const endTimeStr = formatTime(endTime);
  const hasConflict = venueId && availability.some((b) => overlaps(startTimeStr, endTimeStr, b.start_time, b.end_time));

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next.name = "Event name must be at least 3 characters.";
    if (description.trim().length < 10) next.description = "Description must be at least 10 characters.";
    if (!category) next.category = "Choose a category.";
    if (date.getTime() <= Date.now()) next.date = "Date must be in the future.";
    if (!venueId) next.venue = "Select a venue.";
    const maxP = Number(maxParticipants);
    if (!maxP || maxP < 1) next.max_participants = "Must allow at least 1 participant.";
    const fee = Number(registrationFee || 0);
    if (fee < 0) next.registration_fee = "Fee can't be negative.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await createEvent({
        name: name.trim(),
        description: description.trim(),
        date: date.toISOString(),
        start_time: startTimeStr,
        end_time: endTimeStr,
        venue_id: venueId,
        max_participants: Number(maxParticipants),
        registration_fee: Number(registrationFee || 0),
        category: category as EventCategory,
      });
      const conflictNote = res.venueConflicts?.length
        ? `\n\nHeads up: ${res.venueConflicts.length} other approved booking(s) overlap this venue/time. Admin will review.`
        : "";
      Alert.alert("Event submitted", `Your event was submitted for admin approval.${conflictNote}`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (cause) {
      setSubmitError(cause instanceof ApiError ? cause.message : "Could not create this event.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Field label="Event Name *" error={errors.name}>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Hackathon 2026" placeholderTextColor={colors.mutedText} />
      </Field>

      <Field label="Description *" error={errors.description}>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the event, what attendees can expect…"
          placeholderTextColor={colors.mutedText}
          multiline
          numberOfLines={4}
        />
      </Field>

      <Field label="Category *" error={errors.category}>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Event Date *" error={errors.date}>
        <Pressable style={styles.input} onPress={() => setPickerOpen("date")}>
          <Text style={styles.inputValue}>{formatDate(date)}</Text>
        </Pressable>
      </Field>

      <View style={styles.row}>
        <Field label="Start Time *" style={styles.half}>
          <Pressable style={styles.input} onPress={() => setPickerOpen("start")}>
            <Text style={styles.inputValue}>{formatTime(startTime)}</Text>
          </Pressable>
        </Field>
        <Field label="End Time *" style={styles.half}>
          <Pressable style={styles.input} onPress={() => setPickerOpen("end")}>
            <Text style={styles.inputValue}>{formatTime(endTime)}</Text>
          </Pressable>
        </Field>
      </View>

      <Field label="Venue *" error={errors.venue}>
        {venues.length === 0 ? (
          <Text style={styles.helperText}>No venues available. Contact your administrator.</Text>
        ) : (
          <View style={styles.venueList}>
            {venues.map((v) => (
              <Pressable key={v._id} onPress={() => setVenueId(v._id)} style={[styles.venueRow, venueId === v._id && styles.venueRowActive]}>
                <Text style={[styles.venueRowText, venueId === v._id && styles.venueRowTextActive]} numberOfLines={1}>{v.name}</Text>
                <Text style={[styles.venueRowMeta, venueId === v._id && styles.venueRowTextActive]}>cap. {v.capacity}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Field>

      {venueId && (
        <View style={styles.availabilityBox}>
          {availabilityLoading ? (
            <Text style={styles.helperText}>Checking availability…</Text>
          ) : availability.length === 0 ? (
            <Text style={styles.helperText}>No other approved bookings for this venue on this date.</Text>
          ) : (
            <>
              <Text style={styles.availabilityTitle}>Existing approved bookings that day:</Text>
              {availability.map((b) => (
                <Text key={b._id} style={styles.availabilityLine}>
                  {b.start_time}–{b.end_time} · {b.title}{b.club_id ? ` (${b.club_id.name})` : ""}
                </Text>
              ))}
            </>
          )}
          {!!hasConflict && (
            <Text style={styles.conflictWarning}>
              ⚠ Your chosen time overlaps an existing booking. You can still submit — the admin will review and decide.
            </Text>
          )}
        </View>
      )}

      <View style={styles.row}>
        <Field label="Max Participants *" error={errors.max_participants} style={styles.half}>
          <TextInput style={styles.input} value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="number-pad" placeholderTextColor={colors.mutedText} />
        </Field>
        <Field label="Fee (₹)" error={errors.registration_fee} style={styles.half}>
          <TextInput style={styles.input} value={registrationFee} onChangeText={setRegistrationFee} keyboardType="number-pad" placeholder="0 = free" placeholderTextColor={colors.mutedText} />
        </Field>
      </View>

      {!!submitError && <Text style={styles.submitError}>{submitError}</Text>}

      <Pressable onPress={handleSubmit} disabled={submitting} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, submitting && styles.buttonLoading]}>
        {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Submit Event for Approval</Text>}
      </Pressable>

      {pickerOpen && (
        <DateTimePicker
          value={pickerOpen === "date" ? date : pickerOpen === "start" ? startTime : endTime}
          mode={pickerOpen === "date" ? "date" : "time"}
          minimumDate={pickerOpen === "date" ? new Date() : undefined}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event, selected) => {
            setPickerOpen(Platform.OS === "ios" ? pickerOpen : null);
            if (!selected) return;
            if (pickerOpen === "date") setDate(selected);
            else if (pickerOpen === "start") setStartTime(selected);
            else setEndTime(selected);
          }}
        />
      )}
      {pickerOpen && Platform.OS === "ios" && (
        <Pressable style={styles.doneButton} onPress={() => setPickerOpen(null)}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Field({ label, error, style, children }: { label: string; error?: string; style?: any; children: React.ReactNode }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  field: { marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  label: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, fontSize: 15, backgroundColor: colors.surface, justifyContent: "center", minHeight: 48 },
  inputValue: { color: colors.text, fontSize: 15 },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  fieldError: { color: colors.destructive, fontSize: 12, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  chipTextActive: { color: "white" },
  helperText: { color: colors.mutedText, fontSize: 12 },
  venueList: { gap: 6 },
  venueRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, backgroundColor: colors.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  venueRowActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  venueRowText: { color: colors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  venueRowMeta: { color: colors.mutedText, fontSize: 12 },
  venueRowTextActive: { color: "white" },
  availabilityBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, padding: 12, gap: 4 },
  availabilityTitle: { color: colors.mutedText, fontSize: 11.5, fontWeight: "700" },
  availabilityLine: { color: colors.mutedText, fontSize: 12 },
  conflictWarning: { color: "#825700", backgroundColor: "#FFF6DB", borderRadius: radius.sm, padding: 8, fontSize: 12, marginTop: 4, lineHeight: 17 },
  submitError: { color: colors.destructive, fontSize: 13, textAlign: "center", marginTop: spacing.xs },
  button: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.md },
  buttonPressed: { opacity: 0.86 },
  buttonLoading: { opacity: 0.7 },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
  doneButton: { alignSelf: "flex-end", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  doneButtonText: { color: colors.primary, fontWeight: "800" },
});
