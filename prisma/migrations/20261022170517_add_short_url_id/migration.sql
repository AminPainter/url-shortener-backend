-- AlterTable
ALTER TABLE "ShortUrl" DROP CONSTRAINT "ShortUrl_pkey",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "ShortUrl_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "ShortUrl_shortCode_key" ON "ShortUrl"("shortCode");

