import type { AnalysisDetail, AnalysisSummary, ApiErrorBody } from "@linkup/shared";
import { API_URL } from "./config";
import { getDeviceId } from "./device";

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
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch (err) {
    throw networkErrorMessage(err);
  }
}

export async function createAnalysis(fileUri: string, fileName: string, mimeType: string): Promise<AnalysisDetail> {
  const form = new FormData();
  form.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType || "application/pdf",
  } as unknown as Blob);

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
