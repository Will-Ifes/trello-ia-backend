# Trello.ia — Backend

API NestJS com PostgreSQL/Prisma para um Kanban pessoal com planejamento por IA.

Funciona em conjunto com [trello-ia-frontend](https://github.com/Will-Ifes/trello-ia-frontend), na mesma versão do MVP.

## O que está implementado

- Cadastro, login JWT em cookie HTTP-only, consulta de identidade e logout.
- Recuperação por e-mail com token aleatório, hash no banco, expiração de 15 minutos e consumo único.
- CRUD de quadros, listas e cartões, movimentação entre listas do mesmo quadro, conclusão e prazo.
- Autorização por proprietário em todas as consultas e mutações do Kanban.
- Geração de quadros, listas e tarefas por OpenRouter; conteúdo validado antes da gravação atômica.
- Validação global de entradas e limite de requisições, com limites menores em autenticação e IA.

## Rodar sem Docker (Windows, macOS ou Linux)

Requer Node.js 24 e pnpm 11.25.0. Clone os dois repositórios em pastas irmãs.

```sh
pnpm install --frozen-lockfile
pnpm db:local
```

Deixe o banco rodando e abra outro terminal:

```sh
pnpm db:generate
pnpm db:migrate
pnpm start:dev
```

O PostgreSQL de desenvolvimento usa a porta 55432, dados em `.local-db/` e senhas aleatórias em arquivos ignorados pelo Git. O script cria `.env` e `.env.test.local` apenas se estiverem ausentes, e preserva o banco ao encerrar. Ele cria bases UTF-8 distintas para desenvolvimento e testes. Não exige instalar um serviço de banco no sistema.

Para usar PostgreSQL próprio, copie `.env.example` para `.env`, configure `DATABASE_URL`, `JWT_SECRET` e `FRONTEND_URL`, e execute os comandos de geração/migração acima. A API atende em [localhost:3000](http://localhost:3000).

## Docker com o projeto completo

Com os dois repositórios em pastas irmãs, configure `.env` a partir do exemplo, incluindo um segredo JWT novo, e execute nesta pasta:

```sh
docker compose up --build
```

O arquivo `compose.yaml` sobe PostgreSQL, API e frontend; aplica as migrações e expõe apenas [localhost:3030](http://localhost:3030). Os arquivos Compose anteriores agora encaminham para essa configuração. A receita Docker foi revisada, mas não foi executada nesta recuperação porque Docker não estava instalado no ambiente de validação.

Para publicar, configure HTTPS, `COOKIE_SECURE=true`, `FRONTEND_URL`, segredo JWT e senha de banco próprios. Faça backup do volume PostgreSQL. A configuração HTTP do Compose é destinada ao desenvolvimento local.

## IA e recuperação de senha

Defina `OPENROUTER_API_KEY` e `OPENROUTER_MODEL` no backend para habilitar a criação com IA. Use um modelo com suporte a JSON. Consulte o [contrato oficial do OpenRouter](https://openrouter.ai/docs/api_reference/overview). A chave nunca vai ao navegador. Sem configuração, o endpoint retorna 503 e a interface orienta a criação manual. O texto enviado pelo usuário é compartilhado com o provedor; não há geração fictícia como fallback.

Para recuperação real, configure `EMAIL_USER` e `EMAIL_PASS` com uma conta Gmail e senha de aplicativo. Os testes substituem o envio de e-mail e o provedor de IA; não enviam mensagens nem consomem créditos reais.

## Testar

```sh
pnpm lint
pnpm build
pnpm test --runInBand
pnpm test:e2e
pnpm audit --prod
```

`test:e2e` exige `.env.test.local` ou `DATABASE_URL` com nome de banco terminado em `_test`. Aplica migrações somente nesse banco. Não aponte testes para dados de produção. No Windows, encerre a API antes de regenerar o Prisma Client, pois o processo mantém o engine DLL aberto.

Há testes de integração com banco para autenticação, propriedade dos quadros, listas, cartões, movimentação, exclusão em cascata e recuperação de senha. Os testes da IA cobrem validação da resposta, erro do provedor e ausência de configuração. O GitHub Actions executa lint, build, testes e auditoria de produção.

## Endpoints

| Método               | Rota                                        | Operação                           |
| -------------------- | ------------------------------------------- | ---------------------------------- |
| POST                 | /auth/register, /auth/login                 | Cadastro e sessão                  |
| GET                  | /auth/me                                    | Identidade atual                   |
| POST                 | /auth/forgot-password, /auth/reset-password | Recuperação                        |
| POST                 | /auth/logout                                | Limpar cookie                      |
| GET / POST           | /boards                                     | Listar / criar                     |
| GET / PATCH / DELETE | /boards/:id                                 | Consultar / editar / excluir       |
| POST                 | /boards/:id/lists                           | Criar lista                        |
| PATCH / DELETE       | /lists/:id                                  | Renomear / excluir lista           |
| POST                 | /lists/:id/cards                            | Criar cartão                       |
| PATCH / DELETE       | /cards/:id                                  | Editar, mover, concluir / excluir  |
| GET                  | /ai/status                                  | Disponibilidade da configuração    |
| POST                 | /ai/boards                                  | Criar quadro a partir de um prompt |

`PATCH /boards/:id` recebe título e descrição opcional. `PATCH /cards/:id` aceita título, descrição, `completed`, `dueDate` (ISO ou null), `listId` e `position`. O destino precisa pertencer ao mesmo quadro. Exclusões removem os filhos em cascata.

## Limites do MVP

O acesso é pessoal por proprietário. Convites, colaboração em tempo real, checklists, anexos, rotinas e integrações com agenda são evolução futura. A limitação de requisições e o bloqueio de gerações simultâneas são mantidos na memória de uma instância; múltiplas réplicas exigem armazenamento compartilhado e configuração de proxy. Sessões JWT têm duração de um dia; logout remove o cookie do navegador.

Projeto de **Wildemberg de Jesus Oliveira (Will)**. Sem licença de reutilização definida.
