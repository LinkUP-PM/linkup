import type { FastifyInstance } from "fastify";
import type { Job } from "@linkup/shared";
import { prisma } from "../lib/prisma.js";
import { httpError, requireRole, requireUser } from "../lib/http.js";
import { readPdfUpload } from "../lib/pdf-upload.js";
import { runAnalysisPipeline } from "../services/analysis-pipeline.js";
import { toApplicationSummary } from "./applications.js";

type JobCounts = {
  queueCount?: number;
  pendingDecisionCount?: number;
  forwardedCount?: number;
  adjustmentCount?: number;
  closedCount?: number;
};

function toJob(
  row: {
    id: string;
    title: string;
    description: string;
    lookingFor: string;
    employerId: string;
    createdAt: Date;
  },
  counts?: JobCounts,
): Job {
  const job: Job = {
    id: row.id,
    title: row.title,
    description: row.description,
    lookingFor: row.lookingFor,
    employerId: row.employerId,
    createdAt: row.createdAt.toISOString(),
  };
  if (counts?.queueCount !== undefined) {
    job.queueCount = counts.queueCount;
  }
  if (counts?.pendingDecisionCount !== undefined) {
    job.pendingDecisionCount = counts.pendingDecisionCount;
  }
  if (counts?.forwardedCount !== undefined) {
    job.forwardedCount = counts.forwardedCount;
  }
  if (counts?.adjustmentCount !== undefined) {
    job.adjustmentCount = counts.adjustmentCount;
  }
  if (counts?.closedCount !== undefined) {
    job.closedCount = counts.closedCount;
  }
  return job;
}

function trimRequired(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length < 3) {
    throw httpError(400, "INVALID_BODY", `Informe ${field} com pelo menos 3 caracteres.`);
  }
  return value.trim();
}

type StatusCounts = {
  submitted: number;
  forwarded: number;
  adjustment: number;
  closed: number;
};

async function countsForJobs(jobIds: string[]): Promise<Map<string, StatusCounts>> {
  const map = new Map<string, StatusCounts>();
  for (const id of jobIds) {
    map.set(id, { submitted: 0, forwarded: 0, adjustment: 0, closed: 0 });
  }
  if (jobIds.length === 0) return map;

  const groups = await prisma.application.groupBy({
    by: ["jobId", "status"],
    where: { jobId: { in: jobIds } },
    _count: { _all: true },
  });

  for (const row of groups) {
    const entry = map.get(row.jobId);
    if (!entry) continue;
    if (row.status === "SUBMITTED") entry.submitted = row._count._all;
    else if (row.status === "FORWARDED") entry.forwarded = row._count._all;
    else if (row.status === "ADJUSTMENT_REQUESTED") entry.adjustment = row._count._all;
    else if (
      row.status === "DISCARDED" ||
      row.status === "ACCEPTED" ||
      row.status === "REJECTED"
    ) {
      entry.closed += row._count._all;
    }
  }
  return map;
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

    const counts = await countsForJobs(rows.map((r) => r.id));

    return {
      items: rows.map((row) => {
        const c = counts.get(row.id) ?? {
          submitted: 0,
          forwarded: 0,
          adjustment: 0,
          closed: 0,
        };
        if (user.role === "RECRUITER") {
          return toJob(row, {
            queueCount: c.submitted,
            forwardedCount: c.forwarded,
            adjustmentCount: c.adjustment,
            closedCount: c.closed,
          });
        }
        if (user.role === "EMPLOYER") {
          return toJob(row, { pendingDecisionCount: c.forwarded });
        }
        return toJob(row);
      }),
    };
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

    const counts = await countsForJobs([row.id]);
    const c = counts.get(row.id) ?? {
      submitted: 0,
      forwarded: 0,
      adjustment: 0,
      closed: 0,
    };
    if (user.role === "RECRUITER") {
      return toJob(row, {
        queueCount: c.submitted,
        forwardedCount: c.forwarded,
        adjustmentCount: c.adjustment,
        closedCount: c.closed,
      });
    }
    if (user.role === "EMPLOYER") {
      return toJob(row, { pendingDecisionCount: c.forwarded });
    }
    return toJob(row);
  });

  app.get("/jobs/:id/applications", async (request) => {
    const user = await requireUser(request);
    if (!user.role) {
      throw httpError(403, "ROLE_REQUIRED", "Escolha um papel antes de continuar.");
    }
    if (user.role === "CANDIDATE") {
      throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
    }

    const { id: jobId } = request.params as { id: string };

    if (user.role === "EMPLOYER") {
      const job = await prisma.job.findFirst({
        where: { id: jobId, employerId: user.id },
      });
      if (!job) {
        throw httpError(404, "NOT_FOUND", "Vaga não encontrada.");
      }

      const rows = await prisma.application.findMany({
        where: {
          jobId,
          status: { notIn: ["SUBMITTED", "DISCARDED"] },
        },
        orderBy: { updatedAt: "desc" },
        include: { job: { select: { title: true, employerId: true } } },
      });

      return {
        items: rows.map((row) => toApplicationSummary(row)),
      };
    }

    // RECRUITER
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw httpError(404, "NOT_FOUND", "Vaga não encontrada.");
    }

    const rows = await prisma.application.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      include: {
        job: { select: { title: true, employerId: true } },
        candidate: { select: { email: true } },
        analysis: { select: { resultJson: true } },
      },
    });

    return {
      items: rows.map((row) =>
        toApplicationSummary(row, {
          includeDecisionMessage: true,
          recruiterPreview: true,
        }),
      ),
    };
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
        include: { job: { select: { title: true, employerId: true } } },
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
