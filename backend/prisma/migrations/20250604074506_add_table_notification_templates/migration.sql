-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "sender_id" INTEGER,
ADD COLUMN     "template_id" INTEGER,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "message" DROP NOT NULL;

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "message" TEXT,
    "comment" VARCHAR(100),
    "type" "NotificationType"[],
    "channel" VARCHAR(256) NOT NULL,
    "customer_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_templates_title_idx" ON "notification_templates"("title");

-- CreateIndex
CREATE INDEX "notification_templates_type_idx" ON "notification_templates"("type");

-- CreateIndex
CREATE INDEX "notification_templates_channel_idx" ON "notification_templates"("channel");

-- CreateIndex
CREATE INDEX "notification_templates_customer_id_idx" ON "notification_templates"("customer_id");

-- CreateIndex
CREATE INDEX "notification_templates_created_at_idx" ON "notification_templates"("created_at");

-- CreateIndex
CREATE INDEX "notifications_sender_id_idx" ON "notifications"("sender_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
