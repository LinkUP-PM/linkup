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

### APK para instalar no Android

1. Crie uma tag `v*` (ou rode o workflow **Android APK** manualmente)
2. Baixe `linkup.apk` na Release do GitHub
3. Instale no celular (origem desconhecida)
4. Crie as três contas no mesmo aparelho e use **Sair** para trocar de papel

### Checklist rápido no app

1. Cadastrar contratante → abrir vaga
2. Sair → cadastrar candidato → candidatar com `docs/fixtures/sample-resume.pdf` → ver três blocos
3. Sair → cadastrar recrutador → encaminhar
4. Sair → entrar como contratante → decidir
5. Histórico do candidato mostra a análise
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
