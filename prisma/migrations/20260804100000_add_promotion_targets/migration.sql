DO $$ BEGIN
  CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "promotions" (
  "id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "store_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "type" "PromotionType" NOT NULL,
  "value" DECIMAL(12,2) NOT NULL,
  "min_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "max_discount" DECIMAL(12,2),
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "usage_limit" INTEGER,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "promotions_store_id_code_key" ON "promotions"("store_id", "code");
CREATE INDEX IF NOT EXISTS "promotions_seller_id_is_active_idx" ON "promotions"("seller_id", "is_active");
CREATE INDEX IF NOT EXISTS "promotions_store_id_is_active_idx" ON "promotions"("store_id", "is_active");
CREATE INDEX IF NOT EXISTS "promotions_code_is_active_idx" ON "promotions"("code", "is_active");
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "promotion_products" (
  "promotion_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotion_products_pkey" PRIMARY KEY ("promotion_id", "product_id"),
  CONSTRAINT "promotion_products_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "promotion_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "promotion_products_product_id_idx" ON "promotion_products"("product_id");
