# Etapa 1: build da aplicação
FROM node:23-alpine AS builder

# Instala dependências essenciais
RUN apk add --no-cache bash curl

# Habilita o corepack e prepara o pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instala dependências de produção + build
RUN pnpm install --frozen-lockfile

# Copia o restante do projeto
COPY . .

# Gera Prisma Client e compila o projeto
RUN pnpm exec prisma generate
RUN pnpm build

# Etapa 2: imagem final para execução
FROM node:23-alpine AS production

# Habilita pnpm na imagem final
RUN corepack enable && corepack prepare pnpm@latest --activate

# Define diretório de trabalho
WORKDIR /app

# Copia apenas os artefatos necessários da etapa anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Executa novamente o prisma generate (garantia de compatibilidade)
RUN pnpm exec prisma generate

# Expõe a porta padrão do NestJS
EXPOSE 3000

# Copia e prepara o script de entrada
COPY entrypoint.prod.sh /entrypoint.prod.sh
RUN chmod +x /entrypoint.prod.sh

# Usa o script como comando de entrada
CMD ["/entrypoint.prod.sh"]

