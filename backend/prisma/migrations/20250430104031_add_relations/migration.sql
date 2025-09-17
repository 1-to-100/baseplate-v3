-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "customer_success_id" INTEGER;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_customer_success_id_fkey" FOREIGN KEY ("customer_success_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
