-- SmartShop pilot operating model: transparent marketplace fees, pickup codes,
-- campus delivery zones and auditable runner hand-offs.
CREATE TYPE "FulfillmentMethod" AS ENUM ('PICKUP', 'CAMPUS_DELIVERY');
CREATE TYPE "DeliveryStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'FAILED', 'CANCELLED');

ALTER TABLE "orders"
  ADD COLUMN "platform_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "seller_payout" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "pickup_code" VARCHAR(16),
  ADD COLUMN "fulfillment_method" "FulfillmentMethod" NOT NULL DEFAULT 'PICKUP';

CREATE UNIQUE INDEX "orders_pickup_code_key" ON "orders"("pickup_code");

CREATE TABLE "delivery_zones" (
  "id" UUID NOT NULL,
  "location_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "promised_minutes" INTEGER NOT NULL DEFAULT 60,
  "cutoff_hour" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_zones_location_id_key" UNIQUE ("location_id"),
  CONSTRAINT "delivery_zones_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "delivery_zones_is_active_idx" ON "delivery_zones"("is_active");

CREATE TABLE "delivery_tasks" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "zone_id" UUID NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'UNASSIGNED',
  "runner_id" UUID,
  "pickup_proof_url" VARCHAR(500),
  "delivery_proof_url" VARCHAR(500),
  "delivery_note" TEXT,
  "promised_by" TIMESTAMP(3) NOT NULL,
  "assigned_at" TIMESTAMP(3),
  "picked_up_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "delivery_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_tasks_order_id_key" UNIQUE ("order_id"),
  CONSTRAINT "delivery_tasks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "delivery_tasks_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "delivery_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "delivery_tasks_runner_id_fkey" FOREIGN KEY ("runner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "delivery_tasks_status_promised_by_idx" ON "delivery_tasks"("status", "promised_by");
CREATE INDEX "delivery_tasks_runner_id_status_idx" ON "delivery_tasks"("runner_id", "status");
CREATE INDEX "delivery_tasks_zone_id_status_idx" ON "delivery_tasks"("zone_id", "status");
