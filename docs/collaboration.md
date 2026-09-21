# Colaboração

Três regras, copiadas do plano de desenvolvimento:

1. Contratos entre camadas são documentados **antes** de serem consumidos.
2. Alterações que afetam backend, IA e mobile são comunicadas no Pull Request.
3. Uma funcionalidade só está concluída com caminho de sucesso **e** pelo menos um caminho de erro testado.

## Branches

| Branch | Uso |
| --- | --- |
| `main` | Sempre entregável. Protegida. Só entra via PR. |
| `feat/...` | Nova capacidade |
| `fix/...` | Correção |
| `docs/...` | Documentação |
| `chore/...` | Tooling, CI, dependências |
| `refactor/...` | Sem mudança de comportamento |

Não trabalhe direto em `main`. Não crie branches eternas (`dev`, `release`) neste MVP.

## Issues

Toda Issue precisa responder:

- O que precisa ser feito?
- Como sabemos que terminou?
- Qual etapa do plano (0–7) isso atende?

Use os templates em `.github/ISSUE_TEMPLATE`. Labels:

- `etapa-0` … `etapa-7`
- `trilha-backend` `trilha-mobile` `trilha-ia` `trilha-docs`
- `bug` `feat` `chore`
- `contrato` — muda JSON, endpoint ou prompt; exige atenção extra

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), em português ou inglês — escolha um por PR e mantenha.

```
feat(api): rejeitar PDF acima de 5mb
fix(mobile): tratar histórico vazio
docs(adr): registrar stack oficial
```

## Pull Requests

- Título no mesmo padrão do commit principal
- Template obrigatório
- Diff pequeno o bastante para revisar em 15 minutos
- Screenshot ou gravação se a mudança for de UI
- Se houver mudança de contrato, link para o arquivo em `docs/contracts` ou `packages/shared`

## Code owners

`CODEOWNERS` aponta o Tech Lead como revisor padrão até as trilhas terem usernames. Atualize `docs/roles.md` e `.github/CODEOWNERS` quando o time entrar na org.

## Segredos

Nunca commite `.env`. A chave da OpenAI fica só em `apps/api/.env` local ou no secret do ambiente de demo. `AI_PROVIDER=mock` é o padrão de desenvolvimento.
