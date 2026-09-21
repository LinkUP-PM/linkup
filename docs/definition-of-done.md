# Definição de pronto

## Tarefa (Issue / PR)

Uma tarefa está pronta quando:

- [ ] Faz o que a Issue descreveu, e só isso
- [ ] Caminho de sucesso foi exercitado
- [ ] Pelo menos um caminho de erro foi exercitado
- [ ] Tipos/contratos em `@linkup/shared` continuam válidos
- [ ] Docs vivos atualizados se a decisão mudou
- [ ] CI passou
- [ ] PR revisado

## MVP — status

| Critério | Status |
| --- | --- |
| Fluxo Upload → Extração → Análise → Feedback → Histórico na API (mock) | Feito — `smoke:api` |
| Feedback em três blocos + histórico por device | Feito |
| PDF inválido / texto curto com mensagem clara | Feito (API + fixtures) |
| PDF grande / escaneado | Grande: receita no runbook; escaneado: erro `TEXT_NOT_EXTRACTABLE` |
| Fluxo no **celular físico** (Expo Go + LAN) | Pendente — checklist em `docs/runbook.md` |
| Feedback com OpenAI real | Pendente — precisa de `OPENAI_API_KEY` |
| Demo explicando escolhas e limitações | Roteiro em `docs/demo.md` — execução ao vivo pendente |

O MVP acadêmico está **pronto para demo com mock** assim que o checklist Etapa 5 no celular for validado uma vez.
