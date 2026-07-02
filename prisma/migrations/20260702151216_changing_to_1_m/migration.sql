/*
  Warnings:

  - Made the column `maxProducts` on table `subscription_offerings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "subscription_offerings" ALTER COLUMN "maxProducts" SET NOT NULL;
