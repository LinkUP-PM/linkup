import * as Crypto from "expo-crypto";

const ITERATIONS = 10_000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function derive(password: string, salt: string): Promise<string> {
  let hash = `${salt}:${password}`;
  for (let i = 0; i < ITERATIONS; i += 1) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash);
  }
  return hash;
}

export async function hashPassword(password: string): Promise<string> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = bytesToHex(saltBytes);
  const derived = await derive(password, salt);
  return `${salt}:${derived}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = await derive(password, salt);
  if (derived.length !== hash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < derived.length; i += 1) {
    mismatch |= derived.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return mismatch === 0;
}
