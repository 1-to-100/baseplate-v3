/*
  Warnings:

  - A unique constraint covering the columns `[domain]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[owner_id]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `domain` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `owner_id` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
update users set customer_id = null where customer_id is not null;
delete from customers where id > 0;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "domain" TEXT NOT NULL,
ADD COLUMN     "owner_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "customer_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "customers_domain_key" ON "customers"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "customers_owner_id_key" ON "customers"("owner_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
