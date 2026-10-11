import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { getOpenDrives } from "../../services/recruitment";
import type { RecruitmentDrive } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";

function formatDate(iso: string) {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function DrivesScreen() {
  const navigation = useNavigation<any>();
  const [drives, setDrives] = useState<RecruitmentDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setDrives(await getOpenDrives());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load recruitment drives.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.retry} onPress={() => load()}><Text style={styles.retryText}>Try again</Text></Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={drives}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Recruitment</Text>
            <Text style={styles.copy}>Open drives across clubs.</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("MyApplications")}>
            <Text style={styles.link}>My Applications</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => {
        const clubName = typeof item.club_id === "object" ? item.club_id.name : "";
        return (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate("RecruitmentApply", { drive: item })}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardClub}>{clubName}</Text>
            {item.roles_open.length > 0 && (
              <View style={styles.chipRow}>
                {item.roles_open.map((r) => (
                  <View key={r} style={styles.chip}><Text style={styles.chipText}>{r}</Text></View>
                ))}
              </View>
            )}
            <Text style={styles.deadline}>Apply by {formatDate(item.application_deadline)}</Text>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No open drives right now</Text>
          <Text style={styles.emptyCopy}>Check back later for recruitment opportunities.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  error: { color: colors.destructive, textAlign: "center", lineHeight: 21 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: spacing.sm, paddingBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  copy: { color: colors.mutedText, fontSize: 13, marginTop: 2 },
  link: { color: colors.primary, fontWeight: "800", fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  cardPressed: { opacity: 0.9 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  cardClub: { color: colors.primary, fontSize: 13, fontWeight: "700", marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  chip: { backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  deadline: { color: colors.mutedText, fontSize: 12, marginTop: spacing.sm },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  emptyCopy: { color: colors.mutedText, marginTop: 4, textAlign: "center" },
});
