#!/bin/sh

echo "⏳ Aguardando o banco de dados iniciar..."

# Espera até conseguir se conectar na porta do banco
until nc -z -v -w30 db 5432
do
  echo "🔁 Banco ainda não disponível em db:5432..."
  sleep 2
done

echo "✅ Banco disponível! Aplicando migrations..."
pnpm exec prisma migrate deploy

echo "🚀 Iniciando app em modo desenvolvimento..."
pnpm start:dev
