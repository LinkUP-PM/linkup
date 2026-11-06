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

function laudoRootDir(): string {
  const root = FileSystem.documentDirectory;
  if (!root) {
    fail("INTERNAL", "Armazenamento local indisponível neste aparelho.");
  }
  return `${root}laudos/`;
}

function userLaudoDir(userId: string): string {
  return `${laudoRootDir()}${userId}/`;
}

export function laudoFilePath(userId: string): string {
  return `${userLaudoDir(userId)}laudo.pdf`;
}

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

/** Valida o PDF do laudo PCD e grava uma cópia estável em documentDirectory. */
export async function storeLaudoPdf(params: {
  userId: string;
  input: LocalPdfFile;
}): Promise<{ fileName: string; fileUri: string; fileSizeBytes: number }> {
  const { fileName, bytes } = await readPdfBytes(params.input);
  const dest = laudoFilePath(params.userId);
  await ensureDir(userLaudoDir(params.userId));

  await FileSystem.writeAsStringAsync(dest, bytesToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    fileName,
    fileUri: dest,
    fileSizeBytes: bytes.byteLength,
  };
}

export async function deleteLaudoPdf(fileUri: string | null | undefined): Promise<void> {
  if (!fileUri) return;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch {
    // Melhor esforço: o registro no SQLite segue sendo atualizado.
  }
}
