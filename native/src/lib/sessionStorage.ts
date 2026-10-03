import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AuthSession } from "./authSession";
import { API_BASE } from "./api";

// Scope credentials to the API environment; SecureStore keys accept only these characters.
const key =
  "bookpath.auth." +
  Array.from(API_BASE)
    .map((c) => c.charCodeAt(0).toString(16))
    .join("-");
let writes = Promise.resolve();
export async function readStoredSession(): Promise<string | null> {
  await writes;
  return Platform.OS === "web"
    ? typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}
export function storeSession(session: AuthSession | null) {
  const value = session ? JSON.stringify(session) : null;
  const write = writes
    .catch(() => {})
    .then(async () => {
      if (Platform.OS === "web") {
        if (value === null) window.sessionStorage.removeItem(key);
        else window.sessionStorage.setItem(key, value);
      } else if (value === null) await SecureStore.deleteItemAsync(key);
      else
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
    });
  writes = write.catch(() => {});
  return write;
}
