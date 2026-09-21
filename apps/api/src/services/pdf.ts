import pdf from "pdf-parse";
import { httpError } from "../routes/health.js";

const MIN_TEXT_LENGTH = 80;

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const parsed = await pdf(buffer);
    return (parsed.text ?? "").replace(/\s+/g, " ").trim();
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

  if (text.length < MIN_TEXT_LENGTH) {
    throw httpError(
      422,
      "TEXT_TOO_SHORT",
      "O texto extraído é curto demais para uma análise útil. Verifique se o PDF não está vazio ou quase vazio.",
    );
  }
}
