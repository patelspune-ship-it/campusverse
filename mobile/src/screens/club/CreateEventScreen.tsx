import { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { createEvent } from "../../services/club";
import type { EventCategory } from "../../types/api";
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

export function CreateEventScreen() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory | "">("");
  const [venue, setVenue] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("50");
  const [registrationFee, setRegistrationFee] = useState("0");

  const [date, setDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState<"date" | "start" | "end" | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next.name = "Event name must be at least 3 characters.";
    if (description.trim().length < 10) next.description = "Description must be at least 10 characters.";
    if (!category) next.category = "Choose a category.";
    if (date.getTime() <= Date.now()) next.date = "Date must be in the future.";
    if (!venue.trim()) next.venue = "Venue is required.";
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
      await createEvent({
        name: name.trim(),
        description: description.trim(),
        date: date.toISOString(),
        start_time: formatTime(startTime),
        end_time: formatTime(endTime),
        venue: venue.trim(),
        max_participants: Number(maxParticipants),
        registration_fee: Number(registrationFee || 0),
        category: category as EventCategory,
      });
      Alert.alert("Event submitted", "Your event was submitted for admin approval.", [
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
        <TextInput style={styles.input} value={venue} onChangeText={setVenue} placeholder="e.g. Seminar Hall, Block A" placeholderTextColor={colors.mutedText} />
      </Field>

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
  submitError: { color: colors.destructive, fontSize: 13, textAlign: "center", marginTop: spacing.xs },
  button: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.md },
  buttonPressed: { opacity: 0.86 },
  buttonLoading: { opacity: 0.7 },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
  doneButton: { alignSelf: "flex-end", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  doneButtonText: { color: colors.primary, fontWeight: "800" },
});
