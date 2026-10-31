# Como contribuir

Leia isto antes de abrir qualquer Pull Request. O fluxo completo est? em [docs/collaboration.md](docs/collaboration.md).

## 1. Pegue uma Issue

Toda mudan?a come?a em uma Issue. Se n?o existir, crie uma com crit?rio de pronto.

## 2. Crie uma branch a partir de `main`

```bash
git checkout main
git pull
git checkout -b tipo/resumo-curto
```

Tipos: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`.

Exemplos: `feat/upload-pdf`, `fix/extracao-pdf-escaneado`, `docs/adr-auth`.

## 3. Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): validar tamanho m?ximo do PDF
fix(mobile): exibir estado de erro sem internet
docs(scope): congelar compara??o com vaga fora do MVP
```

Um commit = uma inten??o. N?o misture formata??o com regra de neg?cio.

## 4. Pull Request pequeno

- Uma Issue por PR, sempre que poss?vel
- Preencha o template
- Se o contrato JSON, endpoint ou prompt mudar, avise no PR e atualize `docs/contracts`
- CI precisa passar (`typecheck`, `test:fixtures`, `smoke-api`)

## 5. Revis?o

Pelo menos 1 aprova??o. O Tech Lead (`@The-P-P`) revisa mudan?as que cruzam api + mobile + IA.

## 6. Pronto quando

- Caminho de sucesso testado
- Pelo menos um caminho de erro testado
- Documenta??o viva atualizada se a decis?o mudou

## Ambiente local

Ver [docs/runbook.md](docs/runbook.md). Resumo:

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:up
npm run db:generate
npm run db:migrate
npm run dev:api
```
