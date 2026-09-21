import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";

const DEVICE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function httpError(statusCode: number, code: string, message: string) {
  const error = new Error(message) as Error & { statusCode: number; code: string };
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));
}
