CREATE TYPE "SettlementStatus" AS ENUM ('HELD', 'AVAILABLE', 'PAID', 'BLOCKED', 'REVERSED');

CREATE TABLE "seller_settlements" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GHS',
  "status" "SettlementStatus" NOT NULL DEFAULT 'HELD',
  "available_at" TIMESTAMP(3) NOT NULL,
  "paid_at" TIMESTAMP(3),
  "paid_by" UUID,
  "provider_ref" VARCHAR(255),
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "seller_settlements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seller_settlements_order_id_key" UNIQUE ("order_id"),
  CONSTRAINT "seller_settlements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "seller_settlements_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "seller_settlements_seller_id_status_available_at_idx" ON "seller_settlements"("seller_id", "status", "available_at");
CREATE INDEX "seller_settlements_status_available_at_idx" ON "seller_settlements"("status", "available_at");
