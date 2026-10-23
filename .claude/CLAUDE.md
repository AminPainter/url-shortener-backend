# glomo-url-shortner-backend

High-scale URL shortener. NestJS 12 microservices in a Nest CLI monorepo, behind Kong. The frontend lives in a separate repo (`../glomo-url-shortner-frontend`) and only ever talks to Kong.

## Coding rules (mandatory)
- Write ZERO comments in code. No inline, block, JSDoc or TODO comments.
- Write the bare minimum code needed to finish the task. No speculative abstractions, helpers, options, layers or files "for later".
- Do not add dependencies, infra or features that the task does not require.
- Follow SOLID by default:
  - Single responsibility: controllers handle HTTP only (params, status codes, HTTP exceptions) and delegate to an `@Injectable()` service; services hold the logic and never throw HTTP exceptions.
  - Open/closed, Liskov, interface segregation: extend through new providers or modules rather than editing unrelated ones; keep service methods small and focused.
  - Dependency inversion: depend on injected providers through Nest DI, never `new` them up. Add an interface plus injection token only when a second implementation actually exists (bare-minimum rule wins over speculative abstraction).
- Match existing idiom:
  - ESM with extensionless relative imports (`moduleResolution: bundler`; Rspack bundles each app). `nest g` still emits `.js` suffixes, so strip them. Import libs via `@app/<name>`, never `../../libs/...`.
  - Fastify, not Express.
  - Config through `ConfigService.getOrThrow<T>()`.
  - Never use one-word variable or parameter names (`cached`, `row`, `url`, `res`, `config`), except `prisma` for `PrismaService`. Name what the value holds: `cachedLongUrl`, `shortUrl`, `longUrl`, `response`, `configService`.
  - Name every injected instance field after its type in camelCase: `private readonly redirectService: RedirectService`, `cache: Cache`. No shortened or pluralised names like `redirects`. Exception: `PrismaService` is always injected as `prisma`.
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
    - `@app/cache` (`RedisCacheModule`): Nest `CacheModule` on Redis via `@keyv/redis`; inject with `@Inject(CACHE_MANAGER) cache: Cache`. Owns the `short-url:` key namespace; TTL policy stays in the app.
    - `@app/logger` (`PinoLoggerModule`, `Logger`): nestjs-pino. Each app imports `PinoLoggerModule` and calls `app.useLogger(app.get(Logger))` with `bufferLogs: true`.
- Kong (DB-less) is the only gateway, configured in `infra/kong/kong.yml`:
  - Every endpoint gets its own explicit route: method plus an anchored regex path (`~/api/short-urls$`). No prefix or catch-all routes. Unrouted paths 404 at Kong.
  - Kong reaches the host apps through `host.docker.internal`.
  - After editing, run `docker compose restart kong`.
  - The only plugin is a global `opentelemetry`. It sends traces to otel-lgtm and injects W3C `traceparent` upstream.
- Services talk HTTP/REST to Kong and never call each other.
- Each app listens on `0.0.0.0` so Kong can reach it from Docker.
- Builds: each app is bundled by Rspack (`"builder": "rspack"` in `nest-cli.json`) into `dist/apps/<app>/main.js`.

## Runtime
- Nest apps run natively on the host.
- Postgres, Redis, Kong and otel-lgtm (Grafana, Tempo, Loki, Prometheus) run in Docker Compose.

Host ports start at 9111:

| Port | What |
|---|---|
| 9111 | read-service (`READ_SERVICE_PORT`) |
| 9112 | write-service (`WRITE_SERVICE_PORT`) |
| 9113 | Kong proxy, the public entry point |
| 9114 | Kong admin (localhost only) |
| 9115 | Postgres (`DATABASE_URL`, db `url_shortener`) |
| 9116 | Redis (`REDIS_URL`, `allkeys-lru`, 256mb) |
| 9117 | Grafana UI (localhost only, admin/admin) |
| 9118 | OTLP HTTP into otel-lgtm (localhost only, `OTEL_EXPORTER_OTLP_ENDPOINT`) |

New host ports continue sequentially from 9119.

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

## Observability
- OpenTelemetry starts from `instrumentation.mjs` at the repo root, a plain ESM preload outside Rspack.
  - Rspack emits node_modules as hoisted static ESM imports, so the SDK cannot start inside the bundle.
  - `nest-cli.json` sets a per-project `exec`: `OTEL_SERVICE_NAME=<app> node --env-file=.env --import ./instrumentation.mjs`.
  - Do not use `NODE_OPTIONS`, which would also load the SDK into the Nest CLI and Rspack.
  - Edits to the preload need an app restart; watch mode does not reload it.
- Instrumentations:
  - http.
  - `@fastify/otel` (hooks off, handler on).
  - pg (bind params never recorded).
  - redis (statement is `<CMD> <key>` only).
  - pino (trace_id/span_id on every log line, plus OTLP log export).
  - `@opentelemetry/instrumentation-nestjs-core` is a no-op on Nest 12; do not add it.
- Every package the preload imports must be a direct dependency, because of pnpm's strict layout.
- Pin the OTel set together. `@opentelemetry/api` must satisfy `@opentelemetry/sdk-node`'s peer range.
- Never put long URLs, query strings or request bodies in spans, logs or metric labels.
  - The preload redacts `url.query` and strips the query from the Fastify `url.path`.
  - `@app/logger` serializes only `req.id/method/path` and `res.statusCode`, so the 302 `Location` header is never logged.
- Health routes are excluded from traces and request logs.
- Tests run without the preload, so they send no telemetry.

## Current state and decisions
- Done: monorepo skeleton, Fastify, `@nestjs/config`, a health endpoint per app, Docker infra, Kong routing, Prisma client wiring, `ShortUrl` model (`id` BigInt PK, `shortCode` unique, `longUrl`, `createdAt`), `POST /api/short-urls` persisting rows, Redis cache-aside on `GET /:code` in read-service.
- Not yet: do not add these unless the task explicitly asks for them.
  - BullMQ or any other broker.
  - Auth.
  - Kong plugins other than `opentelemetry`.
  - App Dockerfiles and CI.
- Planned data model additions to `ShortUrl`:
  - `shortCode` also holds custom aliases.
  - `expiresAt?`.
  - `userId?`.
  - Plus a `User` table.
- Planned behaviour:
  - Short codes: random 7-character base62, no retry on a unique-key clash (a clash returns 500).
  - Redirects are 302, not 301, so clicks stay measurable.
  - Redis cache (cache-aside in `RedirectService`, not `CacheInterceptor`):
    - Key `short-url:<code>`; Keyv stores `{"value":<longUrl>,"expires":...}`.
    - Found: TTL 24h. Once `expiresAt` exists, TTL is the smaller of 24h and the time left until `expiresAt`.
    - Not found: not cached, every miss goes to Postgres. `undefined` from `get` means ask the DB.
    - Fails open to Postgres when Redis is down (`disableOfflineQueue`, `throwOnConnectError: false`).
    - No in-process L1 tier and no TTL jitter, by decision.
    - Planned: write-service imports `RedisCacheModule` and deletes the key when a link is deleted or changed.

## TODO
- Add a global exception filter (`APP_FILTER`) to each app, shared through a lib, that translates domain exceptions into HTTP responses.
- Make the service layer always throw domain exceptions (e.g. `ShortUrlNotFoundError`), never return `null` for "not found" and never throw Nest HTTP exceptions. Only the exception filter translates them to HTTP. Today `RedirectService.resolve` returns `null` and `RedirectController` throws `NotFoundException`; migrate it when the filter lands.
- Figure out test organisation for this Nest microservices monorepo. Today each app has a single `test/app.e2e-spec.ts` covering every route, and there are no unit specs. Decide: one e2e file per feature or controller, whether services get `*.spec.ts` unit tests next to the source, where cross-service flows through Kong are tested, and shared test bootstrap/fixtures (app setup, random short codes, DB and Redis cleanup).
- Monitor the health of every service and its dependencies. Keep `/health` as liveness only; add a readiness endpoint per app (with its own Kong route) that pings Postgres (503 when down) and reports Redis as degraded without failing readiness. Wire it into whatever monitoring/alerting we adopt.
- Make sure Postgres is connected before an app serves users: today Prisma and Redis both connect lazily on the first request. Connect and verify Postgres during bootstrap (fail startup if unreachable) before `app.listen`. Redis must not block startup (it is a cache; fail open), but warm its connection at boot and log a warning when it is down.

## Prisma
- Prisma ORM 7, pinned (`prisma@7.10.1`). npm `latest` is the Prisma 8 RC with a different API; never install unpinned.
- Schema `prisma/schema.prisma`, config `prisma.config.ts` (loads `.env` via `process.loadEnvFile()`).
- `prisma-client` generator writes to `libs/prisma/src/generated/prisma` (gitignored, lint-ignored). `postinstall` runs `prisma generate`.
- Driver adapter `@prisma/adapter-pg`. Prisma connects lazily, so tests boot without a DB, but write-service e2e needs `pnpm infra:up` and applied migrations.
- After schema changes: `pnpm exec prisma generate` (`migrate dev` does not regenerate).
- `migrate dev` aborts in non-interactive shells when it raises a warning. Generate the SQL with `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`, save it as `prisma/migrations/<UTC timestamp>_<name>/migration.sql`, then `pnpm exec prisma migrate deploy`.

## Cache packages
- Pinned set: `cache-manager@7.2.9`, `@keyv/redis@5.1.6`, `keyv@^5.6.0`. `@keyv/redis@6` needs keyv 6 and clashes with cache-manager 7; do not upgrade one alone.

## Gotchas
- Host port 6379 may belong to another project's Redis. `REDIS_URL` must point at 9116.
- Claude cannot read or edit `.env*` files (permission deny rule). Ask the user to change them. Keys: `READ_SERVICE_PORT`, `WRITE_SERVICE_PORT`, `DATABASE_URL`, `REDIS_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_RESOURCE_ATTRIBUTES`.
- After changing `.env`, restart the service; watch mode does not reload env.
- A Kong 502 means the target service is not running or is on the wrong port.
