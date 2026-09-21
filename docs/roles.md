# Papéis — equipe de 6

O grupo é pequeno. Cada pessoa tem uma trilha principal e uma trilha de apoio. Ninguém "dona" uma camada para sempre: contratos são do time.

Tech Lead: **Pedro Amorim** (`@The-P-P`)

## Trilhas

| Trilha | Pessoas | Responsabilidade principal | Também cobre |
| --- | --- | --- | --- |
| Integração / Tech Lead | 1 | Arquitetura, contratos, CI, merge final | Desbloquear pares |
| Backend | 2 | Upload, extração, persistência, endpoints | Mensagens de erro da API |
| Inteligência | 1 | Prompt, schema, qualidade do feedback | Casos de PDF ruim / JSON inválido |
| Mobile | 2 | Telas, estados, envio do PDF, histórico | Usabilidade e copy da interface |

A sexta cadeira no PDF original é a de **validação da experiência e do conteúdo do feedback**. Na prática isso fica com Inteligência + um par de Mobile, e o Tech Lead fecha a demo.

## Time na organização

Org: [LinkUP-PM](https://github.com/LinkUP-PM) · Times GitHub: `backend`, `mobile`, `ia`

| Nome | GitHub | Trilha | Status |
| --- | --- | --- | --- |
| Pedro Amorim | @The-P-P | Integração / Tech Lead | Na org |
| (a confirmar) | @jguilmartins-blip | a definir no kickoff | Na org — preencher trilha |
| (a confirmar) | convite: heitorwagner119@gmail.com | a definir | Convite pendente |
| (a confirmar) | convite: filipemonteiro.code@gmail.com | a definir | Convite pendente |
| | | Backend / Mobile / IA | Falta convidar 2 pessoas |

Quando alguém aceitar o convite: atualize esta tabela com **nome + @username + trilha**, adicione-o ao time GitHub correspondente e atualize `.github/CODEOWNERS` se a trilha tiver revisor dedicado.

## Quem aprova o quê

| Mudança | Aprovação mínima |
| --- | --- |
| Só docs | 1 pessoa da trilha |
| Só api ou só mobile, sem contrato | 1 pessoa da trilha |
| Contrato JSON, endpoint ou prompt | Tech Lead + 1 pessoa da outra camada afetada |
| Stack / ADR | Tech Lead + alinhamento no grupo |

## Integração final

Uma pessoa (Tech Lead) é responsável por o fluxo inteiro funcionar no celular, sem intervenção manual. Isso não significa implementar tudo: significa recusar merge que quebra o caminho Upload → Histórico.

## Como o par trabalha

- Backend em par no mesmo endpoint até ele responder no Insomnia/curl
- Mobile em par na mesma tela até o estado de erro existir
- Inteligência abre PR de prompt com 3 currículos de exemplo (bom, mediano, fraco) colados na descrição
