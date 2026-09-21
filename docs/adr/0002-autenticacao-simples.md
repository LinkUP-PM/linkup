# ADR 0002 — Autenticação simples por device

- Status: aceita
- Data: 2026-09-21
- Decisor: Tech Lead (Pedro Amorim)

## Contexto

O escopo pede evitar login complexo. O histórico ainda precisa ser por usuário.

## Decisão

Não haverá cadastro, senha, OAuth nem e-mail no MVP.

O app gera um UUID na primeira abertura, persiste no dispositivo e envia em toda request:

```
X-Device-Id: <uuid>
```

A API faz upsert do usuário por `deviceId`.

## Por quê

Atende o recorte, destrava o histórico e evita uma frente inteira (telas de auth, e-mail, recuperação).

## Limites

- Trocar de celular perde o histórico
- Não há conta compartilhada
- Qualquer um que copie o `deviceId` vê as análises daquele device — aceitável no MVP acadêmico, inaceitável em produto real

## Consequências

Auth "de verdade" fica explicitamente fora. Não abrir Issue de login sem novo ADR.
