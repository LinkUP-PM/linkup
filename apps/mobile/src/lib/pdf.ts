import * as FileSystem from "expo-file-system";
import { fail } from "./errors";

const MIN_TEXT_LENGTH = 80;
const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;

function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodePdfLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\(.)/g, "$1");
}

/** Extrai strings de streams/conteúdo PDF quando o Metro não empacota unpdf/pdfjs. */
function extractTextLightweight(bytes: Uint8Array): string {
  const latin = new TextDecoder("latin1").decode(bytes);
  const parts: string[] = [];

  const literalRe = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = literalRe.exec(latin)) !== null) {
    const inner = match[0].slice(1, match[0].lastIndexOf(")"));
    const text = decodePdfLiteral(inner).trim();
    if (text) parts.push(text);
  }

  const arrayRe = /\[((?:[^\]\\]|\\.)*)\]\s*TJ/g;
  while ((match = arrayRe.exec(latin)) !== null) {
    const chunk = match[1];
    const strings = chunk.match(/\((?:\\.|[^\\)])*\)/g) ?? [];
    for (const s of strings) {
      const text = decodePdfLiteral(s.slice(1, -1)).trim();
      if (text) parts.push(text);
    }
  }

  return normalizeExtractedText(parts.join("\n"));
}

async function extractWithUnpdf(bytes: Uint8Array): Promise<string | null> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const raw = Array.isArray(text) ? text.join("\n") : (text ?? "");
    return normalizeExtractedText(raw);
  } catch {
    return null;
  }
}

async function bytesFromBlob(file: PdfByteSource): Promise<Uint8Array> {
  if (file.size > MAX_PDF_SIZE_BYTES) {
    fail("FILE_TOO_LARGE", "O PDF ultrapassa o limite de 5 MB.");
  }
  return new Uint8Array(await file.arrayBuffer());
}

async function bytesFromUri(uri: string): Promise<Uint8Array> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    fail("INVALID_FILE", "Não foi possível abrir o arquivo selecionado.");
  }
  if (typeof info.size === "number" && info.size > MAX_PDF_SIZE_BYTES) {
    fail("FILE_TOO_LARGE", "O PDF ultrapassa o limite de 5 MB.");
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBytes(base64);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export type PdfByteSource = {
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type LocalPdfFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  file?: PdfByteSource;
};

export async function readPdfBytes(input: LocalPdfFile): Promise<{
  fileName: string;
  bytes: Uint8Array;
}> {
  const fileName = input.name || "curriculo.pdf";
  const isPdf =
    input.mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    fail("INVALID_FILE", "Envie apenas arquivos no formato PDF.");
  }

  const bytes = input.file ? await bytesFromBlob(input.file) : await bytesFromUri(input.uri);

  if (bytes.byteLength > MAX_PDF_SIZE_BYTES) {
    fail("FILE_TOO_LARGE", "O PDF ultrapassa o limite de 5 MB.");
  }

  const header = String.fromCharCode(...bytes.subarray(0, 4));
  if (header !== "%PDF") {
    fail("INVALID_FILE", "Envie apenas arquivos no formato PDF.");
  }

  return { fileName, bytes };
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const fromUnpdf = await extractWithUnpdf(bytes);
  const text = fromUnpdf && fromUnpdf.length >= MIN_TEXT_LENGTH
    ? fromUnpdf
    : extractTextLightweight(bytes);

  if (!text) {
    fail(
      "TEXT_NOT_EXTRACTABLE",
      "Não foi possível ler o texto deste PDF. Envie um arquivo com texto selecionável, não uma imagem escaneada.",
    );
  }

  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters < 40) {
    fail(
      "TEXT_NOT_EXTRACTABLE",
      "Não foi possível ler o texto deste PDF. Envie um arquivo com texto selecionável, não uma imagem escaneada.",
    );
  }

  if (text.length < MIN_TEXT_LENGTH) {
    fail(
      "TEXT_TOO_SHORT",
      "O texto extraído é curto demais para uma análise útil. Verifique se o PDF não está vazio ou quase vazio.",
    );
  }

  return text;
}
