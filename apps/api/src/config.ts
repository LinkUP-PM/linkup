import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(apiRoot, ".env") });

export const config = {
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: process.env.DATABASE_URL ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  aiProvider: (process.env.AI_PROVIDER ?? "mock") as "mock" | "openai",
  maxPdfSizeBytes: Number(process.env.MAX_PDF_SIZE_MB ?? 5) * 1024 * 1024,
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 45_000),
};
