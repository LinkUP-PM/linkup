import { Platform } from "react-native";
import type { AnalysisDetail, AnalysisSummary, ApiErrorBody } from "@linkup/shared";
import { API_URL } from "./config";
import { getDeviceId } from "./device";

/** Acima do AI_TIMEOUT_MS (45s) da API para OpenAI lento. */
const FETCH_TIMEOUT_MS = 60_000;

export type UploadFileInput = {
  uri: string;
  name: string;
  mimeType?: string | null;
  /** Presente no Expo web (DocumentPickerAsset.file). */
  file?: File;
};

async function headers(): Promise<Record<string, string>> {
  return { "X-Device-Id": await getDeviceId() };
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.message ?? "Algo deu errado. Tente novamente.";
  } catch {
    return "Algo deu errado. Tente novamente.";
  }
}

function networkErrorMessage(err: unknown): Error {
  if (err instanceof Error && err.name === "AbortError") {
    return new Error(
      "A análise demorou demais. Verifique a conexão e tente novamente.",
    );
  }
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network request failed") ||
    lower.includes("networkerror") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound")
  ) {
    return new Error(
      "Não foi possível falar com a API. Confira se o servidor está ligado, se o celular está na mesma Wi‑Fi e se EXPO_PUBLIC_API_URL aponta para o IP certo.",
    );
  }
  return err instanceof Error ? err : new Error(raw);
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    throw networkErrorMessage(err);
  } finally {
    clearTimeout(timer);
  }
}

async function appendPdfPart(form: FormData, input: UploadFileInput): Promise<void> {
  const fileName = input.name || "curriculo.pdf";
  const mimeType = input.mimeType || "application/pdf";

  if (Platform.OS === "web") {
    let blob: Blob;
    if (typeof File !== "undefined" && input.file instanceof File) {
      blob = input.file;
    } else {
      const blobResponse = await fetch(input.uri);
      blob = await blobResponse.blob();
    }
    // RN FormData typings only accept 2 args; browsers still honor File name via the Blob.
    const part =
      typeof File !== "undefined"
        ? new File([blob], fileName, { type: blob.type || mimeType, lastModified: Date.now() })
        : blob;
    form.append("file", part as unknown as Blob);
    return;
  }

  form.append("file", {
    uri: input.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
}

export async function createAnalysis(input: UploadFileInput): Promise<AnalysisDetail> {
  const form = new FormData();
  await appendPdfPart(form, input);

  const response = await request("/analyses", {
    method: "POST",
    headers: await headers(),
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as AnalysisDetail;
}

export async function listAnalyses(): Promise<AnalysisSummary[]> {
  const response = await request("/analyses", {
    headers: await headers(),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const body = (await response.json()) as { items: AnalysisSummary[] };
  return body.items;
}

export async function getAnalysis(id: string): Promise<AnalysisDetail> {
  const response = await request(`/analyses/${id}`, {
    headers: await headers(),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as AnalysisDetail;
}
