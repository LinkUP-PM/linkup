# Runbook local

## Subir o banco

```bash
npm run db:up
```

Postgres: `localhost:5432`, user/senha/db `linkup`.

## API

```bash
cp apps/api/.env.example apps/api/.env
npm install
npm run db:generate
npm run db:migrate
npm run dev:api
```

A API carrega `apps/api/.env` automaticamente (dotenv). Health check: `GET http://localhost:3333/health`

### Smoke test automatizado

Com a API no ar:

```bash
npm run smoke:api -w @linkup/api
```

Cobre: health, `UNAUTHORIZED` sem token, register/login (`INVALID_CREDENTIALS`, `ROLE_MISMATCH`, `EMAIL_TAKEN`), POST sucesso (`sample-resume.pdf`), `GET /analyses/:id`, `TEXT_TOO_SHORT` + `FAILED` no histórico, `INVALID_FILE`, `FILE_TOO_LARGE`, isolamento por conta, fluxo de vaga/triagem/decisão e logout.

### Smoke manual rápido

```bash
curl http://localhost:3333/health
curl -i http://localhost:3333/analyses
curl -i -X POST http://localhost:3333/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@linkup.test\",\"password\":\"senha-segura\",\"role\":\"CANDIDATE\"}"
# use o token devolvido:
curl -H "Authorization: Bearer <token>" http://localhost:3333/analyses
```

### PDF grande demais (não versionado)

Gera um arquivo > 5 MB e envia (precisa de token de uma conta):

```powershell
# PowerShell
$big = "$env:TEMP\linkup-big.pdf"
# cabeçalho PDF mínimo + padding
[IO.File]::WriteAllBytes($big, [byte[]](0x25,0x50,0x44,0x46) + (New-Object byte[] (6MB)))
curl.exe -i -X POST -H "Authorization: Bearer <token>" `
  -F "file=@$big;type=application/pdf;filename=grande.pdf" http://localhost:3333/analyses
# esperado: 400 FILE_TOO_LARGE
```

## Mobile

O app usa **SQLite no aparelho** (contas, vagas, candidaturas, análises). Não precisa da API ligada para o fluxo do produto. Ver [ADR 0006](adr/0006-apk-sqlite-local.md).

```bash
npm run dev:mobile
```

No navegador (mesmos dados locais, gravados no IndexedDB da origem):

```bash
npm run dev:web
```

Abre em `http://localhost:8081`. Contas criadas no celular não aparecem no navegador, e o contrário também.

Na primeira abertura o app grava dados de demonstração (idempotente; não apaga o que você já criou). Senha de todas: `demo1234`.

| Papel | E-mail |
| --- | --- |
| Contratante | `contratante@demo.linkup` |
| Recrutador | `recrutador@demo.linkup` |
| Candidato (principal) | `ana.costa@demo.linkup` |
| Candidato | `bruno.lima@demo.linkup` |
| Candidato | `carla.nunes@demo.linkup` |

Detalhe do que cada um vê: [demo.md](demo.md).

### APK para instalar no Android

1. Crie uma tag `v*` (ou rode o workflow **Android APK** manualmente)
2. Baixe `linkup.apk` na Release do GitHub
3. Instale no celular (origem desconhecida)
4. Entre com as contas demo (ou crie as suas) e use **Sair** para trocar de papel

### Checklist rápido no app

1. Entrar como contratante (`contratante@demo.linkup` / `demo1234`) → ver as duas vagas
2. Sair → entrar como candidato Ana → ver candidaturas e abrir a análise (três blocos)
3. Sair → entrar como recrutador → fila com Ana → abrir dossiê
4. Entrar como contratante → indicados (Bruno encaminhado) → decidir
5. Opcional: candidatar com `docs/fixtures/sample-resume.pdf` numa vaga nova
6. PDF inválido / curto → mensagem de erro clara

## IA

Sem chave: deixe `AI_PROVIDER=mock`.  
Com chave: `AI_PROVIDER=openai` e `OPENAI_API_KEY`.

Validar fixtures do prompt (3 currículos + JSON inválido):

```bash
npm run test:fixtures -w @linkup/api
```

## Problemas comuns

| Sintoma | O que checar |
| --- | --- |
| API não sobe | Docker do Postgres, `DATABASE_URL` em `apps/api/.env` |
| Extração vazia | PDF escaneado — esperado falhar com `TEXT_NOT_EXTRACTABLE` |
| JSON quebra a tela | A API valida com `isAnalysisResult` antes do 201 |
| `UNAUTHORIZED` / pede login de novo | Sessão local expirada ou limpa — entre de novo |
| APK não instala | Permitir origem desconhecida; mesma keystore para atualizar sem desinstalar |
| PDF sem texto no celular | PDF escaneado — use arquivo com texto selecionável |
