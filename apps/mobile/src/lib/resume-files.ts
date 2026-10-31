import * as FileSystem from "expo-file-system";
import { fail } from "./errors";
import { readPdfBytes, type LocalPdfFile } from "./pdf";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return globalThis.btoa(binary);
}

function resumeRootDir(): string {
  const root = FileSystem.documentDirectory;
  if (!root) {
    fail("INTERNAL", "Armazenamento local indisponível neste aparelho.");
  }
  return `${root}resumes/`;
}

function userResumeDir(userId: string): string {
  return `${resumeRootDir()}${userId}/`;
}

export function resumeFilePath(userId: string, resumeId: string): string {
  return `${userResumeDir(userId)}${resumeId}.pdf`;
}

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

/** Valida o PDF e grava uma cópia estável em documentDirectory. */
export async function storeResumePdf(params: {
  userId: string;
  resumeId: string;
  input: LocalPdfFile;
}): Promise<{ fileName: string; fileUri: string; fileSizeBytes: number }> {
  const { fileName, bytes } = await readPdfBytes(params.input);
  const dest = resumeFilePath(params.userId, params.resumeId);
  await ensureDir(userResumeDir(params.userId));

  // Sempre grava pelos bytes já validados — cobre web, blob e substituição no mesmo path.
  await FileSystem.writeAsStringAsync(dest, bytesToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    fileName,
    fileUri: dest,
    fileSizeBytes: bytes.byteLength,
  };
}

export async function deleteResumePdf(fileUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch {
    // Melhor esforço: o registro no SQLite segue sendo removido.
  }
}

export async function uploadInputFromStoredResume(params: {
  fileUri: string;
  fileName: string;
}): Promise<LocalPdfFile> {
  const info = await FileSystem.getInfoAsync(params.fileUri);
  if (!info.exists) {
    fail("NOT_FOUND", "Arquivo do currículo não encontrado neste aparelho.");
  }
  return {
    uri: params.fileUri,
    name: params.fileName,
    mimeType: "application/pdf",
  };
}
