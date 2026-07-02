-- CreateTable
CREATE TABLE "subscription_offerings" (
    "id" UUID NOT NULL,
    "tier" "SubscriptionPlan" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "version" VARCHAR(60) NOT NULL,
    "priceGhs" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maxProducts" INTEGER NOT NULL,
    "aiTier" VARCHAR(50) NOT NULL,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "promotions" BOOLEAN NOT NULL DEFAULT false,
    "multiStore" BOOLEAN NOT NULL DEFAULT false,
    "teamManagement" BOOLEAN NOT NULL DEFAULT false,
    "apiAccess" BOOLEAN NOT NULL DEFAULT false,
    "freeTrialDays" INTEGER NOT NULL DEFAULT 0,
    "aiDailyRequests" INTEGER NOT NULL DEFAULT 0,
    "aiMaxTokensPerRequest" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_offerings_tier_is_active_idx" ON "subscription_offerings"("tier", "is_active");

-- CreateIndex
CREATE INDEX "subscription_offerings_created_at_idx" ON "subscription_offerings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_offerings_tier_version_key" ON "subscription_offerings"("tier", "version");
