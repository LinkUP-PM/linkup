import { extractText, getDocumentProxy } from "unpdf";
import { httpError } from "../routes/health.js";

const MIN_TEXT_LENGTH = 80;

export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (!buffer.length || buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
    throw httpError(400, "INVALID_FILE", "Envie apenas arquivos no formato PDF.");
  }

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const raw = Array.isArray(text) ? text.join("\n") : (text ?? "");
    return raw.replace(/\s+/g, " ").trim();
  } catch {
    throw httpError(
      422,
      "TEXT_NOT_EXTRACTABLE",
      "Não foi possível ler o texto deste PDF. Envie um arquivo com texto selecionável, não uma imagem escaneada.",
    );
  }
}

export function assertExtractedText(text: string): void {
  if (!text) {
    throw httpError(
      422,
      "TEXT_NOT_EXTRACTABLE",
      "Não foi possível ler o texto deste PDF. Envie um arquivo com texto selecionável, não uma imagem escaneada.",
    );
  }

  // Heurística: PDF com quase só whitespace/controle → típico de scan sem OCR
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters < 40) {
    throw httpError(
      422,
      "TEXT_NOT_EXTRACTABLE",
      "Não foi possível ler o texto deste PDF. Envie um arquivo com texto selecionável, não uma imagem escaneada.",
    );
  }

  if (text.length < MIN_TEXT_LENGTH) {
    throw httpError(
      422,
      "TEXT_TOO_SHORT",
      "O texto extraído é curto demais para uma análise útil. Verifique se o PDF não está vazio ou quase vazio.",
    );
  }
}
