import * as SecureStore from "expo-secure-store";
import type { CampusVerseUser } from "../types/api";

const TOKEN_KEY = "campusverse_token";
const USER_KEY = "campusverse_user";

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export async function saveSession(token: string, user: CampusVerseUser) {
  await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, token), SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))]);
}

export async function restoreSession() {
  const [token, rawUser] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(USER_KEY)]);
  if (!token || !rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) as CampusVerseUser };
  } catch {
    return null;
  }
}

export const clearSession = () => Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
