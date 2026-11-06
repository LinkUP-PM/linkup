import type { AnalysisDetail, AnalysisResult } from "@linkup/shared";
import { prisma } from "../lib/prisma.js";
import { httpError } from "../lib/http.js";
import { analyzeResume } from "./ai.js";
import { assertExtractedText, extractPdfText } from "./pdf.js";

export function toAnalysisDetail(row: {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  status: AnalysisDetail["status"];
  resultJson: unknown;
  errorMessage: string | null;
  createdAt: Date;
}): AnalysisDetail {
  return {
    id: row.id,
    fileName: row.fileName,
    fileSizeBytes: row.fileSizeBytes,
    status: row.status,
    result: (row.resultJson as AnalysisResult | null) ?? null,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function runAnalysisPipeline(input: {
  userId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<AnalysisDetail> {
  const analysis = await prisma.analysis.create({
    data: {
      userId: input.userId,
      fileName: input.fileName,
      fileSizeBytes: input.buffer.byteLength,
      status: "PENDING",
    },
  });

  try {
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: { status: "EXTRACTING" },
    });

    const text = await extractPdfText(input.buffer);
    assertExtractedText(text);

    await prisma.analysis.update({
      where: { id: analysis.id },
      data: { status: "ANALYZING", extractedText: text },
    });

    const { result, modelUsed } = await analyzeResume(text);
    const saved = await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: "COMPLETED",
        resultJson: result,
        modelUsed,
      },
    });

    return toAnalysisDetail(saved);
  } catch (err) {
    const code = (err as { code?: string }).code;
    const message = err instanceof Error ? err.message : "Falha ao analisar o currículo.";
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: { status: "FAILED", errorMessage: message },
    });
    if (code) throw err;
    throw httpError(500, "INTERNAL", message);
  }
}
