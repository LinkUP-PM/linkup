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

Cobre: health, `DEVICE_ID_REQUIRED`, POST sucesso (`sample-resume.pdf`), `TEXT_TOO_SHORT`, `INVALID_FILE`, isolamento por device.

### Smoke manual rápido

```bash
curl http://localhost:3333/health
curl -i http://localhost:3333/analyses
curl -H "X-Device-Id: 11111111-1111-4111-8111-111111111111" http://localhost:3333/analyses
```

### PDF grande demais (não versionado)

Gera um arquivo > 5 MB e envia:

```powershell
# PowerShell
$big = "$env:TEMP\linkup-big.pdf"
# cabeçalho PDF mínimo + padding
[IO.File]::WriteAllBytes($big, [byte[]](0x25,0x50,0x44,0x46) + (New-Object byte[] (6MB)))
curl.exe -i -X POST -H "X-Device-Id: 11111111-1111-4111-8111-111111111111" `
  -F "file=@$big;type=application/pdf;filename=grande.pdf" http://localhost:3333/analyses
# esperado: 400 FILE_TOO_LARGE
```

## Mobile

Padrões em `apps/mobile/src/lib/config.ts`:

| Ambiente | URL |
| --- | --- |
| Emulador Android | `http://10.0.2.2:3333` |
| iOS Simulator / web | `http://localhost:3333` |
| Celular físico (Expo Go) | `EXPO_PUBLIC_API_URL=http://<IP-da-sua-máquina>:3333` |

`app.json` habilita `android.usesCleartextTraffic` para HTTP na LAN.

```bash
# exemplo dispositivo físico
set EXPO_PUBLIC_API_URL=http://192.168.0.10:3333
npm run dev:mobile
```

### Checklist Etapa 5 (celular físico)

1. API escutando em `0.0.0.0:3333` (`npm run dev:api`)
2. Celular e PC na **mesma Wi‑Fi**
3. Descobrir o IP da máquina (`ipconfig` → IPv4)
4. `EXPO_PUBLIC_API_URL=http://<IP>:3333` e reiniciar o Expo
5. Enviar `docs/fixtures/sample-resume.pdf` → ver processando → três blocos
6. Abrir Histórico → mesma análise
7. Enviar `docs/fixtures/not-a-pdf.txt` (ou renomear) / PDF curto → mensagem de erro clara
8. Desligar a API e tentar enviar → mensagem de rede em português

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
| Mobile não acha a API | IP/host, `EXPO_PUBLIC_API_URL`, CORS, cleartext Android |
| `DEVICE_ID_REQUIRED` | Header `X-Device-Id` precisa ser UUID v4 |
| Android bloqueia HTTP | `usesCleartextTraffic` em `app.json` (já no repo) |
