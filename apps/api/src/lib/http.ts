import type { Role } from "@linkup/shared";
import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

const DEVICE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function requireUser(request: FastifyRequest) {
  const deviceId = request.headers["x-device-id"];
  if (typeof deviceId !== "string" || !DEVICE_ID_RE.test(deviceId.trim())) {
    throw httpError(
      400,
      "DEVICE_ID_REQUIRED",
      "Informe o header X-Device-Id com um UUID válido.",
    );
  }

  return prisma.user.upsert({
    where: { deviceId: deviceId.trim() },
    update: {},
    create: { deviceId: deviceId.trim() },
  });
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
