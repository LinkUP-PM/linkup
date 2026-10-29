# Roteiro de demo — LinkUP (3–5 min)

Produto: analisador inteligente de currículos (mobile). Fluxo:

```
Upload → Extração → Análise → Feedback → Histórico
```

## Antes de começar

**Opção A — APK no celular (recomendado para apresentar):** instale `linkup.apk` da Release. Banco e análise ficam no aparelho; sem API. Crie as três contas e use **Sair** para trocar de papel. Ver [runbook](runbook.md) e [ADR 0006](adr/0006-apk-sqlite-local.md).

**Opção B — desenvolvimento da API:** Postgres + API no ar (`docs/runbook.md`), `AI_PROVIDER=mock`, Expo no emulador.

## Roteiro sugerido

| Min | O que mostrar | Como |
| --- | --- | --- |
| 0:00 | Problema | “Currículo genérico não diz o que melhorar. O LinkUP devolve três blocos acionáveis.” |
| 0:30 | Upload | Enviar `docs/fixtures/sample-resume.pdf` |
| 1:00 | Processando | Estado de loading |
| 1:30 | Feedback | Pontos fortes, atenção, sugestões — sem nota |
| 2:30 | Histórico | Abrir a mesma análise depois |
| 3:30 | Erro | Enviar `short-resume.pdf` ou `not-a-pdf.txt` — mensagem clara |
| 4:30 | Limitações | Ver abaixo |

## Mock vs OpenAI

| Modo | Quando usar |
| --- | --- |
| `AI_PROVIDER=mock` | Desenvolvimento, CI, demo sem chave — prova o contrato JSON |
| `AI_PROVIDER=openai` + `OPENAI_API_KEY` | Homologação / demo com feedback “de verdade” |

## Limitações do MVP (falar na demo)

- Login simples por e-mail e senha (sem OAuth nem recuperação) — ver ADR 0005
- Sem comparação com vaga, sem reescrita completa, sem web
- PDF escaneado (só imagem) falha de propósito com mensagem clara
- Não promete emprego nem ranking

## Critérios de sucesso da apresentação

- Fluxo ponta a ponta no celular (ou emulador) sem intervenção manual
- Um caminho de erro demonstrado
- Equipe explica escolhas de stack (ADRs) e o que ficou fora
