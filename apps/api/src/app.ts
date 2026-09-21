import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { config } from "./config.js";
import { analysesRoutes } from "./routes/analyses.js";
import { healthRoutes } from "./routes/health.js";

const CONTRACT_CODES = new Set([
  "DEVICE_ID_REQUIRED",
  "INVALID_FILE",
  "FILE_TOO_LARGE",
  "TEXT_NOT_EXTRACTABLE",
  "TEXT_TOO_SHORT",
  "AI_UNAVAILABLE",
  "AI_INVALID_RESPONSE",
  "NOT_FOUND",
]);

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: { fileSize: config.maxPdfSizeBytes },
  });

  app.setErrorHandler((error: unknown, _request, reply) => {
    const err = error as { statusCode?: number; code?: string; message?: string };

    if (err.code === "FST_REQ_FILE_TOO_LARGE") {
      reply.code(400).send({
        error: "FILE_TOO_LARGE",
        message: `O PDF ultrapassa o limite de ${Math.round(config.maxPdfSizeBytes / (1024 * 1024))} MB.`,
      });
      return;
    }

    const statusCode = err.statusCode ?? 500;
    const code = err.code ?? "INTERNAL";
    const safeCode = CONTRACT_CODES.has(code)
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
