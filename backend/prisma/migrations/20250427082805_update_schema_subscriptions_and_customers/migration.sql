-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'inactive', 'suspended');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "manager_id" INTEGER,
ADD COLUMN     "status" "CustomerStatus" NOT NULL DEFAULT 'inactive',
ADD COLUMN     "subscription_id" INTEGER;

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_name_key" ON "subscriptions"("name");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_subscription_id_idx" ON "customers"("subscription_id");

-- CreateIndex
CREATE INDEX "customers_manager_id_idx" ON "customers"("manager_id");

-- CreateIndex
CREATE INDEX "customers_created_at_idx" ON "customers"("created_at");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
