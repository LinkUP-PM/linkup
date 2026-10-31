import type { FastifyInstance } from "fastify";
import type { AgendaItem, ApplicationEventType, InterviewStatus } from "@linkup/shared";
import { prisma } from "../lib/prisma.js";
import { httpError, requireUser } from "../lib/http.js";

type EventRow = {
  id: string;
  applicationId: string;
  type: ApplicationEventType;
  at: Date;
  createdAt: Date;
  application: {
    jobId: string;
    job: { title: string; employerId: string };
    candidate: { email: string };
    interviews: Array<{ status: InterviewStatus; createdAt: Date }>;
  };
};

function currentInterviewStatus(
  interviews: Array<{ status: InterviewStatus; createdAt: Date }>,
): InterviewStatus | null {
  const current = interviews
    .filter((item) => item.status === "PROPOSED" || item.status === "ACCEPTED")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return current?.status ?? null;
}

function toAgendaItem(row: EventRow, includeEmail: boolean): AgendaItem {
  const item: AgendaItem = {
    id: row.id,
    applicationId: row.applicationId,
    jobId: row.application.jobId,
    jobTitle: row.application.job.title,
    type: row.type,
    date: row.at.toISOString(),
    createdAt: row.createdAt.toISOString(),
    interviewStatus: currentInterviewStatus(row.application.interviews),
  };
  if (includeEmail) {
    item.candidateEmail = row.application.candidate.email;
  }
  return item;
}

const eventInclude = {
  application: {
    include: {
      job: { select: { title: true, employerId: true } },
      candidate: { select: { email: true } },
      interviews: {
        where: { status: { in: ["PROPOSED" as const, "ACCEPTED" as const] } },
        orderBy: { createdAt: "desc" as const },
        take: 1,
      },
    },
  },
};

export async function agendaRoutes(app: FastifyInstance) {
  app.get("/agenda", async (request) => {
    const user = await requireUser(request);
    if (!user.role) {
      throw httpError(403, "ROLE_REQUIRED", "Escolha um papel antes de continuar.");
    }

    if (user.role === "CANDIDATE") {
      const rows = await prisma.applicationEvent.findMany({
        where: { application: { candidateId: user.id } },
        orderBy: [{ at: "asc" }, { createdAt: "asc" }],
        include: eventInclude,
      });
      return { items: rows.map((row) => toAgendaItem(row, false)) };
    }

    if (user.role === "EMPLOYER") {
      const rows = await prisma.applicationEvent.findMany({
        where: { application: { job: { employerId: user.id } } },
        orderBy: [{ at: "asc" }, { createdAt: "asc" }],
        include: eventInclude,
      });
      return { items: rows.map((row) => toAgendaItem(row, true)) };
    }

    if (user.role === "RECRUITER") {
      const rows = await prisma.applicationEvent.findMany({
        orderBy: [{ at: "asc" }, { createdAt: "asc" }],
        include: eventInclude,
      });
      return { items: rows.map((row) => toAgendaItem(row, true)) };
    }

    throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
  });
}
