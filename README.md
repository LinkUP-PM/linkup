# LinkUP

Aplicativo mobile que recebe um curr?culo em PDF e devolve feedback acion?vel: o que est? funcionando, o que merece aten??o e o que fazer agora.

Organiza??o: [LinkUP-PM](https://github.com/LinkUP-PM)  
Produto: Analisador Inteligente de Curr?culos ? MVP ? Setembro de 2026

## Fluxo do produto

```
Upload ? Extra??o ? An?lise ? Feedback ? Hist?rico
```

O MVP n?o reescreve o curr?culo, n?o d? nota gen?rica e n?o promete aprova??o em processo seletivo.

## Stack oficial

| Camada | Escolha |
| --- | --- |
| Mobile | Expo (React Native) + TypeScript |
| Backend | Node.js + Fastify + TypeScript |
| Banco | PostgreSQL + Prisma |
| Extra??o PDF | `unpdf` |
| IA | OpenAI com JSON estruturado (`AI_PROVIDER=mock` no desenvolvimento) |
| Monorepo | npm workspaces |

Decis?es e justificativas: [`docs/adr`](docs/adr).

## Estrutura

```
apps/api          Backend (upload, extra??o, IA, hist?rico)
apps/mobile       App Expo
packages/shared   Contratos TypeScript compartilhados
docs/             Escopo, arquitetura, pap?is e contratos
```

## Pr?-requisitos

- Node.js 20+
- Docker (PostgreSQL local)
- Conta GitHub na organiza??o [LinkUP-PM](https://github.com/LinkUP-PM)

## Primeiros passos

```bash
git clone https://github.com/LinkUP-PM/linkup.git
cd linkup
npm install
cp apps/api/.env.example apps/api/.env
npm run db:up
npm run db:generate
npm run db:migrate
```

API:

```bash
npm run dev:api
```

Mobile (Expo Go ou emulador):

```bash
npm run dev:mobile
```

Navegador:

```bash
npm run dev:web
```

Smoke da API (com o servidor no ar):

```bash
npm run smoke:api
```

## APK Android (banco no celular)

O app instalável grava tudo em SQLite no aparelho e não precisa da API ligada. Na primeira abertura já existem contas, vagas e candidaturas de demonstração. Use **Sair** para trocar de papel.

1. Dispare o workflow **Android APK** (tag `v*` ou *Run workflow*) — o APK vai para a [Release](https://github.com/LinkUP-PM/linkup/releases)
2. Baixe `linkup.apk` (Release `v0.1.0` no disparo manual)
3. No Android, permita instalar de origem desconhecida e abra o arquivo
4. Entre com uma conta demo (senha `demo1234`): `contratante@demo.linkup`, `recrutador@demo.linkup` ou `ana.costa@demo.linkup`

Detalhes: [`docs/adr/0006-apk-sqlite-local.md`](docs/adr/0006-apk-sqlite-local.md) e [`docs/demo.md`](docs/demo.md).

## Documenta??o

| Documento | Para qu? |
| --- | --- |
| [docs/scope.md](docs/scope.md) | Recorte do produto e do que o app faz hoje |
| [docs/areas.md](docs/areas.md) | Mapa das três áreas e telas |
| [docs/architecture.md](docs/architecture.md) | Arquitetura e fluxo |
| [docs/demo.md](docs/demo.md) | Roteiro de apresenta??o |
| [docs/roles.md](docs/roles.md) | Pap?is da equipe de 6 pessoas |
| [docs/collaboration.md](docs/collaboration.md) | Branches, PRs, commits e Issues |
| [docs/contracts/api.md](docs/contracts/api.md) | Endpoints e JSON |
| [docs/runbook.md](docs/runbook.md) | Ambiente local e checklist Etapa 5 |
| [docs/definition-of-done.md](docs/definition-of-done.md) | Quando uma tarefa est? pronta |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir |

## Regra de ouro

Contratos entre camadas s?o documentados **antes** de serem consumidos. Uma funcionalidade s? est? conclu?da com caminho de sucesso **e** pelo menos um caminho de erro testado.
