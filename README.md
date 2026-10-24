# CutItShort backend

NestJS monorepo: `apps/read-service` (redirects) and `apps/write-service` (`/api/*`), behind Kong.
The Nest apps run on the host; Postgres, Redis and Kong run in Docker.

## Run

```bash
cp .env.example .env
pnpm install
pnpm infra:up        # kong :9113 (admin :9114), postgres :9115, redis :9116
pnpm start:read      # :9111
pnpm start:write     # :9112

curl localhost:9113/health        # read-service via Kong
curl localhost:9113/api/health    # write-service via Kong
```

Gateway routes live in `infra/kong/kong.yml` (DB-less). Restart Kong after editing it: `docker compose restart kong`.
