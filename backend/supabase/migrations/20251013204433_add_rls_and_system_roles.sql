-- ============================================================================
-- Supabase RLS Migration - System Roles & Row Level Security
-- ============================================================================
-- This migration:
-- 1. Adds system_role column to roles table
-- 2. Creates default system roles (IDs 1-3)
-- 3. Creates helper functions for RLS policies
-- 4. Creates indexes for optimal performance
-- 5. Enables RLS on all tables
-- 6. Creates comprehensive RLS policies for all tables
-- ============================================================================

-- ============================================================================
-- PART 1: Schema Changes
-- ============================================================================

-- Add system_role column to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS system_role BOOLEAN DEFAULT false;

-- Insert default system roles
INSERT INTO roles (id, name, description, system_role, created_at, updated_at)
VALUES
  (1, 'System Administrator', 'Role with full system access and control', true, NOW(), NOW()),
  (2, 'Customer Success', 'Role focused on ensuring customer satisfaction and retention', true, NOW(), NOW()),
  (3, 'Customer Administrator', 'Role for managing customer-specific configurations and settings', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE 
SET 
  system_role = true,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Reset sequence to start from 100 for custom roles
SELECT setval('roles_id_seq', 100, false);

-- ============================================================================
-- PART 2: Helper Functions (SECURITY DEFINER for performance)
-- ============================================================================

-- Function to get current user's role ID
CREATE OR REPLACE FUNCTION get_user_role_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT role_id 
    FROM users 
    WHERE uid = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has system role
CREATE OR REPLACE FUNCTION has_system_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.uid = auth.uid()::text
    AND r.name = role_name
    AND r.system_role = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's customer ID
CREATE OR REPLACE FUNCTION get_user_customer_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT customer_id 
    FROM users 
    WHERE uid = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 3: Indexes for Optimal RLS Performance
-- ============================================================================
-- These indexes are CRITICAL for RLS performance!
-- Without them, RLS policies will cause sequential scans on large tables.

-- Index on users.uid for auth lookups (MOST CRITICAL)
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);

-- Index on users.role_id for role-based filtering
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Index on users.customer_id for customer-based filtering
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);

-- Index on customers.customer_success_id for CS filtering
CREATE INDEX IF NOT EXISTS idx_customers_customer_success_id ON customers(customer_success_id);

-- Index on roles.system_role for system role filtering
CREATE INDEX IF NOT EXISTS idx_roles_system_role ON roles(system_role);

-- Index on role_permissions for permission lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Index on notifications.user_id for user notification filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_users_customer_role ON users(customer_id, role_id);

-- ============================================================================
-- PART 4: Enable RLS on All Tables
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 5: Drop Existing Policies (for idempotency)
-- ============================================================================

-- Users table
DROP POLICY IF EXISTS users_select_system_admin ON users;
DROP POLICY IF EXISTS users_select_customer_success ON users;
DROP POLICY IF EXISTS users_select_customer_admin ON users;
DROP POLICY IF EXISTS users_select_self ON users;
DROP POLICY IF EXISTS users_insert_system_admin ON users;
DROP POLICY IF EXISTS users_insert_customer_success ON users;
DROP POLICY IF EXISTS users_insert_customer_admin ON users;
DROP POLICY IF EXISTS users_update_system_admin ON users;
DROP POLICY IF EXISTS users_update_customer_success ON users;
DROP POLICY IF EXISTS users_update_customer_admin ON users;
DROP POLICY IF EXISTS users_update_self ON users;
DROP POLICY IF EXISTS users_delete_system_admin ON users;
DROP POLICY IF EXISTS users_delete_customer_success ON users;
DROP POLICY IF EXISTS users_delete_customer_admin ON users;

-- Customers table
DROP POLICY IF EXISTS customers_select_system_admin ON customers;
DROP POLICY IF EXISTS customers_select_customer_success ON customers;
DROP POLICY IF EXISTS customers_select_customer_admin ON customers;
DROP POLICY IF EXISTS customers_insert_system_admin ON customers;
DROP POLICY IF EXISTS customers_update_system_admin ON customers;
DROP POLICY IF EXISTS customers_update_customer_success ON customers;
DROP POLICY IF EXISTS customers_update_customer_admin ON customers;
DROP POLICY IF EXISTS customers_delete_system_admin ON customers;

-- Roles table
DROP POLICY IF EXISTS roles_select_all ON roles;
DROP POLICY IF EXISTS roles_insert_system_admin ON roles;
DROP POLICY IF EXISTS roles_update_system_admin ON roles;
DROP POLICY IF EXISTS roles_delete_system_admin ON roles;

-- Permissions tables
DROP POLICY IF EXISTS permissions_select_all ON permissions;
DROP POLICY IF EXISTS permissions_all_system_admin ON permissions;
DROP POLICY IF EXISTS role_permissions_select_all ON role_permissions;
DROP POLICY IF EXISTS role_permissions_all_system_admin ON role_permissions;

-- Articles tables
DROP POLICY IF EXISTS articles_select_all ON articles;
DROP POLICY IF EXISTS articles_all_system_admin ON articles;
DROP POLICY IF EXISTS articles_manage_with_permissions ON articles;
DROP POLICY IF EXISTS article_categories_select_all ON article_categories;
DROP POLICY IF EXISTS article_categories_all_system_admin ON article_categories;
DROP POLICY IF EXISTS article_categories_manage_with_permissions ON article_categories;

-- Notifications tables
DROP POLICY IF EXISTS notifications_select_own ON notifications;
DROP POLICY IF EXISTS notifications_select_system_admin ON notifications;
DROP POLICY IF EXISTS notifications_insert_system ON notifications;
DROP POLICY IF EXISTS notifications_update_own ON notifications;
DROP POLICY IF EXISTS notifications_update_system_admin ON notifications;
DROP POLICY IF EXISTS notifications_delete_system_admin ON notifications;
DROP POLICY IF EXISTS notification_templates_select_all ON notification_templates;
DROP POLICY IF EXISTS notification_templates_all_system_admin ON notification_templates;

-- ============================================================================
-- PART 6: Create RLS Policies - USERS TABLE
-- ============================================================================
-- Note: All function calls are wrapped in SELECT for 99%+ performance improvement

-- SELECT Policies
CREATE POLICY users_select_system_admin
  ON users FOR SELECT
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

CREATE POLICY users_select_customer_success
  ON users FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Success')) AND
    customer_id = ANY(
      SELECT id FROM customers 
      WHERE customer_success_id = (
        SELECT id FROM users WHERE uid = (SELECT auth.uid()::text)
      )
    )
  );

CREATE POLICY users_select_customer_admin
  ON users FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  );

CREATE POLICY users_select_self
  ON users FOR SELECT
  TO authenticated
  USING (uid = (SELECT auth.uid()::text));

-- INSERT Policies
CREATE POLICY users_insert_system_admin
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT has_system_role('System Administrator')));

CREATE POLICY users_insert_customer_success
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT has_system_role('Customer Success')) AND
    customer_id = ANY(
      SELECT id FROM customers 
      WHERE customer_success_id = (
        SELECT id FROM users WHERE uid = (SELECT auth.uid()::text)
      )
    )
  );

CREATE POLICY users_insert_customer_admin
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  );

-- UPDATE Policies
CREATE POLICY users_update_system_admin
  ON users FOR UPDATE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

CREATE POLICY users_update_customer_success
  ON users FOR UPDATE
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Success')) AND
    customer_id = ANY(
      SELECT id FROM customers 
      WHERE customer_success_id = (
        SELECT id FROM users WHERE uid = (SELECT auth.uid()::text)
      )
    )
  )
  WITH CHECK (
    (SELECT has_system_role('Customer Success')) AND
    customer_id = ANY(
      SELECT id FROM customers 
      WHERE customer_success_id = (
        SELECT id FROM users WHERE uid = (SELECT auth.uid()::text)
      )
    )
  );

CREATE POLICY users_update_customer_admin
  ON users FOR UPDATE
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  )
  WITH CHECK (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  );

CREATE POLICY users_update_self
  ON users FOR UPDATE
  TO authenticated
  USING (uid = (SELECT auth.uid()::text))
  WITH CHECK (uid = (SELECT auth.uid()::text));

-- DELETE Policies
CREATE POLICY users_delete_system_admin
  ON users FOR DELETE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

CREATE POLICY users_delete_customer_success
  ON users FOR DELETE
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Success')) AND
    customer_id = ANY(
      SELECT id FROM customers 
      WHERE customer_success_id = (
        SELECT id FROM users WHERE uid = (SELECT auth.uid()::text)
      )
    )
  );

CREATE POLICY users_delete_customer_admin
  ON users FOR DELETE
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  );

-- ============================================================================
-- PART 7: Create RLS Policies - CUSTOMERS TABLE
-- ============================================================================

-- SELECT Policies
CREATE POLICY customers_select_system_admin
  ON customers FOR SELECT
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

CREATE POLICY customers_select_customer_success
  ON customers FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Success')) AND
    customer_success_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid()::text))
  );

CREATE POLICY customers_select_customer_admin
  ON customers FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Administrator')) AND
    id = (SELECT get_user_customer_id())
  );

-- INSERT Policies
CREATE POLICY customers_insert_system_admin
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- UPDATE Policies
CREATE POLICY customers_update_system_admin
  ON customers FOR UPDATE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

CREATE POLICY customers_update_customer_success
  ON customers FOR UPDATE
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Success')) AND
    customer_success_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid()::text))
  )
  WITH CHECK (
    (SELECT has_system_role('Customer Success')) AND
    customer_success_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid()::text))
  );

CREATE POLICY customers_update_customer_admin
  ON customers FOR UPDATE
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Administrator')) AND
    id = (SELECT get_user_customer_id())
  )
  WITH CHECK (
    (SELECT has_system_role('Customer Administrator')) AND
    id = (SELECT get_user_customer_id())
  );

-- DELETE Policies
CREATE POLICY customers_delete_system_admin
  ON customers FOR DELETE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

-- ============================================================================
-- PART 8: Create RLS Policies - ROLES TABLE
-- ============================================================================

-- SELECT Policies (everyone can read roles)
CREATE POLICY roles_select_all
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT Policies (only admins, only custom roles)
CREATE POLICY roles_insert_system_admin
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT has_system_role('System Administrator')) AND
    id >= 100
  );

-- UPDATE Policies (only admins, only custom roles)
CREATE POLICY roles_update_system_admin
  ON roles FOR UPDATE
  TO authenticated
  USING (
    (SELECT has_system_role('System Administrator')) AND
    id >= 100
  )
  WITH CHECK (
    (SELECT has_system_role('System Administrator')) AND
    id >= 100
  );

-- DELETE Policies (only admins, only custom roles)
CREATE POLICY roles_delete_system_admin
  ON roles FOR DELETE
  TO authenticated
  USING (
    (SELECT has_system_role('System Administrator')) AND
    id >= 100
  );

-- ============================================================================
-- PART 9: Create RLS Policies - PERMISSIONS & ROLE_PERMISSIONS TABLES
-- ============================================================================

-- Permissions table
CREATE POLICY permissions_select_all
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY permissions_all_system_admin
  ON permissions FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- Role permissions table
CREATE POLICY role_permissions_select_all
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY role_permissions_all_system_admin
  ON role_permissions FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- ============================================================================
-- PART 10: Create RLS Policies - ARTICLES & CATEGORIES TABLES
-- ============================================================================

-- Articles table
CREATE POLICY articles_select_all
  ON articles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY articles_all_system_admin
  ON articles FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

CREATE POLICY articles_manage_with_permissions
  ON articles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.uid = (SELECT auth.uid()::text)
      AND p.name LIKE 'Articles:%'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.uid = (SELECT auth.uid()::text)
      AND p.name LIKE 'Articles:%'
    )
  );

-- Article categories table
CREATE POLICY article_categories_select_all
  ON article_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY article_categories_all_system_admin
  ON article_categories FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

CREATE POLICY article_categories_manage_with_permissions
  ON article_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.uid = (SELECT auth.uid()::text)
      AND p.name LIKE 'Articles:%'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.uid = (SELECT auth.uid()::text)
      AND p.name LIKE 'Articles:%'
    )
  );

-- ============================================================================
-- PART 11: Create RLS Policies - NOTIFICATIONS & TEMPLATES TABLES
-- ============================================================================

-- Notifications table
CREATE POLICY notifications_select_own
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid()::text)));

CREATE POLICY notifications_select_system_admin
  ON notifications FOR SELECT
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

CREATE POLICY notifications_insert_system
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY notifications_update_own
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid()::text)))
  WITH CHECK (user_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid()::text)));

CREATE POLICY notifications_update_system_admin
  ON notifications FOR UPDATE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

CREATE POLICY notifications_delete_system_admin
  ON notifications FOR DELETE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

-- Notification templates table
CREATE POLICY notification_templates_select_all
  ON notification_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY notification_templates_all_system_admin
  ON notification_templates FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS is enabled
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND rowsecurity = true
    AND tablename IN (
      'users', 'customers', 'roles', 'permissions', 
      'role_permissions', 'articles', 'article_categories',
      'notifications', 'notification_templates'
    );
  
  RAISE NOTICE 'RLS enabled on % tables', table_count;
  
  IF table_count < 9 THEN
    RAISE WARNING 'Expected RLS on 9 tables, but only found on % tables', table_count;
  END IF;
END $$;

-- Check system roles exist
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM roles 
  WHERE system_role = true;
  
  RAISE NOTICE 'System roles created: %', role_count;
  
  IF role_count < 3 THEN
    RAISE WARNING 'Expected 3 system roles, but only found %', role_count;
  END IF;
END $$;

-- Check helper functions exist
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
    AND routine_name IN ('get_user_role_id', 'has_system_role', 'get_user_customer_id');
  
  RAISE NOTICE 'Helper functions created: %', func_count;
  
  IF func_count < 3 THEN
    RAISE WARNING 'Expected 3 helper functions, but only found %', func_count;
  END IF;
END $$;

-- Check indexes exist
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%';
  
  RAISE NOTICE 'Performance indexes created: %', index_count;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

