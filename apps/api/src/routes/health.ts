import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { httpError } from "../lib/http.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch {
      throw httpError(503, "INTERNAL", "Banco de dados indisponível.");
    }
  });
}
