import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string): Promise<string> {
  const token = createSessionToken();
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}
