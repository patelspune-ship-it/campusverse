import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { getMyCertificates } from "../../services/certificates";
import type { Certificate } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";

export function CertificateScreen() {
  const route = useRoute<any>();
  const { eventId } = route.params ?? {};

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const certificates = await getMyCertificates();
      const match = certificates.find((c) => c._id === eventId);
      if (!match) {
        setError("Certificate not found yet. It may still be generating.");
      } else {
        setCertificate(match);
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load your certificate.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (error || !certificate) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.retry} onPress={load}><Text style={styles.retryText}>Try again</Text></Pressable>
      </View>
    );
  }

  const formattedDate = new Date(certificate.date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <View style={styles.screen}>
      <View style={styles.iconBadge}><Text style={styles.iconMark}>🏆</Text></View>
      <Text style={styles.eventName}>{certificate.name}</Text>
      <Text style={styles.club}>{certificate.club_name}</Text>

      <View style={styles.infoCard}>
        <InfoRow label="Date" value={formattedDate} />
        <InfoRow label="Venue" value={certificate.venue} />
        {certificate.duration_minutes != null && <InfoRow label="Duration" value={`${certificate.duration_minutes} min`} />}
        <InfoRow label="Certificate ID" value={certificate.certificate_id} />
      </View>

      <Pressable style={styles.button} onPress={() => Linking.openURL(certificate.certificate_path)}>
        <Text style={styles.buttonText}>View / Download Certificate</Text>
      </Pressable>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center", padding: spacing.lg, gap: spacing.sm },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  error: { color: colors.destructive, textAlign: "center", lineHeight: 21 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
  iconBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  iconMark: { fontSize: 32 },
  eventName: { color: colors.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  club: { color: colors.mutedText, fontSize: 14 },
  infoCard: { width: "100%", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 10, marginTop: spacing.md, ...shadow },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { color: colors.mutedText, fontSize: 13, fontWeight: "600" },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: "700" },
  button: { width: "100%", minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.lg },
  buttonText: { color: "white", fontWeight: "800", fontSize: 15 },
});
