import type { FastifyInstance } from "fastify";
import type { AnalysisSummary } from "@linkup/shared";
import { prisma } from "../lib/prisma.js";
import { httpError, requireUser } from "../lib/http.js";
import { readPdfUpload } from "../lib/pdf-upload.js";
import { runAnalysisPipeline, toAnalysisDetail } from "../services/analysis-pipeline.js";

export async function analysesRoutes(app: FastifyInstance) {
  app.post("/analyses", async (request, reply) => {
    const user = await requireUser(request);
    const file = await request.file();
    const { fileName, buffer } = await readPdfUpload(file);

    const detail = await runAnalysisPipeline({
      userId: user.id,
      fileName,
      buffer,
    });

    return reply.code(201).send(detail);
  });

  app.get("/analyses", async (request) => {
    const user = await requireUser(request);
    const rows = await prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        status: true,
        createdAt: true,
      },
    });

    const items: AnalysisSummary[] = rows.map((row) => ({
      id: row.id,
      fileName: row.fileName,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));

    return { items };
  });

  app.get("/analyses/:id", async (request) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const row = await prisma.analysis.findFirst({
      where: { id, userId: user.id },
    });
    if (!row) {
      throw httpError(404, "NOT_FOUND", "Análise não encontrada.");
    }
    return toAnalysisDetail(row);
  });
}
