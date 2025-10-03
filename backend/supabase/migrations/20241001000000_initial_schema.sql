-- Migration: Initial Schema from Prisma
-- Created: 2024-10-01
-- Description: Creates the complete initial database schema based on the current Prisma schema
-- 
-- This migration creates all tables, enums, indexes, and relationships
-- to match the existing Prisma schema structure.

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Customer status enum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'inactive', 'suspended');

-- Action enum for permissions
CREATE TYPE "Action" AS ENUM ('manage', 'create', 'read', 'update', 'delete');

-- Notification type enum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'IN_APP');

-- ============================================================================
-- TABLES (in dependency order)
-- ============================================================================

-- Subscriptions table (independent)
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Roles table (independent)
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- Permissions table (independent)
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- Role permissions junction table
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);

-- Managers table (independent)
CREATE TABLE "managers" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "managers_pkey" PRIMARY KEY ("id")
);

-- Users table (references roles and managers)
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "uid" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN DEFAULT false,
    "first_name" TEXT,
    "last_name" TEXT,
    "avatar" TEXT,
    "phone_number" TEXT,
    "customer_id" INTEGER,
    "role_id" INTEGER,
    "manager_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "is_superadmin" BOOLEAN DEFAULT false,
    "is_customer_success" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Customers table (references users, subscriptions, managers)
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "status" "CustomerStatus" DEFAULT 'inactive',
    "subscription_id" INTEGER,
    "manager_id" INTEGER,
    "customer_success_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- User one time codes table
CREATE TABLE "user_one_time_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "is_used" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "user_one_time_codes_pkey" PRIMARY KEY ("id")
);

-- API logs table
CREATE TABLE "api_logs" (
    "id" SERIAL NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "request_body" TEXT,
    "headers" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);

-- Article categories table (references customers and users)
CREATE TABLE "article_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subcategory" TEXT,
    "about" VARCHAR(256),
    "icon" VARCHAR(256),
    "customer_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

-- Articles table (references article categories, customers, and users)
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "subcategory" TEXT,
    "customer_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "status" TEXT DEFAULT 'draft',
    "content" TEXT,
    "video_url" TEXT,
    "views_number" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- Notification templates table (references customers)
CREATE TABLE "notification_templates" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "message" TEXT,
    "comment" VARCHAR(100),
    "type" "NotificationType"[] NOT NULL,
    "channel" VARCHAR(256) NOT NULL,
    "customer_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- Notifications table (references users, customers, notification templates)
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "customer_id" INTEGER,
    "sender_id" INTEGER,
    "type" "NotificationType" NOT NULL,
    "title" TEXT,
    "message" TEXT,
    "template_id" INTEGER,
    "metadata" JSONB,
    "channel" VARCHAR(256),
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "read_at" TIMESTAMPTZ,
    "generated_by" VARCHAR(256),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

-- Unique constraints for subscriptions
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_name_key" UNIQUE ("name");

-- Unique constraints for permissions
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");

-- Unique constraints for users
ALTER TABLE "users" ADD CONSTRAINT "users_uid_key" UNIQUE ("uid");
ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");

-- Unique constraints for customers
ALTER TABLE "customers" ADD CONSTRAINT "customers_name_key" UNIQUE ("name");
ALTER TABLE "customers" ADD CONSTRAINT "customers_email_key" UNIQUE ("email");
ALTER TABLE "customers" ADD CONSTRAINT "customers_domain_key" UNIQUE ("domain");
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_key" UNIQUE ("owner_id");

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Role permissions foreign keys
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" 
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" 
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Users foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_customer_id_fkey" 
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" 
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" 
    FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Customers foreign keys
ALTER TABLE "customers" ADD CONSTRAINT "customers_subscription_id_fkey" 
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "customers" ADD CONSTRAINT "customers_manager_id_fkey" 
    FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_fkey" 
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "customers" ADD CONSTRAINT "customers_customer_success_id_fkey" 
    FOREIGN KEY ("customer_success_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- User one time codes foreign key
ALTER TABLE "user_one_time_codes" ADD CONSTRAINT "user_one_time_codes_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Article categories foreign keys
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_customer_id_fkey" 
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Articles foreign keys
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_fkey" 
    FOREIGN KEY ("category_id") REFERENCES "article_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "articles" ADD CONSTRAINT "articles_customer_id_fkey" 
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "articles" ADD CONSTRAINT "articles_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Notification templates foreign key
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_customer_id_fkey" 
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Notifications foreign keys
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_fkey" 
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_fkey" 
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_fkey" 
    FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Customer indexes
CREATE INDEX "idx_customers_status" ON "customers"("status");
CREATE INDEX "idx_customers_subscription_id" ON "customers"("subscription_id");
CREATE INDEX "idx_customers_manager_id" ON "customers"("manager_id");
CREATE INDEX "idx_customers_created_at" ON "customers"("created_at");

-- User indexes
CREATE INDEX "idx_users_deleted_at" ON "users"("deleted_at");

-- Notification indexes
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");
CREATE INDEX "idx_notifications_sender_id" ON "notifications"("sender_id");
CREATE INDEX "idx_notifications_customer_id" ON "notifications"("customer_id");
CREATE INDEX "idx_notifications_type" ON "notifications"("type");
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");
CREATE INDEX "idx_notifications_is_read" ON "notifications"("is_read");
CREATE INDEX "idx_notifications_channel" ON "notifications"("channel");

-- Notification template indexes
CREATE INDEX "idx_notification_templates_title" ON "notification_templates"("title");
CREATE INDEX "idx_notification_templates_type" ON "notification_templates"("type");
CREATE INDEX "idx_notification_templates_channel" ON "notification_templates"("channel");
CREATE INDEX "idx_notification_templates_customer_id" ON "notification_templates"("customer_id");
CREATE INDEX "idx_notification_templates_created_at" ON "notification_templates"("created_at");

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT FIELDS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at fields
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON "subscriptions" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON "roles" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_managers_updated_at 
    BEFORE UPDATE ON "managers" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON "users" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON "customers" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_categories_updated_at 
    BEFORE UPDATE ON "article_categories" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at 
    BEFORE UPDATE ON "articles" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON "notification_templates" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================