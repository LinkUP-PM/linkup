import type {
  AnalysisDetail,
  AnalysisResult,
  AnalysisSummary,
  ApplicationDetail,
  ApplicationStatus,
  ApplicationSummary,
  AuthResponse,
  DecisionAction,
  Job,
  Me,
  RecruiterNoteAction,
  RecruiterNoteEntry,
  RecruiterTag,
  Role,
} from "@linkup/shared";
import { normalizeRecruiterTags } from "@linkup/shared";
import { getDb } from "./db";
import { fail } from "./errors";
import { createId, createSessionToken, hashToken } from "./ids";
import { mockAnalysisResult } from "./mock-analysis";
import { hashPassword, verifyPassword } from "./password";
import { extractPdfText, readPdfBytes, type PdfByteSource } from "./pdf";
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

function toApplicationSummary(
  row: ApplicationRow,
  opts?: {
    includeDecisionMessage?: boolean;
    recruiterPreview?: boolean;
    previewSkills?: string[];
    previewStrengths?: string[];
    previewAttention?: string[];
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
  return summary;
}

function toApplicationDetail(
  row: ApplicationRow,
  viewer: Role,
  analysis?: AnalysisRow | null,
  notes?: RecruiterNoteEntry[],
): ApplicationDetail {
  const detail: ApplicationDetail = toApplicationSummary(row, {
    recruiterPreview: viewer === "RECRUITER",
    previewSkills:
      viewer === "RECRUITER" ? previewSkillsFromResultJson(analysis?.result_json) : undefined,
    previewStrengths:
      viewer === "RECRUITER" ? previewStrengthsFromResultJson(analysis?.result_json) : undefined,
    previewAttention:
      viewer === "RECRUITER" ? previewAttentionFromResultJson(analysis?.result_json) : undefined,
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
  return rows.map((row) => toApplicationSummary(row));
}

export async function getApplication(id: string): Promise<ApplicationDetail> {
  const user = await requireUser();
  const row = await loadApplication(id);
  if (!row) fail("NOT_FOUND", "Candidatura não encontrada.");

  if (user.role === "CANDIDATE") {
    if (row.candidate_id !== user.id) {
      fail("NOT_FOUND", "Candidatura não encontrada.");
    }
    return toApplicationDetail(row, "CANDIDATE");
  }

  if (user.role === "RECRUITER") {
    const analysis = await loadAnalysis(row.analysis_id);
    const notes = await loadNoteEntries(id);
    return toApplicationDetail(row, "RECRUITER", analysis, notes);
  }

  if (user.role === "EMPLOYER") {
    if (row.employer_id !== user.id || !employerCanSee(row.status)) {
      fail("NOT_FOUND", "Candidatura não encontrada.");
    }
    const analysis = await loadAnalysis(row.analysis_id);
    return toApplicationDetail(row, "EMPLOYER", analysis);
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

  const updated = await loadApplication(id);
  if (!updated) fail("NOT_FOUND", "Candidatura não encontrada.");
  const analysis = await loadAnalysis(updated.analysis_id);
  return toApplicationDetail(updated, "EMPLOYER", analysis);
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
