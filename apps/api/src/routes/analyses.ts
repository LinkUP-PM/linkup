import type { FastifyInstance } from "fastify";
import type { AnalysisDetail, AnalysisResult, AnalysisSummary } from "@linkup/shared";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { analyzeResume } from "../services/ai.js";
import { assertExtractedText, extractPdfText } from "../services/pdf.js";
import { httpError, requireUser } from "./health.js";

function toDetail(row: {
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

async function readPdfBuffer(file: { toBuffer: () => Promise<Buffer> }): Promise<Buffer> {
  try {
    return await file.toBuffer();
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
}

export async function analysesRoutes(app: FastifyInstance) {
  app.post("/analyses", async (request, reply) => {
    const user = await requireUser(request);
    const file = await request.file();

    if (!file) {
      throw httpError(400, "INVALID_FILE", "Envie um arquivo PDF no campo file.");
    }

    const fileName = file.filename || "curriculo.pdf";
    const isPdf =
      file.mimetype === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      throw httpError(400, "INVALID_FILE", "Envie apenas arquivos no formato PDF.");
    }

    const buffer = await readPdfBuffer(file);
    if (buffer.byteLength > config.maxPdfSizeBytes) {
      throw httpError(
        400,
        "FILE_TOO_LARGE",
        `O PDF ultrapassa o limite de ${Math.round(config.maxPdfSizeBytes / (1024 * 1024))} MB.`,
      );
    }

    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        fileName,
        fileSizeBytes: buffer.byteLength,
        status: "EXTRACTING",
      },
    });

    try {
      const text = await extractPdfText(buffer);
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

      return reply.code(201).send(toDetail(saved));
    } catch (err) {
      const code = (err as { code?: string }).code;
      const message = err instanceof Error ? err.message : "Falha ao analisar o currículo.";
      await prisma.analysis.update({
        where: { id: analysis.id },
        data: { status: "FAILED", errorMessage: message },
      });
      if (code) throw err;
      throw httpError(502, "AI_UNAVAILABLE", message);
    }
  });

  app.get("/analyses", async (request) => {
    const user = await requireUser(request);
    const rows = await prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        status: true,
        createdAt: true,
      },
    });

    const items: AnalysisSummary[] = rows.map((row) => ({
      id: row.id,
      fileName: row.fileName,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));

    return { items };
  });

  app.get("/analyses/:id", async (request) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const row = await prisma.analysis.findFirst({
      where: { id, userId: user.id },
    });
    if (!row) {
      throw httpError(404, "NOT_FOUND", "Análise não encontrada.");
    }
    return toDetail(row);
  });
}
