-- CreateEnum
CREATE TYPE "LocationType" AS ENUM (
  'COUNTRY',
  'REGION',
  'CITY',
  'TOWN',
  'AREA',
  'DISTRICT',
  'SUBURB'
);

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "locationId" UUID;

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "parentId" UUID,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "country" TEXT NOT NULL DEFAULT 'Ghana',
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "locations"("slug");

-- CreateIndex
CREATE INDEX "locations_name_idx" ON "locations"("name");

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");

-- CreateIndex
CREATE INDEX "locations_region_idx" ON "locations"("region");

-- CreateIndex
CREATE INDEX "locations_parentId_idx" ON "locations"("parentId");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
