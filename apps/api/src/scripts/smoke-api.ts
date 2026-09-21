import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const baseUrl = process.env.SMOKE_API_URL ?? "http://127.0.0.1:3333";
const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/fixtures",
);

async function expectJson(
  response: Response,
  label: string,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${label}: corpo não é JSON (${response.status}): ${text}`);
  }
  return body;
}

async function main() {
  const deviceA = randomUUID();
  const deviceB = randomUUID();

  const health = await fetch(`${baseUrl}/health`);
  const healthBody = await expectJson(health, "health");
  if (health.status !== 200 || healthBody.status !== "ok") {
    throw new Error(`health falhou: ${health.status} ${JSON.stringify(healthBody)}`);
  }
  console.log("ok  health");

  const noDevice = await fetch(`${baseUrl}/analyses`);
  const noDeviceBody = await expectJson(noDevice, "no-device");
  if (noDevice.status !== 400 || noDeviceBody.error !== "DEVICE_ID_REQUIRED") {
    throw new Error(`DEVICE_ID_REQUIRED esperado: ${noDevice.status} ${JSON.stringify(noDeviceBody)}`);
  }
  console.log("ok  DEVICE_ID_REQUIRED");

  const samplePdf = await readFile(path.join(fixturesDir, "sample-resume.pdf"));
  const formOk = new FormData();
  formOk.append(
    "file",
    new Blob([new Uint8Array(samplePdf)], { type: "application/pdf" }),
    "sample-resume.pdf",
  );
  const postOk = await fetch(`${baseUrl}/analyses`, {
    method: "POST",
    headers: { "X-Device-Id": deviceA },
    body: formOk,
  });
  const postOkBody = await expectJson(postOk, "post-ok");
  if (postOk.status !== 201 || postOkBody.status !== "COMPLETED" || !postOkBody.id) {
    throw new Error(`POST sucesso esperado 201: ${postOk.status} ${JSON.stringify(postOkBody)}`);
  }
  const analysisId = String(postOkBody.id);
  console.log("ok  POST sample-resume.pdf → COMPLETED");

  const shortPdf = await readFile(path.join(fixturesDir, "short-resume.pdf"));
  const formShort = new FormData();
  formShort.append(
    "file",
    new Blob([new Uint8Array(shortPdf)], { type: "application/pdf" }),
    "short-resume.pdf",
  );
  const postShort = await fetch(`${baseUrl}/analyses`, {
    method: "POST",
    headers: { "X-Device-Id": deviceA },
    body: formShort,
  });
  const postShortBody = await expectJson(postShort, "post-short");
  if (postShort.status !== 422 || postShortBody.error !== "TEXT_TOO_SHORT") {
    throw new Error(`TEXT_TOO_SHORT esperado: ${postShort.status} ${JSON.stringify(postShortBody)}`);
  }
  console.log("ok  TEXT_TOO_SHORT");

  const notPdf = await readFile(path.join(fixturesDir, "not-a-pdf.txt"));
  const formBad = new FormData();
  formBad.append(
    "file",
    new Blob([new Uint8Array(notPdf)], { type: "text/plain" }),
    "curriculo.txt",
  );
  const postBad = await fetch(`${baseUrl}/analyses`, {
    method: "POST",
    headers: { "X-Device-Id": deviceA },
    body: formBad,
  });
  const postBadBody = await expectJson(postBad, "post-bad");
  if (postBad.status !== 400 || postBadBody.error !== "INVALID_FILE") {
    throw new Error(`INVALID_FILE esperado: ${postBad.status} ${JSON.stringify(postBadBody)}`);
  }
  console.log("ok  INVALID_FILE");

  const detailB = await fetch(`${baseUrl}/analyses/${analysisId}`, {
    headers: { "X-Device-Id": deviceB },
  });
  const detailBBody = await expectJson(detailB, "detail-b");
  if (detailB.status !== 404 || detailBBody.error !== "NOT_FOUND") {
    throw new Error(`404 NOT_FOUND esperado para outro device: ${detailB.status} ${JSON.stringify(detailBBody)}`);
  }
  console.log("ok  isolamento por device (404)");

  const listA = await expectJson(
    await fetch(`${baseUrl}/analyses`, { headers: { "X-Device-Id": deviceA } }),
    "list-a",
  );
  const listB = await expectJson(
    await fetch(`${baseUrl}/analyses`, { headers: { "X-Device-Id": deviceB } }),
    "list-b",
  );
  const itemsA = (listA.items as unknown[]) ?? [];
  const itemsB = (listB.items as unknown[]) ?? [];
  if (itemsA.length < 1) throw new Error("lista A deveria ter ao menos 1 item");
  if (itemsB.length !== 0) throw new Error("lista B deveria estar vazia");
  console.log("ok  histórico isolado");

  console.log("smoke-api passou");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
