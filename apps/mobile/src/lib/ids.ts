import * as Crypto from "expo-crypto";

export async function createId(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(12);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `c${Date.now().toString(36)}${hex}`;
}

export async function createSessionToken(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashToken(token: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token);
}
