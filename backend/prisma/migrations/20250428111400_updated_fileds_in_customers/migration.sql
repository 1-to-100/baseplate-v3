/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `customers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "email" TEXT NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "customers_name_key" ON "customers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");
