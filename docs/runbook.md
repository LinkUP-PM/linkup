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

Health check: `GET http://localhost:3333/health`

## Mobile

No `apps/mobile/src/lib/config.ts`, o host padrão é o IP da máquina na LAN. No emulador Android use `10.0.2.2`. No Expo Go, use o IP do computador.

```bash
npm run dev:mobile
```

## IA

Sem chave: deixe `AI_PROVIDER=mock`.  
Com chave: `AI_PROVIDER=openai` e `OPENAI_API_KEY`.

## Problemas comuns

| Sintoma | O que checar |
| --- | --- |
| API não sobe | Docker do Postgres, `DATABASE_URL` |
| Extração vazia | PDF escaneado — esperado falhar com mensagem |
| JSON quebra a tela | A API deve validar antes de responder 201 |
| Mobile não acha a API | IP/host e CORS |
