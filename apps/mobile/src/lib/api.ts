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

export async function createAnalysis(fileUri: string, fileName: string, mimeType: string): Promise<AnalysisDetail> {
  const form = new FormData();
  form.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType || "application/pdf",
  } as unknown as Blob);

  const response = await fetch(`${API_URL}/analyses`, {
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
  const response = await fetch(`${API_URL}/analyses`, {
    headers: await headers(),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const body = (await response.json()) as { items: AnalysisSummary[] };
  return body.items;
}

export async function getAnalysis(id: string): Promise<AnalysisDetail> {
  const response = await fetch(`${API_URL}/analyses/${id}`, {
    headers: await headers(),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as AnalysisDetail;
}
