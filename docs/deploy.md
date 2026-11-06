# Publicação gratuita com Vercel e Neon

A aplicação completa precisa de servidor para Next.js/NestJS e de PostgreSQL. O GitHub Pages não executa esses serviços.

## Endereços publicados

- Aplicação: [https://trello-ia-frontend-five.vercel.app](https://trello-ia-frontend-five.vercel.app)
- API: [trello-ia-backend.vercel.app](https://trello-ia-backend.vercel.app)

O banco definitivo usa a branch `production` do projeto Neon `trello-ia`. As migrações foram verificadas primeiro em `migration-validation`, com testes completos do site público nessa branch. A produção mantém seus dados separados dos testes.

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

`GROQ_API_KEY` habilita a geração de quadros com `openai/gpt-oss-20b`, disponível no plano Groq Free. Crie a chave em [Groq Console](https://console.groq.com/keys) e salve como **Secret/Sensitive**, somente no backend, no ambiente Production. Publique novamente após salvar a variável. Não use prefixos públicos nem coloque a chave no frontend.

Mantenha a conta Groq no plano Free e não habilite upgrade/faturamento pago. As cotas do provedor podem mudar e são compartilhadas por todos os usuários. O aplicativo limita cada conta a 5 tentativas por dia UTC, incluindo falhas, sem retentativas automáticas ou fallback para outro provedor. O limite persistido no PostgreSQL funciona entre instâncias da Vercel; ele reduz abuso por conta, mas não substitui as cotas globais da Groq.

Somente o prompt é enviado à Groq; o sistema não envia nome, e-mail, senha ou quadros existentes. A Groq informa que não usa inferências para treino e não retém entradas/saídas por padrão, com exceções documentadas: [política de dados](https://console.groq.com/docs/your-data). Confira a configuração de dados da sua conta. O texto não deve conter informações sensíveis. [Limites gratuitos atuais](https://console.groq.com/docs/rate-limits).

`EMAIL_USER` e `EMAIL_PASS` habilitam recuperação via Gmail com senha de aplicativo. Nunca coloque chaves, senhas ou strings de conexão no README, no código ou em variáveis públicas do Next.

## Dados e validação

O banco local não é transferido automaticamente para a nuvem. Crie uma conta nova no endereço publicado. Não copie contas e dados de testes para produção.

A publicação só é considerada concluída após obter uma URL pública e validar os fluxos reais. Preparar arquivos de deploy e passar na CI não comprova que o serviço foi publicado.
