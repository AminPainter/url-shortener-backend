-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "shorturls";

-- CreateTable
CREATE TABLE "short_urls" (
    "id" BIGSERIAL NOT NULL,
    "short_code" TEXT NOT NULL,
    "long_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" BIGINT,

    CONSTRAINT "short_urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "short_urls_short_code_key" ON "short_urls"("short_code");

-- CreateIndex
CREATE INDEX "short_urls_user_id_idx" ON "short_urls"("user_id");

-- Keep the service roles out of the migration history
REVOKE ALL ON "shorturls"."_prisma_migrations" FROM shorturls_writer, shorturls_reader;
