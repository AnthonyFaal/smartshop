/*
  Warnings:

  - You are about to drop the column `stock` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `ghana_card_back_url` on the `seller_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `ghana_card_number` on the `seller_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `is_location_verified` on the `seller_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `seller_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `seller_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `shop_address` on the `seller_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `shop_city` on the `seller_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `shop_region` on the `seller_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `is_verified` on the `stores` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StoreVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- DropIndex
DROP INDEX "stores_is_active_is_verified_idx";

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "stock",
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "seller_verifications" DROP COLUMN "ghana_card_back_url",
DROP COLUMN "ghana_card_number",
DROP COLUMN "is_location_verified",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "shop_address",
DROP COLUMN "shop_city",
DROP COLUMN "shop_region";

-- AlterTable
ALTER TABLE "stores" DROP COLUMN "is_verified",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "country" VARCHAR(100) NOT NULL DEFAULT 'Ghana',
ADD COLUMN     "latitude" DECIMAL(10,8),
ADD COLUMN     "longitude" DECIMAL(11,8),
ADD COLUMN     "region" VARCHAR(100),
ADD COLUMN     "verification_status" "StoreVerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by" UUID;

-- CreateIndex
CREATE INDEX "stores_verification_status_idx" ON "stores"("verification_status");

-- CreateIndex
CREATE INDEX "stores_is_active_verification_status_idx" ON "stores"("is_active", "verification_status");
