import { spawnSync } from 'node:child_process';

// Runtime queries use the pooler; migrations need a direct database connection.
const environment = { ...process.env };
if (environment.DATABASE_URL_UNPOOLED) {
  environment.DATABASE_URL = environment.DATABASE_URL_UNPOOLED;
}
const result = spawnSync(
  process.execPath,
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  { env: environment, stdio: 'inherit' },
);
if (result.error) {
  console.error('Não foi possível iniciar o Prisma Migrate.');
}
process.exit(result.status ?? 1);
