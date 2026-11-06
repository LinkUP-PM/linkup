# ADR 0005 — Login por papel (e-mail e senha)

- Status: aceita
- Data: 2026-10-29
- Decisor: Tech Lead (Pedro Amorim)

## Contexto

O ADR 0002 identificava o usuário só pelo `deviceId` do aparelho. Isso destrava o MVP, mas impede contas reais, troca de celular e a separação clara entre candidato, recrutador e contratante. O produto passou a precisar de três telas de login, com cadastro na mesma tela.

## Decisão

Cada conta tem e-mail, senha e um papel fixo, definido na tela em que a pessoa cria a conta.

- `POST /auth/register` e `POST /auth/login` recebem `{ email, password, role }`
- Sessão opaca: o app guarda o token; a API guarda só o hash (`Session`), validade 30 dias
- Header nas rotas autenticadas: `Authorization: Bearer <token>`
- Entrar na porta errada (papel da conta ≠ papel da tela) responde `403 ROLE_MISMATCH` sem emitir sessão
- Credencial inválida responde `401 INVALID_CREDENTIALS` (mesmo formato para e-mail inexistente e senha errada)
- Senha com `scrypt` (`node:crypto`); sem OAuth, recuperação de senha ou confirmação de e-mail neste recorte

O `X-Device-Id` deixa de existir. `PUT` e `DELETE /me/role` saem: o papel nasce no cadastro e não muda.

## Por quê

- Telas de login pedem identidade de conta, não de aparelho
- Papel na tela de cadastro evita conta “sem área” e remove a troca de papel no mesmo device
- Sessão opaca com hash no banco é suficiente para o MVP acadêmico sem JWT

## Limites

- Sem recuperação de senha nem verificação de e-mail
- Usuários antigos só de `deviceId` não migram — dados locais de demo somem na migration
- Um e-mail = uma conta = um papel

## Consequências

- Sucede o [ADR 0002](0002-autenticacao-simples.md)
- Contrato HTTP, smoke, mobile e docs vivos passam a falar de Bearer e das três telas de login
- A porta do app só escolhe qual tela de login abrir
