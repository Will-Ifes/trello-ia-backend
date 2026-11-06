import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';

config({ path: '.env.test.local', override: true });
if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.endsWith('_test')) {
  throw new Error(
    'Defina DATABASE_URL em .env.test.local apontando para um banco com sufixo _test.',
  );
}
process.env.JWT_SECRET ||= 'isolated-e2e-secret-for-tests-only';
process.env.NODE_ENV = 'test';
for (const args of [
  ['node_modules/prisma/build/index.js', 'generate'],
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  ['node_modules/jest/bin/jest.js', '--config', 'test/jest-e2e.json', '--runInBand'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
