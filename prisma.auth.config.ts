import { defineConfig, env } from 'prisma/config';

process.loadEnvFile();

const url = new URL(env('DATABASE_ADMIN_URL'));
url.searchParams.set('schema', 'auth');

export default defineConfig({
  schema: 'prisma/auth/schema.prisma',
  migrations: { path: 'prisma/auth/migrations' },
  datasource: { url: url.toString() },
});
