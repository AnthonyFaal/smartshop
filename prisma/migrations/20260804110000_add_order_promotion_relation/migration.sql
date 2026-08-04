ALTER TABLE "orders" ADD COLUMN "promotion_id" UUID;

CREATE INDEX "orders_promotion_id_idx" ON "orders"("promotion_id");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_promotion_id_fkey"
  FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
