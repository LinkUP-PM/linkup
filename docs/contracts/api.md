# Contrato HTTP

Base local: `http://localhost:3333`

Header obrigatório em rotas de análise:

```
X-Device-Id: <uuid-v4>
```

Sem esse header: `400` com `{ "error": "DEVICE_ID_REQUIRED", "message": "..." }`.

## `GET /health`

`200`

```json
{ "status": "ok" }
```

## `POST /analyses`

`multipart/form-data` com campo `file` (PDF).

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
