import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/theme";
export function AppLoadingScreen() { return <View style={styles.container}><Text style={styles.brand}>CampusVerse</Text><ActivityIndicator color={colors.accent} size="large" /></View>; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", gap: 18 }, brand: { color: "white", fontSize: 30, fontWeight: "800" } });
