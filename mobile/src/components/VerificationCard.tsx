import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { WEB_APP_URL } from "../api/config";
import type { VerificationRequest } from "../types/api";
import { colors, radius, shadow, spacing } from "../theme/theme";

// The AVR record only carries a certificate_id, not a direct file URL — the
// web app resolves it via its own SPA route, hosted separately from the API.

function formatDate(iso: string | null) {
  if (!iso) return "Date pending";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "—" : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

type Props = { request: VerificationRequest; children?: React.ReactNode };

export function VerificationCard({ request, children }: Props) {
  const division = request.student_id?.division_id;
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>{request.student_id?.name ?? "Unknown student"}</Text>
      </View>
      <Text style={styles.meta}>
        {request.student_id?.userId}
        {division ? ` · ${division.year ? `${division.year} ` : ""}${division.name}` : ""}
      </Text>

      <View style={styles.detailBlock}>
        <Detail label="Event" value={`${request.event_id?.name ?? request.event_name}${request.event_id?.club_id?.name ? ` (${request.event_id.club_id.name})` : ""}`} />
        <Detail label="Date" value={formatDate(request.event_date)} />
        <Detail label="Entry–Exit" value={`${formatTime(request.event_entry_time)}–${formatTime(request.event_exit_time)}`} />
        {request.event_duration_minutes != null && <Detail label="Attended" value={`${request.event_duration_minutes} min · Entry + Exit scanned`} />}
        {!!request.certificate_id && (
          <Pressable onPress={() => Linking.openURL(`${WEB_APP_URL}/verify/${request.certificate_id}`)}>
            <Text style={styles.certLink}>Certificate: {request.certificate_id} ↗</Text>
          </Pressable>
        )}
      </View>

      {children}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: colors.text, fontSize: 15, fontWeight: "800", flexShrink: 1 },
  meta: { color: colors.mutedText, fontSize: 12, marginTop: 1 },
  detailBlock: { marginTop: spacing.sm, gap: 3 },
  detailLine: { color: colors.text, fontSize: 12.5, lineHeight: 18 },
  detailLabel: { color: colors.mutedText, fontWeight: "700" },
  certLink: { color: colors.primary, fontWeight: "700", fontSize: 12.5, marginTop: 2 },
});
