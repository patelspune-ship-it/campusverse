import { Expo } from "expo-server-sdk";
import User from "../models/User.js";

const expo = new Expo();

// Fire-and-forget by design — never throws. A user with no push_token (push
// disabled, permission denied, or a token that's since expired/invalidated)
// is silently skipped; this must never affect the caller's own flow.
export async function sendPushNotification(userId, title, body, data = {}) {
  try {
    if (!userId) return;
    const user = await User.findById(userId).select("push_token");
    const token = user?.push_token;
    if (!token || !Expo.isExpoPushToken(token)) return;

    const messages = [{ to: token, sound: "default", title, body, data }];
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error("[push] sendPushNotification failed:", err.message ?? err);
  }
}
