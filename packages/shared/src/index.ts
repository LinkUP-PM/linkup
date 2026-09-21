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

export type ApiErrorCode =
  | "DEVICE_ID_REQUIRED"
  | "INVALID_FILE"
  | "FILE_TOO_LARGE"
  | "TEXT_NOT_EXTRACTABLE"
  | "TEXT_TOO_SHORT"
  | "AI_UNAVAILABLE"
  | "AI_INVALID_RESPONSE"
  | "NOT_FOUND";

export type ApiErrorBody = {
  error: ApiErrorCode;
  message: string;
};

export function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const v = value as AnalysisResult;
  return (
    Array.isArray(v.strengths) &&
    v.strengths.length > 0 &&
    Array.isArray(v.attentionPoints) &&
    v.attentionPoints.length > 0 &&
    Array.isArray(v.suggestions) &&
    v.suggestions.length > 0 &&
    typeof v.dimensions?.structure?.summary === "string" &&
    typeof v.dimensions?.clarity?.summary === "string" &&
    Array.isArray(v.dimensions?.skills?.identified) &&
    Array.isArray(v.dimensions?.keywords?.present)
  );
}
