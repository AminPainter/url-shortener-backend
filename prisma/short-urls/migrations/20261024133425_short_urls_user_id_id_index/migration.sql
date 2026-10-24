-- CreateIndex
CREATE INDEX "short_urls_user_id_id_idx" ON "short_urls"("user_id", "id");

-- DropIndex
DROP INDEX "short_urls_user_id_idx";
