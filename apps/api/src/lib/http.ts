import type { Role } from "@linkup/shared";
import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";
import { hashToken } from "./session.js";

const ROLES = new Set<Role>(["CANDIDATE", "RECRUITER", "EMPLOYER"]);

export function httpError(statusCode: number, code: string, message: string) {
  const error = new Error(message) as Error & { statusCode: number; code: string };
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.has(value as Role);
}

export function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (typeof header !== "string") return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) return null;
  return match[1].trim() || null;
}

export async function requireUser(request: FastifyRequest) {
  const token = extractBearerToken(request);
  if (!token) {
    throw httpError(401, "UNAUTHORIZED", "Informe o header Authorization: Bearer <token>.");
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    throw httpError(401, "UNAUTHORIZED", "Sessão inválida ou expirada. Entre de novo.");
  }

  return session.user;
}

export async function requireRole(request: FastifyRequest, allowed: Role | Role[]) {
  const user = await requireUser(request);
  if (!user.role) {
    throw httpError(403, "ROLE_REQUIRED", "Escolha um papel antes de continuar.");
  }
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!list.includes(user.role)) {
    throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
  }
  return user;
}
