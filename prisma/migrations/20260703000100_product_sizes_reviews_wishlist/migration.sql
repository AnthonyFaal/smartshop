-- Add product size options and preserve selected size through cart and order flows.
ALTER TABLE "products" ADD COLUMN "sizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "cart_items" ADD COLUMN "selected_size" VARCHAR(40) NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "cart_items_cart_id_product_id_key";
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_selected_size_key" ON "cart_items"("cart_id", "product_id", "selected_size");

ALTER TABLE "order_items" ADD COLUMN "selected_size" VARCHAR(40);

