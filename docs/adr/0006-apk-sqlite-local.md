# ADR 0006 — APK Android com SQLite local

- Status: aceita
- Data: 2026-10-29
- Decisor: Tech Lead (Pedro Amorim)

## Contexto

O app dependia da API Fastify e do PostgreSQL na máquina de desenvolvimento. Para instalar um APK pelo GitHub Release e usar o LinkUP num celular Android sem servidor, a persistência e a análise precisam viver no aparelho. O uso previsto é no **mesmo celular**, trocando de conta entre os três papéis.

## Decisão

- O mobile grava contas, sessões, vagas, candidaturas e análises em **SQLite** (`expo-sqlite`) no aparelho
- As funções de [`apps/mobile/src/lib/api.ts`](../../apps/mobile/src/lib/api.ts) passam a falar com o SQLite; a superfície exportada (login, vagas, triagem, etc.) permanece
- Extração de PDF e análise rodam no aparelho; a análise usa o resultado local (`modelUsed: "mock"`), sem OpenAI embutida no APK
- O APK é gerado por workflow (`android-apk.yml`) e anexado à Release nas tags `v*`
- A API + PostgreSQL continuam no monorepo para desenvolvimento e CI

## Por quê

- Um APK sideload não pode depender de `localhost` nem de Docker no celular
- Um único arquivo SQLite no aparelho cobre o fluxo contratante → candidato → recrutador com troca de conta
- Análise local evita chave de API no binário e funciona offline

## Limites

- Dois celulares não compartilham dados
- Feedback de currículo no APK é o modo local, não o modelo OpenAI
- Keystore de sideload é de demonstração — não serve para Play Store

## Consequências

- Complementa [ADR 0001](0001-stack.md) e [ADR 0005](0005-login-por-papel.md) para o artefato instalável
- Documentação de arquitetura precisa distinguir ambiente de desenvolvimento (API + Postgres) e APK (SQLite local)
