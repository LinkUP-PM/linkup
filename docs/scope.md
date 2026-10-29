# Escopo do produto

Fonte original: `Escopo do projeto.pdf`. Este arquivo é a referência viva do recorte. Se o PDF e este documento divergirem, vale o que estiver aqui — e a mudança precisa de ADR ou atualização explícita neste arquivo.

O mapa de três papéis (candidato, recrutador, contratante) está em [areas.md](areas.md).

## Tese

Transformar um currículo enviado em um plano claro de melhoria, sem reduzir a avaliação a uma nota genérica — e conectar esse resultado a um processo com recrutador e contratante.

## Direção do produto

Três áreas no mesmo app, ligadas por um único processo de candidatura:

1. O **contratante** abre a vaga
2. O **candidato** se candidata com PDF e recebe a análise que já existe
3. O **recrutador** (intermediador) tria e encaminha ou descarta
4. O **contratante** decide sobre quem foi encaminhado (aceitar, recusar ou pedir ajuste)

Detalhe de telas, status e o que cada papel vê: [areas.md](areas.md).

Home pública, porta, login por papel, vaga, candidatura, triagem e decisão (com reenvio após ajuste) estão no código.

## O que o app faz hoje

Aplicativo **mobile** que:

1. Mostra a home pública e, ao entrar, escolhe a porta do papel e entra (ou cria conta) com e-mail e senha
2. Contratante abre vaga; candidato se candidata com PDF
3. Extrai o texto e analisa com IA generativa
4. Mostra feedback em três blocos e status da candidatura
5. Recrutador tria (encaminha ou descarta); contratante decide (aceita, recusa ou pede ajuste)
6. Pedido de ajuste volta ao candidato, que reenvia o PDF e reabre a triagem
7. Guarda análises no histórico do candidato

### Jornada atual

| Passo | Nome | O que acontece |
| --- | --- | --- |
| 01 | Enviar | Usuário seleciona um PDF |
| 02 | Extrair | Sistema valida e extrai texto |
| 03 | Analisar | IA organiza os achados |
| 04 | Agir | Usuário lê recomendações e consulta histórico |
| 05 | Triar | Recrutador encaminha ou descarta |
| 06 | Decidir | Contratante aceita, recusa ou pede ajuste |

### Funcionalidades incluídas (hoje)

1. Upload de PDF, com erro para arquivo inválido ou indisponível
2. Extração de texto, preservando seções quando possível
3. Análise de estrutura, clareza, competências e palavras-chave
4. Feedback: pontos fortes, pontos de atenção, sugestões concretas
5. Histórico das análises do usuário
6. Interface mobile com estados de carregamento, sucesso e erro
7. Home pública, porta, login por papel, vagas, candidaturas e fluxo de triagem/decisão

Essa análise e esse histórico são o núcleo da área do **candidato**. Recrutador e contratante leem o mesmo resultado com visões diferentes — ver [areas.md](areas.md).

## Formato do feedback

Cada análise responde três perguntas:

- **Pontos fortes:** o que já comunica bem?
- **Pontos de atenção:** o que está pouco claro, ausente ou genérico?
- **Sugestões:** qual ação prática executar na próxima revisão?

## Fora do escopo

| Item | Decisão |
| --- | --- |
| Análise de vídeo ou LinkedIn | Não |
| Reescrita completa do currículo | Não |
| Integração com plataformas de emprego | Não |
| Ranking entre usuários | Não |
| Versão web | Não |
| Login complexo (OAuth, recuperação, confirmação de e-mail) | Não — ver ADR 0005 (e-mail/senha simples está dentro) |
| Monetização | Não |
| Comparação automática com uma vaga específica | Não — ver ADR 0004 |
| Chat, push | Não |
| Vários recrutadores na mesma vaga | Não |
| Recrutador criando vaga em nome da empresa | Não |

## Critérios de sucesso

### Já validados pelo app atual

1. O usuário envia um PDF sem orientação externa
2. O texto é extraído ou o sistema explica que a leitura falhou
3. O resultado aparece com estado de processamento compreensível
4. O feedback vem nos três blocos combinados
5. Análises anteriores aparecem no histórico
6. Funções principais permanecem estáveis com currículos reais
7. A equipe explica valor e limitações com clareza
8. Cada papel entra só na própria área
9. Uma candidatura percorre candidato → recrutador → contratante com status legível
10. Pedido de ajuste volta ao candidato e reabre a triagem após reenvio
