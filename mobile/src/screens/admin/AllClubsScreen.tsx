import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../../api/client";
import { getAllClubs } from "../../services/admin";
import type { AdminClub } from "../../types/api";
import { colors, radius, spacing } from "../../theme/theme";

export function AllClubsScreen() {
  const [clubs, setClubs] = useState<AdminClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setClubs(await getAllClubs());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load clubs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      data={clubs}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>All Clubs</Text>
          <Text style={styles.copy}>{clubs.length} club{clubs.length !== 1 ? "s" : ""} across the platform.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            <View style={[styles.profileBadge, item.profile_completed ? styles.profileComplete : styles.profileIncomplete]}>
              <Text style={[styles.profileBadgeText, item.profile_completed ? styles.profileCompleteText : styles.profileIncompleteText]}>
                {item.profile_completed ? "Profile complete" : "Incomplete profile"}
              </Text>
            </View>
          </View>
          <Text style={styles.institute}>{item.institute_id?.name ?? "University-wide"}</Text>
          <View style={styles.metaRow}>
            {item.category ? <Text style={styles.category}>{item.category}</Text> : <Text style={styles.categoryMuted}>No category</Text>}
            <Text style={styles.eventCount}>{item.eventCount} events</Text>
          </View>
          {item.admin && <Text style={styles.admin}>Admin: {item.admin.email || item.admin.userId}</Text>}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No clubs found</Text>
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
  header: { paddingTop: spacing.sm, paddingBottom: spacing.lg },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  copy: { color: colors.mutedText, fontSize: 13, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  name: { color: colors.text, fontSize: 15, fontWeight: "800", flex: 1 },
  profileBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  profileComplete: { backgroundColor: "#E6FAF2" },
  profileIncomplete: { backgroundColor: "#FFF6DB" },
  profileBadgeText: { fontSize: 10, fontWeight: "700" },
  profileCompleteText: { color: "#1B8E63" },
  profileIncompleteText: { color: "#825700" },
  institute: { color: colors.mutedText, fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm },
  category: { color: colors.primary, backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  categoryMuted: { color: colors.mutedText, backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, fontSize: 11, fontWeight: "600" },
  eventCount: { color: colors.mutedText, fontSize: 12, fontWeight: "600" },
  admin: { color: colors.mutedText, fontSize: 11, marginTop: 6 },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
});
