import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import {
  isAnalysisResult,
  type AnalysisResult,
} from "@linkup/shared";
import { config } from "../config.js";
import { httpError } from "../routes/health.js";

const promptDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/prompts/resume-analysis.md",
);

async function loadSystemPrompt(): Promise<string> {
  const raw = await readFile(promptDir, "utf8");
  const marker = "## System";
  const userMarker = "## User";
  const start = raw.indexOf(marker);
  const end = raw.indexOf(userMarker);
  return raw.slice(start + marker.length, end).trim();
}

function mockResult(): AnalysisResult {
  return {
    strengths: [
      {
        title: "Há uma seção de experiências",
        detail: "O documento já organiza vivências em blocos que o leitor consegue localizar.",
      },
    ],
    attentionPoints: [
      {
        title: "Resultados pouco específicos",
        detail: "Várias atividades descrevem tarefas, mas quase não mostram impacto, números ou entregas.",
      },
    ],
    suggestions: [
      {
        action: "Reescreva 2 experiências com verbo + entrega + contexto",
        why: "Isso torna o potencial do candidato verificável em poucos segundos.",
        example: "Implementei tela de login em React Native, reduzindo o tempo de autenticação do protótipo.",
      },
    ],
    dimensions: {
      structure: { summary: "Estrutura básica presente; hierarquia de seções pode ficar mais escaneável." },
      clarity: { summary: "Linguagem compreensível, ainda genérica em trechos-chave." },
      skills: {
        identified: ["comunicação", "organização"],
        missing: ["evidências quantitativas"],
        summary: "Competências aparecem de forma implícita e pouco destacada.",
      },
      keywords: {
        present: ["projeto", "equipe"],
        missing: ["resultados", "tecnologias específicas"],
        summary: "Palavras-chave de impacto e stack estão pouco visíveis.",
      },
    },
  };
}

export async function analyzeResume(text: string): Promise<{ result: AnalysisResult; modelUsed: string }> {
  if (config.aiProvider !== "openai" || !config.openaiApiKey) {
    return { result: mockResult(), modelUsed: "mock" };
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const system = await loadSystemPrompt();

  let content: string | null = null;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Analise o currículo abaixo.\n\n---\n${text}\n---`,
        },
      ],
    });
    content = completion.choices[0]?.message?.content ?? null;
  } catch {
    throw httpError(
      502,
      "AI_UNAVAILABLE",
      "A análise automática está indisponível no momento. Tente novamente em alguns minutos.",
    );
  }

  if (!content) {
    throw httpError(502, "AI_INVALID_RESPONSE", "A análise não retornou um resultado utilizável.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw httpError(502, "AI_INVALID_RESPONSE", "A análise não retornou um JSON válido.");
  }

  if (!isAnalysisResult(parsed)) {
    throw httpError(
      502,
      "AI_INVALID_RESPONSE",
      "A análise voltou em um formato inesperado. Tente novamente.",
    );
  }

  return { result: parsed, modelUsed: "gpt-4o-mini" };
}
