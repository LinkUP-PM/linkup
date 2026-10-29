export type FeedbackPoint = {
  title: string;
  detail: string;
};

export type Suggestion = {
  action: string;
  why: string;
  example?: string;
};

export type AnalysisDimensions = {
  structure: { summary: string };
  clarity: { summary: string };
  skills: {
    identified: string[];
    missing: string[];
    summary: string;
  };
  keywords: {
    present: string[];
    missing: string[];
    summary: string;
  };
};

export type AnalysisResult = {
  strengths: FeedbackPoint[];
  attentionPoints: FeedbackPoint[];
  suggestions: Suggestion[];
  dimensions: AnalysisDimensions;
};

export type AnalysisStatus =
  | "PENDING"
  | "EXTRACTING"
  | "ANALYZING"
  | "COMPLETED"
  | "FAILED";

export type AnalysisSummary = {
  id: string;
  fileName: string;
  status: AnalysisStatus;
  createdAt: string;
};

export type AnalysisDetail = AnalysisSummary & {
  fileSizeBytes: number;
  result: AnalysisResult | null;
  errorMessage?: string;
};

export type Role = "CANDIDATE" | "RECRUITER" | "EMPLOYER";

export type ApplicationStatus =
  | "SUBMITTED"
  | "DISCARDED"
  | "FORWARDED"
  | "ADJUSTMENT_REQUESTED"
  | "ACCEPTED"
  | "REJECTED";

export type DecisionAction = "ACCEPT" | "REJECT" | "REQUEST_ADJUSTMENT";

export type Me = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: Me;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  lookingFor: string;
  employerId: string;
  createdAt: string;
  /** Recrutador: candidaturas ainda na fila (SUBMITTED). */
  queueCount?: number;
  /** Contratante: encaminhadas aguardando decisão (FORWARDED). */
  pendingDecisionCount?: number;
  /** Recrutador: já encaminhadas (FORWARDED). */
  forwardedCount?: number;
  /** Recrutador: aguardando reenvio do candidato (ADJUSTMENT_REQUESTED). */
  adjustmentCount?: number;
  /** Recrutador: DISCARDED + ACCEPTED + REJECTED. */
  closedCount?: number;
};

/** Tags internas do recrutador (só ele vê). Conjunto fixo do MVP. */
export type RecruiterTag =
  | "forte"
  | "duvida"
  | "perfil-senior"
  | "comunicar-depois";

export const RECRUITER_TAGS: readonly RecruiterTag[] = [
  "forte",
  "duvida",
  "perfil-senior",
  "comunicar-depois",
] as const;

export const RECRUITER_TAG_LABELS: Record<RecruiterTag, string> = {
  forte: "Forte",
  duvida: "Dúvida",
  "perfil-senior": "Perfil sênior",
  "comunicar-depois": "Comunicar depois",
};

export type RecruiterNoteAction = "NOTE" | "FORWARD" | "DISCARD";

export type RecruiterNoteEntry = {
  id: string;
  text: string;
  action: RecruiterNoteAction;
  createdAt: string;
};

export type ApplicationSummary = {
  id: string;
  jobId: string;
  jobTitle: string;
  status: ApplicationStatus;
  analysisId: string;
  createdAt: string;
  updatedAt: string;
  decisionMessage?: string | null;
  /** Só aparece para o recrutador. */
  candidateEmail?: string;
  /** Só aparece para o recrutador. 1 na primeira vez; incrementa no reenvio. */
  submissionCount?: number;
  /** Só aparece para o recrutador. Até 3 competências da análise. */
  previewSkills?: string[];
  /** Só aparece para o recrutador. Até 2 títulos de pontos fortes. */
  previewStrengths?: string[];
  /** Só aparece para o recrutador. Até 1 título de ponto de atenção. */
  previewAttention?: string[];
  /** Só aparece para o recrutador. Tags internas. */
  recruiterTags?: RecruiterTag[];
};

export type ApplicationDetail = ApplicationSummary & {
  /** Só aparece para o recrutador. Atalho da última nota do histórico. */
  recruiterNote?: string | null;
  /** Só aparece para o recrutador. Histórico append-only, mais recente primeiro. */
  recruiterNotes?: RecruiterNoteEntry[];
  analysis?: AnalysisDetail | null;
};

export function isRecruiterTag(value: unknown): value is RecruiterTag {
  return typeof value === "string" && (RECRUITER_TAGS as readonly string[]).includes(value);
}

export function normalizeRecruiterTags(value: unknown): RecruiterTag[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<RecruiterTag>();
  const out: RecruiterTag[] = [];
  for (const item of value) {
    if (isRecruiterTag(item) && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "ROLE_MISMATCH"
  | "EMAIL_TAKEN"
  | "INVALID_FILE"
  | "FILE_TOO_LARGE"
  | "TEXT_NOT_EXTRACTABLE"
  | "TEXT_TOO_SHORT"
  | "AI_UNAVAILABLE"
  | "AI_INVALID_RESPONSE"
  | "NOT_FOUND"
  | "ROLE_REQUIRED"
  | "FORBIDDEN"
  | "ALREADY_APPLIED"
  | "INVALID_BODY"
  | "INVALID_TRANSITION"
  | "INTERNAL";

export type ApiErrorBody = {
  error: ApiErrorCode;
  message: string;
};

export const ROLE_LABELS: Record<Role, string> = {
  CANDIDATE: "Candidato",
  RECRUITER: "Recrutador",
  EMPLOYER: "Contratante",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Candidatura enviada",
  DISCARDED: "Não avançou",
  FORWARDED: "Encaminhada ao contratante",
  ADJUSTMENT_REQUESTED: "Pedido de ajuste",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
};

function isPoint(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as FeedbackPoint;
  return typeof v.title === "string" && v.title.length >= 3 && typeof v.detail === "string" && v.detail.length >= 8;
}

function isSuggestion(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Suggestion;
  return (
    typeof v.action === "string" &&
    v.action.length >= 8 &&
    typeof v.why === "string" &&
    v.why.length >= 8 &&
    (v.example === undefined || typeof v.example === "string")
  );
}

export function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const v = value as AnalysisResult;
  return (
    Array.isArray(v.strengths) &&
    v.strengths.length > 0 &&
    v.strengths.every(isPoint) &&
    Array.isArray(v.attentionPoints) &&
    v.attentionPoints.length > 0 &&
    v.attentionPoints.every(isPoint) &&
    Array.isArray(v.suggestions) &&
    v.suggestions.length > 0 &&
    v.suggestions.every(isSuggestion) &&
    typeof v.dimensions?.structure?.summary === "string" &&
    typeof v.dimensions?.clarity?.summary === "string" &&
    Array.isArray(v.dimensions?.skills?.identified) &&
    Array.isArray(v.dimensions?.skills?.missing) &&
    typeof v.dimensions?.skills?.summary === "string" &&
    Array.isArray(v.dimensions?.keywords?.present) &&
    Array.isArray(v.dimensions?.keywords?.missing) &&
    typeof v.dimensions?.keywords?.summary === "string"
  );
}
