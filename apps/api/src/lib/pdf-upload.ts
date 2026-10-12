import type { MultipartFile } from "@fastify/multipart";
import { config } from "../config.js";
import { httpError } from "./http.js";

export async function readPdfUpload(file: MultipartFile | undefined): Promise<{
  fileName: string;
  buffer: Buffer;
}> {
  if (!file) {
    throw httpError(400, "INVALID_FILE", "Envie um arquivo PDF no campo file.");
  }

  const fileName = file.filename || "curriculo.pdf";
  const isPdf =
    file.mimetype === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw httpError(400, "INVALID_FILE", "Envie apenas arquivos no formato PDF.");
  }

  let buffer: Buffer;
  try {
    buffer = await file.toBuffer();
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "FST_REQ_FILE_TOO_LARGE") {
      throw httpError(
        400,
        "FILE_TOO_LARGE",
        `O PDF ultrapassa o limite de ${Math.round(config.maxPdfSizeBytes / (1024 * 1024))} MB.`,
      );
    }
    throw err;
  }

  if (buffer.byteLength > config.maxPdfSizeBytes) {
    throw httpError(
      400,
      "FILE_TOO_LARGE",
      `O PDF ultrapassa o limite de ${Math.round(config.maxPdfSizeBytes / (1024 * 1024))} MB.`,
    );
  }

  return { fileName, buffer };
}
