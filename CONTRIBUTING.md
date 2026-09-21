# Como contribuir

Leia isto antes de abrir qualquer Pull Request. O fluxo completo está em [docs/collaboration.md](docs/collaboration.md).

## 1. Pegue uma Issue

Toda mudança começa em uma Issue. Se não existir, crie uma com critério de pronto.

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
feat(api): validar tamanho máximo do PDF
fix(mobile): exibir estado de erro sem internet
docs(scope): congelar comparação com vaga fora do MVP
```

Um commit = uma intenção. Não misture formatação com regra de negócio.

## 4. Pull Request pequeno

- Uma Issue por PR, sempre que possível
- Preencha o template
- Se o contrato JSON, endpoint ou prompt mudar, avise no PR e atualize `docs/contracts`
- CI precisa passar

## 5. Revisão

Pelo menos 1 aprovação. O Tech Lead (`@The-P-P`) revisa mudanças que cruzam api + mobile + IA.

## 6. Pronto quando

- Caminho de sucesso testado
- Pelo menos um caminho de erro testado
- Documentação viva atualizada se a decisão mudou
