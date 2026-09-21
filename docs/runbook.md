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

### Smoke test rápido (contrato)

```bash
# health
curl http://localhost:3333/health

# sem device id → 400 DEVICE_ID_REQUIRED
curl -i http://localhost:3333/analyses

# histórico vazio
curl -H "X-Device-Id: 11111111-1111-4111-8111-111111111111" http://localhost:3333/analyses
```

## Mobile

Padrões em `apps/mobile/src/lib/config.ts`:

| Ambiente | URL |
| --- | --- |
| Emulador Android | `http://10.0.2.2:3333` |
| iOS Simulator / web | `http://localhost:3333` |
| Celular físico (Expo Go) | `EXPO_PUBLIC_API_URL=http://<IP-da-sua-máquina>:3333` |

```bash
# exemplo dispositivo físico
set EXPO_PUBLIC_API_URL=http://192.168.0.10:3333
npm run dev:mobile
```

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
| Mobile não acha a API | IP/host, `EXPO_PUBLIC_API_URL`, CORS |
| `DEVICE_ID_REQUIRED` | Header `X-Device-Id` precisa ser UUID v4 |
