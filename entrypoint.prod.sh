#!/bin/sh

# Variáveis padrão (podem ser sobrescritas via .env)
DB_HOST="${POSTGRES_HOST:-db}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "⏳ Aguardando banco de dados em ${DB_HOST}:${DB_PORT} ficar disponível..."

# Tenta conexão até o banco estar pronto
until nc -z -v -w30 "$DB_HOST" "$DB_PORT"
do
  echo "🔁 Ainda aguardando ${DB_HOST}:${DB_PORT}..."
  sleep 2
done

echo "✅ Banco de dados está disponível. Executando migrations..."

# Executa as migrations
pnpm exec prisma migrate deploy

if [ $? -ne 0 ]; then
  echo "❌ Erro ao aplicar migrations. Abortando aplicação."
  exit 1
fi

echo "🚀 Iniciando aplicação NestJS..."
pnpm start
