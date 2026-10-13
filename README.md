# Trello.ia — Backend

API do projeto pessoal Trello.ia, uma aplicação de gestão de tarefas inspirada no Trello. Esta etapa entrega a base de autenticação e persistência; quadros, listas, cards e IA estão previstos para etapas futuras.

---

## 🚀 Tecnologias utilizadas

- **NestJS 11 e TypeScript** — estrutura da API.
- **Prisma ORM + PostgreSQL** — modelo de dados e migrações.
- **JWT, Passport e bcryptjs** — autenticação e proteção de senha.
- **class-validator** — validação das entradas.
- **Jest + Supertest** — testes unitários e de integração.
- **Docker, ESLint e Prettier** — ambiente de desenvolvimento e qualidade de código.

---

## ✅ O que já está implementado

- Cadastro e login de usuários com senha armazenada em hash.
- Autenticação JWT com cookie HTTP-only.
- Solicitação de recuperação e redefinição de senha por e-mail.
- Schema e migrações de banco com Prisma.
- Testes para os fluxos de autenticação.
- Arquivos de Docker para ambientes de desenvolvimento e produção.

## 🔁 Próximas etapas

- CRUD de quadros, listas e cards.
- Regras de colaboração e organização de tarefas.
- Recursos de IA para sugestões e automações.

> O módulo de usuários além da autenticação e os recursos de IA ainda não estão completos nesta versão.

---

## 📁 Estrutura do projeto

```text
src/
├── auth/          # Cadastro, login, recuperação e JWT
├── config/        # Configuração de ambiente
├── users/         # Estrutura inicial do módulo de usuários
├── app.module.ts  # Módulo principal
└── main.ts        # Inicialização da API
prisma/
├── migrations/    # Histórico do esquema do banco
└── schema.prisma  # Modelos de dados
test/              # Testes de integração
```

---

## 🛠️ Executar localmente

Requer Node.js, pnpm e PostgreSQL. Copie `.env.example` para `.env` e configure seus próprios valores de `DATABASE_URL`, `JWT_SECRET` e `FRONTEND_URL`. Para recuperação de senha, configure também `EMAIL_USER` e `EMAIL_PASS`.

```bash
cp .env.example .env
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm start:dev
```

Os arquivos `docker-compose.dev.yml` e `docker-compose.prod.yml` estão disponíveis para quem preferir rodar os serviços em contêineres. Eles exigem as variáveis locais e a rede externa `trelloia-shared`.

### Scripts disponíveis

| Comando | Finalidade |
| --- | --- |
| `pnpm start:dev` | Inicia a API com recarregamento |
| `pnpm build` | Compila a aplicação |
| `pnpm start:prod` | Executa a build compilada |
| `pnpm prisma generate` | Gera o cliente Prisma |
| `pnpm prisma migrate dev` | Aplica migrações no banco local |
| `pnpm test` | Executa testes unitários |
| `pnpm test:e2e` | Executa testes de integração |
| `pnpm test:cov` | Gera cobertura dos testes |

---

## 🔐 Configuração de ambiente

O arquivo [`.env.example`](.env.example) contém apenas valores de exemplo. Crie segredos novos para seu ambiente e mantenha `.env` e `.env.prod` fora do versionamento. A aplicação exige `JWT_SECRET` configurado; não utiliza uma chave padrão no código.

---

## 🔗 Projeto relacionado

- [Frontend Next.js](https://github.com/Will-Ifes/trello-ia-frontend)

---

## 🤝 Contribuições e licença

Sugestões podem ser enviadas por issue ou pull request. O projeto ainda não possui licença definida; consulte o autor antes de reutilizar o código fora das permissões padrão do GitHub.

---

Desenvolvido por **Wildemberg de Jesus Oliveira (Will)** · [LinkedIn](https://www.linkedin.com/in/wildemberg-de-jesus-oliveira/)  
Projeto iniciado em 2025 em outra conta GitHub e reunido neste perfil em uma cópia revisada.
