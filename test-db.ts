import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Conectado com sucesso ao banco!');
  } catch (error) {
    console.error('❌ Erro ao conectar no banco:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
