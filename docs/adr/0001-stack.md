# ADR 0001 — Stack oficial

- Status: aceita
- Data: 2026-09-21
- Decisor: Tech Lead (Pedro Amorim)

## Contexto

O plano pedia stack única, documentada, antes de código paralelo. O time tem 6 pessoas e o curso é Programação Mobile. Backend, IA e app precisam compartilhar tipos.

## Decisão

| Camada | Tecnologia |
| --- | --- |
| Mobile | Expo (React Native) + TypeScript |
| Backend | Node.js 20 + Fastify + TypeScript |
| Banco | PostgreSQL 16 + Prisma |
| IA | OpenAI, com `AI_PROVIDER=mock` no desenvolvimento |
| Monorepo | npm workspaces |
| Contratos | `packages/shared` + JSON Schema |

## Por quê

- Uma linguagem (TypeScript) reduz atrito entre as trilhas
- Expo acelera o MVP sem ejetar para nativo
- Fastify é suficiente para 3 endpoints e upload; NestJS seria cerimônia extra neste recorte
- PostgreSQL + Prisma cobre histórico com modelo claro
- Mock de IA permite mobile e backend integrarem sem gastar cota nem travar em chave

## Consequências

- Flutter fica fora deste MVP. Se o curso exigir Flutter, isso vira um ADR novo e retrabalho de mobile — não mude por preferência individual
- O time precisa de Node 20+ e Docker
