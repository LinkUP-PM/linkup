import type { FastifyInstance } from "fastify";
import type {
  ApplicationDetail,
  ApplicationSummary,
  DecisionAction,
  Interview,
  InterviewStatus,
  RecruiterNoteAction,
  RecruiterNoteEntry,
  Role,
} from "@linkup/shared";
import { normalizeRecruiterTags } from "@linkup/shared";
import { appendApplicationEvent } from "../lib/application-events.js";
import { prisma } from "../lib/prisma.js";
import { httpError, requireRole, requireUser } from "../lib/http.js";
import { readPdfUpload } from "../lib/pdf-upload.js";
import { runAnalysisPipeline, toAnalysisDetail } from "../services/analysis-pipeline.js";

const DECISION_ACTIONS = new Set<DecisionAction>([
  "ACCEPT",
  "REJECT",
  "REQUEST_ADJUSTMENT",
]);

type NoteEntryRow = {
  id: string;
  text: string;
  action: RecruiterNoteAction;
  createdAt: Date;
};

type InterviewEntryRow = {
  id: string;
  applicationId: string;
  scheduledAt: Date;
  status: InterviewStatus;
  createdAt: Date;
  respondedAt: Date | null;
};

type ApplicationRow = {
  id: string;
  jobId: string;
  status: ApplicationSummary["status"];
  analysisId: string;
  recruiterNote: string | null;
  decisionMessage: string | null;
  submissionCount: number;
  recruiterTags: unknown;
  createdAt: Date;
  updatedAt: Date;
  job: { title: string; employerId: string };
  candidate?: { email: string };
  analysis?: {
    id?: string;
    fileName?: string;
    fileSizeBytes?: number;
    status?: "PENDING" | "EXTRACTING" | "ANALYZING" | "COMPLETED" | "FAILED";
    resultJson: unknown;
    errorMessage?: string | null;
    createdAt?: Date;
  };
  noteEntries?: NoteEntryRow[];
  interviews?: InterviewEntryRow[];
};

function previewSkillsFromResult(resultJson: unknown): string[] {
  if (!resultJson || typeof resultJson !== "object") return [];
  const identified = (resultJson as { dimensions?: { skills?: { identified?: unknown } } })
    .dimensions?.skills?.identified;
  if (!Array.isArray(identified)) return [];
  return identified
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 3);
}

function previewStrengthsFromResult(resultJson: unknown): string[] {
  if (!resultJson || typeof resultJson !== "object") return [];
  const strengths = (resultJson as { strengths?: unknown }).strengths;
  if (!Array.isArray(strengths)) return [];
  return strengths
    .map((item) =>
      item && typeof item === "object" && typeof (item as { title?: unknown }).title === "string"
        ? (item as { title: string }).title.trim()
        : "",
    )
    .filter((title) => title.length > 0)
    .slice(0, 2);
}

function previewAttentionFromResult(resultJson: unknown): string[] {
  if (!resultJson || typeof resultJson !== "object") return [];
  const points = (resultJson as { attentionPoints?: unknown }).attentionPoints;
  if (!Array.isArray(points)) return [];
  return points
    .map((item) =>
      item && typeof item === "object" && typeof (item as { title?: unknown }).title === "string"
        ? (item as { title: string }).title.trim()
        : "",
    )
    .filter((title) => title.length > 0)
    .slice(0, 1);
}

function toNoteEntry(row: NoteEntryRow): RecruiterNoteEntry {
  return {
    id: row.id,
    text: row.text,
    action: row.action,
    createdAt: row.createdAt.toISOString(),
  };
}

function toInterviewEntry(
  row: InterviewEntryRow,
  app: ApplicationRow,
  includeEmail: boolean,
): Interview {
  const interview: Interview = {
    id: row.id,
    applicationId: row.applicationId,
    jobId: app.jobId,
    jobTitle: app.job.title,
    scheduledAt: row.scheduledAt.toISOString(),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
  };
  if (includeEmail && app.candidate?.email) {
    interview.candidateEmail = app.candidate.email;
  }
  return interview;
}

function currentInterview(rows: InterviewEntryRow[] | undefined): InterviewEntryRow | null {
  if (!rows) return null;
  return rows.find((item) => item.status === "PROPOSED" || item.status === "ACCEPTED") ?? null;
}

export function toApplicationSummary(
  row: ApplicationRow,
  opts?: {
    includeDecisionMessage?: boolean;
    recruiterPreview?: boolean;
    includeCandidateEmail?: boolean;
  },
): ApplicationSummary {
  const current = currentInterview(row.interviews);
  const summary: ApplicationSummary = {
    id: row.id,
    jobId: row.jobId,
    jobTitle: row.job.title,
    status: row.status,
    analysisId: row.analysisId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    interviewStatus: current?.status ?? null,
    interviewScheduledAt: current?.scheduledAt.toISOString() ?? null,
  };
  if (opts?.includeDecisionMessage !== false) {
    summary.decisionMessage = row.decisionMessage;
  }
  if (opts?.recruiterPreview) {
    summary.candidateEmail = row.candidate?.email;
    summary.submissionCount = row.submissionCount;
    summary.previewSkills = previewSkillsFromResult(row.analysis?.resultJson);
    summary.previewStrengths = previewStrengthsFromResult(row.analysis?.resultJson);
    summary.previewAttention = previewAttentionFromResult(row.analysis?.resultJson);
    summary.recruiterTags = normalizeRecruiterTags(row.recruiterTags);
  }
  if (opts?.includeCandidateEmail && row.candidate?.email) {
    summary.candidateEmail = row.candidate.email;
  }
  return summary;
}

export function toApplicationDetail(
  row: ApplicationRow,
  viewer: Role,
): ApplicationDetail {
  const detail: ApplicationDetail = toApplicationSummary(row, {
    recruiterPreview: viewer === "RECRUITER",
    includeCandidateEmail: viewer === "EMPLOYER",
  });

  if (viewer === "RECRUITER") {
    detail.recruiterNote = row.recruiterNote;
    detail.recruiterNotes = (row.noteEntries ?? []).map(toNoteEntry);
  }

  if (viewer === "CANDIDATE") {
    detail.decisionMessage = row.decisionMessage;
  }

  if (
    (viewer === "RECRUITER" || viewer === "EMPLOYER") &&
    row.analysis &&
    row.analysis.id &&
    row.analysis.fileName &&
    row.analysis.fileSizeBytes !== undefined &&
    row.analysis.status &&
    row.analysis.createdAt
  ) {
    detail.analysis = toAnalysisDetail({
      id: row.analysis.id,
      fileName: row.analysis.fileName,
      fileSizeBytes: row.analysis.fileSizeBytes,
      status: row.analysis.status,
      resultJson: row.analysis.resultJson,
      errorMessage: row.analysis.errorMessage ?? null,
      createdAt: row.analysis.createdAt,
    });
  }

  if (viewer === "EMPLOYER") {
    detail.decisionMessage = row.decisionMessage;
  }

  const includeEmail = viewer === "RECRUITER" || viewer === "EMPLOYER";
  detail.interviews = (row.interviews ?? []).map((item) =>
    toInterviewEntry(item, row, includeEmail),
  );

  return detail;
}

function employerCanSee(status: ApplicationSummary["status"]): boolean {
  return status !== "SUBMITTED" && status !== "DISCARDED";
}

const applicationInclude = {
  job: { select: { title: true, employerId: true } },
  candidate: { select: { email: true } },
  analysis: true,
  noteEntries: { orderBy: { createdAt: "desc" as const } },
  interviews: { orderBy: { createdAt: "desc" as const } },
};

async function loadApplication(id: string): Promise<ApplicationRow | null> {
  return prisma.application.findUnique({
    where: { id },
    include: applicationInclude,
  });
}

async function appendNoteEntry(
  applicationId: string,
  text: string,
  action: RecruiterNoteAction,
): Promise<void> {
  await prisma.recruiterNoteEntry.create({
    data: { applicationId, text, action },
  });
}

function parseOptionalNote(body: { note?: unknown }): string | null {
  if (body.note === undefined || body.note === null) return null;
  if (typeof body.note !== "string") {
    throw httpError(400, "INVALID_BODY", "A nota interna precisa ser texto.");
  }
  return body.note.trim() || null;
}

export async function applicationsRoutes(app: FastifyInstance) {
  app.get("/applications", async (request) => {
    const user = await requireRole(request, "CANDIDATE");
    const rows = await prisma.application.findMany({
      where: { candidateId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        job: { select: { title: true, employerId: true } },
        interviews: { orderBy: { createdAt: "desc" } },
      },
    });

    return {
      items: rows.map((row) => toApplicationSummary(row)),
    };
  });

  app.get("/applications/inbox", async (request) => {
    await requireRole(request, "RECRUITER");
    const rows = await prisma.application.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { createdAt: "desc" },
      include: {
        job: { select: { title: true, employerId: true } },
        candidate: { select: { email: true } },
        analysis: { select: { resultJson: true } },
      },
    });

    const items = rows
      .map((row) =>
        toApplicationSummary(row, {
          includeDecisionMessage: true,
          recruiterPreview: true,
        }),
      )
      .sort((a, b) => {
        const aResubmit = (a.submissionCount ?? 1) > 1 ? 1 : 0;
        const bResubmit = (b.submissionCount ?? 1) > 1 ? 1 : 0;
        if (aResubmit !== bResubmit) return bResubmit - aResubmit;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return { items };
  });

  app.get("/applications/:id", async (request) => {
    const user = await requireUser(request);
    if (!user.role) {
      throw httpError(403, "ROLE_REQUIRED", "Escolha um papel antes de continuar.");
    }

    const { id } = request.params as { id: string };
    const row = await loadApplication(id);
    if (!row) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }

    if (user.role === "CANDIDATE") {
      const own = await prisma.application.findFirst({
        where: { id, candidateId: user.id },
        include: applicationInclude,
      });
      if (!own) {
        throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
      }
      return toApplicationDetail(own, "CANDIDATE");
    }

    if (user.role === "RECRUITER") {
      return toApplicationDetail(row, "RECRUITER");
    }

    if (user.role === "EMPLOYER") {
      if (row.job.employerId !== user.id || !employerCanSee(row.status)) {
        throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
      }
      return toApplicationDetail(row, "EMPLOYER");
    }

    throw httpError(403, "FORBIDDEN", "Esta ação não está disponível para o seu papel.");
  });

  app.patch("/applications/:id/tags", async (request) => {
    await requireRole(request, "RECRUITER");
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { tags?: unknown };

    if (!Array.isArray(body.tags)) {
      throw httpError(400, "INVALID_BODY", "Informe tags como uma lista.");
    }
    const tags = normalizeRecruiterTags(body.tags);
    if (tags.length !== body.tags.length) {
      throw httpError(
        400,
        "INVALID_BODY",
        "Use só as tags: forte, duvida, perfil-senior, comunicar-depois.",
      );
    }

    const row = await loadApplication(id);
    if (!row) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { recruiterTags: tags },
      include: applicationInclude,
    });

    return toApplicationDetail(updated, "RECRUITER");
  });

  app.post("/applications/:id/notes", async (request) => {
    await requireRole(request, "RECRUITER");
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { text?: unknown };

    if (typeof body.text !== "string" || body.text.trim().length < 1) {
      throw httpError(400, "INVALID_BODY", "A nota precisa ter pelo menos 1 caractere.");
    }
    const text = body.text.trim();

    const row = await loadApplication(id);
    if (!row) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }

    await appendNoteEntry(id, text, "NOTE");
    const updated = await prisma.application.update({
      where: { id },
      data: { recruiterNote: text },
      include: applicationInclude,
    });

    return toApplicationDetail(updated, "RECRUITER");
  });

  app.post("/applications/:id/discard", async (request) => {
    await requireRole(request, "RECRUITER");
    const { id } = request.params as { id: string };
    const note = parseOptionalNote((request.body ?? {}) as { note?: unknown });

    const row = await loadApplication(id);
    if (!row) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }
    if (row.status !== "SUBMITTED") {
      throw httpError(
        409,
        "INVALID_TRANSITION",
        "Só é possível descartar candidaturas ainda na fila.",
      );
    }

    if (note) {
      await appendNoteEntry(id, note, "DISCARD");
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: "DISCARDED",
        recruiterNote: note,
      },
      include: applicationInclude,
    });
    await appendApplicationEvent(id, "DISCARDED");

    return toApplicationDetail(updated, "RECRUITER");
  });

  app.post("/applications/:id/forward", async (request) => {
    await requireRole(request, "RECRUITER");
    const { id } = request.params as { id: string };
    const note = parseOptionalNote((request.body ?? {}) as { note?: unknown });

    const row = await loadApplication(id);
    if (!row) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }
    if (row.status !== "SUBMITTED") {
      throw httpError(
        409,
        "INVALID_TRANSITION",
        "Só é possível encaminhar candidaturas ainda na fila.",
      );
    }

    if (note) {
      await appendNoteEntry(id, note, "FORWARD");
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: "FORWARDED",
        recruiterNote: note,
      },
      include: applicationInclude,
    });
    await appendApplicationEvent(id, "FORWARDED");

    return toApplicationDetail(updated, "RECRUITER");
  });

  app.post("/applications/:id/decision", async (request) => {
    const user = await requireRole(request, "EMPLOYER");
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as {
      action?: unknown;
      message?: unknown;
    };

    if (typeof body.action !== "string" || !DECISION_ACTIONS.has(body.action as DecisionAction)) {
      throw httpError(
        400,
        "INVALID_BODY",
        "Informe action: ACCEPT, REJECT ou REQUEST_ADJUSTMENT.",
      );
    }
    const action = body.action as DecisionAction;

    let message: string | null = null;
    if (action === "REJECT" || action === "REQUEST_ADJUSTMENT") {
      if (typeof body.message !== "string" || body.message.trim().length < 3) {
        throw httpError(
          400,
          "INVALID_BODY",
          "Recusa e pedido de ajuste pedem uma mensagem com pelo menos 3 caracteres.",
        );
      }
      message = body.message.trim();
    }

    const row = await loadApplication(id);
    if (!row) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }
    if (row.job.employerId !== user.id) {
      throw httpError(403, "FORBIDDEN", "Esta vaga não é sua.");
    }
    if (row.status !== "FORWARDED") {
      throw httpError(
        409,
        "INVALID_TRANSITION",
        "Só é possível decidir sobre candidaturas encaminhadas.",
      );
    }

    const status =
      action === "ACCEPT"
        ? "ACCEPTED"
        : action === "REJECT"
          ? "REJECTED"
          : "ADJUSTMENT_REQUESTED";

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status,
        decisionMessage: message,
      },
      include: applicationInclude,
    });
    await appendApplicationEvent(
      id,
      status === "ACCEPTED"
        ? "ACCEPTED"
        : status === "REJECTED"
          ? "REJECTED"
          : "ADJUSTMENT_REQUESTED",
    );

    return toApplicationDetail(updated, "EMPLOYER");
  });

  app.post("/applications/:id/resubmit", async (request) => {
    const user = await requireRole(request, "CANDIDATE");
    const { id } = request.params as { id: string };

    const row = await prisma.application.findFirst({
      where: { id, candidateId: user.id },
      include: { job: { select: { title: true, employerId: true } } },
    });
    if (!row) {
      throw httpError(404, "NOT_FOUND", "Candidatura não encontrada.");
    }
    if (row.status !== "ADJUSTMENT_REQUESTED") {
      throw httpError(
        409,
        "INVALID_TRANSITION",
        "Só é possível reenviar o PDF depois de um pedido de ajuste.",
      );
    }

    const file = await request.file();
    const { fileName, buffer } = await readPdfUpload(file);
    const analysis = await runAnalysisPipeline({
      userId: user.id,
      fileName,
      buffer,
    });

    const updated = await prisma.application.update({
      where: { id },
      data: {
        analysisId: analysis.id,
        status: "SUBMITTED",
        decisionMessage: null,
        recruiterNote: null,
        submissionCount: { increment: 1 },
      },
      include: { job: { select: { title: true, employerId: true } } },
    });
    await appendApplicationEvent(id, "RESUBMITTED");

    return toApplicationSummary(updated);
  });
}
