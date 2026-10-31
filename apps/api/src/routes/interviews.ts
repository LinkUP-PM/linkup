import type { FastifyInstance } from "fastify";
import type { Interview, InterviewRespondAction, InterviewStatus } from "@linkup/shared";
import { prisma } from "../lib/prisma.js";
import { httpError, requireRole, requireUser } from "../lib/http.js";
import { toApplicationDetail } from "./applications.js";

type InterviewWithApp = {
  id: string;
  applicationId: string;
  scheduledAt: Date;
  status: InterviewStatus;
  createdAt: Date;
  respondedAt: Date | null;
  application: {
    jobId: string;
    candidateId: string;
    status: string;
    job: { title: string; employerId: string };
    candidate: { email: string };
  };
};

function toInterview(
  row: InterviewWithApp,
  includeEmail: boolean,
): Interview {
  const interview: Interview = {
    id: row.id,
    applicationId: row.applicationId,
    jobId: row.application.jobId,
    jobTitle: row.application.job.title,
    scheduledAt: row.scheduledAt.toISOString(),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
  };
  if (includeEmail) {
    interview.candidateEmail = row.application.candidate.email;
  }
  return interview;
}

function assertFutureIso(value: unknown): Date {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, "INVALID_BODY", "Informe scheduledAt em ISO 8601.");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw httpError(400, "INVALID_BODY", "Informe uma data e hora válidas.");
  }
  if (date.getTime() <= Date.now()) {
    throw httpError(400, "INVALID_BODY", "A entrevista precisa ser no futuro.");
  }
  return date;
}

const interviewInclude = {
  application: {
    include: {
      job: { select: { title: true, employerId: true } },
      candidate: { select: { email: true } },
    },
  },
} as const;

const applicationDetailInclude = {
  job: { select: { title: true, employerId: true } },
  candidate: { select: { email: true } },
  analysis: true,
  noteEntries: { orderBy: { createdAt: "desc" as const } },
  interviews: { orderBy: { createdAt: "desc" as const } },
};

export async function interviewsRoutes(app: FastifyInstance) {
  app.get("/interviews", async (request) => {
    const user = await requireUser(request);
    if (!user.role) {
      throw httpError(403, "ROLE_REQUIRED", "Escolha um papel antes de continuar.");
    }

    if (user.role === "CANDIDATE") {
      const rows = await prisma.interview.findMany({
        where: { application: { candidateId: user.id } },
        orderBy: { scheduledAt: "asc" },
        include: interviewInclude,
      });
      return { items: rows.map((row) => toInterview(row, false)) };
    }

    if (user.role === "EMPLOYER") {
      const rows = await prisma.interview.findMany({
        where: { application: { job: { employerId: user.id } } },
        orderBy: { scheduledAt: "asc" },
        include: interviewInclude,
      });
      return { items: rows.map((row) => toInterview(row, true)) };
    }

    if (user.role === "RECRUITER") {
      const rows = await prisma.interview.findMany({
        orderBy: { scheduledAt: "asc" },
        include: interviewInclude,
      });
      return { items: rows.map((row) => toInterview(row, true)) };
    }

    throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
  });

  app.post("/applications/:id/interviews", async (request) => {
    const user = await requireRole(request, "EMPLOYER");
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { scheduledAt?: unknown };
    const scheduledAt = assertFutureIso(body.scheduledAt);

    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: { select: { employerId: true, title: true } } },
    });
    if (!application) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }
    if (application.job.employerId !== user.id) {
      throw httpError(403, "FORBIDDEN", "Esta vaga não é sua.");
    }
    if (application.status !== "ACCEPTED") {
      throw httpError(
        409,
        "INVALID_TRANSITION",
        "Só é possível marcar entrevista depois de aceitar o candidato.",
      );
    }

    const active = await prisma.interview.findMany({
      where: {
        applicationId: id,
        status: { in: ["PROPOSED", "ACCEPTED"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (active.some((item) => item.status === "ACCEPTED")) {
      throw httpError(
        409,
        "INVALID_TRANSITION",
        "A data da entrevista já foi confirmada.",
      );
    }

    const proposed = active.find((item) => item.status === "PROPOSED");
    if (proposed) {
      await prisma.interview.update({
        where: { id: proposed.id },
        data: { scheduledAt },
      });
    } else {
      await prisma.interview.create({
        data: {
          applicationId: id,
          scheduledAt,
          status: "PROPOSED",
        },
      });
    }

    await prisma.application.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    const updated = await prisma.application.findUnique({
      where: { id },
      include: applicationDetailInclude,
    });
    if (!updated) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }
    return toApplicationDetail(updated, "EMPLOYER");
  });

  app.post("/interviews/:id/respond", async (request) => {
    const user = await requireRole(request, "CANDIDATE");
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { action?: unknown };

    if (body.action !== "ACCEPT" && body.action !== "DECLINE") {
      throw httpError(400, "INVALID_BODY", "Informe action: ACCEPT ou DECLINE.");
    }
    const action = body.action as InterviewRespondAction;

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        application: {
          select: { id: true, candidateId: true },
        },
      },
    });
    if (!interview || interview.application.candidateId !== user.id) {
      throw httpError(404, "NOT_FOUND", "Entrevista não encontrada.");
    }
    if (interview.status !== "PROPOSED") {
      throw httpError(
        409,
        "INVALID_TRANSITION",
        "Só é possível responder a uma data proposta.",
      );
    }

    const status: InterviewStatus = action === "ACCEPT" ? "ACCEPTED" : "DECLINED";
    const respondedAt = new Date();
    await prisma.interview.update({
      where: { id },
      data: { status, respondedAt },
    });
    await prisma.application.update({
      where: { id: interview.applicationId },
      data: { updatedAt: respondedAt },
    });

    const updated = await prisma.application.findUnique({
      where: { id: interview.applicationId },
      include: applicationDetailInclude,
    });
    if (!updated) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }
    return toApplicationDetail(updated, "CANDIDATE");
  });
}
