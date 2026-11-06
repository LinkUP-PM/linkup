# Fixtures — currículos e erros

Textos e JSONs para validar o prompt/contrato (`packages/shared`), mais artefatos para smoke da API.

```bash
npm run test:fixtures -w @linkup/api
npm run smoke:api -w @linkup/api   # API precisa estar no ar
```

| Arquivo | Perfil |
| --- | --- |
| `good.txt` | Currículo com estrutura, resultados e keywords |
| `average.txt` | Currículo mediano, genérico |
| `weak.txt` | Currículo fraco / quase vazio de evidências |
| `sample-resume.pdf` | PDF de smoke — sucesso (`201 COMPLETED`) |
| `short-resume.pdf` | Texto curto demais → `TEXT_TOO_SHORT` |
| `not-a-pdf.txt` | Arquivo inválido → `INVALID_FILE` |
| `*-result.json` | Respostas esperadas no formato do contrato |
| `invalid-result.json` | Payload que **deve** ser rejeitado com `AI_INVALID_RESPONSE` |

PDF grande (`FILE_TOO_LARGE`) não é versionado — ver receita em `docs/runbook.md`.

Os `*-result.json` não substituem uma chamada real à OpenAI.
