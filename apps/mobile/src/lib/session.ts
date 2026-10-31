import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "linkup-session-token";

async function readStored(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

async function writeStored(value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(KEY, value);
    } catch {
      // private mode — caller keeps token in memory only this session
    }
    return;
  }
  await SecureStore.setItemAsync(KEY, value);
}

export async function getSessionToken(): Promise<string | null> {
  return readStored();
}

export async function setSessionToken(token: string): Promise<void> {
  await writeStored(token);
}

export async function clearSessionToken(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
