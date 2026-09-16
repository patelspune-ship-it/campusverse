import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { apiRequest } from "../api/client";
import { navigate } from "../navigation/navigationRef";

// Foreground handler — without this, a notification that arrives while the
// app is open is silently swallowed instead of shown.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Requests permission, gets an Expo push token, and registers it with our
// backend. Every failure path (no physical device, permission denied, no
// EAS projectId configured, network error) resolves to `null` rather than
// throwing — push notifications are additive and must never break login.
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log("[push] Skipping — push notifications require a physical device.");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("[push] Skipping — permission not granted.");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.log("[push] Skipping — no EAS projectId configured (run `eas init`).");
      return null;
    }

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    await apiRequest("/user/register-push-token", { method: "POST", body: JSON.stringify({ push_token: pushToken }) });

    return pushToken;
  } catch (err) {
    console.log("[push] registerForPushNotifications failed (continuing without push):", err);
    return null;
  }
}

type NotificationData = { type?: string; eventId?: string; eventName?: string } | undefined;

function handleNotificationTap(data: NotificationData) {
  switch (data?.type) {
    case "registration":
      if (data.eventId) navigate("MyQR", { eventId: data.eventId, eventName: data.eventName ?? "" });
      break;
    case "certificate":
      if (data.eventId) navigate("Certificate", { eventId: data.eventId });
      break;
    case "verification_request":
      navigate("Tabs", { screen: "Verifications" });
      break;
    case "verification_decision":
      navigate("Tabs", { screen: "My Registrations" });
      break;
  }
}

// Handles both cold-start (app opened fresh by tapping a notification) and
// warm (app already running) taps. Returns an unsubscribe function.
export function setupNotificationResponseHandling() {
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleNotificationTap(response.notification.request.content.data as NotificationData);
  });

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationTap(response.notification.request.content.data as NotificationData);
  });

  return () => subscription.remove();
}
