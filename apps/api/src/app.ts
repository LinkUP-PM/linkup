import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { config } from "./config.js";
import { analysesRoutes } from "./routes/analyses.js";
import { healthRoutes } from "./routes/health.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: { fileSize: config.maxPdfSizeBytes },
  });

  app.setErrorHandler((error: unknown, _request, reply) => {
    const err = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = err.statusCode ?? 500;
    const code = err.code ?? "INTERNAL";
    const safeCode = [
      "DEVICE_ID_REQUIRED",
      "INVALID_FILE",
      "FILE_TOO_LARGE",
      "TEXT_NOT_EXTRACTABLE",
      "TEXT_TOO_SHORT",
      "AI_UNAVAILABLE",
      "AI_INVALID_RESPONSE",
      "NOT_FOUND",
    ].includes(code)
      ? code
      : statusCode >= 500
        ? "AI_UNAVAILABLE"
        : code;

    reply.code(statusCode).send({
      error: safeCode,
      message: err.message ?? "Erro interno",
    });
  });

  await app.register(healthRoutes);
  await app.register(analysesRoutes);
  return app;
}
