# LinkUP

Aplicativo mobile que recebe um currículo em PDF e devolve feedback acionável: o que está funcionando, o que merece atenção e o que fazer agora.

Organização: [LinkUP-PM](https://github.com/LinkUP-PM)  
Produto: Analisador Inteligente de Currículos · MVP · Setembro de 2026

## Fluxo do produto

```
Upload ? Extração ? Análise ? Feedback ? Histórico
```

O MVP não reescreve o currículo, não dá nota genérica e não promete aprovação em processo seletivo.

## Stack oficial

| Camada | Escolha |
| --- | --- |
| Mobile | Expo (React Native) + TypeScript |
| Backend | Node.js + Fastify + TypeScript |
| Banco | PostgreSQL + Prisma |
| IA | OpenAI com JSON estruturado (`AI_PROVIDER=mock` no desenvolvimento) |
| Monorepo | npm workspaces |

Decisões e justificativas: [`docs/adr`](docs/adr).

## Estrutura

```
apps/api          Backend (upload, extração, IA, histórico)
apps/mobile       App Expo
packages/shared   Contratos TypeScript compartilhados
docs/             Escopo, arquitetura, papéis e contratos
```

## Pré-requisitos

- Node.js 20+
- Docker (PostgreSQL local)
- Conta GitHub na organização [LinkUP-PM](https://github.com/LinkUP-PM)

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

Mobile:

```bash
npm run dev:mobile
```

## Documentação

| Documento | Para quê |
| --- | --- |
| [docs/scope.md](docs/scope.md) | Recorte do MVP |
| [docs/architecture.md](docs/architecture.md) | Arquitetura e fluxo |
| [docs/roles.md](docs/roles.md) | Papéis da equipe de 6 pessoas |
| [docs/collaboration.md](docs/collaboration.md) | Branches, PRs, commits e Issues |
| [docs/contracts/api.md](docs/contracts/api.md) | Endpoints e JSON |
| [docs/definition-of-done.md](docs/definition-of-done.md) | Quando uma tarefa está pronta |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir |

## Regra de ouro

Contratos entre camadas são documentados **antes** de serem consumidos. Uma funcionalidade só está concluída com caminho de sucesso **e** pelo menos um caminho de erro testado.
