import type { FastifyInstance } from "fastify";
import type { ApplicationSummary } from "@linkup/shared";
import { prisma } from "../lib/prisma.js";
import { httpError, requireRole } from "../lib/http.js";

function toApplicationSummary(row: {
  id: string;
  jobId: string;
  status: ApplicationSummary["status"];
  analysisId: string;
  createdAt: Date;
  updatedAt: Date;
  job: { title: string };
}): ApplicationSummary {
  return {
    id: row.id,
    jobId: row.jobId,
    jobTitle: row.job.title,
    status: row.status,
    analysisId: row.analysisId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function applicationsRoutes(app: FastifyInstance) {
  app.get("/applications", async (request) => {
    const user = await requireRole(request, "CANDIDATE");
    const rows = await prisma.application.findMany({
      where: { candidateId: user.id },
      orderBy: { createdAt: "desc" },
      include: { job: { select: { title: true } } },
    });

    return { items: rows.map(toApplicationSummary) };
  });

  app.get("/applications/:id", async (request) => {
    const user = await requireRole(request, "CANDIDATE");
    const { id } = request.params as { id: string };
    const row = await prisma.application.findFirst({
      where: { id, candidateId: user.id },
      include: { job: { select: { title: true } } },
    });

    if (!row) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }

    return toApplicationSummary(row);
  });
}
