# Bitu's Fit 💪

App de acompanhamento de treinos de academia para duas pessoas (um casal) que
treinam juntas e seguem o mesmo plano, mas registram e acompanham a evolução
de carga de forma individual. Interface em português (Brasil), unidade de
carga em kg.

O diferencial do app é a criação de planos de treino (periodização) assistida
por IA: cole um plano feito externamente ou converse com um assistente dentro
do próprio app para gerar um novo, com base no histórico de treino de cada um.

## Stack

- **Backend**: [Nitro](https://nitro.build) (rotas de API em `server/api`,
  baseadas em [h3](https://h3.unjs.io)) + SQLite via `node:sqlite`
  (módulo nativo do Node, sem dependências de compilação).
- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4, mobile-first.
- **IA**: API da Anthropic (Claude), usada para interpretar planos colados em
  texto livre e para conduzir o assistente de criação de plano.

## Estrutura do projeto

```
server/
  api/            rotas da API (auth, exercises, plans, workouts, progress, ai)
  db/             schema SQLite e cliente do banco
  utils/          lógica de domínio (autenticação, periodização, IA, histórico)
  routes/         fallback de SPA para o front-end em produção
  types.ts        tipos de domínio compartilhados pelas rotas

web/
  src/
    pages/        telas do app (Home, LiveWorkout, PlanNew/Paste/Chat/Review, ...)
    components/   componentes reutilizáveis (RestTimer, ExercisePicker, AppLayout)
    context/      AuthContext
    api/          cliente HTTP para a API

scripts/seed.ts   cria as duas contas de usuário a partir do .env
```

## Configuração

1. Instale as dependências:

   ```bash
   pnpm install
   ```

2. Copie `.env.example` para `.env` e preencha:

   ```bash
   cp .env.example .env
   ```

   - `ANTHROPIC_API_KEY`: chave da API da Anthropic, necessária para os
     recursos de IA (interpretar plano colado e o assistente de chat).
   - `SEED_USER1_*` / `SEED_USER2_*`: nome, e-mail e senha das duas contas do
     app (o casal). Usadas apenas pelo script de seed.

3. Crie as duas contas de usuário:

   ```bash
   pnpm seed
   ```

## Desenvolvimento

Roda o backend (Nitro, porta 3000) e o frontend (Vite, porta 5173, com proxy
de `/api` para o backend) em paralelo:

```bash
pnpm dev
```

Acesse `http://localhost:5173`.

## Build / produção

```bash
pnpm build     # build do frontend (para /public) + build do servidor Nitro
pnpm preview   # roda o servidor buildado (serve API + front-end juntos)
```

Em produção, o Nitro serve os assets estáticos do front-end e faz fallback
de SPA (qualquer rota que não seja `/api/*` e não corresponda a um asset
estático recebe o `index.html`, para o React Router cuidar da navegação).

> **Nota sobre persistência**: o banco SQLite é um arquivo local
> (`.data/bitusfit.db` por padrão, configurável via `BITUSFIT_DB_PATH`). Isso
> funciona bem para rodar em uma máquina/servidor próprio. Em uma plataforma
> serverless (como Vercel), o sistema de arquivos não é persistente entre
> execuções — para esse cenário, adapte `server/db/client.ts` para um banco
> hospedado (ex: Turso/libSQL, Postgres).

## Modelo de dados

- **Compartilhado** entre os dois usuários: catálogo de exercícios
  (`exercises`) e o plano de treino ativo (`plans` → `plan_workouts` →
  `plan_exercises`). Qualquer um dos dois pode criar/editar o plano ativo.
- **Individual** por usuário: sessões de treino (`workout_sessions`), séries
  registradas (`logged_sets`) e a posição de cada um na sequência do plano
  (`user_progress`). Cada usuário vê seu próprio "próximo treino", calculado
  a partir do que ele mesmo já completou — os dois podem estar em pontos
  diferentes da sequência, e usar "Avançar treino" para se resincronizar.
- Periodização flexível: cada exercício do plano guarda uma lista de
  variações de série/repetição/carga (uma por semana/bloco). A variação
  aplicada em cada ocorrência do treino é escolhida com base em quantas vezes
  aquele usuário já completou esse treino específico, ciclando pela sequência
  do plano automaticamente ao chegar ao fim.

## Licença

MIT
