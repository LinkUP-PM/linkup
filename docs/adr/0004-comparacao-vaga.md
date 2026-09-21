# ADR 0004 — Comparação com vaga fora do MVP

- Status: aceita
- Data: 2026-09-21
- Decisor: Tech Lead (Pedro Amorim)

## Contexto

O escopo deixava em aberto colar a descrição de uma vaga para comparar requisitos com o currículo. O plano pedia congelar essa decisão antes da implementação.

## Decisão

**Não entra no MVP.**

O fluxo congelado é só: PDF → extração → análise geral → feedback → histórico.

## Por quê

O próprio escopo admite que o recurso aumenta complexidade de prompt, interface e validação. O critério de sucesso já é um caminho ponta a ponta estável. Comparar com vaga pode vir depois, sem redesenhar o núcleo.

## Consequências

- Não criar campo de "cole a vaga" nas telas
- Não adicionar `jobDescription` no contrato JSON agora
- Se o grupo reabrir a decisão, este ADR muda de status e o contrato é versionado de propósito — não no meio de outra Issue
