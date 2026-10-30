CREATE TABLE "subscription_payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'GHS',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider_ref" VARCHAR(255) NOT NULL,
    "provider_data" JSONB,
    "failure_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_payments_provider_ref_key" ON "subscription_payments"("provider_ref");
CREATE INDEX "subscription_payments_user_id_status_idx" ON "subscription_payments"("user_id", "status");
CREATE INDEX "subscription_payments_created_at_idx" ON "subscription_payments"("created_at");
ALTER TABLE "conversation_participants" ADD COLUMN "last_email_at" TIMESTAMP(3);
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
