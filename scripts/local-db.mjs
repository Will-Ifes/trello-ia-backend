import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { writeFile, readFile } from 'node:fs/promises';

const databaseDir = resolve('.local-db');
const credentials = resolve('.local-db-credentials.json');
const settings = existsSync(credentials)
  ? JSON.parse(await readFile(credentials, 'utf8'))
  : { password: randomBytes(24).toString('hex') };
await writeFile(credentials, JSON.stringify(settings), { mode: 0o600 });
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: settings.password,
  port: 55432,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});
if (!existsSync(resolve(databaseDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
for (const name of ['trelloia_utf8', 'trelloia_utf8_test']) {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (!result.rowCount)
    await client.query(
      `CREATE DATABASE "${name}" TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
    );
}
await client.end();
const env = `DATABASE_URL="postgresql://postgres:${settings.password}@localhost:55432/trelloia_utf8"\nJWT_SECRET="${randomBytes(48).toString('hex')}"\nFRONTEND_URL="http://localhost:3030"\nPORT=3000\nEMAIL_USER=""\nEMAIL_PASS=""\nGROQ_API_KEY=""\n`;
if (!existsSync('.env')) await writeFile('.env', env, { mode: 0o600 });
if (!existsSync('.env.test.local'))
  await writeFile('.env.test.local', env.replace('/trelloia_utf8"', '/trelloia_utf8_test"'), {
    mode: 0o600,
  });
console.log('PostgreSQL local na porta 55432. Ambiente criado se ausente. Pare com Ctrl+C.');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
