# Contrato HTTP

Base local: `http://localhost:3333`

Header obrigatório em rotas autenticadas por device (todas exceto `/health`):

```
X-Device-Id: <uuid-v4>
```

Sem esse header: `400` com `{ "error": "DEVICE_ID_REQUIRED", "message": "..." }`.

Papéis (`Role`): `CANDIDATE` | `RECRUITER` | `EMPLOYER`.

Status de candidatura (`ApplicationStatus`): `SUBMITTED` | `DISCARDED` | `FORWARDED` | `ADJUSTMENT_REQUESTED` | `ACCEPTED` | `REJECTED`.

Neste corte o fluxo real só cria `SUBMITTED`. Os demais status existem no tipo para o próximo corte.

## `GET /health`

`200` quando API e banco respondem:

```json
{ "status": "ok" }
```

`503` com `{ "error": "INTERNAL", "message": "..." }` se o banco estiver indisponível.

## `GET /me`

Devolve o usuário do device.

`200`

```json
{
  "id": "clx...",
  "role": "CANDIDATE",
  "createdAt": "2026-09-21T19:00:00.000Z"
}
```

`role` é `null` até `PUT /me/role`.

## `PUT /me/role`

Define o papel **uma vez**.

Corpo:

```json
{ "role": "CANDIDATE" }
```

Sucesso `200`: mesmo formato de `GET /me`.

Erros:

| HTTP | `error` | Quando |
| --- | --- | --- |
| 400 | `INVALID_BODY` | Papel ausente ou inválido |
| 409 | `ROLE_ALREADY_SET` | Device já tem papel |

## `DELETE /me/role`

Limpa o papel do device (volta para a porta). Útil para trocar de área no mesmo aparelho.

`200` no formato de `GET /me` com `role: null`.

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

Erros: `400 INVALID_BODY`, `403 FORBIDDEN` (papel errado), `403 ROLE_REQUIRED` (sem papel).

## `GET /jobs`

- `EMPLOYER`: só as vagas dele
- `CANDIDATE` e `RECRUITER`: todas as vagas abertas (neste corte, todas)

`200`

```json
{ "items": [ { "id": "…", "title": "…", "description": "…", "lookingFor": "…", "employerId": "…", "createdAt": "…" } ] }
```

`403 ROLE_REQUIRED` se ainda não escolheu papel.

## `GET /jobs/:id`

Detalhe da vaga (mesmas regras de visibilidade de `GET /jobs`).

`200` no formato de um item, ou `404 NOT_FOUND`.

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

## `GET /applications`

Só `CANDIDATE`. Lista as candidaturas do device, mais recente primeiro.

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
      "updatedAt": "2026-09-21T19:00:00.000Z"
    }
  ]
}
```

## `GET /applications/:id`

Só `CANDIDATE`, e só a própria candidatura.

`200` no mesmo formato do item (com `decisionMessage` opcional no próximo corte), ou `404 NOT_FOUND`.

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

Lista do device, mais recente primeiro.

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

Só devolve análises do mesmo `X-Device-Id`.
