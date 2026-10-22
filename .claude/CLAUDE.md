# glomo-url-shortner-backend

High-scale URL shortener. NestJS 12 microservices in a Nest CLI monorepo, behind Kong. The frontend lives in a separate repo (`../glomo-url-shortner-frontend`) and only ever talks to Kong.

## Coding rules (mandatory)
- Write ZERO comments in code. No inline, block, JSDoc or TODO comments.
- Write the bare minimum code needed to finish the task. No speculative abstractions, helpers, options, layers or files "for later".
- Do not add dependencies, infra or features that the task does not require.
- Match existing idiom:
  - ESM with extensionless relative imports (`moduleResolution: bundler`; Rspack bundles each app). `nest g` still emits `.js` suffixes, so strip them. Import libs via `@app/<name>`, never `../../libs/...`.
  - Fastify, not Express.
  - Config through `ConfigService.getOrThrow<T>()`.
- Avoid mocks in tests. Exercise real code paths against the Docker Compose infra (Postgres, Redis, Kong). Mock only what cannot run locally, such as third-party external APIs, and clean up any data a test creates.
- pnpm only. Never use npm or yarn, even when a tool's output suggests an `npm install` command.

## Architecture
- `apps/read-service`: redirect hot path, `GET /:code` → 302. Routes have no prefix.
- `apps/write-service`: everything under the global prefix `/api`.
- `libs/`: shared code, one Nest library per concern. Single root `package.json`; libs are path aliases bundled into each app, not workspace packages.
  - Shared contracts and infra plumbing only.
  - Never business logic, and never one service importing another service's internals.
  - One concern per lib, named for what it does. No catch-all `common`/`shared` lib.
  - Public API is `src/index.ts` only. Libs never import apps.
  - Create with `pnpm exec nest g library <name>` (accept the `@app` prefix). Then:
    - Strip `.js` suffixes from generated imports.
    - Delete the generated module/service/spec when the lib needs no DI.
    - Remove the deep `@app/<name>/*` alias it adds to `tsconfig.json`.
    - If the lib uses decorators, add its `tsconfig.lib.json` to the root `tsconfig.json` `references`, or Vitest leaves the decorators untransformed (SyntaxError).
  - Current libs:
    - `@app/validation` (`ZodValidationPipe`: `@Body(new ZodValidationPipe(schema))`).
    - `@app/prisma` (`PrismaModule`, `PrismaService`), imported by both apps.
- Kong (DB-less) is the only gateway, configured in `infra/kong/kong.yml`:
  - Every endpoint gets its own explicit route: method plus an anchored regex path (`~/api/short-urls$`). No prefix or catch-all routes. Unrouted paths 404 at Kong.
  - Kong reaches the host apps through `host.docker.internal`.
  - After editing, run `docker compose restart kong`.
- Services talk HTTP/REST to Kong and never call each other.
- Each app listens on `0.0.0.0` so Kong can reach it from Docker.
- Builds: each app is bundled by Rspack (`"builder": "rspack"` in `nest-cli.json`) into `dist/apps/<app>/main.js`.

## Runtime
- Nest apps run natively on the host.
- Postgres, Redis and Kong run in Docker Compose.

Host ports start at 9111:

| Port | What |
|---|---|
| 9111 | read-service (`READ_SERVICE_PORT`) |
| 9112 | write-service (`WRITE_SERVICE_PORT`) |
| 9113 | Kong proxy, the public entry point |
| 9114 | Kong admin (localhost only) |
| 9115 | Postgres (`DATABASE_URL`, db `url_shortener`) |
| 9116 | Redis (`REDIS_URL`, `allkeys-lru`, 256mb) |

New host ports continue sequentially from 9117.

## Commands
```
pnpm infra:up / pnpm infra:down
pnpm start:read / pnpm start:write
pnpm build read-service | write-service
pnpm test        # unit, *.spec.ts
pnpm test:e2e    # *.e2e-spec.ts, using Fastify app.inject
pnpm lint        # oxlint --type-aware
```

Health checks through Kong:
- `curl localhost:9113/health` (read-service)
- `curl localhost:9113/api/health` (write-service)

## Current state and decisions
- Done: monorepo skeleton, Fastify, `@nestjs/config`, a health endpoint per app, Docker infra, Kong routing, Prisma client wiring, `ShortUrl` model (`id` BigInt PK, `shortCode` unique, `longUrl`, `createdAt`), `POST /api/short-urls` persisting rows.
- Not yet: do not add these unless the task explicitly asks for them.
  - BullMQ or any other broker.
  - Auth.
  - Kong plugins.
  - App Dockerfiles and CI.
- Planned data model additions to `ShortUrl`:
  - `shortCode` also holds custom aliases.
  - `expiresAt?`.
  - `userId?`.
  - Plus a `User` table.
- Planned behaviour:
  - Short codes: random 7-character base62, no retry on a unique-key clash (a clash returns 500).
  - Redirects are 302, not 301, so clicks stay measurable.
  - Redis is used cache-aside in read-service:
    - TTL is the smaller of the default and the time left until `expiresAt`.
    - Misses are cached too, with a short TTL.
    - write-service deletes the cache key when a link is deleted or changed.

## Prisma
- Prisma ORM 7, pinned (`prisma@7.10.1`). npm `latest` is the Prisma 8 RC with a different API; never install unpinned.
- Schema `prisma/schema.prisma`, config `prisma.config.ts` (loads `.env` via `process.loadEnvFile()`).
- `prisma-client` generator writes to `libs/prisma/src/generated/prisma` (gitignored, lint-ignored). `postinstall` runs `prisma generate`.
- Driver adapter `@prisma/adapter-pg`. Prisma connects lazily, so tests boot without a DB, but write-service e2e needs `pnpm infra:up` and applied migrations.
- After schema changes: `pnpm exec prisma generate` (`migrate dev` does not regenerate).
- `migrate dev` aborts in non-interactive shells when it raises a warning. Generate the SQL with `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`, save it as `prisma/migrations/<UTC timestamp>_<name>/migration.sql`, then `pnpm exec prisma migrate deploy`.

## Gotchas
- Claude cannot read or edit `.env*` files (permission deny rule). Ask the user to change them. Keys: `READ_SERVICE_PORT`, `WRITE_SERVICE_PORT`, `DATABASE_URL`, `REDIS_URL`.
- After changing `.env`, restart the service; watch mode does not reload env.
- A Kong 502 means the target service is not running or is on the wrong port.
