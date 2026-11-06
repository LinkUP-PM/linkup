import type { FastifyInstance } from "fastify";
import type {
  Job,
  JobContractType,
  JobInput,
  JobSeniority,
  JobStage,
  JobStatus,
  WorkModel,
} from "@linkup/shared";
import {
  canPublishJob,
  DEFAULT_JOB_STAGES,
  isJobContractType,
  isJobSeniority,
  isJobStatus,
  isWorkModel,
  lookingForFromRequirements,
  normalizeJobStages,
  normalizeStringList,
} from "@linkup/shared";
import { appendApplicationEvent } from "../lib/application-events.js";
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

type JobRow = {
  id: string;
  title: string;
  description: string;
  lookingFor: string;
  status: JobStatus;
  seniority: JobSeniority | null;
  contractType: JobContractType | null;
  openings: number;
  pcdExclusive: boolean;
  workModel: WorkModel | null;
  city: string | null;
  state: string | null;
  responsibilities: string;
  requirementsJson: unknown;
  niceToHaveJson: unknown;
  benefitsJson: unknown;
  salaryMin: number | null;
  salaryMax: number | null;
  additionalInfo: string;
  stagesJson: unknown;
  publishedAt: Date | null;
  employerId: string;
  createdAt: Date;
};

function asStringList(value: unknown): string[] {
  return normalizeStringList(value);
}

function asStages(value: unknown): JobStage[] {
  return normalizeJobStages(value);
}

function toJob(row: JobRow, counts?: JobCounts): Job {
  const job: Job = {
    id: row.id,
    title: row.title,
    description: row.description,
    lookingFor: row.lookingFor,
    employerId: row.employerId,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    seniority: row.seniority,
    contractType: row.contractType,
    openings: row.openings,
    pcdExclusive: row.pcdExclusive,
    workModel: row.workModel,
    city: row.city,
    state: row.state,
    responsibilities: row.responsibilities,
    requirements: asStringList(row.requirementsJson),
    niceToHave: asStringList(row.niceToHaveJson),
    benefits: asStringList(row.benefitsJson),
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    additionalInfo: row.additionalInfo,
    stages: asStages(row.stagesJson),
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
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

function optionalTrimmed(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parseOptionalEnum<T extends string>(
  value: unknown,
  guard: (v: unknown) => v is T,
): T | null {
  if (value === null || value === undefined || value === "") return null;
  if (!guard(value)) {
    throw httpError(400, "INVALID_BODY", "Valor inválido no formulário da vaga.");
  }
  return value;
}

function parseOpenings(value: unknown): number {
  if (value === undefined || value === null || value === "") return 1;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    throw httpError(400, "INVALID_BODY", "Quantidade de posições deve ser entre 1 e 99.");
  }
  return n;
}

function parseOptionalSalary(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) {
    throw httpError(400, "INVALID_BODY", `${field} inválido.`);
  }
  return n;
}

type NormalizedJobFields = {
  title: string;
  description: string;
  lookingFor: string;
  status: JobStatus;
  seniority: JobSeniority | null;
  contractType: JobContractType | null;
  openings: number;
  pcdExclusive: boolean;
  workModel: WorkModel | null;
  city: string | null;
  state: string | null;
  responsibilities: string;
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  additionalInfo: string;
  stages: JobStage[];
};

function normalizeJobBody(body: JobInput, opts: { publish: boolean }): NormalizedJobFields {
  const title = optionalTrimmed(body.title);
  if (title.length < 3) {
    throw httpError(400, "INVALID_BODY", "Informe um título com pelo menos 3 caracteres.");
  }

  const status: JobStatus = opts.publish
    ? "PUBLISHED"
    : isJobStatus(body.status)
      ? body.status
      : "DRAFT";

  const description = optionalTrimmed(body.description);
  const responsibilities = optionalTrimmed(body.responsibilities);
  const additionalInfo = optionalTrimmed(body.additionalInfo);
  const requirements = normalizeStringList(body.requirements);
  const niceToHave = normalizeStringList(body.niceToHave);
  const benefits = normalizeStringList(body.benefits);
  const stages =
    body.stages === undefined ? [...DEFAULT_JOB_STAGES] : normalizeJobStages(body.stages);

  const seniority = parseOptionalEnum(body.seniority, isJobSeniority);
  const contractType = parseOptionalEnum(body.contractType, isJobContractType);
  const workModel = parseOptionalEnum(body.workModel, isWorkModel);
  const openings = parseOpenings(body.openings);
  const pcdExclusive = Boolean(body.pcdExclusive);
  const cityRaw = optionalTrimmed(body.city);
  const stateRaw = optionalTrimmed(body.state).toUpperCase();
  const city = cityRaw.length > 0 ? cityRaw : null;
  const state = stateRaw.length > 0 ? stateRaw : null;

  let salaryMin = parseOptionalSalary(body.salaryMin, "Salário mínimo");
  let salaryMax = parseOptionalSalary(body.salaryMax, "Salário máximo");
  if ((salaryMin !== null && salaryMax === null) || (salaryMin === null && salaryMax !== null)) {
    throw httpError(400, "INVALID_BODY", "Informe a faixa salarial completa ou deixe em branco.");
  }
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    throw httpError(400, "INVALID_BODY", "O salário mínimo não pode ser maior que o máximo.");
  }

  const lookingFor =
    requirements.length > 0
      ? lookingForFromRequirements(requirements)
      : optionalTrimmed(body.lookingFor);

  if (status === "PUBLISHED" || opts.publish) {
    const err = canPublishJob({
      title,
      description,
      workModel,
      city,
      state,
      seniority,
      contractType,
      requirements,
    });
    if (err) throw httpError(400, "INVALID_BODY", err);
  }

  return {
    title,
    description,
    lookingFor,
    status: opts.publish ? "PUBLISHED" : status,
    seniority,
    contractType,
    openings,
    pcdExclusive,
    workModel,
    city,
    state,
    responsibilities,
    requirements,
    niceToHave,
    benefits,
    salaryMin,
    salaryMax,
    additionalInfo,
    stages,
  };
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

function withCounts(row: JobRow, role: string | null | undefined, c: StatusCounts): Job {
  if (role === "RECRUITER") {
    return toJob(row, {
      queueCount: c.submitted,
      forwardedCount: c.forwarded,
      adjustmentCount: c.adjustment,
      closedCount: c.closed,
    });
  }
  if (role === "EMPLOYER") {
    return toJob(row, { pendingDecisionCount: c.forwarded });
  }
  return toJob(row);
}

export async function jobsRoutes(app: FastifyInstance) {
  app.post("/jobs", async (request, reply) => {
    const user = await requireRole(request, "EMPLOYER");
    const body = (request.body ?? {}) as JobInput;
    const publish = body.status === "PUBLISHED";
    const fields = normalizeJobBody(body, { publish });
    const now = new Date();

    const job = await prisma.job.create({
      data: {
        title: fields.title,
        description: fields.description,
        lookingFor: fields.lookingFor,
        status: fields.status,
        seniority: fields.seniority,
        contractType: fields.contractType,
        openings: fields.openings,
        pcdExclusive: fields.pcdExclusive,
        workModel: fields.workModel,
        city: fields.city,
        state: fields.state,
        responsibilities: fields.responsibilities,
        requirementsJson: fields.requirements,
        niceToHaveJson: fields.niceToHave,
        benefitsJson: fields.benefits,
        salaryMin: fields.salaryMin,
        salaryMax: fields.salaryMax,
        additionalInfo: fields.additionalInfo,
        stagesJson: fields.stages,
        publishedAt: fields.status === "PUBLISHED" ? now : null,
        employerId: user.id,
      },
    });

    return reply.code(201).send(toJob(job as JobRow));
  });

  app.patch("/jobs/:id", async (request) => {
    const user = await requireRole(request, "EMPLOYER");
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as JobInput;
    const publish = body.status === "PUBLISHED";
    const fields = normalizeJobBody(body, { publish });

    const existing = await prisma.job.findFirst({
      where: { id, employerId: user.id },
    });
    if (!existing) {
      throw httpError(404, "NOT_FOUND", "Vaga não encontrada.");
    }

    const now = new Date();
    const publishedAt =
      fields.status === "PUBLISHED"
        ? (existing.publishedAt ?? now)
        : existing.publishedAt;

    const job = await prisma.job.update({
      where: { id },
      data: {
        title: fields.title,
        description: fields.description,
        lookingFor: fields.lookingFor,
        status: fields.status,
        seniority: fields.seniority,
        contractType: fields.contractType,
        openings: fields.openings,
        pcdExclusive: fields.pcdExclusive,
        workModel: fields.workModel,
        city: fields.city,
        state: fields.state,
        responsibilities: fields.responsibilities,
        requirementsJson: fields.requirements,
        niceToHaveJson: fields.niceToHave,
        benefitsJson: fields.benefits,
        salaryMin: fields.salaryMin,
        salaryMax: fields.salaryMax,
        additionalInfo: fields.additionalInfo,
        stagesJson: fields.stages,
        publishedAt,
      },
    });

    return toJob(job as JobRow);
  });

  app.get("/jobs", async (request) => {
    const user = await requireUser(request);
    if (!user.role) {
      throw httpError(403, "ROLE_REQUIRED", "Escolha um papel antes de continuar.");
    }

    const rows = await prisma.job.findMany({
      where:
        user.role === "EMPLOYER"
          ? { employerId: user.id }
          : { status: "PUBLISHED" },
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
        return withCounts(row as JobRow, user.role, c);
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
          : { id, status: "PUBLISHED" },
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
    return withCounts(row as JobRow, user.role, c);
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
    const job = await prisma.job.findFirst({
      where: { id: jobId, status: "PUBLISHED" },
    });
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

    const job = await prisma.job.findFirst({
      where: { id: jobId, status: "PUBLISHED" },
    });
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
      await appendApplicationEvent(application.id, "SUBMITTED", application.createdAt);

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
