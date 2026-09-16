import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSession } from "../../context/SessionContext";
import { ApiError } from "../../api/client";
import {
  colors,
  radius,
  shadow,
  spacing,
} from "../../theme/theme";

export function LoginScreen() {
  const { signIn } = useSession();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!userId.trim() || !password) {
      setError("Enter your College ID / PRN and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signIn(userId, password);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      {/* Branding */}
      <View style={styles.hero}>
        <Image
          source={require("../../../assets/mit-adt-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.brand}>CampusVerse</Text>

        <Text style={styles.tagline}>
          Your campus, connected.
        </Text>
      </View>

      {/* Login Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>

        <Text style={styles.copy}>
          Sign in with the College ID / PRN and password you use on CampusVerse.
        </Text>

        {/* College ID */}
        <Text style={styles.label}>College ID / PRN</Text>

        <TextInput
          value={userId}
          onChangeText={setUserId}
          placeholder="Enter your ID"
          placeholderTextColor={colors.mutedText}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          editable={!loading}
        />

        {/* Password */}
        <Text style={styles.label}>Password</Text>

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor={colors.mutedText}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          editable={!loading}
          onSubmitEditing={submit}
        />

        {/* Error */}
        <Text style={styles.error}>{error}</Text>

        {/* Login Button */}
        <Pressable
          onPress={submit}
          disabled={loading}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonLoading,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <Text style={styles.note}>
          CampusVerse uses your existing university account.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: spacing.lg,
  },

  hero: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  logo: {
    width: 150,
    height: 90,
    marginBottom: spacing.md,
  },

  brand: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: "800",
  },

  tagline: {
    color: colors.mutedText,
    fontSize: 15,
    marginTop: 4,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },

  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },

  copy: {
    color: colors.mutedText,
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },

  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.md,
  },

  error: {
    color: colors.destructive,
    minHeight: 19,
    fontSize: 13,
    marginBottom: spacing.sm,
  },

  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  buttonPressed: {
    opacity: 0.86,
  },

  buttonLoading: {
    opacity: 0.7,
  },

  buttonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },

  note: {
    color: colors.mutedText,
    textAlign: "center",
    fontSize: 12,
    marginTop: spacing.lg,
  },
});