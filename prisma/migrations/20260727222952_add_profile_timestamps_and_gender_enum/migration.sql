/*
  Warnings:

  - Added the required column `Updated` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Gender" ADD VALUE 'PREFER_NOT_TO_SAY';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "Updated" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
