# Escopo do MVP

Fonte: `Escopo do projeto.pdf`. Este arquivo é a referência viva do recorte. Se o PDF e este documento divergirem, vale o que estiver aqui — e a mudança precisa de ADR ou atualização explícita neste arquivo.

## Tese

Transformar um currículo enviado em um plano claro de melhoria, sem reduzir a avaliação a uma nota genérica.

## O que o MVP faz

Aplicativo **mobile** que:

1. Recebe um currículo em PDF
2. Extrai o texto
3. Analisa com IA generativa
4. Mostra feedback em três blocos
5. Guarda o resultado no histórico

## Jornada

| Passo | Nome | O que acontece |
| --- | --- | --- |
| 01 | Enviar | Usuário seleciona um PDF |
| 02 | Extrair | Sistema valida e extrai texto |
| 03 | Analisar | IA organiza os achados |
| 04 | Agir | Usuário lê recomendações e consulta histórico |

## Funcionalidades incluídas

1. Upload de PDF, com erro para arquivo inválido ou indisponível
2. Extração de texto, preservando seções quando possível
3. Análise de estrutura, clareza, competências e palavras-chave
4. Feedback: pontos fortes, pontos de atenção, sugestões concretas
5. Histórico das análises do usuário
6. Interface mobile com estados de carregamento, sucesso e erro

## Formato do feedback

Cada análise responde três perguntas:

- **Pontos fortes:** o que já comunica bem?
- **Pontos de atenção:** o que está pouco claro, ausente ou genérico?
- **Sugestões:** qual ação prática executar na próxima revisão?

## Fora do MVP

| Item | Decisão |
| --- | --- |
| Análise de vídeo ou LinkedIn | Não |
| Reescrita completa do currículo | Não |
| Integração com plataformas de emprego | Não |
| Ranking entre usuários | Não |
| Versão web | Não |
| Login complexo | Não — ver ADR 0002 |
| Monetização | Não |
| Comparação com uma vaga específica | Não — ver ADR 0004 |

## Critérios de sucesso

1. O usuário envia um PDF sem orientação externa
2. O texto é extraído ou o sistema explica que a leitura falhou
3. O resultado aparece com estado de processamento compreensível
4. O feedback vem nos três blocos combinados
5. Análises anteriores aparecem no histórico
6. Funções principais permanecem estáveis com currículos reais
7. A equipe explica valor e limitações com clareza
