import type { AnalysisResult } from "@linkup/shared";
import { hashPassword } from "./password";

/** Shared by expo-sqlite and sql.js wrappers. */
export type SeedDatabase = {
  getFirstAsync: <T>(source: string, ...params: (string | number | null)[]) => Promise<T | null>;
  runAsync: (source: string, ...params: (string | number | null)[]) => Promise<unknown>;
};

export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS = {
  employer: "contratante@demo.linkup",
  recruiter: "recrutador@demo.linkup",
  ana: "ana.costa@demo.linkup",
  bruno: "bruno.lima@demo.linkup",
  carla: "carla.nunes@demo.linkup",
} as const;

const IDS = {
  employer: "demo-user-employer",
  recruiter: "demo-user-recruiter",
  ana: "demo-user-ana",
  bruno: "demo-user-bruno",
  carla: "demo-user-carla",
  jobMobile: "demo-job-mobile",
  jobData: "demo-job-data",
  analysisAnaMobile: "demo-analysis-ana-mobile",
  analysisAnaData: "demo-analysis-ana-data",
  analysisBrunoMobile: "demo-analysis-bruno-mobile",
  analysisBrunoData: "demo-analysis-bruno-data",
  analysisCarlaMobile: "demo-analysis-carla-mobile",
  analysisCarlaData: "demo-analysis-carla-data",
  appAnaMobile: "demo-app-ana-mobile",
  appAnaData: "demo-app-ana-data",
  appBrunoMobile: "demo-app-bruno-mobile",
  appBrunoData: "demo-app-bruno-data",
  appCarlaMobile: "demo-app-carla-mobile",
  appCarlaData: "demo-app-carla-data",
  noteAna: "demo-note-ana-mobile",
  noteBruno: "demo-note-bruno-mobile",
  noteCarla: "demo-note-carla-mobile",
  interviewBrunoData: "demo-interview-bruno-data",
  evtAnaMobileSub: "demo-evt-ana-mobile-sub",
  evtAnaDataSub: "demo-evt-ana-data-sub",
  evtAnaDataFwd: "demo-evt-ana-data-fwd",
  evtAnaDataAdj: "demo-evt-ana-data-adj",
  evtBrunoMobileSub: "demo-evt-bruno-mobile-sub",
  evtBrunoMobileFwd: "demo-evt-bruno-mobile-fwd",
  evtBrunoDataSub: "demo-evt-bruno-data-sub",
  evtBrunoDataFwd: "demo-evt-bruno-data-fwd",
  evtBrunoDataAcc: "demo-evt-bruno-data-acc",
  evtBrunoDataIv: "demo-evt-bruno-data-iv",
  evtCarlaMobileSub: "demo-evt-carla-mobile-sub",
  evtCarlaMobileDisc: "demo-evt-carla-mobile-disc",
  evtCarlaDataSub: "demo-evt-carla-data-sub",
  evtCarlaDataFwd: "demo-evt-carla-data-fwd",
  evtCarlaDataRej: "demo-evt-carla-data-rej",
} as const;

const T0 = "2026-10-20T12:00:00.000Z";
const T1 = "2026-10-21T10:00:00.000Z";
const T2 = "2026-10-22T14:30:00.000Z";
const T3 = "2026-10-23T09:15:00.000Z";
const T4 = "2026-10-24T16:45:00.000Z";
const T5 = "2026-10-25T11:20:00.000Z";
/** Data futura para o convite demo (Bruno / vaga de dados). */
const T_INTERVIEW = "2026-11-10T17:00:00.000Z";
const T6 = "2026-10-26T08:00:00.000Z";
const T7 = "2026-10-27T15:10:00.000Z";

/** Same shape as docs/fixtures/good-result.json */
const GOOD_RESULT: AnalysisResult = {
  strengths: [
    {
      title: "Resultados mensuráveis",
      detail:
        "A experiência na LinkUP Labs cita redução de 40% no tempo de envio, o que torna o impacto verificável.",
    },
    {
      title: "Stack alinhada ao produto mobile",
      detail:
        "React Native, Expo e TypeScript aparecem com contexto de entrega, não só como lista solta.",
    },
  ],
  attentionPoints: [
    {
      title: "Resumo ainda pode ser mais curto",
      detail:
        "O resumo funciona, mas cabe condensar em duas linhas focadas em resultado para o leitor de RH.",
    },
  ],
  suggestions: [
    {
      action: "Inclua uma métrica também na experiência de estágio",
      why: "Hoje só a vaga atual tem número; equilibrar as duas experiências reforça consistência.",
      example: "Documentei 12 componentes do design system usados por 3 squads.",
    },
  ],
  dimensions: {
    structure: {
      summary: "Seções claras (resumo, experiência, formação, competências) com boa escaneabilidade.",
    },
    clarity: {
      summary: "Linguagem objetiva e com evidências; poucos trechos genéricos.",
    },
    skills: {
      identified: ["React Native", "TypeScript", "Expo", "Fastify", "PostgreSQL"],
      missing: ["testes automatizados"],
      summary: "Competências técnicas bem destacadas; falta evidência de testes.",
    },
    keywords: {
      present: ["React Native", "Expo", "TypeScript", "API", "produção"],
      missing: ["CI", "acessibilidade"],
      summary: "Keywords de mobile e backend presentes; CI e acessibilidade pouco visíveis.",
    },
  },
};

/** Same shape as docs/fixtures/average-result.json */
const AVERAGE_RESULT: AnalysisResult = {
  strengths: [
    {
      title: "Há formação e experiências listadas",
      detail:
        "O documento já separa objetivo, experiências, formação e habilidades, o que facilita a leitura inicial.",
    },
  ],
  attentionPoints: [
    {
      title: "Experiências genéricas",
      detail:
        "Frases como “ajudei a equipe” não mostram o que foi feito, com quem ou qual foi o resultado.",
    },
    {
      title: "Poucas palavras-chave técnicas",
      detail:
        "Quase não aparecem tecnologias, ferramentas ou entregáveis concretos da área desejada.",
    },
  ],
  suggestions: [
    {
      action: "Reescreva cada experiência com verbo + entrega + contexto",
      why: "Isso transforma tarefas vagas em evidências que um recrutador consegue avaliar rápido.",
      example: "Desenvolvi protótipo de app em React Native para o projeto de extensão da faculdade.",
    },
  ],
  dimensions: {
    structure: {
      summary: "Estrutura básica presente, mas os blocos de experiência estão rasos.",
    },
    clarity: {
      summary: "Texto compreensível, porém genérico e sem evidências.",
    },
    skills: {
      identified: ["proatividade", "trabalho em equipe", "comunicação"],
      missing: ["stack técnica", "resultados"],
      summary: "Só competências comportamentais aparecem; faltam skills técnicas.",
    },
    keywords: {
      present: ["tecnologia", "faculdade", "equipe"],
      missing: ["React", "API", "projetos com impacto"],
      summary: "Keywords de impacto e ferramentas estão pouco presentes.",
    },
  },
};

/** Same shape as docs/fixtures/weak-result.json */
const WEAK_RESULT: AnalysisResult = {
  strengths: [
    {
      title: "Há intenção clara de busca",
      detail:
        "O texto deixa explícito que a pessoa quer uma oportunidade, o que ainda é um ponto de partida.",
    },
  ],
  attentionPoints: [
    {
      title: "Conteúdo insuficiente",
      detail:
        "Faltam seções de experiência, formação, competências e qualquer evidência verificável.",
    },
    {
      title: "Contato incompleto",
      detail:
        "Só há um telefone parcial; sem e-mail ou cidade fica difícil o retorno do recrutador.",
    },
  ],
  suggestions: [
    {
      action: "Monte seções mínimas: contato, formação, 2 experiências e 5 skills",
      why: "Sem essa base o leitor não consegue avaliar o perfil nem comparar com uma vaga.",
      example: "Formação: UNDB — Sistemas de Informação (previsão 2026).",
    },
  ],
  dimensions: {
    structure: {
      summary: "Não há estrutura de currículo reconhecível.",
    },
    clarity: {
      summary: "Linguagem informal e sem detalhes úteis para seleção.",
    },
    skills: {
      identified: [],
      missing: ["competências técnicas", "experiências", "formação"],
      summary: "Nenhuma skill concreta foi identificada no texto.",
    },
    keywords: {
      present: ["emprego", "faculdade", "computador"],
      missing: ["tecnologias", "projetos", "resultados"],
      summary: "Quase não há palavras-chave relevantes para vagas de tecnologia.",
    },
  },
};

const EXTRACTED = {
  good:
    "Ana Costa — Desenvolvedora mobile. React Native, Expo, TypeScript. Reduzi 40% o tempo de envio de currículos na LinkUP Labs.",
  average:
    "Bruno Lima — Busco oportunidade em tecnologia. Ajudei a equipe em projetos da faculdade. Proativo e comunicativo.",
  weak: "Carla Nunes — Quero um emprego. Tenho computador. Telefone: 98 9…",
} as const;

async function seedDemoInterview(db: SeedDatabase): Promise<void> {
  const app = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM applications WHERE id = ?`,
    IDS.appBrunoData,
  );
  if (!app) return;

  await db.runAsync(
    `INSERT OR IGNORE INTO interviews
      (id, application_id, scheduled_at, status, created_at, responded_at)
     VALUES (?, ?, ?, 'PROPOSED', ?, NULL)`,
    IDS.interviewBrunoData,
    IDS.appBrunoData,
    T_INTERVIEW,
    T5,
  );
}

async function seedDemoEvents(db: SeedDatabase): Promise<void> {
  const events: Array<{
    id: string;
    applicationId: string;
    type: string;
    at: string;
  }> = [
    { id: IDS.evtAnaMobileSub, applicationId: IDS.appAnaMobile, type: "SUBMITTED", at: T2 },
    { id: IDS.evtAnaDataSub, applicationId: IDS.appAnaData, type: "SUBMITTED", at: T3 },
    { id: IDS.evtAnaDataFwd, applicationId: IDS.appAnaData, type: "FORWARDED", at: T3 },
    {
      id: IDS.evtAnaDataAdj,
      applicationId: IDS.appAnaData,
      type: "ADJUSTMENT_REQUESTED",
      at: T3,
    },
    { id: IDS.evtBrunoMobileSub, applicationId: IDS.appBrunoMobile, type: "SUBMITTED", at: T4 },
    { id: IDS.evtBrunoMobileFwd, applicationId: IDS.appBrunoMobile, type: "FORWARDED", at: T4 },
    { id: IDS.evtBrunoDataSub, applicationId: IDS.appBrunoData, type: "SUBMITTED", at: T5 },
    { id: IDS.evtBrunoDataFwd, applicationId: IDS.appBrunoData, type: "FORWARDED", at: T5 },
    { id: IDS.evtBrunoDataAcc, applicationId: IDS.appBrunoData, type: "ACCEPTED", at: T5 },
    {
      id: IDS.evtBrunoDataIv,
      applicationId: IDS.appBrunoData,
      type: "INTERVIEW_PROPOSED",
      at: T_INTERVIEW,
    },
    { id: IDS.evtCarlaMobileSub, applicationId: IDS.appCarlaMobile, type: "SUBMITTED", at: T6 },
    { id: IDS.evtCarlaMobileDisc, applicationId: IDS.appCarlaMobile, type: "DISCARDED", at: T6 },
    { id: IDS.evtCarlaDataSub, applicationId: IDS.appCarlaData, type: "SUBMITTED", at: T7 },
    { id: IDS.evtCarlaDataFwd, applicationId: IDS.appCarlaData, type: "FORWARDED", at: T7 },
    { id: IDS.evtCarlaDataRej, applicationId: IDS.appCarlaData, type: "REJECTED", at: T7 },
  ];

  for (const event of events) {
    const app = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM applications WHERE id = ?`,
      event.applicationId,
    );
    if (!app) continue;
    await db.runAsync(
      `INSERT OR IGNORE INTO application_events (id, application_id, type, at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      event.id,
      event.applicationId,
      event.type,
      event.at,
      event.at,
    );
  }
}

/**
 * Idempotent demo seed for local SQLite. Fixed IDs + INSERT OR IGNORE.
 * Does not delete or overwrite user-created data.
 */
export async function seedDemo(db: SeedDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM users WHERE id IN (?, ?, ?, ?, ?)`,
    IDS.employer,
    IDS.recruiter,
    IDS.ana,
    IDS.bruno,
    IDS.carla,
  );
  if ((existing?.c ?? 0) >= 5) {
    await seedDemoInterview(db);
    await seedDemoEvents(db);
    return;
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const users: Array<{ id: string; email: string; role: string; at: string }> = [
    { id: IDS.employer, email: DEMO_ACCOUNTS.employer, role: "EMPLOYER", at: T0 },
    { id: IDS.recruiter, email: DEMO_ACCOUNTS.recruiter, role: "RECRUITER", at: T0 },
    { id: IDS.ana, email: DEMO_ACCOUNTS.ana, role: "CANDIDATE", at: T0 },
    { id: IDS.bruno, email: DEMO_ACCOUNTS.bruno, role: "CANDIDATE", at: T0 },
    { id: IDS.carla, email: DEMO_ACCOUNTS.carla, role: "CANDIDATE", at: T0 },
  ];

  for (const user of users) {
    await db.runAsync(
      `INSERT OR IGNORE INTO users (id, email, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      user.id,
      user.email,
      passwordHash,
      user.role,
      user.at,
      user.at,
    );
  }

  await db.runAsync(
    `INSERT OR IGNORE INTO jobs (id, title, description, looking_for, employer_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    IDS.jobMobile,
    "Desenvolvedor mobile (React Native)",
    "Time de produto construindo o LinkUP. Você vai implementar telas, integrar com dados locais e cuidar da experiência no celular.",
    "React Native ou Expo, TypeScript, e interesse em feedback de currículo e processos seletivos.",
    IDS.employer,
    T1,
    T1,
  );

  await db.runAsync(
    `INSERT OR IGNORE INTO jobs (id, title, description, looking_for, employer_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    IDS.jobData,
    "Analista de dados",
    "Apoiar decisões de produto com métricas de candidatura, triagem e conversão por etapa do funil.",
    "SQL, visualização e comunicação clara com recrutamento e contratantes.",
    IDS.employer,
    T1,
    T1,
  );

  type AnalysisSeed = {
    id: string;
    userId: string;
    fileName: string;
    text: string;
    result: AnalysisResult;
    at: string;
  };

  const analyses: AnalysisSeed[] = [
    {
      id: IDS.analysisAnaMobile,
      userId: IDS.ana,
      fileName: "ana-costa-mobile.pdf",
      text: EXTRACTED.good,
      result: GOOD_RESULT,
      at: T2,
    },
    {
      id: IDS.analysisAnaData,
      userId: IDS.ana,
      fileName: "ana-costa-dados.pdf",
      text: EXTRACTED.average,
      result: AVERAGE_RESULT,
      at: T3,
    },
    {
      id: IDS.analysisBrunoMobile,
      userId: IDS.bruno,
      fileName: "bruno-lima-mobile.pdf",
      text: EXTRACTED.average,
      result: AVERAGE_RESULT,
      at: T4,
    },
    {
      id: IDS.analysisBrunoData,
      userId: IDS.bruno,
      fileName: "bruno-lima-dados.pdf",
      text: EXTRACTED.good,
      result: GOOD_RESULT,
      at: T5,
    },
    {
      id: IDS.analysisCarlaMobile,
      userId: IDS.carla,
      fileName: "carla-nunes-mobile.pdf",
      text: EXTRACTED.weak,
      result: WEAK_RESULT,
      at: T6,
    },
    {
      id: IDS.analysisCarlaData,
      userId: IDS.carla,
      fileName: "carla-nunes-dados.pdf",
      text: EXTRACTED.weak,
      result: WEAK_RESULT,
      at: T7,
    },
  ];

  for (const analysis of analyses) {
    await db.runAsync(
      `INSERT OR IGNORE INTO analyses
        (id, user_id, file_name, file_size_bytes, status, extracted_text, result_json, error_message, model_used, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'COMPLETED', ?, ?, NULL, 'mock', ?, ?)`,
      analysis.id,
      analysis.userId,
      analysis.fileName,
      48_000,
      analysis.text,
      JSON.stringify(analysis.result),
      analysis.at,
      analysis.at,
    );
  }

  type AppSeed = {
    id: string;
    jobId: string;
    candidateId: string;
    analysisId: string;
    status: string;
    recruiterNote: string | null;
    decisionMessage: string | null;
    submissionCount: number;
    tags: string;
    at: string;
  };

  const applications: AppSeed[] = [
    {
      id: IDS.appAnaMobile,
      jobId: IDS.jobMobile,
      candidateId: IDS.ana,
      analysisId: IDS.analysisAnaMobile,
      status: "SUBMITTED",
      recruiterNote: "Perfil forte em React Native; vale entrevistar.",
      decisionMessage: null,
      submissionCount: 1,
      tags: JSON.stringify(["forte", "perfil-senior"]),
      at: T2,
    },
    {
      id: IDS.appAnaData,
      jobId: IDS.jobData,
      candidateId: IDS.ana,
      analysisId: IDS.analysisAnaData,
      status: "ADJUSTMENT_REQUESTED",
      recruiterNote: null,
      decisionMessage: "Inclua exemplos de dashboards ou consultas SQL que você já fez.",
      submissionCount: 1,
      tags: JSON.stringify(["duvida"]),
      at: T3,
    },
    {
      id: IDS.appBrunoMobile,
      jobId: IDS.jobMobile,
      candidateId: IDS.bruno,
      analysisId: IDS.analysisBrunoMobile,
      status: "FORWARDED",
      recruiterNote: "Júnior com potencial; encaminhei para o contratante.",
      decisionMessage: null,
      submissionCount: 1,
      tags: JSON.stringify(["duvida"]),
      at: T4,
    },
    {
      id: IDS.appBrunoData,
      jobId: IDS.jobData,
      candidateId: IDS.bruno,
      analysisId: IDS.analysisBrunoData,
      status: "ACCEPTED",
      recruiterNote: null,
      decisionMessage: "Bem-vindo ao time de dados.",
      submissionCount: 1,
      tags: JSON.stringify(["forte"]),
      at: T5,
    },
    {
      id: IDS.appCarlaMobile,
      jobId: IDS.jobMobile,
      candidateId: IDS.carla,
      analysisId: IDS.analysisCarlaMobile,
      status: "DISCARDED",
      recruiterNote: "Currículo sem evidências técnicas para a vaga.",
      decisionMessage: null,
      submissionCount: 1,
      tags: JSON.stringify(["comunicar-depois"]),
      at: T6,
    },
    {
      id: IDS.appCarlaData,
      jobId: IDS.jobData,
      candidateId: IDS.carla,
      analysisId: IDS.analysisCarlaData,
      status: "REJECTED",
      recruiterNote: null,
      decisionMessage: "O momento ainda não combina com o que a vaga pede.",
      submissionCount: 1,
      tags: "[]",
      at: T7,
    },
  ];

  for (const app of applications) {
    await db.runAsync(
      `INSERT OR IGNORE INTO applications
        (id, job_id, candidate_id, analysis_id, status, recruiter_note, decision_message, submission_count, recruiter_tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      app.id,
      app.jobId,
      app.candidateId,
      app.analysisId,
      app.status,
      app.recruiterNote,
      app.decisionMessage,
      app.submissionCount,
      app.tags,
      app.at,
      app.at,
    );
  }

  await db.runAsync(
    `INSERT OR IGNORE INTO recruiter_note_entries (id, application_id, text, action, created_at)
     VALUES (?, ?, ?, 'NOTE', ?)`,
    IDS.noteAna,
    IDS.appAnaMobile,
    "Perfil forte em React Native; vale entrevistar.",
    T2,
  );

  await db.runAsync(
    `INSERT OR IGNORE INTO recruiter_note_entries (id, application_id, text, action, created_at)
     VALUES (?, ?, ?, 'FORWARD', ?)`,
    IDS.noteBruno,
    IDS.appBrunoMobile,
    "Júnior com potencial; encaminhei para o contratante.",
    T4,
  );

  await db.runAsync(
    `INSERT OR IGNORE INTO recruiter_note_entries (id, application_id, text, action, created_at)
     VALUES (?, ?, ?, 'DISCARD', ?)`,
    IDS.noteCarla,
    IDS.appCarlaMobile,
    "Currículo sem evidências técnicas para a vaga.",
    T6,
  );

  await seedDemoInterview(db);
  await seedDemoEvents(db);
}
