import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function requireUser(request: FastifyRequest) {
  const deviceId = request.headers["x-device-id"];
  if (typeof deviceId !== "string" || deviceId.trim().length < 8) {
    const error = new Error("Informe o header X-Device-Id.");
    (error as Error & { statusCode?: number; code?: string }).statusCode = 400;
    (error as Error & { statusCode?: number; code?: string }).code = "DEVICE_ID_REQUIRED";
    throw error;
  }

  return prisma.user.upsert({
    where: { deviceId: deviceId.trim() },
    update: {},
    create: { deviceId: deviceId.trim() },
  });
}

export function httpError(statusCode: number, code: string, message: string) {
  const error = new Error(message) as Error & { statusCode: number; code: string };
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));
}
