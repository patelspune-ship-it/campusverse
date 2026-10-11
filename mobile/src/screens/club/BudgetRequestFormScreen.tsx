import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { createBudgetRequest, updateBudgetRequest } from "../../services/budget";
import { getClubEvents } from "../../services/club";
import type { BudgetRequest, BudgetRequestType, ClubEvent } from "../../types/api";
import { colors, radius, spacing } from "../../theme/theme";
import { formatCurrency } from "../../utils/format";

type BreakdownRow = { item: string; cost: string };

function formatDate(iso: string) {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function BudgetRequestFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editing: BudgetRequest | undefined = route.params?.request;

  const [title, setTitle] = useState(editing?.title ?? "");
  const [requestType, setRequestType] = useState<BudgetRequestType>(editing?.request_type ?? "annual");
  const [eventId, setEventId] = useState(editing?.event_id?._id ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount_requested) : "");
  const [purpose, setPurpose] = useState(editing?.purpose ?? "");
  const [academicYear, setAcademicYear] = useState(editing?.academic_year ?? "");
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>(
    editing?.breakdown.map((b) => ({ item: b.item, cost: String(b.cost) })) ?? []
  );

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (requestType !== "event") return;
    setEventsLoading(true);
    getClubEvents()
      .then(setEvents)
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, [requestType]);

  const breakdownTotal = breakdown.reduce((sum, b) => sum + (Number(b.cost) || 0), 0);

  const addRow = () => setBreakdown((rows) => [...rows, { item: "", cost: "" }]);
  const removeRow = (idx: number) => setBreakdown((rows) => rows.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<BreakdownRow>) =>
    setBreakdown((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const validate = () => {
    const next: Record<string, string> = {};
    if (title.trim().length < 2) next.title = "Title is required.";
    const amt = Number(amount);
    if (!amt || amt <= 0) next.amount = "Amount must be greater than 0.";
    if (!purpose.trim()) next.purpose = "Purpose is required.";
    if (!academicYear.trim()) next.academicYear = "Academic year is required.";
    if (requestType === "event" && !eventId) next.event = "Select which event this budget is for.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError("");
    setSubmitting(true);

    const parsedBreakdown = breakdown
      .filter((b) => b.item.trim() && b.cost)
      .map((b) => ({ item: b.item.trim(), cost: Number(b.cost) }));

    try {
      if (editing) {
        await updateBudgetRequest(editing._id, {
          title: title.trim(),
          amount_requested: Number(amount),
          purpose: purpose.trim(),
          academic_year: academicYear.trim(),
          breakdown: parsedBreakdown,
          ...(requestType === "event" ? { event_id: eventId } : {}),
        });
      } else {
        await createBudgetRequest({
          title: title.trim(),
          request_type: requestType,
          event_id: requestType === "event" ? eventId : undefined,
          amount_requested: Number(amount),
          purpose: purpose.trim(),
          academic_year: academicYear.trim(),
          breakdown: parsedBreakdown,
        });
      }
      Alert.alert(
        editing ? "Request updated" : "Request submitted",
        editing ? "Your budget request was updated." : "Your budget request was submitted for admin review.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (cause) {
      setSubmitError(cause instanceof ApiError ? cause.message : "Could not save this request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Field label="Title *" error={errors.title}>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Annual Budget 2026-27" placeholderTextColor={colors.mutedText} />
      </Field>

      <View style={styles.row}>
        <Field label="Request Type *" style={styles.half}>
          <View style={styles.chipRow}>
            {(["annual", "event"] as BudgetRequestType[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => !editing && setRequestType(t)}
                disabled={!!editing}
                style={[styles.chip, requestType === t && styles.chipActive, !!editing && styles.chipDisabled]}
              >
                <Text style={[styles.chipText, requestType === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          {!!editing && <Text style={styles.helperText}>Type can't be changed after submission.</Text>}
        </Field>
        <Field label="Academic Year *" error={errors.academicYear} style={styles.half}>
          <TextInput style={styles.input} value={academicYear} onChangeText={setAcademicYear} placeholder="2026-27" placeholderTextColor={colors.mutedText} />
        </Field>
      </View>

      {requestType === "event" && (
        <Field label="Event *" error={errors.event}>
          {eventsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : events.length === 0 ? (
            <Text style={styles.helperText}>You don't have any events yet — create one first.</Text>
          ) : (
            <View style={styles.eventList}>
              {events.map((e) => (
                <Pressable key={e._id} onPress={() => setEventId(e._id)} style={[styles.eventRow, eventId === e._id && styles.eventRowActive]}>
                  <Text style={[styles.eventRowText, eventId === e._id && styles.eventRowTextActive]} numberOfLines={1}>{e.name}</Text>
                  <Text style={[styles.eventRowDate, eventId === e._id && styles.eventRowTextActive]}>{formatDate(e.date)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Field>
      )}

      <Field label="Amount Requested (₹) *" error={errors.amount}>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.mutedText} />
      </Field>

      <Field label="Purpose *" error={errors.purpose}>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={purpose}
          onChangeText={setPurpose}
          placeholder="What is this budget for?"
          placeholderTextColor={colors.mutedText}
          multiline
          numberOfLines={4}
        />
      </Field>

      <Field label="Itemized Breakdown (optional)">
        {breakdown.map((row, idx) => (
          <View key={idx} style={styles.breakdownRow}>
            <TextInput
              style={[styles.input, styles.breakdownItem]}
              value={row.item}
              onChangeText={(v) => updateRow(idx, { item: v })}
              placeholder="Item"
              placeholderTextColor={colors.mutedText}
            />
            <TextInput
              style={[styles.input, styles.breakdownCost]}
              value={row.cost}
              onChangeText={(v) => updateRow(idx, { cost: v })}
              placeholder="Cost"
              placeholderTextColor={colors.mutedText}
              keyboardType="number-pad"
            />
            <Pressable onPress={() => removeRow(idx)} style={styles.removeRowButton}>
              <Text style={styles.removeRowButtonText}>✕</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={addRow} style={styles.addRowButton}>
          <Text style={styles.addRowButtonText}>+ Add item</Text>
        </Pressable>
        {breakdown.length > 0 && (
          <Text style={styles.breakdownTotal}>
            Breakdown total: <Text style={styles.breakdownTotalValue}>{formatCurrency(breakdownTotal)}</Text>
            {amount && breakdownTotal !== Number(amount) && "  (doesn't match amount requested)"}
          </Text>
        )}
      </Field>

      {!!submitError && <Text style={styles.submitError}>{submitError}</Text>}

      <Pressable onPress={handleSubmit} disabled={submitting} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, submitting && styles.buttonLoading]}>
        {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{editing ? "Save Changes" : "Submit Request"}</Text>}
      </Pressable>
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
  textArea: { minHeight: 90, textAlignVertical: "top" },
  fieldError: { color: colors.destructive, fontSize: 12, marginTop: 4 },
  helperText: { color: colors.mutedText, fontSize: 12, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.5 },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  chipTextActive: { color: "white" },
  eventList: { gap: 6 },
  eventRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, backgroundColor: colors.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  eventRowActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  eventRowText: { color: colors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  eventRowDate: { color: colors.mutedText, fontSize: 12 },
  eventRowTextActive: { color: "white" },
  breakdownRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 },
  breakdownItem: { flex: 1, minHeight: 44 },
  breakdownCost: { width: 96, minHeight: 44 },
  removeRowButton: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: "#FDE8E8" },
  removeRowButtonText: { color: colors.destructive, fontWeight: "800" },
  addRowButton: { alignSelf: "flex-start", paddingVertical: 6 },
  addRowButtonText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  breakdownTotal: { color: colors.mutedText, fontSize: 12.5, marginTop: 4 },
  breakdownTotalValue: { color: colors.text, fontWeight: "800" },
  submitError: { color: colors.destructive, fontSize: 13, textAlign: "center", marginTop: spacing.xs },
  button: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.md },
  buttonPressed: { opacity: 0.86 },
  buttonLoading: { opacity: 0.7 },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
});
