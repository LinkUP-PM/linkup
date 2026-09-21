import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isAnalysisResult } from "@linkup/shared";
import { validateAiPayload } from "../services/ai.js";

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/fixtures",
);

const validFiles = ["good-result.json", "average-result.json", "weak-result.json"];

async function main() {
  for (const file of validFiles) {
    const raw = await readFile(path.join(fixturesDir, file), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isAnalysisResult(parsed)) {
      throw new Error(`${file} falhou isAnalysisResult`);
    }
    validateAiPayload(parsed);
    console.log(`ok  ${file}`);
  }

  const invalid = JSON.parse(
    await readFile(path.join(fixturesDir, "invalid-result.json"), "utf8"),
  ) as unknown;
  if (isAnalysisResult(invalid)) {
    throw new Error("invalid-result.json não deveria passar em isAnalysisResult");
  }
  let rejected = false;
  try {
    validateAiPayload(invalid);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "AI_INVALID_RESPONSE") throw err;
    rejected = true;
  }
  if (!rejected) throw new Error("validateAiPayload deveria rejeitar invalid-result.json");
  console.log("ok  invalid-result.json rejeitado (AI_INVALID_RESPONSE)");

  for (const textFile of ["good.txt", "average.txt", "weak.txt"]) {
    const text = await readFile(path.join(fixturesDir, textFile), "utf8");
    if (text.trim().length < 20) throw new Error(`${textFile} muito curto`);
    console.log(`ok  ${textFile} (${text.trim().length} chars)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
