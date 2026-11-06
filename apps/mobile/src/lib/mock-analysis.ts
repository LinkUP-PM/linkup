import type { AnalysisResult } from "@linkup/shared";

export function mockAnalysisResult(text: string): AnalysisResult {
  const preview = text.slice(0, 80).replace(/\s+/g, " ").trim();
  return {
    strengths: [
      {
        title: "Há conteúdo suficiente para analisar",
        detail: preview
          ? `O texto começa com trechos legíveis (“${preview}…”), o que permite feedback concreto.`
          : "O documento já organiza vivências em blocos que o leitor consegue localizar.",
      },
    ],
    attentionPoints: [
      {
        title: "Resultados pouco específicos",
        detail:
          "Várias atividades descrevem tarefas, mas quase não mostram impacto, números ou entregas.",
      },
    ],
    suggestions: [
      {
        action: "Reescreva 2 experiências com verbo + entrega + contexto",
        why: "Isso torna o potencial do candidato verificável em poucos segundos.",
        example:
          "Implementei tela de login em React Native, reduzindo o tempo de autenticação do protótipo.",
      },
    ],
    dimensions: {
      structure: {
        summary: "Estrutura básica presente; hierarquia de seções pode ficar mais escaneável.",
      },
      clarity: {
        summary: "Linguagem compreensível, ainda genérica em trechos-chave.",
      },
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
