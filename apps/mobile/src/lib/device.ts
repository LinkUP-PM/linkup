import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "linkup-device-id";

function createUuidV4(): string {
  // RFC 4122 variant bits without crypto polyfill differences across RN runtimes
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function readStoredId(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

async function writeStoredId(value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(KEY, value);
    } catch {
      // private mode / blocked storage — still return an in-memory id for the session
    }
    return;
  }
  await SecureStore.setItemAsync(KEY, value);
}

export async function getDeviceId(): Promise<string> {
  const existing = await readStoredId();
  if (existing) return existing;
  const created = createUuidV4();
  await writeStoredId(created);
  return created;
}
