# Roteiro de demo — LinkUP (3–5 min)

Produto: analisador inteligente de currículos (mobile). Fluxo:

```
Upload → Extração → Análise → Feedback → Histórico
```

## Antes de começar

**Opção A — APK no celular (recomendado para apresentar):** instale `linkup.apk` da Release. Banco e análise ficam no aparelho; sem API. Na primeira abertura o app já grava contas, vagas e candidaturas de demonstração. Use **Sair** para trocar de papel. Ver [runbook](runbook.md) e [ADR 0006](adr/0006-apk-sqlite-local.md).

**Opção B — navegador / Expo:** `npm run dev:web` ou `npm run dev:mobile`. Os mesmos dados demo entram no SQLite local na primeira abertura.

**Opção C — desenvolvimento da API:** Postgres + API no ar (`docs/runbook.md`), `AI_PROVIDER=mock`. O seed demo é só do app local; a API continua sem seed automático.

### Contas demo (senha `demo1234`)

| Papel | E-mail | O que já está pronto |
| --- | --- | --- |
| Contratante | `contratante@demo.linkup` | Duas vagas (mobile e dados); decisão pendente do Bruno |
| Recrutador | `recrutador@demo.linkup` | Fila com Ana; funil com encaminhada, ajuste, descarte |
| Candidato | `ana.costa@demo.linkup` | Candidatura enviada (mobile) + pedido de ajuste (dados) |

Outras contas no seed (mesma senha): `bruno.lima@demo.linkup`, `carla.nunes@demo.linkup` — casos encaminhado/aceito e descartado/recusado. A tela de entrar de cada papel mostra o e-mail principal e a senha.

## Roteiro sugerido

| Min | O que mostrar | Como |
| --- | --- | --- |
| 0:00 | Problema | “Currículo genérico não diz o que melhorar. O LinkUP devolve três blocos acionáveis.” |
| 0:30 | Candidato | Entrar como Ana → início com status e histórico |
| 1:00 | Feedback | Abrir a análise (três blocos) — sem nota |
| 1:45 | Recrutador | Entrar → fila / dossiê da Ana → encaminhar ou só ler a nota |
| 2:30 | Contratante | Entrar → indicados (Bruno) → decidir |
| 3:30 | Upload novo | Enviar `docs/fixtures/sample-resume.pdf` ou caminho de erro (`short-resume.pdf` / `not-a-pdf.txt`) |
| 4:30 | Limitações | Ver abaixo |

## Mock vs OpenAI

| Modo | Quando usar |
| --- | --- |
| `AI_PROVIDER=mock` | Desenvolvimento, CI, demo sem chave — prova o contrato JSON |
| `AI_PROVIDER=openai` + `OPENAI_API_KEY` | Homologação / demo com feedback “de verdade” |

No APK e no SQLite local a análise nova também usa o mock embutido (ADR 0006).

## Limitações do MVP (falar na demo)

- Login simples por e-mail e senha (sem OAuth nem recuperação) — ver ADR 0005
- Sem comparação com vaga, sem reescrita completa, sem web
- PDF escaneado (só imagem) falha de propósito com mensagem clara
- Não promete emprego nem ranking

## Critérios de sucesso da apresentação

- Fluxo ponta a ponta no celular (ou emulador) sem criar contas do zero
- Um caminho de erro demonstrado
- Equipe explica escolhas de stack (ADRs) e o que ficou fora
