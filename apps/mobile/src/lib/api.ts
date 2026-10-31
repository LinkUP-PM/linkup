import type {
  AgendaItem,
  AnalysisDetail,
  AnalysisResult,
  AnalysisSummary,
  ApplicationDetail,
  ApplicationEventType,
  ApplicationStatus,
  ApplicationSummary,
  AuthResponse,
  DecisionAction,
  Interview,
  InterviewRespondAction,
  InterviewStatus,
  Job,
  Me,
  RecruiterNoteAction,
  RecruiterNoteEntry,
  RecruiterTag,
  Resume,
  ResumeKind,
  Role,
} from "@linkup/shared";
import { MAIN_RESUME_LABEL, MAX_FOCUSED_RESUMES, normalizeRecruiterTags } from "@linkup/shared";
import { getDb } from "./db";
import { fail } from "./errors";
import { createId, createSessionToken, hashToken } from "./ids";
import { mockAnalysisResult } from "./mock-analysis";
import { hashPassword, verifyPassword } from "./password";
import { extractPdfText, readPdfBytes, type PdfByteSource } from "./pdf";
import {
  deleteResumePdf,
  storeResumePdf,
  uploadInputFromStoredResume,
} from "./resume-files";
import { clearSessionToken, getSessionToken, setSessionToken } from "./session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DECISION_ACTIONS = new Set<DecisionAction>([
  "ACCEPT",
  "REJECT",
  "REQUEST_ADJUSTMENT",
]);

export type UploadFileInput = {
  uri: string;
  name: string;
  mimeType?: string | null;
  file?: PdfByteSource;
};

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: string;
  updated_at: string;
};

type JobRow = {
  id: string;
  title: string;
  description: string;
  looking_for: string;
  employer_id: string;
  created_at: string;
  updated_at: string;
};

type AnalysisRow = {
  id: string;
  user_id: string;
  file_name: string;
  file_size_bytes: number;
  status: AnalysisDetail["status"];
  extracted_text: string | null;
  result_json: string | null;
  error_message: string | null;
  model_used: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationRow = {
  id: string;
  job_id: string;
  candidate_id: string;
  analysis_id: string;
  status: ApplicationStatus;
  recruiter_note: string | null;
  decision_message: string | null;
  submission_count: number;
  recruiter_tags: string | null;
  created_at: string;
  updated_at: string;
  job_title: string;
  employer_id: string;
  candidate_email?: string | null;
};

type NoteEntryRow = {
  id: string;
  application_id: string;
  text: string;
  action: RecruiterNoteAction;
  created_at: string;
};

type ResumeRow = {
  id: string;
  user_id: string;
  kind: ResumeKind;
  label: string;
  file_name: string;
  file_uri: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
};

type InterviewRow = {
  id: string;
  application_id: string;
  scheduled_at: string;
  status: InterviewStatus;
  created_at: string;
  responded_at: string | null;
  job_id?: string;
  job_title?: string;
  candidate_email?: string | null;
};

function toResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeResumeLabel(kind: ResumeKind, label: string): string {
  const trimmed = label.trim().replace(/\s+/g, " ");
  if (kind === "MAIN") return MAIN_RESUME_LABEL;
  if (trimmed.length < 2) {
    fail("INVALID_BODY", "Dê um nome curto à versão (área ou empresa).");
  }
  if (trimmed.length > 40) {
    fail("INVALID_BODY", "O nome da versão pode ter no máximo 40 caracteres.");
  }
  return trimmed;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toMe(user: UserRow): Me {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return null;
  return email;
}

type JobCounts = {
  queueCount?: number;
  pendingDecisionCount?: number;
  forwardedCount?: number;
  adjustmentCount?: number;
  closedCount?: number;
};

function toJob(row: JobRow, counts?: JobCounts): Job {
  const job: Job = {
    id: row.id,
    title: row.title,
    description: row.description,
    lookingFor: row.looking_for,
    employerId: row.employer_id,
    createdAt: row.created_at,
  };
  if (counts?.queueCount !== undefined) job.queueCount = counts.queueCount;
  if (counts?.pendingDecisionCount !== undefined) {
    job.pendingDecisionCount = counts.pendingDecisionCount;
  }
  if (counts?.forwardedCount !== undefined) job.forwardedCount = counts.forwardedCount;
  if (counts?.adjustmentCount !== undefined) job.adjustmentCount = counts.adjustmentCount;
  if (counts?.closedCount !== undefined) job.closedCount = counts.closedCount;
  return job;
}

function previewSkillsFromResultJson(resultJson: string | null | undefined): string[] {
  if (!resultJson) return [];
  try {
    const parsed = JSON.parse(resultJson) as {
      dimensions?: { skills?: { identified?: unknown } };
    };
    const identified = parsed.dimensions?.skills?.identified;
    if (!Array.isArray(identified)) return [];
    return identified
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function previewStrengthsFromResultJson(resultJson: string | null | undefined): string[] {
  if (!resultJson) return [];
  try {
    const parsed = JSON.parse(resultJson) as { strengths?: unknown };
    if (!Array.isArray(parsed.strengths)) return [];
    return parsed.strengths
      .map((item) =>
        item && typeof item === "object" && typeof (item as { title?: unknown }).title === "string"
          ? (item as { title: string }).title.trim()
          : "",
      )
      .filter((title) => title.length > 0)
      .slice(0, 2);
  } catch {
    return [];
  }
}

function previewAttentionFromResultJson(resultJson: string | null | undefined): string[] {
  if (!resultJson) return [];
  try {
    const parsed = JSON.parse(resultJson) as { attentionPoints?: unknown };
    if (!Array.isArray(parsed.attentionPoints)) return [];
    return parsed.attentionPoints
      .map((item) =>
        item && typeof item === "object" && typeof (item as { title?: unknown }).title === "string"
          ? (item as { title: string }).title.trim()
          : "",
      )
      .filter((title) => title.length > 0)
      .slice(0, 1);
  } catch {
    return [];
  }
}

function parseTagsJson(raw: string | null | undefined): RecruiterTag[] {
  if (!raw) return [];
  try {
    return normalizeRecruiterTags(JSON.parse(raw));
  } catch {
    return [];
  }
}

function sortTriageQueue(items: ApplicationSummary[]): ApplicationSummary[] {
  return [...items].sort((a, b) => {
    const aResubmit = (a.submissionCount ?? 1) > 1 ? 1 : 0;
    const bResubmit = (b.submissionCount ?? 1) > 1 ? 1 : 0;
    if (aResubmit !== bResubmit) return bResubmit - aResubmit;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function toNoteEntry(row: NoteEntryRow): RecruiterNoteEntry {
  return {
    id: row.id,
    text: row.text,
    action: row.action,
    createdAt: row.created_at,
  };
}

async function loadNoteEntries(applicationId: string): Promise<RecruiterNoteEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NoteEntryRow>(
    `SELECT * FROM recruiter_note_entries
     WHERE application_id = ?
     ORDER BY created_at DESC`,
    applicationId,
  );
  return rows.map(toNoteEntry);
}

async function appendNoteEntry(
  applicationId: string,
  text: string,
  action: RecruiterNoteAction,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recruiter_note_entries (id, application_id, text, action, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    await createId(),
    applicationId,
    text,
    action,
    nowIso(),
  );
}

async function appendApplicationEvent(
  applicationId: string,
  type: ApplicationEventType,
  atIso?: string,
): Promise<void> {
  const db = await getDb();
  const createdAt = nowIso();
  await db.runAsync(
    `INSERT INTO application_events (id, application_id, type, at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    await createId(),
    applicationId,
    type,
    atIso ?? createdAt,
    createdAt,
  );
}

function toAnalysisDetail(row: AnalysisRow): AnalysisDetail {
  let result: AnalysisResult | null = null;
  if (row.result_json) {
    try {
      result = JSON.parse(row.result_json) as AnalysisResult;
    } catch {
      result = null;
    }
  }
  return {
    id: row.id,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    status: row.status,
    result,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
  };
}

function toInterview(
  row: InterviewRow,
  ctx: { jobId: string; jobTitle: string; candidateEmail?: string | null },
  includeEmail: boolean,
): Interview {
  const interview: Interview = {
    id: row.id,
    applicationId: row.application_id,
    jobId: ctx.jobId,
    jobTitle: ctx.jobTitle,
    scheduledAt: row.scheduled_at,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
  if (includeEmail && ctx.candidateEmail) {
    interview.candidateEmail = ctx.candidateEmail;
  }
  return interview;
}

function currentInterviewFromList(interviews: Interview[]): Interview | null {
  return interviews.find((item) => item.status === "PROPOSED" || item.status === "ACCEPTED") ?? null;
}

function toApplicationSummary(
  row: ApplicationRow,
  opts?: {
    includeDecisionMessage?: boolean;
    recruiterPreview?: boolean;
    includeCandidateEmail?: boolean;
    previewSkills?: string[];
    previewStrengths?: string[];
    previewAttention?: string[];
    interviewStatus?: InterviewStatus | null;
    interviewScheduledAt?: string | null;
  },
): ApplicationSummary {
  const summary: ApplicationSummary = {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    status: row.status,
    analysisId: row.analysis_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (opts?.includeDecisionMessage !== false) {
    summary.decisionMessage = row.decision_message;
  }
  if (opts?.recruiterPreview) {
    if (row.candidate_email) summary.candidateEmail = row.candidate_email;
    summary.submissionCount = row.submission_count ?? 1;
    summary.previewSkills = opts.previewSkills ?? [];
    summary.previewStrengths = opts.previewStrengths ?? [];
    summary.previewAttention = opts.previewAttention ?? [];
    summary.recruiterTags = parseTagsJson(row.recruiter_tags);
  }
  if (opts?.includeCandidateEmail && row.candidate_email) {
    summary.candidateEmail = row.candidate_email;
  }
  if (opts?.interviewStatus !== undefined) {
    summary.interviewStatus = opts.interviewStatus;
  }
  if (opts?.interviewScheduledAt !== undefined) {
    summary.interviewScheduledAt = opts.interviewScheduledAt;
  }
  return summary;
}

function toApplicationDetail(
  row: ApplicationRow,
  viewer: Role,
  analysis?: AnalysisRow | null,
  notes?: RecruiterNoteEntry[],
  interviews?: Interview[],
): ApplicationDetail {
  const current = interviews ? currentInterviewFromList(interviews) : null;
  const detail: ApplicationDetail = toApplicationSummary(row, {
    recruiterPreview: viewer === "RECRUITER",
    includeCandidateEmail: viewer === "EMPLOYER",
    previewSkills:
      viewer === "RECRUITER" ? previewSkillsFromResultJson(analysis?.result_json) : undefined,
    previewStrengths:
      viewer === "RECRUITER" ? previewStrengthsFromResultJson(analysis?.result_json) : undefined,
    previewAttention:
      viewer === "RECRUITER" ? previewAttentionFromResultJson(analysis?.result_json) : undefined,
    interviewStatus: current?.status ?? null,
    interviewScheduledAt: current?.scheduledAt ?? null,
  });
  if (viewer === "RECRUITER") {
    detail.recruiterNote = row.recruiter_note;
    detail.recruiterNotes = notes ?? [];
  }
  if (viewer === "CANDIDATE" || viewer === "EMPLOYER") {
    detail.decisionMessage = row.decision_message;
  }
  if ((viewer === "RECRUITER" || viewer === "EMPLOYER") && analysis) {
    detail.analysis = toAnalysisDetail(analysis);
  }
  detail.interviews = interviews ?? [];
  return detail;
}

function employerCanSee(status: ApplicationStatus): boolean {
  return status !== "SUBMITTED" && status !== "DISCARDED";
}

async function createSession(userId: string): Promise<string> {
  const db = await getDb();
  const token = await createSessionToken();
  const tokenHash = await hashToken(token);
  const id = await createId();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.runAsync(
    `INSERT INTO sessions (id, token_hash, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    tokenHash,
    userId,
    expiresAt,
    createdAt,
  );
  return token;
}

async function requireUser(): Promise<UserRow> {
  const token = await getSessionToken();
  if (!token) {
    fail("UNAUTHORIZED", "Faça login para continuar.");
  }
  const db = await getDb();
  const tokenHash = await hashToken(token);
  const session = await db.getFirstAsync<{
    user_id: string;
    expires_at: string;
    id: string;
  }>(`SELECT id, user_id, expires_at FROM sessions WHERE token_hash = ?`, tokenHash);

  if (!session) {
    await clearSessionToken();
    fail("UNAUTHORIZED", "Sessão inválida. Entre novamente.");
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await db.runAsync(`DELETE FROM sessions WHERE id = ?`, session.id);
    await clearSessionToken();
    fail("UNAUTHORIZED", "Sessão expirada. Entre novamente.");
  }

  const user = await db.getFirstAsync<UserRow>(
    `SELECT * FROM users WHERE id = ?`,
    session.user_id,
  );
  if (!user) {
    await clearSessionToken();
    fail("UNAUTHORIZED", "Sessão inválida. Entre novamente.");
  }
  return user;
}

async function requireRole(role: Role): Promise<UserRow> {
  const user = await requireUser();
  if (user.role !== role) {
    fail("FORBIDDEN", "Esta ação não está disponível para o seu papel.");
  }
  return user;
}

async function persistAuth(user: UserRow): Promise<AuthResponse> {
  const token = await createSession(user.id);
  await setSessionToken(token);
  return { token, user: toMe(user) };
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

  const db = await getDb();
  const placeholders = jobIds.map(() => "?").join(",");
  const rows = await db.getAllAsync<{ job_id: string; status: string; cnt: number }>(
    `SELECT job_id, status, COUNT(*) as cnt
     FROM applications
     WHERE job_id IN (${placeholders})
     GROUP BY job_id, status`,
    ...jobIds,
  );

  for (const row of rows) {
    const entry = map.get(row.job_id);
    if (!entry) continue;
    if (row.status === "SUBMITTED") entry.submitted = row.cnt;
    else if (row.status === "FORWARDED") entry.forwarded = row.cnt;
    else if (row.status === "ADJUSTMENT_REQUESTED") entry.adjustment = row.cnt;
    else if (
      row.status === "DISCARDED" ||
      row.status === "ACCEPTED" ||
      row.status === "REJECTED"
    ) {
      entry.closed += row.cnt;
    }
  }
  return map;
}

async function loadApplication(id: string): Promise<ApplicationRow | null> {
  const db = await getDb();
  return db.getFirstAsync<ApplicationRow>(
    `SELECT a.*, j.title as job_title, j.employer_id as employer_id, u.email as candidate_email
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = a.candidate_id
     WHERE a.id = ?`,
    id,
  );
}

async function loadInterviewsForApplication(
  applicationId: string,
  ctx: { jobId: string; jobTitle: string; candidateEmail?: string | null },
  includeEmail: boolean,
): Promise<Interview[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<InterviewRow>(
    `SELECT * FROM interviews
     WHERE application_id = ?
     ORDER BY created_at DESC`,
    applicationId,
  );
  return rows.map((row) => toInterview(row, ctx, includeEmail));
}

async function loadCurrentInterviewMap(
  applicationIds: string[],
): Promise<Map<string, { status: InterviewStatus; scheduledAt: string }>> {
  const map = new Map<string, { status: InterviewStatus; scheduledAt: string }>();
  if (applicationIds.length === 0) return map;
  const db = await getDb();
  const placeholders = applicationIds.map(() => "?").join(",");
  const rows = await db.getAllAsync<InterviewRow>(
    `SELECT * FROM interviews
     WHERE application_id IN (${placeholders})
       AND status IN ('PROPOSED', 'ACCEPTED')
     ORDER BY created_at DESC`,
    ...applicationIds,
  );
  for (const row of rows) {
    if (!map.has(row.application_id)) {
      map.set(row.application_id, {
        status: row.status,
        scheduledAt: row.scheduled_at,
      });
    }
  }
  return map;
}

function assertFutureIso(scheduledAt: string): Date {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) {
    fail("INVALID_BODY", "Informe uma data e hora válidas.");
  }
  if (date.getTime() <= Date.now()) {
    fail("INVALID_BODY", "A entrevista precisa ser no futuro.");
  }
  return date;
}

async function loadAnalysis(id: string): Promise<AnalysisRow | null> {
  const db = await getDb();
  return db.getFirstAsync<AnalysisRow>(`SELECT * FROM analyses WHERE id = ?`, id);
}

async function runAnalysisPipeline(input: {
  userId: string;
  fileName: string;
  bytes: Uint8Array;
}): Promise<AnalysisDetail> {
  const db = await getDb();
  const id = await createId();
  const createdAt = nowIso();

  await db.runAsync(
    `INSERT INTO analyses
      (id, user_id, file_name, file_size_bytes, status, extracted_text, result_json, error_message, model_used, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'PENDING', NULL, NULL, NULL, NULL, ?, ?)`,
    id,
    input.userId,
    input.fileName,
    input.bytes.byteLength,
    createdAt,
    createdAt,
  );

  try {
    await db.runAsync(
      `UPDATE analyses SET status = 'EXTRACTING', updated_at = ? WHERE id = ?`,
      nowIso(),
      id,
    );

    const text = await extractPdfText(input.bytes);

    await db.runAsync(
      `UPDATE analyses SET status = 'ANALYZING', extracted_text = ?, updated_at = ? WHERE id = ?`,
      text,
      nowIso(),
      id,
    );

    const result = mockAnalysisResult(text);
    const updatedAt = nowIso();
    await db.runAsync(
      `UPDATE analyses
       SET status = 'COMPLETED', result_json = ?, model_used = 'mock', updated_at = ?
       WHERE id = ?`,
      JSON.stringify(result),
      updatedAt,
      id,
    );

    const saved = await loadAnalysis(id);
    if (!saved) fail("INTERNAL", "Falha ao gravar a análise.");
    return toAnalysisDetail(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao analisar o currículo.";
    await db.runAsync(
      `UPDATE analyses SET status = 'FAILED', error_message = ?, updated_at = ? WHERE id = ?`,
      message,
      nowIso(),
      id,
    );
    throw err;
  }
}

export async function register(input: {
  email: string;
  password: string;
  role: Role;
}): Promise<AuthResponse> {
  const email = normalizeEmail(input.email);
  if (!email || input.password.length < MIN_PASSWORD || input.password.length > MAX_PASSWORD) {
    fail(
      "INVALID_BODY",
      `Envie e-mail válido e senha com 8 a ${MAX_PASSWORD} caracteres.`,
    );
  }

  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM users WHERE email = ?`,
    email,
  );
  if (existing) {
    fail("EMAIL_TAKEN", "Já existe uma conta com este e-mail.");
  }

  const id = await createId();
  const createdAt = nowIso();
  const passwordHash = await hashPassword(input.password);
  await db.runAsync(
    `INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    email,
    passwordHash,
    input.role,
    createdAt,
    createdAt,
  );

  const user: UserRow = {
    id,
    email,
    password_hash: passwordHash,
    role: input.role,
    created_at: createdAt,
    updated_at: createdAt,
  };
  return persistAuth(user);
}

export async function login(input: {
  email: string;
  password: string;
  role: Role;
}): Promise<AuthResponse> {
  const email = normalizeEmail(input.email);
  if (!email) {
    fail("INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
  }

  const db = await getDb();
  const user = await db.getFirstAsync<UserRow>(`SELECT * FROM users WHERE email = ?`, email);
  if (!user || !(await verifyPassword(input.password, user.password_hash))) {
    fail("INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
  }
  if (user.role !== input.role) {
    fail(
      "ROLE_MISMATCH",
      "Esta conta não entra por esta porta. Use a tela do papel certo.",
    );
  }
  return persistAuth(user);
}

export async function logout(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    const db = await getDb();
    const tokenHash = await hashToken(token);
    await db.runAsync(`DELETE FROM sessions WHERE token_hash = ?`, tokenHash);
  }
  await clearSessionToken();
}

export async function getMe(): Promise<Me> {
  const user = await requireUser();
  return toMe(user);
}

export async function listJobs(): Promise<Job[]> {
  const user = await requireUser();
  const db = await getDb();
  const rows =
    user.role === "EMPLOYER"
      ? await db.getAllAsync<JobRow>(
          `SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC`,
          user.id,
        )
      : await db.getAllAsync<JobRow>(`SELECT * FROM jobs ORDER BY created_at DESC`);

  const counts = await countsForJobs(rows.map((r) => r.id));
  return rows.map((row) => {
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
    if (user.role === "EMPLOYER") return toJob(row, { pendingDecisionCount: c.forwarded });
    return toJob(row);
  });
}

export async function getJob(id: string): Promise<Job> {
  const user = await requireUser();
  const db = await getDb();
  const row =
    user.role === "EMPLOYER"
      ? await db.getFirstAsync<JobRow>(
          `SELECT * FROM jobs WHERE id = ? AND employer_id = ?`,
          id,
          user.id,
        )
      : await db.getFirstAsync<JobRow>(`SELECT * FROM jobs WHERE id = ?`, id);

  if (!row) fail("NOT_FOUND", "Vaga não encontrada.");

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
  if (user.role === "EMPLOYER") return toJob(row, { pendingDecisionCount: c.forwarded });
  return toJob(row);
}

export async function createJob(input: {
  title: string;
  description: string;
  lookingFor: string;
}): Promise<Job> {
  const user = await requireRole("EMPLOYER");
  const title = input.title.trim();
  const description = input.description.trim();
  const lookingFor = input.lookingFor.trim();
  if (title.length < 3 || description.length < 3 || lookingFor.length < 3) {
    fail("INVALID_BODY", "Preencha título, descrição e o que busca com pelo menos 3 caracteres.");
  }

  const db = await getDb();
  const id = await createId();
  const createdAt = nowIso();
  await db.runAsync(
    `INSERT INTO jobs (id, title, description, looking_for, employer_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    title,
    description,
    lookingFor,
    user.id,
    createdAt,
    createdAt,
  );

  return {
    id,
    title,
    description,
    lookingFor,
    employerId: user.id,
    createdAt,
  };
}

export async function listJobApplications(jobId: string): Promise<ApplicationSummary[]> {
  const user = await requireUser();
  if (user.role === "CANDIDATE") {
    fail("FORBIDDEN", "Esta ação não está disponível para o seu papel.");
  }

  const db = await getDb();

  if (user.role === "EMPLOYER") {
    const job = await db.getFirstAsync<JobRow>(
      `SELECT * FROM jobs WHERE id = ? AND employer_id = ?`,
      jobId,
      user.id,
    );
    if (!job) fail("NOT_FOUND", "Vaga não encontrada.");

    const rows = await db.getAllAsync<ApplicationRow>(
      `SELECT a.*, j.title as job_title, j.employer_id as employer_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.job_id = ? AND a.status NOT IN ('SUBMITTED', 'DISCARDED')
       ORDER BY a.updated_at DESC`,
      jobId,
    );
    return rows.map((row) => toApplicationSummary(row));
  }

  const job = await db.getFirstAsync<JobRow>(`SELECT * FROM jobs WHERE id = ?`, jobId);
  if (!job) fail("NOT_FOUND", "Vaga não encontrada.");

  try {
    const rows = await db.getAllAsync<
      ApplicationRow & { result_json: string | null }
    >(
      `SELECT a.*, j.title as job_title, j.employer_id as employer_id,
              u.email as candidate_email, an.result_json as result_json
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.candidate_id
       LEFT JOIN analyses an ON an.id = a.analysis_id
       WHERE a.job_id = ?
       ORDER BY a.created_at DESC`,
      jobId,
    );
    return rows.map((row) =>
      toApplicationSummary(row, {
        includeDecisionMessage: true,
        recruiterPreview: true,
        previewSkills: previewSkillsFromResultJson(row.result_json),
        previewStrengths: previewStrengthsFromResultJson(row.result_json),
        previewAttention: previewAttentionFromResultJson(row.result_json),
      }),
    );
  } catch {
    const rows = await db.getAllAsync<ApplicationRow>(
      `SELECT a.*, j.title as job_title, j.employer_id as employer_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.job_id = ?
       ORDER BY a.created_at DESC`,
      jobId,
    );
    return rows.map((row) =>
      toApplicationSummary(row, { includeDecisionMessage: true, recruiterPreview: true }),
    );
  }
}

export async function listTriageInbox(): Promise<ApplicationSummary[]> {
  await requireRole("RECRUITER");
  const db = await getDb();
  const rows = await db.getAllAsync<ApplicationRow & { result_json: string | null }>(
    `SELECT a.*, j.title as job_title, j.employer_id as employer_id,
            u.email as candidate_email, an.result_json as result_json
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = a.candidate_id
     LEFT JOIN analyses an ON an.id = a.analysis_id
     WHERE a.status = 'SUBMITTED'
     ORDER BY a.created_at DESC`,
  );
  return sortTriageQueue(
    rows.map((row) =>
      toApplicationSummary(row, {
        includeDecisionMessage: true,
        recruiterPreview: true,
        previewSkills: previewSkillsFromResultJson(row.result_json),
        previewStrengths: previewStrengthsFromResultJson(row.result_json),
        previewAttention: previewAttentionFromResultJson(row.result_json),
      }),
    ),
  );
}

export async function applyToJob(
  jobId: string,
  input: UploadFileInput,
): Promise<ApplicationSummary> {
  const user = await requireRole("CANDIDATE");
  const db = await getDb();

  const job = await db.getFirstAsync<JobRow>(`SELECT * FROM jobs WHERE id = ?`, jobId);
  if (!job) fail("NOT_FOUND", "Vaga não encontrada.");

  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?`,
    jobId,
    user.id,
  );
  if (existing) {
    fail("ALREADY_APPLIED", "Você já se candidatou a esta vaga.");
  }

  const { fileName, bytes } = await readPdfBytes(input);
  const analysis = await runAnalysisPipeline({
    userId: user.id,
    fileName,
    bytes,
  });

  const id = await createId();
  const createdAt = nowIso();
  try {
    await db.runAsync(
      `INSERT INTO applications
        (id, job_id, candidate_id, analysis_id, status, recruiter_note, decision_message, submission_count, recruiter_tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'SUBMITTED', NULL, NULL, 1, '[]', ?, ?)`,
      id,
      jobId,
      user.id,
      analysis.id,
      createdAt,
      createdAt,
    );
  } catch {
    fail("ALREADY_APPLIED", "Você já se candidatou a esta vaga.");
  }

  await appendApplicationEvent(id, "SUBMITTED", createdAt);

  return {
    id,
    jobId,
    jobTitle: job.title,
    status: "SUBMITTED",
    analysisId: analysis.id,
    createdAt,
    updatedAt: createdAt,
    decisionMessage: null,
  };
}

export async function listApplications(): Promise<ApplicationSummary[]> {
  const user = await requireRole("CANDIDATE");
  const db = await getDb();
  const rows = await db.getAllAsync<ApplicationRow>(
    `SELECT a.*, j.title as job_title, j.employer_id as employer_id
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.candidate_id = ?
     ORDER BY a.created_at DESC`,
    user.id,
  );
  const currentMap = await loadCurrentInterviewMap(rows.map((row) => row.id));
  return rows.map((row) => {
    const current = currentMap.get(row.id);
    return toApplicationSummary(row, {
      interviewStatus: current?.status ?? null,
      interviewScheduledAt: current?.scheduledAt ?? null,
    });
  });
}

export async function getApplication(id: string): Promise<ApplicationDetail> {
  const user = await requireUser();
  const row = await loadApplication(id);
  if (!row) fail("NOT_FOUND", "Candidatura não encontrada.");

  const interviewCtx = {
    jobId: row.job_id,
    jobTitle: row.job_title,
    candidateEmail: row.candidate_email,
  };

  if (user.role === "CANDIDATE") {
    if (row.candidate_id !== user.id) {
      fail("NOT_FOUND", "Candidatura não encontrada.");
    }
    const interviews = await loadInterviewsForApplication(id, interviewCtx, false);
    return toApplicationDetail(row, "CANDIDATE", null, undefined, interviews);
  }

  if (user.role === "RECRUITER") {
    const analysis = await loadAnalysis(row.analysis_id);
    const notes = await loadNoteEntries(id);
    const interviews = await loadInterviewsForApplication(id, interviewCtx, true);
    return toApplicationDetail(row, "RECRUITER", analysis, notes, interviews);
  }

  if (user.role === "EMPLOYER") {
    if (row.employer_id !== user.id || !employerCanSee(row.status)) {
      fail("NOT_FOUND", "Candidatura não encontrada.");
    }
    const analysis = await loadAnalysis(row.analysis_id);
    const interviews = await loadInterviewsForApplication(id, interviewCtx, true);
    return toApplicationDetail(row, "EMPLOYER", analysis, undefined, interviews);
  }

  fail("FORBIDDEN", "Esta ação não está disponível para o seu papel.");
}

export async function updateApplicationTags(
  id: string,
  tags: RecruiterTag[],
): Promise<ApplicationDetail> {
  await requireRole("RECRUITER");
  const normalized = normalizeRecruiterTags(tags);
  if (normalized.length !== tags.length) {
    fail(
      "INVALID_BODY",
      "Use só as tags: forte, duvida, perfil-senior, comunicar-depois.",
    );
  }

  const row = await loadApplication(id);
  if (!row) fail("NOT_FOUND", "Candidatura não encontrada.");

  const updatedAt = nowIso();
  const db = await getDb();
  await db.runAsync(
    `UPDATE applications SET recruiter_tags = ?, updated_at = ? WHERE id = ?`,
    JSON.stringify(normalized),
    updatedAt,
    id,
  );

  const updated = await loadApplication(id);
  if (!updated) fail("NOT_FOUND", "Candidatura não encontrada.");
  const analysis = await loadAnalysis(updated.analysis_id);
  const notes = await loadNoteEntries(id);
  return toApplicationDetail(updated, "RECRUITER", analysis, notes);
}

export async function addRecruiterNote(
  id: string,
  text: string,
): Promise<ApplicationDetail> {
  await requireRole("RECRUITER");
  const trimmed = text.trim();
  if (!trimmed) {
    fail("INVALID_BODY", "A nota precisa ter pelo menos 1 caractere.");
  }

  const row = await loadApplication(id);
  if (!row) fail("NOT_FOUND", "Candidatura não encontrada.");

  await appendNoteEntry(id, trimmed, "NOTE");
  const updatedAt = nowIso();
  const db = await getDb();
  await db.runAsync(
    `UPDATE applications SET recruiter_note = ?, updated_at = ? WHERE id = ?`,
    trimmed,
    updatedAt,
    id,
  );

  const updated = await loadApplication(id);
  if (!updated) fail("NOT_FOUND", "Candidatura não encontrada.");
  const analysis = await loadAnalysis(updated.analysis_id);
  const notes = await loadNoteEntries(id);
  return toApplicationDetail(updated, "RECRUITER", analysis, notes);
}

export async function discardApplication(
  id: string,
  note?: string,
): Promise<ApplicationDetail> {
  await requireRole("RECRUITER");
  const row = await loadApplication(id);
  if (!row) fail("NOT_FOUND", "Candidatura não encontrada.");
  if (row.status !== "SUBMITTED") {
    fail("INVALID_TRANSITION", "Só é possível descartar candidaturas ainda na fila.");
  }

  const trimmed = note?.trim() || null;
  if (trimmed) {
    await appendNoteEntry(id, trimmed, "DISCARD");
  }
  const updatedAt = nowIso();
  const db = await getDb();
  await db.runAsync(
    `UPDATE applications SET status = 'DISCARDED', recruiter_note = ?, updated_at = ? WHERE id = ?`,
    trimmed,
    updatedAt,
    id,
  );
  await appendApplicationEvent(id, "DISCARDED", updatedAt);

  const updated = await loadApplication(id);
  if (!updated) fail("NOT_FOUND", "Candidatura não encontrada.");
  const analysis = await loadAnalysis(updated.analysis_id);
  const notes = await loadNoteEntries(id);
  return toApplicationDetail(updated, "RECRUITER", analysis, notes);
}

export async function forwardApplication(
  id: string,
  note?: string,
): Promise<ApplicationDetail> {
  await requireRole("RECRUITER");
  const row = await loadApplication(id);
  if (!row) fail("NOT_FOUND", "Candidatura não encontrada.");
  if (row.status !== "SUBMITTED") {
    fail("INVALID_TRANSITION", "Só é possível encaminhar candidaturas ainda na fila.");
  }

  const trimmed = note?.trim() || null;
  if (trimmed) {
    await appendNoteEntry(id, trimmed, "FORWARD");
  }
  const updatedAt = nowIso();
  const db = await getDb();
  await db.runAsync(
    `UPDATE applications SET status = 'FORWARDED', recruiter_note = ?, updated_at = ? WHERE id = ?`,
    trimmed,
    updatedAt,
    id,
  );
  await appendApplicationEvent(id, "FORWARDED", updatedAt);

  const updated = await loadApplication(id);
  if (!updated) fail("NOT_FOUND", "Candidatura não encontrada.");
  const analysis = await loadAnalysis(updated.analysis_id);
  const notes = await loadNoteEntries(id);
  return toApplicationDetail(updated, "RECRUITER", analysis, notes);
}

export async function decideApplication(
  id: string,
  input: { action: DecisionAction; message?: string },
): Promise<ApplicationDetail> {
  const user = await requireRole("EMPLOYER");
  if (!DECISION_ACTIONS.has(input.action)) {
    fail("INVALID_BODY", "Informe action: ACCEPT, REJECT ou REQUEST_ADJUSTMENT.");
  }

  let message: string | null = null;
  if (input.action === "REJECT" || input.action === "REQUEST_ADJUSTMENT") {
    if (!input.message || input.message.trim().length < 3) {
      fail(
        "INVALID_BODY",
        "Recusa e pedido de ajuste pedem uma mensagem com pelo menos 3 caracteres.",
      );
    }
    message = input.message.trim();
  }

  const row = await loadApplication(id);
  if (!row) fail("NOT_FOUND", "Candidatura não encontrada.");
  if (row.employer_id !== user.id) {
    fail("FORBIDDEN", "Esta vaga não é sua.");
  }
  if (row.status !== "FORWARDED") {
    fail("INVALID_TRANSITION", "Só é possível decidir sobre candidaturas encaminhadas.");
  }

  const status: ApplicationStatus =
    input.action === "ACCEPT"
      ? "ACCEPTED"
      : input.action === "REJECT"
        ? "REJECTED"
        : "ADJUSTMENT_REQUESTED";

  const updatedAt = nowIso();
  const db = await getDb();
  await db.runAsync(
    `UPDATE applications SET status = ?, decision_message = ?, updated_at = ? WHERE id = ?`,
    status,
    message,
    updatedAt,
    id,
  );
  const eventType: ApplicationEventType =
    status === "ACCEPTED"
      ? "ACCEPTED"
      : status === "REJECTED"
        ? "REJECTED"
        : "ADJUSTMENT_REQUESTED";
  await appendApplicationEvent(id, eventType, updatedAt);

  const updated = await loadApplication(id);
  if (!updated) fail("NOT_FOUND", "Candidatura não encontrada.");
  const analysis = await loadAnalysis(updated.analysis_id);
  return toApplicationDetail(updated, "EMPLOYER", analysis, undefined, []);
}

type AgendaEventRow = {
  id: string;
  application_id: string;
  type: ApplicationEventType;
  at: string;
  created_at: string;
  job_id: string;
  job_title: string;
  candidate_email?: string | null;
  interview_status?: InterviewStatus | null;
};

function toAgendaItem(row: AgendaEventRow, includeEmail: boolean): AgendaItem {
  const item: AgendaItem = {
    id: row.id,
    applicationId: row.application_id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    type: row.type,
    date: row.at,
    createdAt: row.created_at,
  };
  if (includeEmail && row.candidate_email) {
    item.candidateEmail = row.candidate_email;
  }
  if (row.interview_status) {
    item.interviewStatus = row.interview_status;
  }
  return item;
}

export async function listAgenda(): Promise<AgendaItem[]> {
  const user = await requireUser();
  const db = await getDb();

  const baseSelect = `
    SELECT e.id, e.application_id, e.type, e.at, e.created_at,
           a.job_id as job_id, j.title as job_title,
           u.email as candidate_email,
           (
             SELECT i.status FROM interviews i
             WHERE i.application_id = a.id
               AND i.status IN ('PROPOSED', 'ACCEPTED')
             ORDER BY i.created_at DESC
             LIMIT 1
           ) as interview_status
    FROM application_events e
    JOIN applications a ON a.id = e.application_id
    JOIN jobs j ON j.id = a.job_id
    JOIN users u ON u.id = a.candidate_id
  `;

  if (user.role === "CANDIDATE") {
    const rows = await db.getAllAsync<AgendaEventRow>(
      `${baseSelect}
       WHERE a.candidate_id = ?
       ORDER BY e.at ASC, e.created_at ASC`,
      user.id,
    );
    return rows.map((row) => toAgendaItem(row, false));
  }

  if (user.role === "EMPLOYER") {
    const rows = await db.getAllAsync<AgendaEventRow>(
      `${baseSelect}
       WHERE j.employer_id = ?
       ORDER BY e.at ASC, e.created_at ASC`,
      user.id,
    );
    return rows.map((row) => toAgendaItem(row, true));
  }

  if (user.role === "RECRUITER") {
    const rows = await db.getAllAsync<AgendaEventRow>(
      `${baseSelect}
       ORDER BY e.at ASC, e.created_at ASC`,
    );
    return rows.map((row) => toAgendaItem(row, true));
  }

  fail("FORBIDDEN", "Esta ação não está disponível para o seu papel.");
}

export async function listInterviews(): Promise<Interview[]> {
  const user = await requireUser();
  const db = await getDb();

  if (user.role === "CANDIDATE") {
    const rows = await db.getAllAsync<InterviewRow>(
      `SELECT i.*, a.job_id as job_id, j.title as job_title
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE a.candidate_id = ?
       ORDER BY i.scheduled_at ASC`,
      user.id,
    );
    return rows.map((row) =>
      toInterview(
        row,
        {
          jobId: row.job_id ?? "",
          jobTitle: row.job_title ?? "",
        },
        false,
      ),
    );
  }

  if (user.role === "EMPLOYER") {
    const rows = await db.getAllAsync<InterviewRow>(
      `SELECT i.*, a.job_id as job_id, j.title as job_title, u.email as candidate_email
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.candidate_id
       WHERE j.employer_id = ?
       ORDER BY i.scheduled_at ASC`,
      user.id,
    );
    return rows.map((row) =>
      toInterview(
        row,
        {
          jobId: row.job_id ?? "",
          jobTitle: row.job_title ?? "",
          candidateEmail: row.candidate_email,
        },
        true,
      ),
    );
  }

  if (user.role === "RECRUITER") {
    const rows = await db.getAllAsync<InterviewRow>(
      `SELECT i.*, a.job_id as job_id, j.title as job_title, u.email as candidate_email
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.candidate_id
       ORDER BY i.scheduled_at ASC`,
    );
    return rows.map((row) =>
      toInterview(
        row,
        {
          jobId: row.job_id ?? "",
          jobTitle: row.job_title ?? "",
          candidateEmail: row.candidate_email,
        },
        true,
      ),
    );
  }

  fail("FORBIDDEN", "Esta ação não está disponível para o seu papel.");
}

export async function proposeInterview(
  applicationId: string,
  input: { scheduledAt: string },
): Promise<ApplicationDetail> {
  const user = await requireRole("EMPLOYER");
  const scheduled = assertFutureIso(input.scheduledAt);
  const scheduledAt = scheduled.toISOString();

  const row = await loadApplication(applicationId);
  if (!row) fail("NOT_FOUND", "Candidatura não encontrada.");
  if (row.employer_id !== user.id) {
    fail("FORBIDDEN", "Esta vaga não é sua.");
  }
  if (row.status !== "ACCEPTED") {
    fail(
      "INVALID_TRANSITION",
      "Só é possível marcar entrevista depois de aceitar o candidato.",
    );
  }

  const db = await getDb();
  const existing = await db.getAllAsync<InterviewRow>(
    `SELECT * FROM interviews
     WHERE application_id = ? AND status IN ('PROPOSED', 'ACCEPTED')
     ORDER BY created_at DESC`,
    applicationId,
  );
  const accepted = existing.find((item) => item.status === "ACCEPTED");
  if (accepted) {
    fail("INVALID_TRANSITION", "A data da entrevista já foi confirmada.");
  }
  const proposed = existing.find((item) => item.status === "PROPOSED");
  const now = nowIso();

  if (proposed) {
    await db.runAsync(
      `UPDATE interviews SET scheduled_at = ? WHERE id = ?`,
      scheduledAt,
      proposed.id,
    );
  } else {
    const id = await createId();
    await db.runAsync(
      `INSERT INTO interviews (id, application_id, scheduled_at, status, created_at, responded_at)
       VALUES (?, ?, ?, 'PROPOSED', ?, NULL)`,
      id,
      applicationId,
      scheduledAt,
      now,
    );
  }

  await appendApplicationEvent(applicationId, "INTERVIEW_PROPOSED", scheduledAt);
  await db.runAsync(`UPDATE applications SET updated_at = ? WHERE id = ?`, now, applicationId);

  const updated = await loadApplication(applicationId);
  if (!updated) fail("NOT_FOUND", "Candidatura não encontrada.");
  const analysis = await loadAnalysis(updated.analysis_id);
  const interviews = await loadInterviewsForApplication(
    applicationId,
    {
      jobId: updated.job_id,
      jobTitle: updated.job_title,
      candidateEmail: updated.candidate_email,
    },
    true,
  );
  return toApplicationDetail(updated, "EMPLOYER", analysis, undefined, interviews);
}

export async function respondInterview(
  interviewId: string,
  input: { action: InterviewRespondAction },
): Promise<ApplicationDetail> {
  const user = await requireRole("CANDIDATE");
  if (input.action !== "ACCEPT" && input.action !== "DECLINE") {
    fail("INVALID_BODY", "Informe action: ACCEPT ou DECLINE.");
  }

  const db = await getDb();
  const interview = await db.getFirstAsync<InterviewRow>(
    `SELECT * FROM interviews WHERE id = ?`,
    interviewId,
  );
  if (!interview) fail("NOT_FOUND", "Entrevista não encontrada.");

  const row = await loadApplication(interview.application_id);
  if (!row || row.candidate_id !== user.id) {
    fail("NOT_FOUND", "Entrevista não encontrada.");
  }
  if (interview.status !== "PROPOSED") {
    fail("INVALID_TRANSITION", "Só é possível responder a uma data proposta.");
  }

  const status: InterviewStatus = input.action === "ACCEPT" ? "ACCEPTED" : "DECLINED";
  const eventType: ApplicationEventType =
    input.action === "ACCEPT" ? "INTERVIEW_ACCEPTED" : "INTERVIEW_DECLINED";
  const respondedAt = nowIso();
  await db.runAsync(
    `UPDATE interviews SET status = ?, responded_at = ? WHERE id = ?`,
    status,
    respondedAt,
    interviewId,
  );
  await appendApplicationEvent(interview.application_id, eventType, interview.scheduled_at);
  await db.runAsync(
    `UPDATE applications SET updated_at = ? WHERE id = ?`,
    respondedAt,
    interview.application_id,
  );

  const updated = await loadApplication(interview.application_id);
  if (!updated) fail("NOT_FOUND", "Candidatura não encontrada.");
  const interviews = await loadInterviewsForApplication(
    interview.application_id,
    {
      jobId: updated.job_id,
      jobTitle: updated.job_title,
      candidateEmail: updated.candidate_email,
    },
    false,
  );
  return toApplicationDetail(updated, "CANDIDATE", null, undefined, interviews);
}

export async function resubmitApplication(
  id: string,
  input: UploadFileInput,
): Promise<ApplicationSummary> {
  const user = await requireRole("CANDIDATE");
  const row = await loadApplication(id);
  if (!row || row.candidate_id !== user.id) {
    fail("NOT_FOUND", "Candidatura não encontrada.");
  }
  if (row.status !== "ADJUSTMENT_REQUESTED") {
    fail(
      "INVALID_TRANSITION",
      "Só é possível reenviar o PDF depois de um pedido de ajuste.",
    );
  }

  const { fileName, bytes } = await readPdfBytes(input);
  const analysis = await runAnalysisPipeline({
    userId: user.id,
    fileName,
    bytes,
  });

  const updatedAt = nowIso();
  const db = await getDb();
  const nextCount = (row.submission_count ?? 1) + 1;
  await db.runAsync(
    `UPDATE applications
     SET analysis_id = ?, status = 'SUBMITTED', decision_message = NULL, recruiter_note = NULL,
         submission_count = ?, updated_at = ?
     WHERE id = ?`,
    analysis.id,
    nextCount,
    updatedAt,
    id,
  );
  await appendApplicationEvent(id, "RESUBMITTED", updatedAt);

  return {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    status: "SUBMITTED",
    analysisId: analysis.id,
    createdAt: row.created_at,
    updatedAt,
    decisionMessage: null,
  };
}

export async function createAnalysis(input: UploadFileInput): Promise<AnalysisDetail> {
  const user = await requireUser();
  const { fileName, bytes } = await readPdfBytes(input);
  return runAnalysisPipeline({
    userId: user.id,
    fileName,
    bytes,
  });
}

export async function listAnalyses(): Promise<AnalysisSummary[]> {
  const user = await requireUser();
  const db = await getDb();
  const rows = await db.getAllAsync<AnalysisRow>(
    `SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC`,
    user.id,
  );
  return rows.map((row) => ({
    id: row.id,
    fileName: row.file_name,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getAnalysis(id: string): Promise<AnalysisDetail> {
  const user = await requireUser();
  const db = await getDb();
  const row = await db.getFirstAsync<AnalysisRow>(
    `SELECT * FROM analyses WHERE id = ? AND user_id = ?`,
    id,
    user.id,
  );
  if (!row) fail("NOT_FOUND", "Análise não encontrada.");
  return toAnalysisDetail(row);
}

export async function listResumes(): Promise<Resume[]> {
  const user = await requireRole("CANDIDATE");
  const db = await getDb();
  const rows = await db.getAllAsync<ResumeRow>(
    `SELECT * FROM resumes
     WHERE user_id = ?
     ORDER BY CASE kind WHEN 'MAIN' THEN 0 ELSE 1 END, created_at ASC`,
    user.id,
  );
  return rows.map(toResume);
}

async function loadResumeForUser(userId: string, resumeId: string): Promise<ResumeRow> {
  const db = await getDb();
  const row = await db.getFirstAsync<ResumeRow>(
    `SELECT * FROM resumes WHERE id = ? AND user_id = ?`,
    resumeId,
    userId,
  );
  if (!row) fail("NOT_FOUND", "Currículo não encontrado.");
  return row;
}

export async function createResume(params: {
  kind: ResumeKind;
  label?: string;
  input: UploadFileInput;
}): Promise<Resume> {
  const user = await requireRole("CANDIDATE");
  const db = await getDb();
  const label = normalizeResumeLabel(params.kind, params.label ?? "");

  if (params.kind === "MAIN") {
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM resumes WHERE user_id = ? AND kind = 'MAIN'`,
      user.id,
    );
    if (existing) {
      fail("INVALID_BODY", "Já existe um currículo principal. Substitua o arquivo ou remova-o.");
    }
  } else {
    const countRow = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM resumes WHERE user_id = ? AND kind = 'FOCUSED'`,
      user.id,
    );
    if ((countRow?.cnt ?? 0) >= MAX_FOCUSED_RESUMES) {
      fail(
        "INVALID_BODY",
        `Você já tem ${MAX_FOCUSED_RESUMES} versões. Substitua uma delas ou remova antes de adicionar.`,
      );
    }
  }

  const id = await createId();
  const stored = await storeResumePdf({
    userId: user.id,
    resumeId: id,
    input: params.input,
  });
  const createdAt = nowIso();
  await db.runAsync(
    `INSERT INTO resumes
      (id, user_id, kind, label, file_name, file_uri, file_size_bytes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    user.id,
    params.kind,
    label,
    stored.fileName,
    stored.fileUri,
    stored.fileSizeBytes,
    createdAt,
    createdAt,
  );

  return {
    id,
    kind: params.kind,
    label,
    fileName: stored.fileName,
    fileSizeBytes: stored.fileSizeBytes,
    createdAt,
    updatedAt: createdAt,
  };
}

export async function replaceResumeFile(
  resumeId: string,
  input: UploadFileInput,
): Promise<Resume> {
  const user = await requireRole("CANDIDATE");
  const row = await loadResumeForUser(user.id, resumeId);
  const stored = await storeResumePdf({
    userId: user.id,
    resumeId: row.id,
    input,
  });
  if (stored.fileUri !== row.file_uri) {
    await deleteResumePdf(row.file_uri);
  }
  const updatedAt = nowIso();
  const db = await getDb();
  await db.runAsync(
    `UPDATE resumes
     SET file_name = ?, file_uri = ?, file_size_bytes = ?, updated_at = ?
     WHERE id = ?`,
    stored.fileName,
    stored.fileUri,
    stored.fileSizeBytes,
    updatedAt,
    row.id,
  );
  return {
    ...toResume(row),
    fileName: stored.fileName,
    fileSizeBytes: stored.fileSizeBytes,
    updatedAt,
  };
}

export async function renameResume(resumeId: string, label: string): Promise<Resume> {
  const user = await requireRole("CANDIDATE");
  const row = await loadResumeForUser(user.id, resumeId);
  if (row.kind !== "FOCUSED") {
    fail("INVALID_BODY", "Só as versões de área ou empresa podem ser renomeadas.");
  }
  const nextLabel = normalizeResumeLabel("FOCUSED", label);
  const updatedAt = nowIso();
  const db = await getDb();
  await db.runAsync(
    `UPDATE resumes SET label = ?, updated_at = ? WHERE id = ?`,
    nextLabel,
    updatedAt,
    row.id,
  );
  return { ...toResume(row), label: nextLabel, updatedAt };
}

export async function deleteResume(resumeId: string): Promise<void> {
  const user = await requireRole("CANDIDATE");
  const row = await loadResumeForUser(user.id, resumeId);
  const db = await getDb();
  await db.runAsync(`DELETE FROM resumes WHERE id = ?`, row.id);
  await deleteResumePdf(row.file_uri);
}

/** Lê o PDF salvo e devolve o mesmo formato usado no upload. */
export async function getResumeUploadInput(resumeId: string): Promise<UploadFileInput> {
  const user = await requireRole("CANDIDATE");
  const row = await loadResumeForUser(user.id, resumeId);
  return uploadInputFromStoredResume({
    fileUri: row.file_uri,
    fileName: row.file_name,
  });
}

/**
 * Cria ou substitui um slot a partir de um PDF já escolhido (Analisar / reenvio avulso).
 * `replaceId` aponta para um FOCUSED existente quando as 3 versões já estão ocupadas.
 */
export async function savePickedPdfToLibrary(params: {
  input: UploadFileInput;
  target: "MAIN" | "NEW_FOCUSED" | { replaceId: string };
  label?: string;
}): Promise<Resume> {
  const user = await requireRole("CANDIDATE");

  if (params.target === "MAIN") {
    const db = await getDb();
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM resumes WHERE user_id = ? AND kind = 'MAIN'`,
      user.id,
    );
    if (existing) {
      return replaceResumeFile(existing.id, params.input);
    }
    return createResume({ kind: "MAIN", input: params.input });
  }

  if (params.target === "NEW_FOCUSED") {
    return createResume({
      kind: "FOCUSED",
      label: params.label,
      input: params.input,
    });
  }

  const row = await loadResumeForUser(user.id, params.target.replaceId);
  if (row.kind !== "FOCUSED") {
    fail("INVALID_BODY", "Só é possível substituir uma versão focada neste fluxo.");
  }
  if (params.label && params.label.trim().length >= 2) {
    await renameResume(row.id, params.label);
  }
  return replaceResumeFile(row.id, params.input);
}
