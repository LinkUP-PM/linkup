# Contrato HTTP

Base local: `http://localhost:3333`

Header obrigatório em rotas autenticadas (todas exceto `/health`, `POST /auth/register` e `POST /auth/login`):

```
Authorization: Bearer <token>
```

Sem token ou sessão inválida/expirada: `401` com `{ "error": "UNAUTHORIZED", "message": "..." }`.

Papéis (`Role`): `CANDIDATE` | `RECRUITER` | `EMPLOYER`. O papel nasce no cadastro e não muda.

Status de candidatura (`ApplicationStatus`): `SUBMITTED` | `DISCARDED` | `FORWARDED` | `ADJUSTMENT_REQUESTED` | `ACCEPTED` | `REJECTED`.

Transições válidas:

| De | Ação | Para | Quem |
| --- | --- | --- | --- |
| `SUBMITTED` | descartar | `DISCARDED` | recrutador |
| `SUBMITTED` | encaminhar | `FORWARDED` | recrutador |
| `FORWARDED` | aceitar | `ACCEPTED` | contratante da vaga |
| `FORWARDED` | recusar | `REJECTED` | contratante da vaga |
| `FORWARDED` | pedir ajuste | `ADJUSTMENT_REQUESTED` | contratante da vaga |
| `ADJUSTMENT_REQUESTED` | reenviar PDF | `SUBMITTED` | candidato dono |

Transição inválida: `409 INVALID_TRANSITION`.

## `GET /health`

`200` quando API e banco respondem:

```json
{ "status": "ok" }
```

`503` com `{ "error": "INTERNAL", "message": "..." }` se o banco estiver indisponível.

## `POST /auth/register`

Cria conta com e-mail, senha e papel. Já devolve sessão.

Corpo:

```json
{
  "email": "voce@empresa.com",
  "password": "senha-segura",
  "role": "CANDIDATE"
}
```

- `email` em minúsculas (a API normaliza)
- `password` entre 8 e 72 caracteres
- `role`: `CANDIDATE` | `RECRUITER` | `EMPLOYER`

Sucesso `201`:

```json
{
  "token": "…",
  "user": {
    "id": "clx...",
    "email": "voce@empresa.com",
    "role": "CANDIDATE",
    "createdAt": "2026-10-29T19:00:00.000Z"
  }
}
```

| HTTP | `error` | Quando |
| --- | --- | --- |
| 400 | `INVALID_BODY` | Campos ausentes ou inválidos |
| 409 | `EMAIL_TAKEN` | E-mail já cadastrado |

## `POST /auth/login`

Entra com e-mail, senha e o papel da tela. Só emite sessão se o papel da conta bater com o enviado.

Corpo: mesmo de `POST /auth/register`.

Sucesso `200`: mesmo formato de register (`token` + `user`).

| HTTP | `error` | Quando |
| --- | --- | --- |
| 400 | `INVALID_BODY` | Campos ausentes ou inválidos |
| 401 | `INVALID_CREDENTIALS` | E-mail inexistente ou senha errada |
| 403 | `ROLE_MISMATCH` | Conta existe, mas o papel não é o da tela |

## `DELETE /auth/session`

Encerra a sessão do Bearer atual.

Sucesso `204` (sem corpo).

`401 UNAUTHORIZED` se o token estiver ausente ou já inválido.

## `GET /me`

Devolve o usuário da sessão.

`200`

```json
{
  "id": "clx...",
  "email": "voce@empresa.com",
  "role": "CANDIDATE",
  "createdAt": "2026-10-29T19:00:00.000Z"
}
```

## `POST /jobs`

Só `EMPLOYER`.

Corpo:

```json
{
  "title": "Desenvolvedor mobile",
  "description": "App em React Native…",
  "lookingFor": "Experiência com TypeScript e entregas em time."
}
```

Sucesso `201`:

```json
{
  "id": "clx...",
  "title": "Desenvolvedor mobile",
  "description": "App em React Native…",
  "lookingFor": "Experiência com TypeScript e entregas em time.",
  "employerId": "clx...",
  "createdAt": "2026-09-21T19:00:00.000Z"
}
```

Erros: `400 INVALID_BODY`, `403 FORBIDDEN` (papel errado), `401 UNAUTHORIZED`.

## `GET /jobs`

- `EMPLOYER`: só as vagas dele, com `pendingDecisionCount` (quantas `FORWARDED`)
- `CANDIDATE`: todas as vagas abertas
- `RECRUITER`: todas as vagas, com `queueCount` (`SUBMITTED`), `forwardedCount` (`FORWARDED`), `adjustmentCount` (`ADJUSTMENT_REQUESTED`) e `closedCount` (`DISCARDED` + `ACCEPTED` + `REJECTED`)

`200`

```json
{
  "items": [
    {
      "id": "…",
      "title": "…",
      "description": "…",
      "lookingFor": "…",
      "employerId": "…",
      "createdAt": "…",
      "queueCount": 2,
      "forwardedCount": 1,
      "adjustmentCount": 0,
      "closedCount": 3,
      "pendingDecisionCount": 1
    }
  ]
}
```

`queueCount`, `forwardedCount`, `adjustmentCount`, `closedCount` e `pendingDecisionCount` só aparecem quando fazem sentido para o papel.

## `GET /jobs/:id`

Detalhe da vaga (mesmas regras de visibilidade de `GET /jobs`), com as mesmas contagens opcionais.

`200` no formato de um item, ou `404 NOT_FOUND`.

## `GET /jobs/:id/applications`

Lista candidaturas da vaga conforme o papel:

- `RECRUITER`: todas as candidaturas da vaga (fila + acompanhamento). Inclui `candidateEmail`, `submissionCount`, `previewSkills` (até 3), `previewStrengths` (até 2 títulos), `previewAttention` (até 1 título), `recruiterTags`. O candidato e o contratante **não** recebem esses campos
- `EMPLOYER`: só as da vaga dele que **não** estão em `SUBMITTED` nem `DISCARDED` (indicados e desfechos). Nunca a fila bruta nem descartados
- `CANDIDATE`: `403 FORBIDDEN`

`200`

```json
{
  "items": [
    {
      "id": "clx...",
      "jobId": "clx...",
      "jobTitle": "Desenvolvedor mobile",
      "status": "SUBMITTED",
      "analysisId": "clx...",
      "createdAt": "2026-09-21T19:00:00.000Z",
      "updatedAt": "2026-09-21T19:00:00.000Z",
      "decisionMessage": null,
      "candidateEmail": "candidato@exemplo.com",
      "submissionCount": 1,
      "previewSkills": ["TypeScript", "React Native", "SQLite"],
      "previewStrengths": ["Experiência com apps nativos"],
      "previewAttention": ["Poucos números de impacto"],
      "recruiterTags": ["forte"]
    }
  ]
}
```

`submissionCount` começa em 1 e incrementa a cada reenvio após pedido de ajuste. Prévia e tags seguem a ordem do JSON da análise / conjunto fixo (sem ranking).

Erros: `403 FORBIDDEN` / `ROLE_REQUIRED`, `404 NOT_FOUND` (vaga inexistente ou fora da visibilidade do contratante).

## `POST /jobs/:id/applications`

Só `CANDIDATE`. `multipart/form-data` com campo `file` (PDF).

Reusa a mesma pipeline de extração e IA de `POST /analyses`. Em sucesso cria uma `Analysis` do candidato e uma candidatura `SUBMITTED` ligada a ela.

Uma candidatura por par vaga + candidato.

Sucesso `201`:

```json
{
  "id": "clx...",
  "jobId": "clx...",
  "jobTitle": "Desenvolvedor mobile",
  "status": "SUBMITTED",
  "analysisId": "clx...",
  "createdAt": "2026-09-21T19:00:00.000Z",
  "updatedAt": "2026-09-21T19:00:00.000Z"
}
```

Erros de PDF/IA: mesmos de `POST /analyses`.

| HTTP | `error` | Quando |
| --- | --- | --- |
| 403 | `FORBIDDEN` / `ROLE_REQUIRED` | Papel errado ou ausente |
| 404 | `NOT_FOUND` | Vaga inexistente |
| 409 | `ALREADY_APPLIED` | Já candidatou-se a esta vaga |

## `GET /applications/inbox`

Só `RECRUITER`. Lista global de candidaturas `SUBMITTED` (todas as vagas), com os mesmos campos de prévia da fila. Ordenação: reenvios (`submissionCount` > 1) no topo, depois mais recentes.

`200` no formato `{ "items": [ ApplicationSummary... ] }`.

Erros: `403 FORBIDDEN` / `ROLE_REQUIRED`.

## `GET /applications`

Só `CANDIDATE`. Lista as candidaturas da conta, mais recente primeiro.

`200`

```json
{
  "items": [
    {
      "id": "clx...",
      "jobId": "clx...",
      "jobTitle": "Desenvolvedor mobile",
      "status": "SUBMITTED",
      "analysisId": "clx...",
      "createdAt": "2026-09-21T19:00:00.000Z",
      "updatedAt": "2026-09-21T19:00:00.000Z",
      "decisionMessage": null
    }
  ]
}
```

## `GET /applications/:id`

Detalhe da candidatura conforme o papel:

- `CANDIDATE`: só a própria. Inclui `decisionMessage`. **Não** inclui `recruiterNote`, `recruiterNotes`, `recruiterTags`, `candidateEmail` nem prévias
- `RECRUITER`: qualquer candidatura. Inclui `recruiterNote` (última), `recruiterNotes` (histórico), `recruiterTags`, `candidateEmail`, `submissionCount`, prévias e `analysis`
- `EMPLOYER`: só se for dono da vaga e o status **não** for `SUBMITTED` nem `DISCARDED`. Inclui `decisionMessage` e `analysis`. **Não** inclui notas, tags nem e-mail do candidato

`200`

```json
{
  "id": "clx...",
  "jobId": "clx...",
  "jobTitle": "Desenvolvedor mobile",
  "status": "FORWARDED",
  "analysisId": "clx...",
  "createdAt": "2026-09-21T19:00:00.000Z",
  "updatedAt": "2026-09-21T19:00:00.000Z",
  "decisionMessage": null,
  "recruiterNote": "Perfil alinhado",
  "recruiterNotes": [
    {
      "id": "clx...",
      "text": "Perfil alinhado",
      "action": "FORWARD",
      "createdAt": "2026-09-21T19:05:00.000Z"
    }
  ],
  "recruiterTags": ["forte"],
  "candidateEmail": "candidato@exemplo.com",
  "submissionCount": 1,
  "previewSkills": ["TypeScript", "React Native"],
  "previewStrengths": ["Experiência com apps nativos"],
  "previewAttention": ["Poucos números de impacto"],
  "analysis": {
    "id": "clx...",
    "fileName": "curriculo.pdf",
    "fileSizeBytes": 120000,
    "status": "COMPLETED",
    "result": {},
    "createdAt": "2026-09-21T19:00:00.000Z"
  }
}
```

Campos de triagem só aparecem para o recrutador. O mobile filtra o `result` por papel (candidato: completo; recrutador: fortes/atenção/competências; contratante: fortes + competências).

`404 NOT_FOUND` se a candidatura não existir ou estiver fora da visibilidade.

## `PATCH /applications/:id/tags`

Só `RECRUITER`. Substitui as tags internas da candidatura.

Corpo:

```json
{ "tags": ["forte", "duvida"] }
```

Valores permitidos: `forte`, `duvida`, `perfil-senior`, `comunicar-depois`. Lista vazia limpa as tags.

Sucesso `200`: `ApplicationDetail` no formato do recrutador.

| HTTP | `error` | Quando |
| --- | --- | --- |
| 400 | `INVALID_BODY` | `tags` ausente, não é lista, ou contém valor inválido |
| 403 | `FORBIDDEN` / `ROLE_REQUIRED` | Papel errado |
| 404 | `NOT_FOUND` | Candidatura inexistente |

## `POST /applications/:id/notes`

Só `RECRUITER`. Acrescenta uma nota interna sem mudar o status. Atualiza `recruiterNote` para o texto novo e entra no histórico com `action: "NOTE"`.

Corpo:

```json
{ "text": "Chamar para confirmar disponibilidade" }
```

Sucesso `200`: `ApplicationDetail` no formato do recrutador.

| HTTP | `error` | Quando |
| --- | --- | --- |
| 400 | `INVALID_BODY` | `text` ausente ou vazio |
| 403 | `FORBIDDEN` / `ROLE_REQUIRED` | Papel errado |
| 404 | `NOT_FOUND` | Candidatura inexistente |

## `POST /applications/:id/discard`

Só `RECRUITER`. Só de `SUBMITTED` → `DISCARDED`.

Corpo:

```json
{ "note": "Fora do perfil sênior" }
```

`note` é opcional (nota interna; o candidato **não** a vê). Se houver texto, entra no histórico com `action: "DISCARD"` e atualiza `recruiterNote`.

Sucesso `200`: `ApplicationDetail` no formato do recrutador.

| HTTP | `error` | Quando |
| --- | --- | --- |
| 400 | `INVALID_BODY` | `note` presente e não é string |
| 403 | `FORBIDDEN` / `ROLE_REQUIRED` | Papel errado |
| 404 | `NOT_FOUND` | Candidatura inexistente |
| 409 | `INVALID_TRANSITION` | Status diferente de `SUBMITTED` |

## `POST /applications/:id/forward`

Só `RECRUITER`. Só de `SUBMITTED` → `FORWARDED`.

Corpo (opcional):

```json
{ "note": "Perfil alinhado ao que a vaga pede" }
```

`note` é opcional (nota interna; o candidato **não** a vê). Ausente ou vazia grava `null` em `recruiterNote`. Se houver texto, entra no histórico com `action: "FORWARD"`.

Sucesso `200`: `ApplicationDetail` no formato do recrutador.

Erros: mesmos de discard (`400 INVALID_BODY` se `note` não for string, `404`, `409 INVALID_TRANSITION`, `403`).

## `POST /applications/:id/decision`

Só `EMPLOYER` dono da vaga. Só de `FORWARDED`.

Corpo:

```json
{
  "action": "ACCEPT" | "REJECT" | "REQUEST_ADJUSTMENT",
  "message": "Falta detalhar projetos recentes."
}
```

- `ACCEPT` → `ACCEPTED` (`message` ignorado / limpo)
- `REJECT` → `REJECTED` (`message` **obrigatório**, mínimo 3 caracteres)
- `REQUEST_ADJUSTMENT` → `ADJUSTMENT_REQUESTED` (`message` **obrigatório**, mínimo 3 caracteres)

Sucesso `200`: `ApplicationDetail` no formato do contratante (com `decisionMessage` quando houver).

| HTTP | `error` | Quando |
| --- | --- | --- |
| 400 | `INVALID_BODY` | Ação inválida ou mensagem ausente/curta em recusa/ajuste |
| 403 | `FORBIDDEN` / `ROLE_REQUIRED` | Papel errado ou não é dono da vaga |
| 404 | `NOT_FOUND` | Candidatura inexistente |
| 409 | `INVALID_TRANSITION` | Status diferente de `FORWARDED` |

## `POST /applications/:id/resubmit`

Só `CANDIDATE` dono. Só de `ADJUSTMENT_REQUESTED`. `multipart/form-data` com campo `file` (PDF).

Roda a pipeline de análise, troca o `analysisId`, volta para `SUBMITTED`, limpa `decisionMessage` e `recruiterNote`, e incrementa `submissionCount` (a triagem recomeça; o selo de reenvio usa esse contador).

Sucesso `200`: `ApplicationSummary` com `status: "SUBMITTED"` e novo `analysisId`.

Erros de PDF/IA: mesmos de `POST /analyses`.

| HTTP | `error` | Quando |
| --- | --- | --- |
| 403 | `FORBIDDEN` / `ROLE_REQUIRED` | Papel errado |
| 404 | `NOT_FOUND` | Candidatura inexistente ou de outro candidato |
| 409 | `INVALID_TRANSITION` | Status diferente de `ADJUSTMENT_REQUESTED` |

## `POST /analyses`

`multipart/form-data` com campo `file` (PDF).

Continua disponível para o candidato analisar um PDF sem se candidatar a uma vaga.

Sucesso `201`:

```json
{
  "id": "clx...",
  "status": "COMPLETED",
  "fileName": "curriculo.pdf",
  "fileSizeBytes": 120000,
  "result": { },
  "createdAt": "2026-09-21T19:00:00.000Z"
}
```

`result` segue exatamente `packages/shared` / `analysis-result.schema.json`.

Erros:

| HTTP | `error` | Quando |
| --- | --- | --- |
| 400 | `INVALID_FILE` | Não é PDF |
| 400 | `FILE_TOO_LARGE` | Acima do limite |
| 422 | `TEXT_NOT_EXTRACTABLE` | Escaneado / vazio |
| 422 | `TEXT_TOO_SHORT` | Texto insuficiente |
| 502 | `AI_UNAVAILABLE` | Modelo falhou ou timeout |
| 502 | `AI_INVALID_RESPONSE` | JSON fora do contrato |

Corpo de erro:

```json
{
  "error": "TEXT_NOT_EXTRACTABLE",
  "message": "Não foi possível ler o texto deste PDF. Envie um arquivo com texto selecionável, não uma imagem escaneada."
}
```

## `GET /analyses`

Lista da conta, mais recente primeiro.

`200`

```json
{
  "items": [
    {
      "id": "clx...",
      "fileName": "curriculo.pdf",
      "status": "COMPLETED",
      "createdAt": "2026-09-21T19:00:00.000Z"
    }
  ]
}
```

## `GET /analyses/:id`

`200` no mesmo formato do POST, ou `404` `{ "error": "NOT_FOUND", "message": "..." }`.

Só devolve análises da mesma conta.
