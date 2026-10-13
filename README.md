# Trello.ia — Backend

API de um projeto pessoal de organização de tarefas, construída com NestJS, TypeScript, Prisma e PostgreSQL.

## O que está implementado

- Cadastro, login e recuperação de senha.
- Senhas armazenadas com hash, autenticação JWT em cookie e validação de dados.
- Schema e migrações do Prisma.
- Testes unitários e de integração para os fluxos de autenticação.

Boards, listas, cards e recursos de IA estão planejados; esta versão da API ainda não os implementa.

## Tecnologias

NestJS, TypeScript, Prisma, PostgreSQL, JWT, Jest, Supertest e Docker.

## Executar localmente

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm start:dev
```

Configure `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` e as variáveis de e-mail exigidas pelos fluxos de recuperação. Use valores próprios no ambiente local; nenhum segredo de produção faz parte desta cópia. Os arquivos de Docker Compose esperam `.env` ou `.env.prod` local, sem versioná-los.

## Testes

```bash
pnpm test
pnpm test:e2e
pnpm build
```

## Projeto

- [Frontend](https://github.com/Will-Ifes/trello-ia-frontend)
- [Projeto original](https://github.com/Wildemberg-otus7/trello.ia-backend)

Versão de portfólio com histórico novo para excluir credenciais e configurações privadas versionadas no repositório original. Esta cópia ainda não foi validada em execução após a migração.
