# Fixtures de currículos — Etapa 3

Três textos usados para validar o prompt e o contrato JSON (`packages/shared`).
Rode `npm run test:fixtures -w @linkup/api` para garantir que os JSON de exemplo passam em `isAnalysisResult`.

| Arquivo | Perfil |
| --- | --- |
| `good.txt` | Currículo com estrutura, resultados e keywords |
| `average.txt` | Currículo mediano, genérico |
| `weak.txt` | Currículo fraco / quase vazio de evidências |
| `sample-resume.pdf` | PDF de smoke test para `POST /analyses` (texto selecionável) |
| `*-result.json` | Respostas esperadas no formato do contrato |
| `invalid-result.json` | Payload que **deve** ser rejeitado com `AI_INVALID_RESPONSE` |

Os arquivos `*-result.json` são respostas **esperadas no formato do contrato** (úteis no mock e na revisão de prompt). Não substituem uma chamada real à OpenAI.
