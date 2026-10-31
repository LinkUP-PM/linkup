import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const baseUrl = process.env.SMOKE_API_URL ?? "http://127.0.0.1:3333";
const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/fixtures",
);
const password = "senha-segura-123";

async function expectJson(
  response: Response,
  label: string,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (response.status === 204) {
    if (text.trim()) {
      throw new Error(`${label}: 204 deveria ter corpo vazio: ${text}`);
    }
    return {};
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${label}: corpo não é JSON (${response.status}): ${text}`);
  }
  return body;
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function register(
  email: string,
  role: "CANDIDATE" | "RECRUITER" | "EMPLOYER",
): Promise<{ token: string; user: Record<string, unknown> }> {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  const body = await expectJson(response, `register-${role}`);
  if (response.status !== 201 || typeof body.token !== "string") {
    throw new Error(`register ${role}: ${response.status} ${JSON.stringify(body)}`);
  }
  const user = body.user as Record<string, unknown>;
  if (!user || user.role !== role || user.email !== email) {
    throw new Error(`register user inválido: ${JSON.stringify(body)}`);
  }
  return { token: body.token, user };
}

async function main() {
  const suffix = randomUUID().slice(0, 8);
  const emailA = `candidato-a-${suffix}@smoke.test`;
  const emailB = `candidato-b-${suffix}@smoke.test`;
  const emailEmployer = `contratante-${suffix}@smoke.test`;
  const emailRecruiter = `recrutador-${suffix}@smoke.test`;
  const emailCandidate = `candidato-${suffix}@smoke.test`;
  const emailCandidate2 = `candidato2-${suffix}@smoke.test`;

  const health = await fetch(`${baseUrl}/health`);
  const healthBody = await expectJson(health, "health");
  if (health.status !== 200 || healthBody.status !== "ok") {
    throw new Error(`health falhou: ${health.status} ${JSON.stringify(healthBody)}`);
  }
  console.log("ok  health");

  const noAuth = await fetch(`${baseUrl}/analyses`);
  const noAuthBody = await expectJson(noAuth, "no-auth");
  if (noAuth.status !== 401 || noAuthBody.error !== "UNAUTHORIZED") {
    throw new Error(`UNAUTHORIZED esperado: ${noAuth.status} ${JSON.stringify(noAuthBody)}`);
  }
  console.log("ok  UNAUTHORIZED sem token");

  const userA = await register(emailA, "CANDIDATE");
  console.log("ok  POST /auth/register CANDIDATE");

  const badLogin = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailA, password: "senha-errada", role: "CANDIDATE" }),
  });
  const badLoginBody = await expectJson(badLogin, "bad-login");
  if (badLogin.status !== 401 || badLoginBody.error !== "INVALID_CREDENTIALS") {
    throw new Error(
      `INVALID_CREDENTIALS esperado: ${badLogin.status} ${JSON.stringify(badLoginBody)}`,
    );
  }
  console.log("ok  INVALID_CREDENTIALS");

  const mismatch = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailA, password, role: "RECRUITER" }),
  });
  const mismatchBody = await expectJson(mismatch, "role-mismatch");
  if (mismatch.status !== 403 || mismatchBody.error !== "ROLE_MISMATCH") {
    throw new Error(`ROLE_MISMATCH esperado: ${mismatch.status} ${JSON.stringify(mismatchBody)}`);
  }
  console.log("ok  ROLE_MISMATCH");

  const taken = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailA, password, role: "CANDIDATE" }),
  });
  const takenBody = await expectJson(taken, "email-taken");
  if (taken.status !== 409 || takenBody.error !== "EMAIL_TAKEN") {
    throw new Error(`EMAIL_TAKEN esperado: ${taken.status} ${JSON.stringify(takenBody)}`);
  }
  console.log("ok  EMAIL_TAKEN");

  const samplePdf = await readFile(path.join(fixturesDir, "sample-resume.pdf"));
  const formOk = new FormData();
  formOk.append(
    "file",
    new Blob([new Uint8Array(samplePdf)], { type: "application/pdf" }),
    "sample-resume.pdf",
  );
  const postOk = await fetch(`${baseUrl}/analyses`, {
    method: "POST",
    headers: bearer(userA.token),
    body: formOk,
  });
  const postOkBody = await expectJson(postOk, "post-ok");
  if (postOk.status !== 201 || postOkBody.status !== "COMPLETED" || !postOkBody.id) {
    throw new Error(`POST sucesso esperado 201: ${postOk.status} ${JSON.stringify(postOkBody)}`);
  }
  const analysisId = String(postOkBody.id);
  console.log("ok  POST sample-resume.pdf → COMPLETED");

  const detailA = await fetch(`${baseUrl}/analyses/${analysisId}`, {
    headers: bearer(userA.token),
  });
  const detailABody = await expectJson(detailA, "detail-a");
  if (
    detailA.status !== 200 ||
    detailABody.id !== analysisId ||
    detailABody.status !== "COMPLETED" ||
    !detailABody.result
  ) {
    throw new Error(
      `GET detalhe esperado 200 COMPLETED: ${detailA.status} ${JSON.stringify(detailABody)}`,
    );
  }
  console.log("ok  GET /analyses/:id");

  const shortPdf = await readFile(path.join(fixturesDir, "short-resume.pdf"));
  const formShort = new FormData();
  formShort.append(
    "file",
    new Blob([new Uint8Array(shortPdf)], { type: "application/pdf" }),
    "short-resume.pdf",
  );
  const postShort = await fetch(`${baseUrl}/analyses`, {
    method: "POST",
    headers: bearer(userA.token),
    body: formShort,
  });
  const postShortBody = await expectJson(postShort, "post-short");
  if (postShort.status !== 422 || postShortBody.error !== "TEXT_TOO_SHORT") {
    throw new Error(`TEXT_TOO_SHORT esperado: ${postShort.status} ${JSON.stringify(postShortBody)}`);
  }
  console.log("ok  TEXT_TOO_SHORT");

  const listAfterFail = await expectJson(
    await fetch(`${baseUrl}/analyses`, { headers: bearer(userA.token) }),
    "list-after-fail",
  );
  const itemsAfterFail =
    (listAfterFail.items as Array<{ status?: string; fileName?: string }>) ?? [];
  const failedShort = itemsAfterFail.find(
    (item) => item.fileName === "short-resume.pdf" && item.status === "FAILED",
  );
  if (!failedShort) {
    throw new Error(
      `histórico deveria ter short-resume.pdf como FAILED: ${JSON.stringify(itemsAfterFail)}`,
    );
  }
  console.log("ok  FAILED persistido no histórico");

  const notPdf = await readFile(path.join(fixturesDir, "not-a-pdf.txt"));
  const formBad = new FormData();
  formBad.append(
    "file",
    new Blob([new Uint8Array(notPdf)], { type: "text/plain" }),
    "curriculo.txt",
  );
  const postBad = await fetch(`${baseUrl}/analyses`, {
    method: "POST",
    headers: bearer(userA.token),
    body: formBad,
  });
  const postBadBody = await expectJson(postBad, "post-bad");
  if (postBad.status !== 400 || postBadBody.error !== "INVALID_FILE") {
    throw new Error(`INVALID_FILE esperado: ${postBad.status} ${JSON.stringify(postBadBody)}`);
  }
  console.log("ok  INVALID_FILE");

  const oversized = new Uint8Array(6 * 1024 * 1024);
  oversized[0] = 0x25;
  oversized[1] = 0x50;
  oversized[2] = 0x44;
  oversized[3] = 0x46;
  const formBig = new FormData();
  formBig.append("file", new Blob([oversized], { type: "application/pdf" }), "grande.pdf");
  const postBig = await fetch(`${baseUrl}/analyses`, {
    method: "POST",
    headers: bearer(userA.token),
    body: formBig,
  });
  const postBigBody = await expectJson(postBig, "post-big");
  if (postBig.status !== 400 || postBigBody.error !== "FILE_TOO_LARGE") {
    throw new Error(`FILE_TOO_LARGE esperado: ${postBig.status} ${JSON.stringify(postBigBody)}`);
  }
  console.log("ok  FILE_TOO_LARGE");

  const userB = await register(emailB, "CANDIDATE");
  const detailB = await fetch(`${baseUrl}/analyses/${analysisId}`, {
    headers: bearer(userB.token),
  });
  const detailBBody = await expectJson(detailB, "detail-b");
  if (detailB.status !== 404 || detailBBody.error !== "NOT_FOUND") {
    throw new Error(
      `404 NOT_FOUND esperado para outra conta: ${detailB.status} ${JSON.stringify(detailBBody)}`,
    );
  }
  console.log("ok  isolamento por conta (404)");

  const listA = await expectJson(
    await fetch(`${baseUrl}/analyses`, { headers: bearer(userA.token) }),
    "list-a",
  );
  const listB = await expectJson(
    await fetch(`${baseUrl}/analyses`, { headers: bearer(userB.token) }),
    "list-b",
  );
  const itemsA = (listA.items as unknown[]) ?? [];
  const itemsB = (listB.items as unknown[]) ?? [];
  if (itemsA.length < 1) throw new Error("lista A deveria ter ao menos 1 item");
  if (itemsB.length !== 0) throw new Error("lista B deveria estar vazia");
  console.log("ok  histórico isolado");

  const employer = await register(emailEmployer, "EMPLOYER");
  console.log("ok  POST /auth/register EMPLOYER");

  const createJob = await fetch(`${baseUrl}/jobs`, {
    method: "POST",
    headers: { ...bearer(employer.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Desenvolvedor mobile",
      description: "Time LinkUP construindo app em React Native.",
      lookingFor: "TypeScript, entregas em time e clareza no currículo.",
    }),
  });
  const createJobBody = await expectJson(createJob, "create-job");
  if (createJob.status !== 201 || !createJobBody.id) {
    throw new Error(`POST /jobs: ${createJob.status} ${JSON.stringify(createJobBody)}`);
  }
  const jobId = String(createJobBody.id);
  console.log("ok  POST /jobs");

  const candidate = await register(emailCandidate, "CANDIDATE");

  const formApply = new FormData();
  formApply.append(
    "file",
    new Blob([new Uint8Array(samplePdf)], { type: "application/pdf" }),
    "sample-resume.pdf",
  );
  const apply = await fetch(`${baseUrl}/jobs/${jobId}/applications`, {
    method: "POST",
    headers: bearer(candidate.token),
    body: formApply,
  });
  const applyBody = await expectJson(apply, "apply");
  if (apply.status !== 201 || applyBody.status !== "SUBMITTED" || !applyBody.id) {
    throw new Error(`POST application: ${apply.status} ${JSON.stringify(applyBody)}`);
  }
  console.log("ok  POST /jobs/:id/applications → SUBMITTED");

  const listApps = await expectJson(
    await fetch(`${baseUrl}/applications`, { headers: bearer(candidate.token) }),
    "list-apps",
  );
  const appItems = (listApps.items as unknown[]) ?? [];
  if (appItems.length < 1) throw new Error("candidato deveria ter ao menos 1 candidatura");
  console.log("ok  GET /applications");

  const applicationId = String(applyBody.id);
  const recruiter = await register(emailRecruiter, "RECRUITER");

  const employerQueue = await fetch(`${baseUrl}/jobs/${jobId}/applications`, {
    headers: bearer(employer.token),
  });
  const employerQueueBody = await expectJson(employerQueue, "employer-queue");
  if (employerQueue.status !== 200) {
    throw new Error(
      `GET job apps employer: ${employerQueue.status} ${JSON.stringify(employerQueueBody)}`,
    );
  }
  const employerItems = (employerQueueBody.items as Array<{ status?: string }>) ?? [];
  if (employerItems.some((item) => item.status === "SUBMITTED" || item.status === "DISCARDED")) {
    throw new Error(`contratante não deveria ver fila/descartes: ${JSON.stringify(employerItems)}`);
  }
  if (employerItems.length !== 0) {
    throw new Error(`contratante não deveria ver SUBMITTED na lista: ${JSON.stringify(employerItems)}`);
  }
  console.log("ok  contratante não vê fila SUBMITTED");

  const discardNote = "Fora do perfil sênior desta vaga";
  const discard = await fetch(`${baseUrl}/applications/${applicationId}/discard`, {
    method: "POST",
    headers: { ...bearer(recruiter.token), "Content-Type": "application/json" },
    body: JSON.stringify({ note: discardNote }),
  });
  const discardBody = await expectJson(discard, "discard");
  if (discard.status !== 200 || discardBody.status !== "DISCARDED") {
    throw new Error(`POST discard: ${discard.status} ${JSON.stringify(discardBody)}`);
  }
  if (discardBody.recruiterNote !== discardNote) {
    throw new Error(`discard deveria devolver nota ao recrutador: ${JSON.stringify(discardBody)}`);
  }
  console.log("ok  POST /applications/:id/discard");

  const candidateAfterDiscard = await expectJson(
    await fetch(`${baseUrl}/applications/${applicationId}`, {
      headers: bearer(candidate.token),
    }),
    "candidate-after-discard",
  );
  if (candidateAfterDiscard.status !== "DISCARDED") {
    throw new Error(`candidato deveria ver DISCARDED: ${JSON.stringify(candidateAfterDiscard)}`);
  }
  if ("recruiterNote" in candidateAfterDiscard && candidateAfterDiscard.recruiterNote != null) {
    throw new Error(`nota interna vazou para o candidato: ${JSON.stringify(candidateAfterDiscard)}`);
  }
  if ("candidateEmail" in candidateAfterDiscard && candidateAfterDiscard.candidateEmail != null) {
    throw new Error(`e-mail vazou no GET do candidato: ${JSON.stringify(candidateAfterDiscard)}`);
  }
  console.log("ok  nota interna e e-mail não vazam no GET do candidato");

  const candidate2 = await register(emailCandidate2, "CANDIDATE");

  const formApply2 = new FormData();
  formApply2.append(
    "file",
    new Blob([new Uint8Array(samplePdf)], { type: "application/pdf" }),
    "sample-resume.pdf",
  );
  const apply2 = await fetch(`${baseUrl}/jobs/${jobId}/applications`, {
    method: "POST",
    headers: bearer(candidate2.token),
    body: formApply2,
  });
  const apply2Body = await expectJson(apply2, "apply2");
  if (apply2.status !== 201 || apply2Body.status !== "SUBMITTED" || !apply2Body.id) {
    throw new Error(`POST application2: ${apply2.status} ${JSON.stringify(apply2Body)}`);
  }
  const application2Id = String(apply2Body.id);

  const recruiterQueue = await fetch(`${baseUrl}/jobs/${jobId}/applications`, {
    headers: bearer(recruiter.token),
  });
  const recruiterQueueBody = await expectJson(recruiterQueue, "recruiter-queue");
  if (recruiterQueue.status !== 200) {
    throw new Error(
      `GET job apps recruiter: ${recruiterQueue.status} ${JSON.stringify(recruiterQueueBody)}`,
    );
  }
  const recruiterItems =
    (recruiterQueueBody.items as Array<{
      id?: string;
      candidateEmail?: string;
      submissionCount?: number;
      previewSkills?: string[];
    }>) ?? [];
  const queuedApp2 = recruiterItems.find((item) => item.id === application2Id);
  if (!queuedApp2?.candidateEmail || typeof queuedApp2.candidateEmail !== "string") {
    throw new Error(`fila do recrutador deveria trazer e-mail: ${JSON.stringify(queuedApp2)}`);
  }
  if (queuedApp2.submissionCount !== 1) {
    throw new Error(`submissionCount deveria ser 1: ${JSON.stringify(queuedApp2)}`);
  }
  console.log("ok  fila do recrutador com e-mail e submissionCount");

  const inbox = await fetch(`${baseUrl}/applications/inbox`, {
    headers: bearer(recruiter.token),
  });
  const inboxBody = await expectJson(inbox, "inbox");
  if (inbox.status !== 200) {
    throw new Error(`GET inbox: ${inbox.status} ${JSON.stringify(inboxBody)}`);
  }
  const inboxItems = (inboxBody.items as Array<{ id?: string; status?: string }>) ?? [];
  if (!inboxItems.some((item) => item.id === application2Id && item.status === "SUBMITTED")) {
    throw new Error(`inbox deveria incluir application2: ${JSON.stringify(inboxItems)}`);
  }
  if (inboxItems.some((item) => item.status !== "SUBMITTED")) {
    throw new Error(`inbox só deveria ter SUBMITTED: ${JSON.stringify(inboxItems)}`);
  }
  console.log("ok  GET /applications/inbox");

  const tags = await fetch(`${baseUrl}/applications/${application2Id}/tags`, {
    method: "PATCH",
    headers: { ...bearer(recruiter.token), "Content-Type": "application/json" },
    body: JSON.stringify({ tags: ["forte", "duvida"] }),
  });
  const tagsBody = await expectJson(tags, "tags");
  if (tags.status !== 200) {
    throw new Error(`PATCH tags: ${tags.status} ${JSON.stringify(tagsBody)}`);
  }
  const tagList = tagsBody.recruiterTags as string[] | undefined;
  if (!tagList || tagList.length !== 2 || !tagList.includes("forte") || !tagList.includes("duvida")) {
    throw new Error(`tags inválidas: ${JSON.stringify(tagsBody)}`);
  }
  console.log("ok  PATCH /applications/:id/tags");

  const freeNote = "Chamar para confirmar disponibilidade";
  const noteRes = await fetch(`${baseUrl}/applications/${application2Id}/notes`, {
    method: "POST",
    headers: { ...bearer(recruiter.token), "Content-Type": "application/json" },
    body: JSON.stringify({ text: freeNote }),
  });
  const noteBody = await expectJson(noteRes, "notes");
  if (noteRes.status !== 200 || noteBody.recruiterNote !== freeNote) {
    throw new Error(`POST notes: ${noteRes.status} ${JSON.stringify(noteBody)}`);
  }
  const noteEntries =
    (noteBody.recruiterNotes as Array<{ text?: string; action?: string }>) ?? [];
  if (!noteEntries.some((entry) => entry.text === freeNote && entry.action === "NOTE")) {
    throw new Error(`histórico deveria ter NOTE: ${JSON.stringify(noteBody)}`);
  }
  if (noteBody.status !== "SUBMITTED") {
    throw new Error(`nota livre não deveria mudar status: ${JSON.stringify(noteBody)}`);
  }
  console.log("ok  POST /applications/:id/notes");

  const candidateSeesTags = await expectJson(
    await fetch(`${baseUrl}/applications/${application2Id}`, {
      headers: bearer(candidate2.token),
    }),
    "candidate-no-tags",
  );
  if ("recruiterTags" in candidateSeesTags && candidateSeesTags.recruiterTags != null) {
    throw new Error(`tags vazaram para o candidato: ${JSON.stringify(candidateSeesTags)}`);
  }
  if ("recruiterNotes" in candidateSeesTags && candidateSeesTags.recruiterNotes != null) {
    throw new Error(`notas vazaram para o candidato: ${JSON.stringify(candidateSeesTags)}`);
  }
  console.log("ok  tags e notas não vazam para o candidato");

  const forwardNote = "Perfil alinhado ao que a vaga pede";
  const forward = await fetch(`${baseUrl}/applications/${application2Id}/forward`, {
    method: "POST",
    headers: { ...bearer(recruiter.token), "Content-Type": "application/json" },
    body: JSON.stringify({ note: forwardNote }),
  });
  const forwardBody = await expectJson(forward, "forward");
  if (forward.status !== 200 || forwardBody.status !== "FORWARDED") {
    throw new Error(`POST forward: ${forward.status} ${JSON.stringify(forwardBody)}`);
  }
  if (forwardBody.recruiterNote !== forwardNote) {
    throw new Error(`forward deveria devolver nota ao recrutador: ${JSON.stringify(forwardBody)}`);
  }
  const forwardNotes =
    (forwardBody.recruiterNotes as Array<{ text?: string; action?: string }>) ?? [];
  if (!forwardNotes.some((entry) => entry.text === forwardNote && entry.action === "FORWARD")) {
    throw new Error(`histórico deveria ter FORWARD: ${JSON.stringify(forwardBody)}`);
  }
  if (!forwardNotes.some((entry) => entry.action === "NOTE")) {
    throw new Error(`histórico deveria manter NOTE anterior: ${JSON.stringify(forwardBody)}`);
  }
  console.log("ok  POST /applications/:id/forward");

  const candidateAfterForward = await expectJson(
    await fetch(`${baseUrl}/applications/${application2Id}`, {
      headers: bearer(candidate2.token),
    }),
    "candidate-after-forward",
  );
  if (
    "recruiterNote" in candidateAfterForward &&
    candidateAfterForward.recruiterNote != null
  ) {
    throw new Error(
      `nota do forward vazou para o candidato: ${JSON.stringify(candidateAfterForward)}`,
    );
  }
  if (
    "candidateEmail" in candidateAfterForward &&
    candidateAfterForward.candidateEmail != null
  ) {
    throw new Error(
      `e-mail vazou no GET do candidato após forward: ${JSON.stringify(candidateAfterForward)}`,
    );
  }
  console.log("ok  nota do forward não vaza para o candidato");

  const rejectNoMsg = await fetch(`${baseUrl}/applications/${application2Id}/decision`, {
    method: "POST",
    headers: { ...bearer(employer.token), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "REJECT" }),
  });
  const rejectNoMsgBody = await expectJson(rejectNoMsg, "reject-no-msg");
  if (rejectNoMsg.status !== 400 || rejectNoMsgBody.error !== "INVALID_BODY") {
    throw new Error(`recusa sem texto: ${rejectNoMsg.status} ${JSON.stringify(rejectNoMsgBody)}`);
  }
  console.log("ok  REJECT sem message → INVALID_BODY");

  const askAdjust = await fetch(`${baseUrl}/applications/${application2Id}/decision`, {
    method: "POST",
    headers: { ...bearer(employer.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "REQUEST_ADJUSTMENT",
      message: "Detalhe melhor os projetos recentes com métricas.",
    }),
  });
  const askAdjustBody = await expectJson(askAdjust, "ask-adjust");
  if (askAdjust.status !== 200 || askAdjustBody.status !== "ADJUSTMENT_REQUESTED") {
    throw new Error(`POST decision adjust: ${askAdjust.status} ${JSON.stringify(askAdjustBody)}`);
  }
  if (
    askAdjustBody.decisionMessage !== "Detalhe melhor os projetos recentes com métricas."
  ) {
    throw new Error(`decisionMessage ausente: ${JSON.stringify(askAdjustBody)}`);
  }
  console.log("ok  POST /applications/:id/decision REQUEST_ADJUSTMENT");

  const formResubmit = new FormData();
  formResubmit.append(
    "file",
    new Blob([new Uint8Array(samplePdf)], { type: "application/pdf" }),
    "sample-resume-v2.pdf",
  );
  const resubmit = await fetch(`${baseUrl}/applications/${application2Id}/resubmit`, {
    method: "POST",
    headers: bearer(candidate2.token),
    body: formResubmit,
  });
  const resubmitBody = await expectJson(resubmit, "resubmit");
  if (resubmit.status !== 200 || resubmitBody.status !== "SUBMITTED") {
    throw new Error(`POST resubmit: ${resubmit.status} ${JSON.stringify(resubmitBody)}`);
  }
  if (resubmitBody.analysisId === apply2Body.analysisId) {
    throw new Error(`resubmit deveria trocar analysisId: ${JSON.stringify(resubmitBody)}`);
  }
  if (resubmitBody.decisionMessage != null) {
    throw new Error(`resubmit deveria limpar decisionMessage: ${JSON.stringify(resubmitBody)}`);
  }
  console.log("ok  POST /applications/:id/resubmit → SUBMITTED");

  const forwardAgain = await fetch(`${baseUrl}/applications/${application2Id}/forward`, {
    method: "POST",
    headers: { ...bearer(recruiter.token), "Content-Type": "application/json" },
    body: JSON.stringify({ note: "Reenviado; perfil ok para entrevista." }),
  });
  const forwardAgainBody = await expectJson(forwardAgain, "forward-again");
  if (forwardAgain.status !== 200 || forwardAgainBody.status !== "FORWARDED") {
    throw new Error(
      `POST forward after resubmit: ${forwardAgain.status} ${JSON.stringify(forwardAgainBody)}`,
    );
  }

  const accept = await fetch(`${baseUrl}/applications/${application2Id}/decision`, {
    method: "POST",
    headers: { ...bearer(employer.token), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  const acceptBody = await expectJson(accept, "accept");
  if (accept.status !== 200 || acceptBody.status !== "ACCEPTED") {
    throw new Error(`POST decision ACCEPT: ${accept.status} ${JSON.stringify(acceptBody)}`);
  }
  console.log("ok  POST /applications/:id/decision ACCEPT");

  const futureIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const propose = await fetch(`${baseUrl}/applications/${application2Id}/interviews`, {
    method: "POST",
    headers: { ...bearer(employer.token), "Content-Type": "application/json" },
    body: JSON.stringify({ scheduledAt: futureIso }),
  });
  const proposeBody = await expectJson(propose, "propose-interview");
  if (propose.status !== 200 || !Array.isArray(proposeBody.interviews)) {
    throw new Error(
      `POST interviews: ${propose.status} ${JSON.stringify(proposeBody)}`,
    );
  }
  type InterviewSmoke = { id?: string; status?: string };
  const proposeInterviews = (proposeBody.interviews ?? []) as InterviewSmoke[];
  const proposed = proposeInterviews.find((item) => item.status === "PROPOSED");
  if (!proposed?.id) {
    throw new Error(`entrevista PROPOSED ausente: ${JSON.stringify(proposeBody)}`);
  }
  console.log("ok  POST /applications/:id/interviews");

  const decline = await fetch(`${baseUrl}/interviews/${proposed.id}/respond`, {
    method: "POST",
    headers: { ...bearer(candidate2.token), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "DECLINE" }),
  });
  const declineBody = await expectJson(decline, "decline-interview");
  if (decline.status !== 200) {
    throw new Error(
      `POST respond DECLINE: ${decline.status} ${JSON.stringify(declineBody)}`,
    );
  }
  const declineInterviews = (declineBody.interviews ?? []) as InterviewSmoke[];
  const declined = declineInterviews.find((item) => item.id === proposed.id);
  if (declined?.status !== "DECLINED") {
    throw new Error(`DECLINE não gravou: ${JSON.stringify(declineBody)}`);
  }
  console.log("ok  POST /interviews/:id/respond DECLINE");

  const futureIso2 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const propose2 = await fetch(`${baseUrl}/applications/${application2Id}/interviews`, {
    method: "POST",
    headers: { ...bearer(employer.token), "Content-Type": "application/json" },
    body: JSON.stringify({ scheduledAt: futureIso2 }),
  });
  const propose2Body = await expectJson(propose2, "propose-interview-2");
  const propose2Interviews = (propose2Body.interviews ?? []) as InterviewSmoke[];
  const proposed2 = propose2Interviews.find((item) => item.status === "PROPOSED");
  if (propose2.status !== 200 || !proposed2?.id) {
    throw new Error(
      `POST interviews (2): ${propose2.status} ${JSON.stringify(propose2Body)}`,
    );
  }

  const acceptDate = await fetch(`${baseUrl}/interviews/${proposed2.id}/respond`, {
    method: "POST",
    headers: { ...bearer(candidate2.token), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  const acceptDateBody = await expectJson(acceptDate, "accept-interview");
  const acceptInterviews = (acceptDateBody.interviews ?? []) as InterviewSmoke[];
  const acceptedInterview = acceptInterviews.find((item) => item.id === proposed2.id);
  if (acceptDate.status !== 200 || acceptedInterview?.status !== "ACCEPTED") {
    throw new Error(
      `POST respond ACCEPT: ${acceptDate.status} ${JSON.stringify(acceptDateBody)}`,
    );
  }
  console.log("ok  POST /interviews/:id/respond ACCEPT");

  const locked = await fetch(`${baseUrl}/applications/${application2Id}/interviews`, {
    method: "POST",
    headers: { ...bearer(employer.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });
  const lockedBody = await expectJson(locked, "interview-locked");
  if (locked.status !== 409 || lockedBody.error !== "INVALID_TRANSITION") {
    throw new Error(
      `nova data após ACCEPTED deveria falhar: ${locked.status} ${JSON.stringify(lockedBody)}`,
    );
  }
  console.log("ok  POST interviews após ACCEPTED → INVALID_TRANSITION");

  const agenda = await fetch(`${baseUrl}/interviews`, {
    headers: bearer(recruiter.token),
  });
  const agendaBody = await expectJson(agenda, "list-interviews");
  if (agenda.status !== 200 || !Array.isArray(agendaBody.items) || agendaBody.items.length < 2) {
    throw new Error(`GET /interviews: ${agenda.status} ${JSON.stringify(agendaBody)}`);
  }
  console.log("ok  GET /interviews");

  const calendar = await fetch(`${baseUrl}/agenda`, {
    headers: bearer(recruiter.token),
  });
  const calendarBody = await expectJson(calendar, "list-agenda");
  if (
    calendar.status !== 200 ||
    !Array.isArray(calendarBody.items) ||
    calendarBody.items.length < 3
  ) {
    throw new Error(`GET /agenda: ${calendar.status} ${JSON.stringify(calendarBody)}`);
  }
  const hasSubmitted = calendarBody.items.some(
    (item: { type?: string }) => item.type === "SUBMITTED",
  );
  const hasInterview = calendarBody.items.some(
    (item: { type?: string }) =>
      item.type === "INTERVIEW_PROPOSED" || item.type === "INTERVIEW_ACCEPTED",
  );
  if (!hasSubmitted || !hasInterview) {
    throw new Error(`GET /agenda sem histórico esperado: ${JSON.stringify(calendarBody.items)}`);
  }
  console.log("ok  GET /agenda");

  const logout = await fetch(`${baseUrl}/auth/session`, {
    method: "DELETE",
    headers: bearer(candidate2.token),
  });
  if (logout.status !== 204) {
    const logoutBody = await expectJson(logout, "logout");
    throw new Error(`DELETE session: ${logout.status} ${JSON.stringify(logoutBody)}`);
  }
  const afterLogout = await fetch(`${baseUrl}/me`, { headers: bearer(candidate2.token) });
  const afterLogoutBody = await expectJson(afterLogout, "after-logout");
  if (afterLogout.status !== 401 || afterLogoutBody.error !== "UNAUTHORIZED") {
    throw new Error(
      `após logout: ${afterLogout.status} ${JSON.stringify(afterLogoutBody)}`,
    );
  }
  console.log("ok  DELETE /auth/session");

  console.log("smoke-api passou");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
