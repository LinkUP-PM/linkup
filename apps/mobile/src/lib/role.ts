import { Platform } from "react-native";
import type { Role } from "@linkup/shared";
import * as SecureStore from "expo-secure-store";

const KEY = "linkup-role";

const ROLES = new Set<Role>(["CANDIDATE", "RECRUITER", "EMPLOYER"]);

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.has(value as Role);
}

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
      // private mode — sessão só em memória via caller
    }
    return;
  }
  await SecureStore.setItemAsync(KEY, value);
}

export async function getStoredRole(): Promise<Role | null> {
  const value = await readStored();
  return isRole(value) ? value : null;
}

export async function setStoredRole(role: Role): Promise<void> {
  await writeStored(role);
}

export async function clearStoredRole(): Promise<void> {
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

export function homeHrefForRole(role: Role): string {
  if (role === "EMPLOYER") return "/(employer)";
  if (role === "RECRUITER") return "/(recruiter)";
  return "/(candidate)";
}
