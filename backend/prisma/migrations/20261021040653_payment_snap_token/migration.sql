/*
  Warnings:

  - A unique constraint covering the columns `[orderId,provider]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Payment_orderId_idx";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "redirectUrl" TEXT,
ADD COLUMN     "snapToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_provider_key" ON "Payment"("orderId", "provider");
