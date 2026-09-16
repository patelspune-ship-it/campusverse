import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useSession } from "../../context/SessionContext";
import { getMyRegistrations } from "../../services/registrations";
import { colors, radius, shadow, spacing } from "../../theme/theme";

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 10; // ~15s, matches the web app's polling window

export function MyQRScreen() {
  const route = useRoute<any>();
  const { eventId, eventName } = route.params;
  const { user } = useSession();

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const attemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    attemptsRef.current = 0;
    setTimedOut(false);

    const poll = async () => {
      attemptsRef.current += 1;
      try {
        const registrations = await getMyRegistrations();
        const match = registrations.find((r) => r._id === eventId);
        if (cancelled) return;
        if (match?.qr_code_path) {
          setQrUrl(match.qr_code_path);
          return;
        }
      } catch {
        // ignore — keep polling until attempts run out
      }
      if (cancelled) return;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setTimedOut(true);
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => { cancelled = true; };
  }, [eventId, retryKey]);

  return (
    <View style={styles.screen}>
      {qrUrl ? (
        <>
          <View style={styles.qrCard}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
          </View>
          <Text style={styles.eventName}>{eventName}</Text>
          <View style={styles.studentBox}>
            <Text style={styles.studentName}>{user?.name || "Student"}</Text>
            <Text style={styles.studentId}>{user?.userId}</Text>
          </View>
          <Text style={styles.hint}>Show this QR at the event entrance to mark your attendance.</Text>
        </>
      ) : timedOut ? (
        <View style={styles.center}>
          <Text style={styles.timeoutTitle}>Still generating your QR</Text>
          <Text style={styles.timeoutCopy}>This is taking longer than usual. Check back from My Registrations in a moment.</Text>
          <Pressable onPress={() => setRetryKey((k) => k + 1)} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Generating your QR code…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  center: { alignItems: "center", justifyContent: "center", gap: spacing.md },
  loadingText: { color: colors.mutedText },
  qrCard: { backgroundColor: "white", borderRadius: radius.lg, borderWidth: 2, borderColor: colors.primaryLight, padding: spacing.md, ...shadow },
  qrImage: { width: 240, height: 240 },
  eventName: { color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  studentBox: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center", gap: 2 },
  studentName: { color: colors.text, fontWeight: "700", fontSize: 14 },
  studentId: { color: colors.mutedText, fontSize: 12 },
  hint: { color: colors.mutedText, fontSize: 12, textAlign: "center", paddingHorizontal: spacing.lg },
  timeoutTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  timeoutCopy: { color: colors.mutedText, textAlign: "center", lineHeight: 20 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
});
