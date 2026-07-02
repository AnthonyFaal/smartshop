-- AlterTable
ALTER TABLE "seller_verifications" ADD COLUMN     "is_face_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_location_verified" BOOLEAN NOT NULL DEFAULT false;
