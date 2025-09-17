-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_customer_success" BOOLEAN DEFAULT false,
ADD COLUMN     "is_superadmin" BOOLEAN DEFAULT false;
