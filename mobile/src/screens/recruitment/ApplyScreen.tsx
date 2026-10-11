import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { applyToDrive } from "../../services/recruitment";
import type { RecruitmentDrive } from "../../types/api";
import { colors, radius, spacing } from "../../theme/theme";

export function ApplyScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const drive: RecruitmentDrive | undefined = route.params?.drive;

  const [role, setRole] = useState(drive?.roles_open?.[0] ?? "General");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!drive) {
    return <View style={styles.center}><Text style={styles.error}>Drive information is missing.</Text></View>;
  }

  const validate = () => {
    const next: Record<string, string> = {};
    for (const q of drive.questions) {
      if (q.required && !answers[q.question]?.trim()) next[q.question] = "Required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      await applyToDrive({
        drive_id: drive._id,
        role_applied_for: role,
        responses: drive.questions.map((q) => ({ question: q.question, answer: answers[q.question] ?? "" })),
      });
      Alert.alert("Application submitted", "Good luck!", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (cause) {
      setSubmitError(cause instanceof ApiError ? cause.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{drive.title}</Text>
      {!!drive.description && <Text style={styles.description}>{drive.description}</Text>}

      {drive.roles_open.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>Role *</Text>
          <View style={styles.chipRow}>
            {drive.roles_open.map((r) => (
              <Pressable key={r} onPress={() => setRole(r)} style={[styles.chip, role === r && styles.chipActive]}>
                <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {drive.questions.map((q) => (
        <View key={q.question} style={styles.field}>
          <Text style={styles.label}>{q.question} {q.required ? "*" : ""}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={answers[q.question] ?? ""}
            onChangeText={(v) => setAnswers((a) => ({ ...a, [q.question]: v }))}
            placeholderTextColor={colors.mutedText}
            multiline
            numberOfLines={3}
          />
          {!!errors[q.question] && <Text style={styles.fieldError}>{errors[q.question]}</Text>}
        </View>
      ))}

      {!!submitError && <Text style={styles.submitError}>{submitError}</Text>}

      <Pressable onPress={handleSubmit} disabled={submitting} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, submitting && styles.buttonLoading]}>
        {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Submit Application</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  error: { color: colors.destructive, textAlign: "center" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  description: { color: colors.mutedText, fontSize: 13, marginTop: 4, marginBottom: spacing.sm, lineHeight: 18 },
  field: { marginBottom: spacing.sm },
  label: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, fontSize: 15, backgroundColor: colors.surface },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  fieldError: { color: colors.destructive, fontSize: 12, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "white" },
  submitError: { color: colors.destructive, fontSize: 13, textAlign: "center", marginTop: spacing.xs },
  button: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.md },
  buttonPressed: { opacity: 0.86 },
  buttonLoading: { opacity: 0.7 },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
});
