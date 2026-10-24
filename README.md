# CutItShort backend

NestJS monorepo: `apps/short-url-read-service` (redirects) and `apps/short-url-write-service` (`/api/*`), behind Kong.
The Nest apps run on the host; Postgres, Redis and Kong run in Docker.

## Run

```bash
cp .env.example .env
pnpm install
pnpm infra:up        # kong :9113 (admin :9114), postgres :9115, redis :9116
pnpm dev             # all apps in mprocs: read :9111, write :9112, auth :9119

curl localhost:9113/health        # short-url-read-service via Kong
curl localhost:9113/api/health    # short-url-write-service via Kong
curl localhost:9113/api/auth/health  # auth-service via Kong
```

One app on its own: `pnpm start:short-url-read`, `pnpm start:short-url-write` or `pnpm start:auth`.

Gateway routes live in `infra/kong/kong.yml` (DB-less). Restart Kong after editing it: `docker compose restart kong`.
