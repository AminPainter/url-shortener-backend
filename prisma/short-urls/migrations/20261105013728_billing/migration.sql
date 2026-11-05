-- CreateEnum
CREATE TYPE "PaymentPartner" AS ENUM ('GLOMO');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'ACTIVE', 'PAUSED', 'HALTED', 'ACTION_REQUIRED', 'UNDER_REVIEW', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingPaymentSequence" AS ENUM ('FIRST', 'SUBSEQUENT');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED');

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "billing_subscription_id" BIGINT,
ADD COLUMN     "valid_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "billing_customers" (
    "user_id" BIGINT NOT NULL,
    "partner" "PaymentPartner" NOT NULL,
    "partner_customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("user_id","partner")
);

-- CreateTable
CREATE TABLE "billing_subscriptions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "partner" "PaymentPartner" NOT NULL,
    "partner_subscription_id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "BillingSubscriptionStatus" NOT NULL,
    "current_period_end" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "halt_reason" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payments" (
    "id" BIGSERIAL NOT NULL,
    "billing_subscription_id" BIGINT NOT NULL,
    "partner" "PaymentPartner" NOT NULL,
    "partner_payment_id" TEXT NOT NULL,
    "sequence" "BillingPaymentSequence" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "failure_code" TEXT,
    "failure_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" BIGSERIAL NOT NULL,
    "partner" "PaymentPartner" NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "payload" JSONB NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_partner_partner_customer_id_key" ON "billing_customers"("partner", "partner_customer_id");

-- CreateIndex
CREATE INDEX "billing_subscriptions_user_id_idx" ON "billing_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_partner_partner_subscription_id_key" ON "billing_subscriptions"("partner", "partner_subscription_id");

-- CreateIndex
CREATE INDEX "billing_payments_billing_subscription_id_idx" ON "billing_payments"("billing_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payments_partner_partner_payment_id_key" ON "billing_payments"("partner", "partner_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_partner_dedupe_key_key" ON "webhook_events"("partner", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_billing_subscription_id_key" ON "subscription_plans"("billing_subscription_id");

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_billing_subscription_id_fkey" FOREIGN KEY ("billing_subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_billing_subscription_id_fkey" FOREIGN KEY ("billing_subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_one_live_per_user_key" ON "billing_subscriptions"("user_id") WHERE "status" IN ('AUTHORIZED', 'ACTIVE', 'PAUSED', 'HALTED', 'ACTION_REQUIRED', 'UNDER_REVIEW');
