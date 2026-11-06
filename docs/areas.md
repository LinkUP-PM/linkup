# Áreas e telas — três papéis

Mapa do produto com três áreas no mesmo app. Cada papel entra na própria área e não vê o menu dos outros. Eles só se encontram numa candidatura.

Documento irmão: [scope.md](scope.md). Porta, vaga, candidatura, triagem do recrutador e decisão do contratante (com reenvio após ajuste) estão no código.

## Processo

```mermaid
flowchart LR
  vaga[Contratante abre a vaga]
  envio[Candidato envia o PDF]
  analise[Analise que ja existe]
  triagem[Recrutador tria]
  decisao[Contratante decide]
  vaga --> envio --> analise --> triagem
  triagem -->|encaminha| decisao
  triagem -->|descarta| fim1[Candidato ve que nao avancou]
  decisao -->|aceita ou recusa| fim2[Candidato ve a decisao]
  decisao -->|pede ajuste| envio
```

1. O **contratante** abre a vaga (título, descrição, o que procura). A vaga já nasce ligada a ele.
2. O **candidato** vê vagas abertas, envia o PDF e acompanha o status.
3. A **análise atual** (PDF → extração → feedback) roda nesse envio. Ninguém cola descrição de vaga na hora da análise. Comparação automática currículo versus vaga continua fora — ver [adr/0004-comparacao-vaga.md](adr/0004-comparacao-vaga.md). O recrutador usa o feedback que já existe para triar.
4. O **recrutador** não cria vaga. Ele vê a fila e só tem duas saídas: encaminhar ao contratante daquela vaga, ou descartar.
5. O **contratante** não vê a fila inteira. Vê só quem foi encaminhado e escolhe: aceitar, recusar ou pedir ajuste.
6. Pedido de ajuste volta para o candidato, que reenvia o PDF. A análise roda de novo.

### Status da candidatura

Nesta ordem lógica:

| Status | Quem move | O que o candidato vê |
| --- | --- | --- |
| enviada | candidato (envio ou reenvio) | Candidatura enviada |
| descartada | recrutador | Não avançou |
| encaminhada | recrutador | Encaminhada ao contratante |
| ajuste pedido | contratante | Pedido de ajuste + texto |
| aceita | contratante | Aceita |
| recusada | contratante | Recusada + texto |

Reenvio depois do ajuste volta para **enviada** e o recrutador tria outra vez.

## O que cada um vê do mesmo currículo

| Papel | Visão |
| --- | --- |
| Candidato | Feedback completo, inclusive sugestões do que melhorar |
| Recrutador | Dossiê de triagem (fortes, atenção, competências). Pode guardar uma nota interna — essa nota não aparece para o candidato nem para o contratante |
| Contratante | Leitura curta para decidir, sem o tom de "revise seu currículo" |

Recusa e pedido de ajuste levam um texto curto, visível ao candidato. Descarte do recrutador só aparece para o candidato como "não avançou", sem a nota interna.

## Entrada comum

A **home** apresenta o produto (o currículo vira um plano; o processo em três passos) e o botão Entrar abre a porta. Três portas: **Candidato**, **Recrutador**, **Contratante**. Cada uma abre a tela de login daquele papel (entrar ou criar conta). O papel nasce no cadastro e não muda — ver [adr/0005-login-por-papel.md](adr/0005-login-por-papel.md).

## Telas — Candidato

| Tela | O que faz |
| --- | --- |
| Login | E-mail e senha; criar conta ou entrar como candidato |
| Início | Candidaturas em andamento, com o status em uma linha; aviso se o cadastro estiver incompleto |
| Cadastro | Formulário em passos: pessoal (com laudo PCD opcional), endereço, profissional, trajetória e diversidade |
| Perfil | Atalho para o cadastro + biblioteca de PDFs (1 principal e até 3 versões) |
| Vagas | Lista do que está aberto |
| Vaga | Descrição e o botão de se candidatar. Uma candidatura por vaga |
| Enviar currículo | A tela atual de PDF |
| Análise | A tela atual de fortes, atenção e sugestões |
| Candidatura | Linha do tempo do status + mensagem de decisão; se aceito, aceitar ou recusar a data da entrevista |
| Agenda | Aba com calendário: envio, decisões e entrevistas das próprias candidaturas |
| Ajuste | O texto do contratante e o reenvio do PDF (na mesma tela de candidatura) |

O histórico de análises que já existe continua aqui, como lista dos PDFs que o candidato mesmo enviou.

Recrutador e contratante veem só um **resumo** do cadastro (nome, cidade/UF, objetivo, formação e experiência recentes). Telefone, deficiência, laudo PCD, diversidade e pretensão salarial ficam só na conta do candidato.

## Telas — Recrutador

| Tela | O que faz |
| --- | --- |
| Login | E-mail e senha; criar conta ou entrar como recrutador |
| Início (aba Triagem) | Atalho **A triar** + vagas com contagens do funil (fila, encaminhadas, em ajuste, encerradas) |
| Inbox (A triar) | Fila global de candidaturas `SUBMITTED` de todas as vagas; reenvios no topo; prévia rápida e tags |
| Agenda | Aba com calendário do funil (envios, encaminhamentos, decisões, entrevistas); só leitura |
| Perfil | Aba com identidade, força do perfil e seções (pessoal, atuação, especialidade); cadastro em passos fora da barra |
| Fila da vaga | Busca por e-mail, filtros (fila / reenvios / encaminhadas / ajuste / encerradas), e-mail, competências, tags, selo de reenvio, prévia rápida (fortes/atenção) |
| Dossiê | Texto da vaga, tags internas, histórico de notas, análise, salvar nota sem mudar status; Encaminhar ou Descartar com nota opcional; histórico de entrevistas |
| Tags internas | Conjunto fixo (`forte`, `duvida`, `perfil-senior`, `comunicar-depois`); só o recrutador vê |
| Nota interna | Append-only no histórico (`NOTE` / `FORWARD` / `DISCARD`); `recruiterNote` é a última; só o recrutador vê |

O recrutador não cria vaga. O perfil profissional fica só na conta dele (não aparece no dossiê nem para o contratante).

## Telas — Contratante

| Tela | O que faz |
| --- | --- |
| Login | E-mail e senha; criar conta ou entrar como contratante |
| Início | Vagas dele e decisões pendentes |
| Agenda | Aba com calendário: envios, decisões e entrevistas das suas vagas |
| Nova vaga | Título, descrição e o que procura |
| Perfil | Aba com identidade da empresa, força do perfil e seções (empresa, endereço, responsável, contratação, cultura); cadastro em passos fora da barra |
| Indicados | Só os indicados pelo recrutador (e desfechos já decididos) |
| Dossiê | Leitura curta da análise; após aceitar, marcar ou corrigir o dia da entrevista |
| Decisão | Aceitar, Recusar ou Pedir ajuste. Recusa e ajuste pedem um texto curto |

O perfil da empresa fica só na conta do contratante (não aparece na vaga nem para o candidato).

## Fora deste mapa

- Recuperação de senha, confirmação de e-mail, OAuth e troca de papel na mesma conta
- Nota numérica, ranking entre candidatos e reescrita automática do currículo
- Chat, push e versão web
- Vários recrutadores na mesma vaga, ou recrutador criando vaga em nome da empresa
- Comparação automática do currículo com o texto da vaga
- Kanban completo, ações em massa e publicação de vaga pelo recrutador
