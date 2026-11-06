# Publicação gratuita com Vercel e Neon

A aplicação completa precisa de servidor para Next.js/NestJS e de PostgreSQL. O GitHub Pages não executa esses serviços.

## Serviços

- Frontend: Vercel, plano **Hobby**, framework Next.js.
- API: Vercel, plano **Hobby**, framework NestJS.
- PostgreSQL: Neon, plano **Free**.

Use somente os planos gratuitos, sem ativar trial Pro, upgrades ou recursos pagos. A Vercel limita Hobby a projetos pessoais não comerciais. O Neon Free tem cotas de uso e armazenamento. Consulte os limites atuais: [Vercel](https://vercel.com/docs/plans/hobby) e [Neon](https://neon.com/pricing).

## Ordem do deploy

1. Crie um projeto Neon Free e guarde a conexão de produção como segredo.
2. Importe `trello-ia-backend` na Vercel como NestJS, com Node.js 24.
3. Configure `DATABASE_URL` com a conexão pooled do Neon, `DATABASE_URL_UNPOOLED` com a conexão direta para migrações, `JWT_SECRET` aleatório com pelo menos 32 bytes, e `FRONTEND_URL` com o domínio definitivo do frontend.
4. O comando de build da API gera o Prisma Client, aplica as migrações pela conexão direta e compila o NestJS. A aplicação continua usando a conexão pooled. Aponte previews para um banco/branch Neon separado; nunca reutilize credenciais de produção em previews não confiáveis.
5. Importe `trello-ia-frontend` como Next.js na Vercel, com Node.js 24.
6. Configure `API_INTERNAL_URL` com a URL HTTPS da API e `COOKIE_SECURE=true`.
7. Atualize `FRONTEND_URL` na API e publique novamente se o domínio só tiver sido definido após a criação do frontend.
8. Verifique cadastro, login, criação e movimentação de cartões, reload e logout na URL pública.

O arquivo antigo do frontend desabilitava deploys pelo GitHub e ignorava o build; essa configuração foi substituída.

## Variáveis opcionais

`OPENROUTER_API_KEY` e `OPENROUTER_MODEL` habilitam geração de quadros. Chamadas a modelos podem ter custo próprio; a hospedagem gratuita não inclui créditos de IA.

`EMAIL_USER` e `EMAIL_PASS` habilitam recuperação via Gmail com senha de aplicativo. Nunca coloque chaves, senhas ou strings de conexão no README, no código ou em variáveis públicas do Next.

## Dados e validação

O banco local não é transferido automaticamente para a nuvem. Crie uma conta nova no endereço publicado. Não copie contas e dados de testes para produção.

A publicação só é considerada concluída após obter uma URL pública e validar os fluxos reais. Preparar arquivos de deploy e passar na CI não comprova que o serviço foi publicado.
