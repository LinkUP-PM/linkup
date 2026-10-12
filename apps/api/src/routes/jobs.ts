import type { FastifyInstance } from "fastify";
import type { ApplicationSummary, Job } from "@linkup/shared";
import { prisma } from "../lib/prisma.js";
import { httpError, requireRole, requireUser } from "../lib/http.js";
import { readPdfUpload } from "../lib/pdf-upload.js";
import { runAnalysisPipeline } from "../services/analysis-pipeline.js";

function toJob(row: {
  id: string;
  title: string;
  description: string;
  lookingFor: string;
  employerId: string;
  createdAt: Date;
}): Job {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    lookingFor: row.lookingFor,
    employerId: row.employerId,
    createdAt: row.createdAt.toISOString(),
  };
}

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

function trimRequired(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length < 3) {
    throw httpError(400, "INVALID_BODY", `Informe ${field} com pelo menos 3 caracteres.`);
  }
  return value.trim();
}

export async function jobsRoutes(app: FastifyInstance) {
  app.post("/jobs", async (request, reply) => {
    const user = await requireRole(request, "EMPLOYER");
    const body = (request.body ?? {}) as {
      title?: unknown;
      description?: unknown;
      lookingFor?: unknown;
    };

    const title = trimRequired(body.title, "title");
    const description = trimRequired(body.description, "description");
    const lookingFor = trimRequired(body.lookingFor, "lookingFor");

    const job = await prisma.job.create({
      data: {
        title,
        description,
        lookingFor,
        employerId: user.id,
      },
    });

    return reply.code(201).send(toJob(job));
  });

  app.get("/jobs", async (request) => {
    const user = await requireUser(request);
    if (!user.role) {
      throw httpError(403, "ROLE_REQUIRED", "Escolha um papel antes de continuar.");
    }

    const rows = await prisma.job.findMany({
      where: user.role === "EMPLOYER" ? { employerId: user.id } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return { items: rows.map(toJob) };
  });

  app.get("/jobs/:id", async (request) => {
    const user = await requireUser(request);
    if (!user.role) {
      throw httpError(403, "ROLE_REQUIRED", "Escolha um papel antes de continuar.");
    }

    const { id } = request.params as { id: string };
    const row = await prisma.job.findFirst({
      where:
        user.role === "EMPLOYER"
          ? { id, employerId: user.id }
          : { id },
    });

    if (!row) {
      throw httpError(404, "NOT_FOUND", "Vaga não encontrada.");
    }

    return toJob(row);
  });

  app.post("/jobs/:id/applications", async (request, reply) => {
    const user = await requireRole(request, "CANDIDATE");
    const { id: jobId } = request.params as { id: string };

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw httpError(404, "NOT_FOUND", "Vaga não encontrada.");
    }

    const existing = await prisma.application.findUnique({
      where: {
        jobId_candidateId: { jobId, candidateId: user.id },
      },
    });
    if (existing) {
      throw httpError(409, "ALREADY_APPLIED", "Você já se candidatou a esta vaga.");
    }

    const file = await request.file();
    const { fileName, buffer } = await readPdfUpload(file);
    const analysis = await runAnalysisPipeline({
      userId: user.id,
      fileName,
      buffer,
    });

    try {
      const application = await prisma.application.create({
        data: {
          jobId,
          candidateId: user.id,
          analysisId: analysis.id,
          status: "SUBMITTED",
        },
        include: { job: { select: { title: true } } },
      });

      return reply.code(201).send(toApplicationSummary(application));
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        throw httpError(409, "ALREADY_APPLIED", "Você já se candidatou a esta vaga.");
      }
      throw err;
    }
  });
}
