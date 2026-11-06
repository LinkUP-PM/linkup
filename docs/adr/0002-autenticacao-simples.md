# ADR 0002 — Autenticação simples por device

- Status: substituída pelo [0005](0005-login-por-papel.md)
- Data: 2026-09-21
- Decisor: Tech Lead (Pedro Amorim)

## Contexto

O escopo pedia evitar login complexo. O histórico ainda precisava ser por usuário.

## Decisão

Não haveria cadastro, senha, OAuth nem e-mail no MVP.

O app gerava um UUID na primeira abertura, persistia no dispositivo e enviava em toda request:

```
X-Device-Id: <uuid>
```

A API fazia upsert do usuário por `deviceId`.

## Por quê

Atendia o recorte, destravava o histórico e evitava uma frente inteira (telas de auth, e-mail, recuperação).

## Limites

- Trocar de celular perdia o histórico
- Não havia conta compartilhada
- Qualquer um que copiasse o `deviceId` via as análises daquele device — aceitável no MVP acadêmico, inaceitável em produto real

## Consequências

Substituída pelo ADR 0005: login por e-mail e senha, com papel fixo na tela de cadastro.
