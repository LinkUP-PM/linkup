# ADR 0003 — Monorepo

- Status: aceita
- Data: 2026-09-21
- Decisor: Tech Lead (Pedro Amorim)

## Contexto

O plano de desenvolvimento pede monorepo no GitHub. Mobile, API e contratos precisam versionar juntos.

## Decisão

Um único repositório (`LinkUP-PM/linkup`) com npm workspaces:

- `apps/api`
- `apps/mobile`
- `packages/shared`

## Por quê

- PR de contrato altera tipo, API e tela no mesmo diff
- Um clone, um README, um CI
- Equipe de 6 não se beneficia de múltiplos repos neste MVP

## Consequências

PRs devem permanecer pequenos mesmo no monorepo: não misturar extração de PDF com redesign da Home.
