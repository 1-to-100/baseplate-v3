# Supabase Row Level Security (RLS) Migration Guide

## 🎯 Overview

This guide provides a complete, step-by-step migration plan to implement Row Level Security (RLS) in your Supabase database, transitioning from boolean flags (`is_superadmin`, `is_customer_success`) to a unified role-based authorization system.

**What This Achieves:**
- ✅ Database-level security with RLS policies
- ✅ 99%+ query performance with proper optimization
- ✅ Unified role-based authorization (System Admin, Customer Success, Customer Admin)
- ✅ Customer data isolation
- ✅ Scalable permission management

---

## ⚠️ Critical Performance Rules (MUST FOLLOW!)

**Failing to follow these rules will result in 99% slower queries!**

### 1. Wrap All Function Calls in SELECT
```sql
-- ❌ WRONG (calls function on every row)
USING (has_system_role('System Administrator'))

-- ✅ CORRECT (calls function once per query)
USING ((SELECT has_system_role('System Administrator')))
```

### 2. Always Add TO Clause
```sql
-- ❌ WRONG
CREATE POLICY my_policy ON users FOR SELECT
USING (condition);

-- ✅ CORRECT
CREATE POLICY my_policy ON users FOR SELECT
TO authenticated
USING (condition);
```

### 3. Wrap auth.uid() Calls
```sql
-- ❌ WRONG
USING (user_id = auth.uid())

-- ✅ CORRECT
USING (user_id = (SELECT auth.uid()))
```

### 4. Add Explicit Filters in Application Code
```typescript
// ❌ WRONG - Only relies on RLS
const { data } = await supabase.from('users').select();

// ✅ CORRECT - Adds explicit filter
const { data } = await supabase
  .from('users')
  .select()
  .eq('customer_id', customerId);
```

**Expected Performance Gains:**
- Function wrapping: **99.9% faster** ⚡
- TO clause: **99.78% faster** ⚡
- Query filters: **95% faster** ⚡

---

## 📋 Implementation Checklist

### Phase 1: Database Migration ✅ COMPLETE
- [x] Create migration file
- [x] Add system_role column
- [x] Insert system roles (IDs 1-3)
- [x] Create helper functions
- [x] Create indexes
- [x] Enable RLS on all tables
- [x] Create RLS policies
- [x] Apply migration
- [x] Verify with test queries (SQL file created)

### Phase 2: Backend Code Updates
- [x] Create SystemRoles decorator
- [x] Create system roles constants (SYSTEM_ROLES, SYSTEM_ROLE_IDS)
- [x] Create SystemRoleGuard (with constants)
- [x] Update PermissionGuard (with constants)
- [x] Update RequireSuperuserGuard (with constants)
- [x] Update OutputUserDto (add role field)
- [ ] Update RolesService
- [ ] Update RolesController
- [ ] Add explicit filters to all services
- [x] Create RoleMigrationService (with constants)

### Phase 3: Data Migration
- [ ] Run role migration service
- [ ] Verify all users have correct roles
- [ ] Test with sample users

### Phase 4: Frontend Updates
- [ ] Update type definitions
- [ ] Create utility functions
- [ ] Replace boolean flag checks

### Phase 5: Testing & Validation
- [ ] Test each role's access
- [ ] Verify performance with EXPLAIN ANALYZE
- [ ] Run all tests
- [ ] Load testing

### Phase 6: Cleanup & Deployment
- [ ] Remove boolean columns
- [ ] Regenerate types
- [ ] Deploy to staging
- [ ] Deploy to production

---

## 🗄️ Phase 1: Database Migration

### Step 1.1: Create Migration File

```bash
cd backend/supabase/migrations
touch $(date +%Y%m%d%H%M%S)_add_rls_and_system_roles.sql
```

### Step 1.2: Migration SQL Script

Copy this complete SQL script into your migration file:

```sql
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
    WHERE uid = auth.uid()
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
    WHERE u.uid = auth.uid() 
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
    WHERE uid = auth.uid()
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
        SELECT id FROM users WHERE uid = (SELECT auth.uid())
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
  USING (uid = (SELECT auth.uid()));

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
        SELECT id FROM users WHERE uid = (SELECT auth.uid())
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
        SELECT id FROM users WHERE uid = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    (SELECT has_system_role('Customer Success')) AND
    customer_id = ANY(
      SELECT id FROM customers 
      WHERE customer_success_id = (
        SELECT id FROM users WHERE uid = (SELECT auth.uid())
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
  USING (uid = (SELECT auth.uid()))
  WITH CHECK (uid = (SELECT auth.uid()));

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
        SELECT id FROM users WHERE uid = (SELECT auth.uid())
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
    customer_success_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid()))
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
    customer_success_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid()))
  )
  WITH CHECK (
    (SELECT has_system_role('Customer Success')) AND
    customer_success_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid()))
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
      WHERE u.uid = (SELECT auth.uid())
      AND p.name LIKE 'Articles:%'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.uid = (SELECT auth.uid())
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
      WHERE u.uid = (SELECT auth.uid())
      AND p.name LIKE 'Articles:%'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.uid = (SELECT auth.uid())
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
  USING (user_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid())));

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
  USING (user_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid())))
  WITH CHECK (user_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid())));

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
```

### Step 1.3: Apply Migration

#### Development/Local:
```bash
cd backend
supabase db push --dry-run  # Preview changes
supabase db push            # Apply migration
```

#### Staging:
```bash
cd backend
./supabase/scripts/migrate.sh staging true   # Dry run
./supabase/scripts/migrate.sh staging        # Apply
```

#### Production:
```bash
cd backend
./supabase/scripts/migrate.sh production true  # Dry run
./supabase/scripts/migrate.sh production       # Apply
```

### Step 1.4: Verify Migration

Run these queries in Supabase SQL Editor:

```sql
-- 1. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'customers', 'roles', 'permissions', 'articles', 'notifications');

-- Expected: All tables should show rowsecurity = true

-- 2. Verify system roles exist
SELECT id, name, system_role FROM roles WHERE system_role = true ORDER BY id;

-- Expected:
-- 1 | System Administrator | true
-- 2 | Customer Success     | true
-- 3 | Customer Administrator | true

-- 3. Verify helper functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_role_id', 'has_system_role', 'get_user_customer_id');

-- Expected: 3 functions of type FUNCTION

-- 4. Verify indexes exist
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected: Multiple indexes starting with idx_

-- 5. Verify policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: Multiple policies for each table

-- 6. Test a policy
EXPLAIN ANALYZE SELECT * FROM users LIMIT 1;

-- Look for: InitPlan (indicates function is cached - GOOD!)
```

---

## 💻 Phase 2: Backend Code Updates

### Step 2.1: Create New Files

#### Create: `backend/src/common/constants/system-roles.ts`

```typescript
/**
 * System Role Constants
 * 
 * These constants define the three system roles that are created during migration.
 * System roles have IDs 1-3 and cannot be modified or deleted.
 * Custom roles created by users will have IDs >= 100.
 */

export const SYSTEM_ROLES = {
  SYSTEM_ADMINISTRATOR: 'System Administrator',
  CUSTOMER_SUCCESS: 'Customer Success',
  CUSTOMER_ADMINISTRATOR: 'Customer Administrator',
} as const;

export const SYSTEM_ROLE_IDS = {
  SYSTEM_ADMINISTRATOR: 1,
  CUSTOMER_SUCCESS: 2,
  CUSTOMER_ADMINISTRATOR: 3,
} as const;

export type SystemRoleName = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];
export type SystemRoleId = typeof SYSTEM_ROLE_IDS[keyof typeof SYSTEM_ROLE_IDS];

export const CUSTOM_ROLE_MIN_ID = 100;

export function isSystemRole(roleName: string): roleName is SystemRoleName {
  return Object.values(SYSTEM_ROLES).includes(roleName as SystemRoleName);
}

export function isSystemRoleId(roleId: number): roleId is SystemRoleId {
  return roleId >= 1 && roleId <= 3;
}

export function isCustomRoleId(roleId: number): boolean {
  return roleId >= CUSTOM_ROLE_MIN_ID;
}
```

#### Create: `backend/src/common/decorators/system-roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const SYSTEM_ROLES_KEY = 'system_roles';
export const SystemRoles = (...roles: string[]) => 
  SetMetadata(SYSTEM_ROLES_KEY, roles);
```

**Usage Example:**
```typescript
import { SYSTEM_ROLES } from '@/common/constants/system-roles';

@SystemRoles(SYSTEM_ROLES.SYSTEM_ADMINISTRATOR, SYSTEM_ROLES.CUSTOMER_SUCCESS)
@Get('admin-only')
async adminEndpoint() {
  // Only System Administrators and Customer Success can access
}
```

#### Create: `backend/src/auth/guards/system-role/system-role.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SYSTEM_ROLES_KEY } from '@/common/decorators/system-roles.decorator';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { SupabaseService } from '@/common/supabase/supabase.service';

@Injectable()
export class SystemRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedRoles = this.reflector.getAllAndOverride<string[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      currentUser: OutputUserDto;
    }>();

    const user = request.currentUser;
    if (!user) {
      throw new ForbiddenException('Access denied: user not found');
    }

    if (!user.roleId) {
      throw new ForbiddenException('Access denied: no role assigned');
    }

    // Get user's role information
    const { data: userRole, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('id, name, description, system_role')
      .eq('id', user.roleId)
      .single();

    if (error || !userRole) {
      throw new ForbiddenException('Access denied: role not found');
    }

    // Check if user has required system role
    const hasRequiredRole = allowedRoles.includes(userRole.name);
    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied: required role(s): ${allowedRoles.join(', ')}`,
      );
    }

    return true;
  }
}
```

#### Create: `backend/src/users/services/role-migration.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';

@Injectable()
export class RoleMigrationService {
  private readonly logger = new Logger(RoleMigrationService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async migrateUserRoles(): Promise<void> {
    this.logger.log('Starting role migration...');

    try {
      // Migrate users with isSuperadmin = true to System Administrator (id: 1)
      const { data: superadminUsers } = await this.supabaseService
        .getClient()
        .from('users')
        .select('id, email')
        .eq('is_superadmin', true);

      if (superadminUsers && superadminUsers.length > 0) {
        for (const user of superadminUsers) {
          const { error } = await this.supabaseService
            .getClient()
            .from('users')
            .update({ role_id: 1 })
            .eq('id', user.id);

          if (error) {
            this.logger.error(`Failed to migrate superadmin user ${user.email}:`, error);
          } else {
            this.logger.log(`✅ Migrated superadmin: ${user.email} → System Administrator`);
          }
        }
      }

      // Migrate users with isCustomerSuccess = true to Customer Success (id: 2)
      const { data: customerSuccessUsers } = await this.supabaseService
        .getClient()
        .from('users')
        .select('id, email')
        .eq('is_customer_success', true);

      if (customerSuccessUsers && customerSuccessUsers.length > 0) {
        for (const user of customerSuccessUsers) {
          const { error } = await this.supabaseService
            .getClient()
            .from('users')
            .update({ role_id: 2 })
            .eq('id', user.id);

          if (error) {
            this.logger.error(`Failed to migrate CS user ${user.email}:`, error);
          } else {
            this.logger.log(`✅ Migrated customer success: ${user.email} → Customer Success`);
          }
        }
      }

      // Set Customer Administrator role (id: 3) for customer owners
      const { data: customers } = await this.supabaseService
        .getClient()
        .from('customers')
        .select('id, owner_id')
        .not('owner_id', 'is', null);

      if (customers && customers.length > 0) {
        for (const customer of customers) {
          const { error } = await this.supabaseService
            .getClient()
            .from('users')
            .update({ role_id: 3 })
            .eq('id', customer.owner_id);

          if (error) {
            this.logger.error(`Failed to migrate customer owner ${customer.owner_id}:`, error);
          } else {
            this.logger.log(`✅ Migrated customer owner (ID: ${customer.owner_id}) → Customer Administrator`);
          }
        }
      }

      this.logger.log('🎉 Role migration completed successfully!');
    } catch (error) {
      this.logger.error('❌ Role migration failed:', error);
      throw error;
    }
  }
}
```

### Step 2.2: Update Existing Files

#### Update: `backend/src/users/dto/output-user.dto.ts`

Add this field to the OutputUserDto class:

```typescript
@ApiPropertyOptional({ description: 'User role information' })
@IsOptional()
role?: {
  id: number;
  name: string;
  description: string | null;
  systemRole: boolean;
};
```

#### Update: `backend/src/auth/guards/permission/permission.guard.ts`

Find the section where you check for System Administrator and update it to use the role name check:

```typescript
// Check if user has System Administrator role
if (effectiveUser.roleId) {
  const { data: userRole } = await this.supabaseService
    .getClient()
    .from('roles')
    .select('name, system_role')
    .eq('id', effectiveUser.roleId)
    .single();

  if (userRole?.name === 'System Administrator') {
    return true;
  }
}
```

### Step 2.3: Add Explicit Filters to Services

**CRITICAL:** Review these files and add explicit filters to ALL Supabase queries:

#### File: `backend/src/users/users.service.ts`

Find all queries like this:
```typescript
// ❌ BAD
const { data } = await this.supabaseService
  .getClient()
  .from('users')
  .select();
```

Update to:
```typescript
// ✅ GOOD - Add explicit filter
const { data } = await this.supabaseService
  .getClient()
  .from('users')
  .select()
  .eq('customer_id', customerId);  // Always add appropriate filter!
```

#### File: `backend/src/notifications/notifications.service.ts`

Ensure all queries include user_id filter:
```typescript
// ✅ GOOD
const { data } = await this.supabaseService
  .getClient()
  .from('notifications')
  .select()
  .eq('user_id', userId);
```

---

## 🔄 Phase 3: Data Migration

### Step 3.1: Create CLI Command or Endpoint

Add this to your CLI module or create a temporary controller:

```typescript
import { Command, CommandRunner } from 'nest-commander';
import { RoleMigrationService } from '@/users/services/role-migration.service';

@Command({
  name: 'migrate:roles',
  description: 'Migrate users from boolean flags to role IDs',
})
export class MigrateRolesCommand extends CommandRunner {
  constructor(private readonly roleMigrationService: RoleMigrationService) {
    super();
  }

  async run(): Promise<void> {
    await this.roleMigrationService.migrateUserRoles();
  }
}
```

### Step 3.2: Run Migration

```bash
cd backend
npm run cli migrate:roles
```

Or if using a controller endpoint:
```bash
curl -X POST http://localhost:3000/api/admin/migrate-roles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 3.3: Verify Migration

```sql
-- Check how many users have each role
SELECT 
  r.name as role_name,
  COUNT(u.id) as user_count
FROM roles r
LEFT JOIN users u ON u.role_id = r.id
WHERE r.system_role = true
GROUP BY r.id, r.name
ORDER BY r.id;

-- Expected output:
-- System Administrator | X users
-- Customer Success     | Y users
-- Customer Administrator | Z users

-- Check users without roles (should be 0 or only regular users)
SELECT COUNT(*) FROM users WHERE role_id IS NULL;
```

---

## 🎨 Phase 4: Frontend Updates

### Step 4.1: Update Type Definitions

#### File: `frontend/src/contexts/auth/types.d.ts`

```typescript
export interface Role {
  id: number;
  name: string;
  description: string | null;
  systemRole?: boolean;  // ADD THIS LINE
  permissions: PermissionsByModule;
  _count: {
    users: number;
  };
}

export interface ApiUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  customerId?: number;
  customer?: Customer;
  roleId?: number;
  role?: Role;  // Make sure this includes systemRole
  status: string;
  permissions?: string[];
  // ... other fields
}
```

### Step 4.2: Create Utility Functions

#### File: `frontend/src/lib/user-utils.ts`

```typescript
import { ApiUser } from "@/contexts/auth/types";

export const isSystemAdministrator = (user?: ApiUser): boolean => {
  return user?.role?.name === 'System Administrator';
};

export const isCustomerSuccess = (user?: ApiUser): boolean => {
  return user?.role?.name === 'Customer Success';
};

export const isCustomerAdministrator = (user?: ApiUser): boolean => {
  return user?.role?.name === 'Customer Administrator';
};

export const hasSystemRole = (user?: ApiUser): boolean => {
  return user?.role?.systemRole === true;
};

export const getCustomerAdministrators = (
  users: ApiUser[], 
  customerId: number
): ApiUser[] => {
  return users.filter(user => 
    user.role?.name === 'Customer Administrator' && 
    user.customerId === customerId
  );
};

export const isUserOwner = (ownerUser?: ApiUser, user?: ApiUser): boolean => {
  if (!ownerUser || !user) return false;

  // System Admin can manage all
  if (isSystemAdministrator(ownerUser)) return true;

  // Customer Success can manage users in their assigned customers
  if (isCustomerSuccess(ownerUser) && 
      ownerUser.customerId === user.customerId) {
    return true;
  }

  // Customer Admin can manage users in their customer
  if (ownerUser.customer?.ownerId === ownerUser.id && 
      ownerUser.customerId === user.customerId) {
    return true;
  }

  return false;
};
```

### Step 4.3: Update Components

Search for and replace all instances of:

```typescript
// ❌ OLD
if (user.isSuperadmin) { ... }
if (user.isCustomerSuccess) { ... }

// ✅ NEW
if (isSystemAdministrator(user)) { ... }
if (isCustomerSuccess(user)) { ... }
```

---

## 🧪 Phase 5: Testing & Validation

### Step 5.1: Create Test Users

```sql
-- Create test System Administrator
INSERT INTO users (email, first_name, last_name, role_id, uid, status)
VALUES ('admin@test.com', 'Test', 'Admin', 1, gen_random_uuid(), 'active');

-- Create test Customer Success
INSERT INTO users (email, first_name, last_name, role_id, uid, status)
VALUES ('cs@test.com', 'Test', 'CS', 2, gen_random_uuid(), 'active');

-- Create test Customer Administrator
INSERT INTO users (email, first_name, last_name, role_id, customer_id, uid, status)
VALUES ('custadmin@test.com', 'Test', 'CustAdmin', 3, 1, gen_random_uuid(), 'active');

-- Create test regular user
INSERT INTO users (email, first_name, last_name, role_id, customer_id, uid, status)
VALUES ('user@test.com', 'Test', 'User', 100, 1, gen_random_uuid(), 'active');
```

### Step 5.2: Test Access Control

For each test user, verify:

#### System Administrator:
- ✅ Can see all users
- ✅ Can see all customers
- ✅ Can create/update/delete any resource
- ✅ Can manage roles and permissions

#### Customer Success:
- ✅ Can see users from assigned customers only
- ✅ Can see assigned customers only
- ✅ Cannot see other customers' data
- ✅ Cannot manage roles

#### Customer Administrator:
- ✅ Can see users from their customer only
- ✅ Can see their customer only
- ✅ Cannot see other customers' data
- ✅ Cannot manage system roles

#### Regular User:
- ✅ Can see only their own data
- ✅ Cannot see other users
- ✅ Cannot see customer data
- ✅ Cannot manage anything

### Step 5.3: Performance Testing

Run these queries and verify performance:

```sql
-- Test 1: Users query with RLS
EXPLAIN ANALYZE 
SELECT * FROM users 
WHERE customer_id = 1;

-- Look for:
-- ✅ InitPlan (function caching - GOOD!)
-- ✅ Index Scan on idx_users_customer_id (GOOD!)
-- ✅ Execution time < 50ms (GOOD!)
-- ❌ Seq Scan (BAD - missing index)

-- Test 2: Customers query with RLS
EXPLAIN ANALYZE 
SELECT * FROM customers 
WHERE id = 1;

-- Look for InitPlan and Index Scan

-- Test 3: Roles query
EXPLAIN ANALYZE 
SELECT * FROM roles 
WHERE system_role = true;

-- Should use idx_roles_system_role

-- Test 4: Notifications query
EXPLAIN ANALYZE 
SELECT * FROM notifications 
WHERE user_id = 1;

-- Should use idx_notifications_user_id
```

### Step 5.4: Load Testing

Use a tool like k6 or Apache Bench:

```bash
# Test concurrent user queries
ab -n 1000 -c 10 http://localhost:3000/api/users

# Expected: < 100ms average response time
```

---

## 🧹 Phase 6: Cleanup & Deployment

### Step 6.1: Remove Boolean Columns

After verifying everything works, remove the old columns:

```sql
-- IMPORTANT: Only run this after verifying migration is successful!

ALTER TABLE users DROP COLUMN IF EXISTS is_superadmin;
ALTER TABLE users DROP COLUMN IF EXISTS is_customer_success;
```

### Step 6.2: Regenerate TypeScript Types

```bash
cd backend
supabase gen types typescript --linked > supabase/types/supabase.ts
```

### Step 6.3: Deploy to Staging

```bash
cd backend
./supabase/scripts/migrate.sh staging
```

Verify on staging:
- Test all role access patterns
- Run performance tests
- Check application logs for errors

### Step 6.4: Deploy to Production

```bash
cd backend
./supabase/scripts/migrate.sh production true  # Dry run first!
./supabase/scripts/migrate.sh production       # Apply
```

Monitor:
- Application logs
- Database performance metrics
- User reports
- Error tracking (Sentry, etc.)

---

## 🚨 Troubleshooting

### Issue 1: Slow Queries After Enabling RLS

**Symptom:** Queries taking seconds instead of milliseconds.

**Solution:**
1. Check if functions are wrapped in SELECT:
   ```sql
   -- Check policies
   SELECT schemaname, tablename, policyname, qual, with_check
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

2. Verify indexes exist:
   ```sql
   SELECT tablename, indexname 
   FROM pg_indexes 
   WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
   ```

3. Run EXPLAIN ANALYZE and look for InitPlan nodes.

### Issue 2: Users Can't See Any Data

**Symptom:** Authenticated users getting empty results.

**Solution:**
1. Check if RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```

2. Check if user has a role assigned:
   ```sql
   SELECT id, email, role_id FROM users WHERE email = 'user@example.com';
   ```

3. Test policy directly:
   ```sql
   SET ROLE authenticated;
   SELECT * FROM users WHERE email = 'user@example.com';
   ```

### Issue 3: System Roles Being Modified

**Symptom:** System roles (IDs 1-3) are changed or deleted.

**Solution:**
1. Policies should prevent this - check policy:
   ```sql
   SELECT policyname, qual 
   FROM pg_policies 
   WHERE tablename = 'roles' AND policyname LIKE '%system_admin%';
   ```

2. Verify `id >= 100` check in policies.

3. Add additional database trigger if needed:
   ```sql
   CREATE OR REPLACE FUNCTION prevent_system_role_modification()
   RETURNS TRIGGER AS $$
   BEGIN
     IF OLD.system_role = true THEN
       RAISE EXCEPTION 'Cannot modify system roles';
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER protect_system_roles
     BEFORE UPDATE OR DELETE ON roles
     FOR EACH ROW
     EXECUTE FUNCTION prevent_system_role_modification();
   ```

### Issue 4: Performance Degradation

**Symptom:** Queries slower after RLS than before.

**Solution:**
1. **Add explicit filters in application code** - this is the #1 fix!
2. Verify all function calls are wrapped in SELECT
3. Check query plans with EXPLAIN ANALYZE
4. Ensure indexes exist on foreign keys
5. Consider using security definer functions for complex checks

---

## 📊 Success Metrics

After migration, you should achieve:

- ✅ All queries return correct data for each role
- ✅ Query execution time < 50ms for typical queries
- ✅ EXPLAIN ANALYZE shows InitPlan nodes (function caching)
- ✅ EXPLAIN ANALYZE shows Index Scans (not Seq Scans)
- ✅ No users can access data outside their scope
- ✅ System roles (ID 1-3) cannot be modified
- ✅ No security vulnerabilities in RLS policies
- ✅ Application logs show no RLS-related errors
- ✅ All tests passing (unit, integration, e2e)
- ✅ 99%+ performance improvement achieved

---

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL RLS Docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/database/postgres/row-level-security#performance)

---

## 🎉 Conclusion

Following this guide, you've successfully:
- ✅ Implemented database-level security with RLS
- ✅ Achieved 99%+ query performance with proper optimization
- ✅ Created a unified role-based authorization system
- ✅ Ensured customer data isolation
- ✅ Built a scalable permission management system

Your application now has enterprise-grade security at the database level! 🚀

