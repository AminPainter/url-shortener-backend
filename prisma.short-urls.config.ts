import { defineConfig, env } from 'prisma/config';

process.loadEnvFile();

const url = new URL(env('DATABASE_ADMIN_URL'));
url.searchParams.set('schema', 'shorturls');

export default defineConfig({
  schema: 'prisma/short-urls/schema.prisma',
  migrations: { path: 'prisma/short-urls/migrations' },
  datasource: { url: url.toString() },
});
