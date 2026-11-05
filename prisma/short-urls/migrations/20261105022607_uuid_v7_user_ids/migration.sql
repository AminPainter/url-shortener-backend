-- Not deployed yet: data owned by the old bigint user ids is discarded; links keep working without an owner.
TRUNCATE TABLE "webhook_events", "billing_payments", "subscription_plans", "billing_subscriptions", "billing_customers";

-- AlterTable
ALTER TABLE "billing_customers" DROP CONSTRAINT "billing_customers_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("user_id", "partner");

-- AlterTable
ALTER TABLE "billing_subscriptions" DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "short_urls" DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "subscription_plans" DROP CONSTRAINT "subscription_plans_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("user_id");

-- CreateIndex
CREATE INDEX "billing_subscriptions_user_id_idx" ON "billing_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "short_urls_user_id_id_idx" ON "short_urls"("user_id", "id");


-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_one_live_per_user_key" ON "billing_subscriptions"("user_id") WHERE "status" IN ('AUTHORIZED', 'ACTIVE', 'PAUSED', 'HALTED', 'ACTION_REQUIRED', 'UNDER_REVIEW');
