import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ApiError } from "../../api/client";
import { getAdminStats } from "../../services/admin";
import type { AdminStats } from "../../types/api";
import { colors, radius, shadow, spacing } from "../../theme/theme";

export function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setStats(await getAdminStats());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load platform stats.");
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>Platform Overview</Text>
      <Text style={styles.copy}>Live stats across the whole platform.</Text>

      <View style={styles.statsGrid}>
        <Stat label="Students" value={stats?.students} />
        <Stat label="Clubs" value={stats?.clubs} />
        <Stat label="Institutes" value={stats?.institutes} />
        <Stat label="Total Events" value={stats?.events} />
        <Stat label="Pending Approvals" value={stats?.pendingEvents} highlight={!!stats?.pendingEvents} />
        <Stat label="Upcoming Events" value={stats?.upcomingEvents} />
      </View>

      <Text style={styles.sectionTitle}>Manage</Text>
      <NavRow label="Pending Approvals" count={stats?.pendingEvents} onPress={() => navigation.navigate("AdminPendingApprovals")} />
      <NavRow label="All Events" count={stats?.events} onPress={() => navigation.navigate("AdminAllEvents")} />
      <NavRow label="All Clubs" count={stats?.clubs} onPress={() => navigation.navigate("AdminAllClubs")} />
    </ScrollView>
  );
}

function Stat({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value ?? "—"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NavRow({ label, count, onPress }: { label: string; count?: number; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]} onPress={onPress}>
      <Text style={styles.navRowLabel}>{label}</Text>
      <View style={styles.navRowRight}>
        {count !== undefined && <Text style={styles.navRowCount}>{count}</Text>}
        <Text style={styles.navRowArrow}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  error: { color: colors.destructive, textAlign: "center", lineHeight: 21 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: "white", fontWeight: "800" },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: spacing.sm },
  copy: { color: colors.mutedText, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: { width: "31%", backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border, ...shadow },
  statHighlight: { borderColor: "#F5D87E", backgroundColor: "#FFF6DB" },
  statValue: { color: colors.primary, fontSize: 20, fontWeight: "800" },
  statValueHighlight: { color: "#825700" },
  statLabel: { color: colors.mutedText, fontSize: 10, fontWeight: "600", marginTop: 2 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "800", marginTop: spacing.xl, marginBottom: spacing.sm },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  navRowPressed: { opacity: 0.9 },
  navRowLabel: { color: colors.text, fontSize: 14, fontWeight: "700" },
  navRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  navRowCount: { color: colors.mutedText, fontSize: 13, fontWeight: "700" },
  navRowArrow: { color: colors.mutedText, fontSize: 18, fontWeight: "700" },
});
