import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { checkIsRegistered, registerForEvent } from "../../services/events";
import { colors, radius, shadow, spacing } from "../../theme/theme";

export function EventDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { event } = route.params;

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");

  const loadStatus = useCallback(async () => {
    setCheckingStatus(true);
    setStatusError("");
    try {
      const { isRegistered: registered } = await checkIsRegistered(event._id);
      setIsRegistered(registered);
    } catch (cause) {
      setStatusError(cause instanceof ApiError ? cause.message : "Could not check registration status.");
    } finally {
      setCheckingStatus(false);
    }
  }, [event._id]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const date = new Date(event.date);
  const formattedDate = isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const isFull = (event.registrationCount ?? 0) >= event.max_participants;

  const handleRegister = async () => {
    setRegistering(true);
    setRegisterError("");
    try {
      await registerForEvent(event._id);
      navigation.navigate("MyQR", { eventId: event._id, eventName: event.name });
    } catch (cause) {
      setRegisterError(cause instanceof ApiError ? cause.message : "Could not register for this event.");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {event.poster_url ? <Image source={{ uri: event.poster_url }} style={styles.poster} /> : <View style={styles.posterPlaceholder}><Text style={styles.posterMark}>CV</Text></View>}

      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.category}>{event.category}</Text>
          <Text style={styles.club}>{event.club_id?.name || "CampusVerse Club"}</Text>
        </View>

        <Text style={styles.title}>{event.name}</Text>
        <Text style={styles.description}>{event.description}</Text>

        <View style={styles.infoCard}>
          <InfoRow label="Date" value={formattedDate} />
          <InfoRow label="Time" value={`${event.start_time} – ${event.end_time}`} />
          <InfoRow label="Venue" value={event.venue} />
          <InfoRow label="Capacity" value={`${event.registrationCount ?? 0} / ${event.max_participants} registered`} />
          {!!event.registration_fee && <InfoRow label="Fee" value={`₹${event.registration_fee}`} />}
        </View>

        {checkingStatus ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : statusError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{statusError}</Text>
            <Pressable onPress={loadStatus} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : isRegistered ? (
          <View style={styles.registeredBox}>
            <Text style={styles.registeredText}>You're registered ✓</Text>
            <Pressable onPress={() => navigation.navigate("MyQR", { eventId: event._id, eventName: event.name })}>
              <Text style={styles.link}>View my QR</Text>
            </Pressable>
          </View>
        ) : isFull ? (
          <View style={styles.fullBox}><Text style={styles.fullText}>This event is full</Text></View>
        ) : (
          <>
            {!!registerError && <Text style={styles.registerError}>{registerError}</Text>}
            <Pressable onPress={handleRegister} disabled={registering} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, registering && styles.buttonLoading]}>
              {registering ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Register</Text>}
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  poster: { height: 200, width: "100%" },
  posterPlaceholder: { height: 160, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  posterMark: { color: colors.primary, fontSize: 40, fontWeight: "800" },
  body: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  category: { color: colors.primary, backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  club: { color: colors.mutedText, fontSize: 13, fontWeight: "600" },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", lineHeight: 30 },
  description: { color: colors.text, fontSize: 15, lineHeight: 21 },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 10, marginTop: spacing.xs, ...shadow },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { color: colors.mutedText, fontSize: 13, fontWeight: "600" },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  center: { paddingVertical: spacing.lg, alignItems: "center" },
  errorBox: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: "center", marginTop: spacing.sm },
  errorText: { color: colors.destructive, textAlign: "center", lineHeight: 20 },
  retry: { backgroundColor: colors.primaryLight, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10, marginTop: spacing.md },
  retryText: { color: colors.primary, fontWeight: "800" },
  registeredBox: { backgroundColor: colors.accentLight, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent, padding: spacing.md, alignItems: "center", gap: 4, marginTop: spacing.sm },
  registeredText: { color: colors.text, fontWeight: "800", fontSize: 15 },
  link: { color: colors.primary, fontWeight: "800", fontSize: 14 },
  fullBox: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: "center", marginTop: spacing.sm },
  fullText: { color: colors.mutedText, fontWeight: "700" },
  registerError: { color: colors.destructive, fontSize: 13, marginTop: spacing.sm },
  button: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.sm },
  buttonPressed: { opacity: 0.86 },
  buttonLoading: { opacity: 0.7 },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
});
