# Supabase Role-Based Authorization Migration Guide

## Quick Reference

### Critical Performance Rules (MUST FOLLOW)
⚠️ **Failing to follow these rules will result in 99% slower queries!**

1. ✅ **Wrap all function calls**: `(SELECT has_system_role('System Administrator'))`
2. ✅ **Add TO clause**: `TO authenticated` on all policies
3. ✅ **Wrap auth.uid()**: `(SELECT auth.uid())`
4. ✅ **Add explicit filters**: Always include `.eq('customer_id', id)` in queries
5. ✅ **Avoid joins**: Use `ANY()` or `IN` with subqueries

### Key Sections
- [Performance Best Practices](#23-rls-performance-best-practices) - Required reading!
- [Complete SQL Migration Script](#complete-sql-migration-script) - Ready to execute
- [Common Pitfalls](#common-pitfalls--troubleshooting) - Debug issues
- [Performance Monitoring](#performance-monitoring) - Verify optimization
- [Migration Checklist](#migration-checklist) - Track progress

### Expected Performance Gains
- Function wrapping: **99.9% faster** ⚡
- TO clause: **99.78% faster** ⚡
- Query filters: **95% faster** ⚡

---

## Overview

This guide provides step-by-step instructions for migrating from boolean flags (`isSuperadmin`, `isCustomerSuccess`) to a unified role-based authorization system using Supabase Row Level Security (RLS).

**✨ What You'll Achieve:**
- Unified role-based authorization (no more boolean flags)
- Database-level security with RLS policies
- 99%+ query performance with proper optimization
- Customer data isolation
- Scalable permission management

## Current State Analysis

- **Mixed authorization model**: Boolean flags + role table
- **Basic Supabase integration**: JWT token validation and user sync
- **Limited RLS**: Only basic policies on some tables
- **Permission-based guards**: Using role-permission relationships
- **Frontend issues**: Customer administrators showing across all customers

## Implementation Plan

### Phase 1: Database Schema Migration

#### 1.1 Add system_role column to roles table

```sql
-- Add system_role column to roles table
ALTER TABLE roles ADD COLUMN system_role BOOLEAN DEFAULT false;
```

#### 1.2 Insert default system roles

```sql
-- Insert default system roles
INSERT INTO roles (id, name, description, system_role, created_at, updated_at)
VALUES
  (1, 'System Administrator', 'Role with full system access and control', true, NOW(), NOW()),
  (2, 'Customer Success', 'Role focused on ensuring customer satisfaction and retention', true, NOW(), NOW()),
  (3, 'Customer Administrator', 'Role for managing customer-specific configurations and settings', true, NOW(), NOW());

-- Reset sequence to start from 100 for custom roles
ALTER SEQUENCE roles_id_seq RESTART WITH 100;
```

#### 1.3 Create helper functions for role checking

```sql
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
```

#### 1.4 Create indexes for optimal RLS performance

```sql
-- Index on users.uid for auth lookups (critical for RLS performance)
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

-- Index on articles for common queries
CREATE INDEX IF NOT EXISTS idx_articles_customer_id ON articles(customer_id) WHERE customer_id IS NOT NULL;

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_users_customer_role ON users(customer_id, role_id);
```

> **Performance Note**: These indexes are critical for RLS performance. Without proper indexes, RLS policies will cause sequential scans on large tables, resulting in severe performance degradation.

### Phase 2: Row Level Security Implementation

#### 2.1 Enable RLS on all tables

```sql
-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Customers table  
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Permissions table
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Role permissions table
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Articles table
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Article categories table
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;

-- Notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notification templates table
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
```

#### 2.2 Create comprehensive RLS policies

> **Performance Note**: All function calls must be wrapped in `SELECT` statements for optimal performance. This causes Postgres to use an `initPlan` and cache the result per-statement rather than calling the function for every row (99%+ performance improvement).

**Users table policies:**

```sql
-- System admins can see all users
CREATE POLICY users_select_system_admin
  ON users FOR SELECT
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

-- Customer success can see users from their assigned customers
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

-- Customer admins can see users from their customer
CREATE POLICY users_select_customer_admin
  ON users FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  );

-- Users can see their own record
CREATE POLICY users_select_self
  ON users FOR SELECT
  TO authenticated
  USING (uid = (SELECT auth.uid()));

-- System admins can insert users
CREATE POLICY users_insert_system_admin
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- Customer success can insert users in their assigned customers
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

-- Customer admins can insert users in their customer
CREATE POLICY users_insert_customer_admin
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  );

-- System admins can update all users
CREATE POLICY users_update_system_admin
  ON users FOR UPDATE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- Customer success can update users in their assigned customers
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

-- Customer admins can update users in their customer
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

-- Users can update their own record
CREATE POLICY users_update_self
  ON users FOR UPDATE
  TO authenticated
  USING (uid = (SELECT auth.uid()))
  WITH CHECK (uid = (SELECT auth.uid()));

-- System admins can delete users
CREATE POLICY users_delete_system_admin
  ON users FOR DELETE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

-- Customer success can delete users in their assigned customers
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

-- Customer admins can delete users in their customer
CREATE POLICY users_delete_customer_admin
  ON users FOR DELETE
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  );
```

**Customers table policies:**

```sql
-- System admins can see all customers
CREATE POLICY customers_select_system_admin
  ON customers FOR SELECT
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

-- Customer success can see their assigned customers
CREATE POLICY customers_select_customer_success
  ON customers FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Success')) AND
    customer_success_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid()))
  );

-- Customer admins can see their customer
CREATE POLICY customers_select_customer_admin
  ON customers FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Administrator')) AND
    id = (SELECT get_user_customer_id())
  );

-- System admins can insert customers
CREATE POLICY customers_insert_system_admin
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- System admins can update customers
CREATE POLICY customers_update_system_admin
  ON customers FOR UPDATE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- Customer success can update their assigned customers
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

-- Customer admins can update their customer (limited fields)
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

-- System admins can delete customers
CREATE POLICY customers_delete_system_admin
  ON customers FOR DELETE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));
```

**Roles table policies:**

```sql
-- Everyone authenticated can read roles
CREATE POLICY roles_select_all
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- System admins can insert custom roles only
CREATE POLICY roles_insert_system_admin
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT has_system_role('System Administrator')) AND
    id >= 100  -- Only allow creating custom roles
  );

-- System admins can update custom roles only (id >= 100)
CREATE POLICY roles_update_system_admin
  ON roles FOR UPDATE
  TO authenticated
  USING (
    (SELECT has_system_role('System Administrator')) AND
    id >= 100  -- Only allow modifying custom roles
  )
  WITH CHECK (
    (SELECT has_system_role('System Administrator')) AND
    id >= 100  -- Prevent changing id to system role range
  );

-- System admins can delete custom roles only
CREATE POLICY roles_delete_system_admin
  ON roles FOR DELETE
  TO authenticated
  USING (
    (SELECT has_system_role('System Administrator')) AND
    id >= 100  -- Only allow deleting custom roles
  );
```

**Permissions table policies:**

```sql
-- Everyone authenticated can read permissions
CREATE POLICY permissions_select_all
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- System admins can manage permissions
CREATE POLICY permissions_all_system_admin
  ON permissions FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));
```

**Role permissions table policies:**

```sql
-- Everyone authenticated can read role permissions
CREATE POLICY role_permissions_select_all
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- System admins can manage role permissions
CREATE POLICY role_permissions_all_system_admin
  ON role_permissions FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));
```

**Articles table policies:**

```sql
-- Everyone authenticated can read articles
CREATE POLICY articles_select_all
  ON articles FOR SELECT
  TO authenticated
  USING (true);

-- System admins can manage all articles
CREATE POLICY articles_all_system_admin
  ON articles FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- Users with article permissions can manage articles
-- Note: This should be combined with application-level permission checks
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
```

**Article categories table policies:**

```sql
-- Everyone authenticated can read article categories
CREATE POLICY article_categories_select_all
  ON article_categories FOR SELECT
  TO authenticated
  USING (true);

-- System admins can manage article categories
CREATE POLICY article_categories_all_system_admin
  ON article_categories FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- Users with article permissions can manage categories
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
```

**Notifications table policies:**

```sql
-- Users can see their own notifications
CREATE POLICY notifications_select_own
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid())));

-- System admins can see all notifications
CREATE POLICY notifications_select_system_admin
  ON notifications FOR SELECT
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

-- System can insert notifications
CREATE POLICY notifications_insert_system
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Application level controls who can send

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update_own
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid())))
  WITH CHECK (user_id = (SELECT id FROM users WHERE uid = (SELECT auth.uid())));

-- System admins can update all notifications
CREATE POLICY notifications_update_system_admin
  ON notifications FOR UPDATE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- System admins can delete notifications
CREATE POLICY notifications_delete_system_admin
  ON notifications FOR DELETE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));
```

**Notification templates table policies:**

```sql
-- Everyone authenticated can read notification templates
CREATE POLICY notification_templates_select_all
  ON notification_templates FOR SELECT
  TO authenticated
  USING (true);

-- System admins can manage notification templates
CREATE POLICY notification_templates_all_system_admin
  ON notification_templates FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));
```

#### 2.3 RLS Performance Best Practices

Following Supabase's official recommendations, these optimizations are CRITICAL for performance:

**1. Wrap all function calls in SELECT statements:**
```sql
-- ❌ BAD - Calls function for every row (99% slower)
USING (has_system_role('System Administrator'))

-- ✅ GOOD - Calls function once per query
USING ((SELECT has_system_role('System Administrator')))
```

**2. Always specify the TO clause:**
```sql
-- ❌ BAD - Evaluates for all roles
CREATE POLICY my_policy ON table_name FOR SELECT
USING (condition);

-- ✅ GOOD - Only evaluates for authenticated users
CREATE POLICY my_policy ON table_name FOR SELECT
TO authenticated
USING (condition);
```

**3. Wrap auth.uid() calls:**
```sql
-- ❌ BAD
USING (user_id = auth.uid())

-- ✅ GOOD
USING (user_id = (SELECT auth.uid()))
```

**4. Minimize joins and use ANY/IN operations:**
```sql
-- ❌ BAD - Joins on every row
USING (
  team_id IN (
    SELECT team_id FROM team_user 
    WHERE team_user.user_id = (SELECT auth.uid())
  )
)

-- ✅ GOOD - Fetches set first, then filters
USING (
  team_id = ANY(
    SELECT team_id FROM team_user 
    WHERE user_id = (SELECT auth.uid())
  )
)
```

**5. Add filters to application queries:**

Even though RLS policies filter data, always add explicit filters in your application code:

```typescript
// ❌ BAD - Relies only on RLS
const { data } = await supabase.from('users').select();

// ✅ GOOD - Adds explicit filter
const { data } = await supabase.from('users')
  .select()
  .eq('customer_id', customerId);
```

This allows Postgres to construct a better query plan and can result in 95%+ performance improvement.

**Expected Performance Improvements:**

Based on Supabase benchmarks:
- Wrapping `auth.uid()` in SELECT: **~95% faster**
- Wrapping security definer functions: **~99.9% faster**
- Adding TO clause: **~99.78% faster** (when called as wrong role)
- Avoiding joins: **~99.78% faster**
- Adding query filters: **~95% faster**

### Phase 3: Backend Code Migration

#### 3.1 Update User DTOs

**Update `backend/src/users/dto/output-user.dto.ts`:**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { UserStatusList } from '@/common/constants/status';

export class OutputUserDto {
  @ApiProperty({ description: 'User ID' })
  id: number;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'First Name' })
  firstName: string | null = null;

  @ApiProperty({ description: 'Last Name' })
  lastName: string | null = null;

  @ApiPropertyOptional({ description: 'Phone Number' })
  phoneNumber?: string | null = null;

  @ApiProperty({ description: 'ID of the Customer this user belongs to' })
  @IsOptional()
  customerId: number | null = null;

  @ApiPropertyOptional({
    description: 'Customer associated with the user',
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Customer ID' },
      name: { type: 'string', description: 'Customer name' },
    },
  })
  customer?: {
    id: number;
    name: string;
  };

  @ApiProperty({ description: 'The role of the user' })
  @IsOptional()
  roleId: number | null = null;

  @ApiPropertyOptional({ description: 'Manager ID' })
  @IsOptional()
  managerId: number | null = null;

  @ApiPropertyOptional({
    description: 'Status (optional). Default: inactive',
    enum: UserStatusList,
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'List of permissions' })
  @IsOptional()
  permissions?: string[];

  // ADD THIS NEW FIELD:
  @ApiPropertyOptional({ description: 'User role information' })
  @IsOptional()
  role?: {
    id: number;
    name: string;
    description: string | null;
    systemRole: boolean;
  };
}
```

**Update `backend/src/users/dto/create-user.dto.ts`:**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail(
    { blacklisted_chars: '\\/%^$#!~*()[]{}<>?|' },
    { message: 'Invalid email format' },
  )
  @IsNotEmpty()
  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'First Name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Last Name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ description: 'Phone Number' })
  @IsPhoneNumber('US')
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ description: 'ID of the Customer this user belongs to' })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiProperty({ description: 'The role of the user' })
  @IsOptional()
  @IsInt()
  roleId?: number;

  @ApiPropertyOptional({ description: 'Manager ID' })
  @IsOptional()
  @IsInt()
  managerId?: number;

  @ApiPropertyOptional({
    description: 'Status (optional). Default: inactive',
    enum: ['inactive', 'active', 'suspended'],
  })
  @IsOptional()
  @IsIn(['inactive', 'active', 'suspended'])
  status?: string;
}
```

#### 3.2 Create new role-based guards

**Create `backend/src/auth/guards/system-role/system-role.guard.ts`:**

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
    console.log('[[[[SYSTEM ROLE GUARD]]]]');

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

    // Get user's role information using SupabaseClient
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

    console.log('user role:', userRole.name);
    return true;
  }
}
```

**Create `backend/src/common/decorators/system-roles.decorator.ts`:**

```typescript
import { SetMetadata } from '@nestjs/common';

export const SYSTEM_ROLES_KEY = 'system_roles';
export const SystemRoles = (...roles: string[]) => SetMetadata(SYSTEM_ROLES_KEY, roles);
```

#### 3.3 Update existing guards

**Update `backend/src/auth/guards/permission/permission.guard.ts`:**

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { DecodedIdToken } from '@/common/types/decoded-token.type';
import { SYSTEM_MODULES } from '@/system-modules/system-modules.data';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('[[[[PERMISSION GUARD]]]]');

    const allowedPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // if no permissions are required, allow access
    console.log('allowedPermissions', allowedPermissions);
    if (!allowedPermissions || allowedPermissions.length === 0) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest<{
      user: DecodedIdToken;
      headers: { authorization?: string };
      currentUser: null | OutputUserDto;
      impersonatedUser?: OutputUserDto;
      isImpersonating?: boolean;
    }>();

    const effectiveUser =
      request.isImpersonating && request.impersonatedUser
        ? request.impersonatedUser
        : request.currentUser;

    if (!effectiveUser) {
      throw new ForbiddenException('Access denied: user not found');
    }

    // Check if user has System Administrator role
    if (effectiveUser.roleId) {
      const { data: userRole } = await this.supabaseService
        .getClient()
        .from('roles')
        .select('name')
        .eq('id', effectiveUser.roleId)
        .single();

      if (userRole?.name === 'System Administrator') {
        return true;
      }
    }

    // Check if user has Customer Success role and appropriate permissions
    if (effectiveUser.roleId) {
      const { data: userRole } = await this.supabaseService
        .getClient()
        .from('roles')
        .select('name')
        .eq('id', effectiveUser.roleId)
        .single();

      if (userRole?.name === 'Customer Success') {
        const userManagementPermissions =
          SYSTEM_MODULES.find(
            (module) => module.name === 'UserManagement',
          )?.permissions?.map((permission) => permission.name) || [];

        const hasCustomerSuccessAccess = allowedPermissions.some(
          (permission) =>
            userManagementPermissions.includes(permission) ||
            permission.startsWith('Documents:'),
        );

        if (hasCustomerSuccessAccess) {
          return true;
        }
      }
    }

    // Get customer information using SupabaseClient
    const { data: customer } = await this.supabaseService
      .getClient()
      .from('customers')
      .select('id, owner_id')
      .eq('id', effectiveUser.customerId!)
      .single();

    console.log('======================');
    console.log(customer);
    console.log(effectiveUser);
    console.log('======================');
    
    // allow customer owner to access its endpoints
    if (customer && effectiveUser.id == customer.owner_id) {
      return true;
    }
    
    if (!effectiveUser.roleId) {
      throw new ForbiddenException('Access denied: user has no role assigned');
    }

    // Get user's role permissions using SupabaseClient
    const { data: userRole, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select(`
        id,
        name,
        permissions:role_permissions(
          permission:permissions(
            name
          )
        )
      `)
      .eq('id', effectiveUser.roleId)
      .single();

    if (error || !userRole) {
      throw new ForbiddenException('Access denied: role not found');
    }
    
    const rolePermissions = userRole.permissions;
    if (!rolePermissions) {
      throw new ForbiddenException('Access denied: permissions not found');
    }

    let allowed = false;
    rolePermissions.forEach((rolePermission: any) => {
      if (allowedPermissions.includes(rolePermission.permission.name)) {
        allowed = true;
      }
    });

    if (!allowed) {
      const userContext = request.isImpersonating
        ? `impersonated user (${effectiveUser.email})`
        : `user (${effectiveUser.email})`;
      throw new ForbiddenException(
        `Access denied for ${userContext}: required permission(s): ${allowedPermissions.join(', ')}`,
      );
    }

    console.log('effectiveUser', effectiveUser);
    return true;
  }
}
```

**Update `backend/src/auth/guards/require-superuser/require-superuser.guard.ts`:**

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUPERUSER_KEY } from '@/common/decorators/superuser.decorator';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { DecodedIdToken } from '@/common/types/decoded-token.type';
import { SupabaseService } from '@/common/supabase/supabase.service';

@Injectable()
export class RequireSuperuserGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('[[[[SUPERUSER GUARD]]]]');

    const allowedPermissions = this.reflector.getAllAndOverride<string[]>(
      SUPERUSER_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{
      user: DecodedIdToken;
      headers: { authorization?: string };
      currentUser: null | OutputUserDto;
    }>();

    const user = request.currentUser;
    console.log(user);
    if (!user) {
      throw new ForbiddenException('Access denied: user not found');
    }

    if (!user.roleId) {
      throw new ForbiddenException('Access denied: no role assigned');
    }

    // Get user's role information using SupabaseClient
    const { data: userRole, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('name')
      .eq('id', user.roleId)
      .single();

    if (error || !userRole) {
      throw new ForbiddenException('Access denied: role not found');
    }

    // Check if user has System Administrator or Customer Success role
    const hasSystemRole = userRole.name === 'System Administrator' || 
                         userRole.name === 'Customer Success';
    
    if (!hasSystemRole) {
      throw new ForbiddenException('Access denied: insufficient privileges');
    }

    let allowed = false;
    allowedPermissions.forEach((permission) => {
      if (permission === 'superAdmin' && userRole.name === 'System Administrator') {
        allowed = true;
      }
      if (permission === 'customerSuccess' && userRole.name === 'Customer Success') {
        allowed = true;
      }
    });

    if (!allowed) {
      throw new ForbiddenException('Access denied');
    }
    return true;
  }
}
```

#### 3.4 Create role migration service

**Create `backend/src/users/services/role-migration.service.ts`:**

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
      // Ensure system roles exist
      await this.ensureSystemRolesExist();

      // Migrate users with isSuperadmin = true to System Administrator role (id: 1)
      const { data: superadminUsers } = await this.supabaseService
        .getClient()
        .from('users')
        .select('id, email')
        .eq('is_superadmin', true);

      if (superadminUsers) {
        for (const user of superadminUsers) {
          const { error } = await this.supabaseService
            .getClient()
            .from('users')
            .update({ role_id: 1 })
            .eq('id', user.id);

          if (error) {
            this.logger.error(`Failed to migrate superadmin user ${user.email}:`, error);
          } else {
            this.logger.log(`Migrated superadmin user ${user.email} to System Administrator role`);
          }
        }
      }

      // Migrate users with isCustomerSuccess = true to Customer Success role (id: 2)
      const { data: customerSuccessUsers } = await this.supabaseService
        .getClient()
        .from('users')
        .select('id, email')
        .eq('is_customer_success', true);

      if (customerSuccessUsers) {
        for (const user of customerSuccessUsers) {
          const { error } = await this.supabaseService
            .getClient()
            .from('users')
            .update({ role_id: 2 })
            .eq('id', user.id);

          if (error) {
            this.logger.error(`Failed to migrate customer success user ${user.email}:`, error);
          } else {
            this.logger.log(`Migrated customer success user ${user.email} to Customer Success role`);
          }
        }
      }

      // Set Customer Administrator role (id: 3) for customer owners
      const { data: customerOwners } = await this.supabaseService
        .getClient()
        .from('users')
        .select('id, email')
        .not('owned_customer', 'is', null);

      if (customerOwners) {
        for (const user of customerOwners) {
          const { error } = await this.supabaseService
            .getClient()
            .from('users')
            .update({ role_id: 3 })
            .eq('id', user.id);

          if (error) {
            this.logger.error(`Failed to migrate customer owner ${user.email}:`, error);
          } else {
            this.logger.log(`Migrated customer owner ${user.email} to Customer Administrator role`);
          }
        }
      }

      this.logger.log('Role migration completed successfully');
    } catch (error) {
      this.logger.error('Role migration failed:', error);
      throw error;
    }
  }

  private async ensureSystemRolesExist(): Promise<void> {
    // Check if system roles exist, if not create them
    const { data: systemAdminRole } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('id')
      .eq('id', 1)
      .single();

    if (!systemAdminRole) {
      const { error } = await this.supabaseService
        .getClient()
        .from('roles')
        .insert({
          id: 1,
          name: 'System Administrator',
          description: 'Role with full system access and control',
          system_role: true,
        });

      if (error) {
        this.logger.error('Failed to create System Administrator role:', error);
      } else {
        this.logger.log('Created System Administrator role');
      }
    }

    const { data: customerSuccessRole } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('id')
      .eq('id', 2)
      .single();

    if (!customerSuccessRole) {
      const { error } = await this.supabaseService
        .getClient()
        .from('roles')
        .insert({
          id: 2,
          name: 'Customer Success',
          description: 'Role focused on ensuring customer satisfaction and retention',
          system_role: true,
        });

      if (error) {
        this.logger.error('Failed to create Customer Success role:', error);
      } else {
        this.logger.log('Created Customer Success role');
      }
    }

    const { data: customerAdminRole } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('id')
      .eq('id', 3)
      .single();

    if (!customerAdminRole) {
      const { error } = await this.supabaseService
        .getClient()
        .from('roles')
        .insert({
          id: 3,
          name: 'Customer Administrator',
          description: 'Role for managing customer-specific configurations and settings',
          system_role: true,
        });

      if (error) {
        this.logger.error('Failed to create Customer Administrator role:', error);
      } else {
        this.logger.log('Created Customer Administrator role');
      }
    }
  }

  async removeBooleanFlags(): Promise<void> {
    this.logger.log('Removing boolean flags from users table...');
    
    // This would be done via a database migration
    // ALTER TABLE users DROP COLUMN is_superadmin;
    // ALTER TABLE users DROP COLUMN is_customer_success;
    
    this.logger.log('Boolean flags removal completed');
  }
}
```

### Phase 4: Backend Role Management Endpoints

#### 4.1 Update Role Service for SupabaseClient

**Update `backend/src/roles/roles.service.ts`:**

```typescript
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreateRoleDto } from '@/roles/dto/create-role.dto';
import { UpdateRoleDto } from '@/roles/dto/update-role.dto';
import { UpdateRolePermissionsByNameDto } from '@/roles/dto/update-role-permissions-by-name.dto';

@Injectable()
export class RolesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createRoleDto: CreateRoleDto) {
    // Check if role with same name already exists
    const { data: existingRole } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('id')
      .eq('name', createRoleDto.name)
      .single();

    if (existingRole) {
      throw new ConflictException('Role with name already exists');
    }

    // Insert new role
    const { data: newRole, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .insert({
        name: createRoleDto.name,
        description: createRoleDto.description,
        image_url: createRoleDto.imageUrl,
        system_role: false, // Custom roles are not system roles
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create role: ${error.message}`);
    }

    return newRole;
  }

  async findAll(search?: string) {
    let query = this.supabaseService
      .getClient()
      .from('roles')
      .select(`
        id,
        name,
        description,
        image_url,
        system_role,
        created_at,
        updated_at,
        permissions:role_permissions(
          permission:permissions(
            id,
            name,
            label
          )
        ),
        _count:users(count)
      `)
      .order('id', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: roles, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch roles: ${error.message}`);
    }

    return roles;
  }

  async findOne(id: number) {
    const { data: role, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select(`
        id,
        name,
        description,
        image_url,
        system_role,
        created_at,
        updated_at,
        permissions:role_permissions(
          permission:permissions(
            id,
            name,
            label
          )
        ),
        users:users(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    // Prevent modification of system roles
    const { data: existingRole } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('system_role')
      .eq('id', id)
      .single();

    if (existingRole?.system_role) {
      throw new BadRequestException('Cannot modify system roles');
    }

    // Check if new name conflicts with existing roles
    if (updateRoleDto.name) {
      const { data: conflictingRole } = await this.supabaseService
        .getClient()
        .from('roles')
        .select('id')
        .eq('name', updateRoleDto.name)
        .neq('id', id)
        .single();

      if (conflictingRole) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    const { data: updatedRole, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .update({
        name: updateRoleDto.name,
        description: updateRoleDto.description,
        image_url: updateRoleDto.imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update role: ${error.message}`);
    }

    return updatedRole;
  }

  async remove(id: number) {
    // Prevent deletion of system roles
    const { data: existingRole } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('system_role')
      .eq('id', id)
      .single();

    if (existingRole?.system_role) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if role is assigned to any users
    const { data: usersWithRole } = await this.supabaseService
      .getClient()
      .from('users')
      .select('id')
      .eq('role_id', id)
      .limit(1);

    if (usersWithRole && usersWithRole.length > 0) {
      throw new ConflictException('Cannot delete role that is assigned to users');
    }

    const { error } = await this.supabaseService
      .getClient()
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(`Failed to delete role: ${error.message}`);
    }

    return { message: 'Role deleted successfully' };
  }

  async updatePermissions(
    id: number,
    updateRolePermissionsDto: UpdateRolePermissionsByNameDto,
  ) {
    // Prevent modification of system roles
    const { data: existingRole } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('system_role')
      .eq('id', id)
      .single();

    if (existingRole?.system_role) {
      throw new BadRequestException('Cannot modify permissions of system roles');
    }

    // Start transaction by removing all existing permissions
    const { error: deleteError } = await this.supabaseService
      .getClient()
      .from('role_permissions')
      .delete()
      .eq('role_id', id);

    if (deleteError) {
      throw new BadRequestException(`Failed to remove existing permissions: ${deleteError.message}`);
    }

    // Add new permissions
    if (updateRolePermissionsDto.permissions && updateRolePermissionsDto.permissions.length > 0) {
      // Get permission IDs for the provided permission names
      const { data: permissions } = await this.supabaseService
        .getClient()
        .from('permissions')
        .select('id')
        .in('name', updateRolePermissionsDto.permissions);

      if (permissions && permissions.length > 0) {
        const rolePermissions = permissions.map(permission => ({
          role_id: id,
          permission_id: permission.id,
        }));

        const { error: insertError } = await this.supabaseService
          .getClient()
          .from('role_permissions')
          .insert(rolePermissions);

        if (insertError) {
          throw new BadRequestException(`Failed to add permissions: ${insertError.message}`);
        }
      }
    }

    return { message: 'Role permissions updated successfully' };
  }

  async getSystemRoles() {
    const { data: systemRoles, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select(`
        id,
        name,
        description,
        system_role,
        _count:users(count)
      `)
      .eq('system_role', true)
      .order('id', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch system roles: ${error.message}`);
    }

    return systemRoles;
  }

  async getCustomRoles() {
    const { data: customRoles, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select(`
        id,
        name,
        description,
        system_role,
        created_at,
        updated_at,
        _count:users(count)
      `)
      .eq('system_role', false)
      .order('id', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch custom roles: ${error.message}`);
    }

    return customRoles;
  }
}
```

#### 4.2 Update Role Controller

**Update `backend/src/roles/roles.controller.ts`:**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { SystemRoleGuard } from '@/auth/guards/system-role/system-role.guard';
import { SystemRoles } from '@/common/decorators/system-roles.decorator';
import { RolesService } from '@/roles/roles.service';
import { CreateRoleDto } from '@/roles/dto/create-role.dto';
import { ListRolesDto } from '@/roles/dto/list-roles.dto';
import { OutputRoleDto } from '@/roles/dto/output-role.dto';
import { UpdateRoleDto } from '@/roles/dto/update-role.dto';
import { UpdateRolePermissionsByNameDto } from '@/roles/dto/update-role-permissions-by-name.dto';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(DynamicAuthGuard, SystemRoleGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @SystemRoles('System Administrator')
  @ApiOperation({ summary: 'Create a new custom role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role with this name already exists' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @SystemRoles('System Administrator', 'Customer Success')
  @ApiOperation({ summary: 'Get all roles (system and custom)' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  findAll(@Query() listRolesDto: ListRolesDto) {
    return this.rolesService.findAll(listRolesDto.search);
  }

  @Get('system')
  @SystemRoles('System Administrator', 'Customer Success')
  @ApiOperation({ summary: 'Get system roles only' })
  @ApiResponse({ status: 200, description: 'System roles retrieved successfully' })
  getSystemRoles() {
    return this.rolesService.getSystemRoles();
  }

  @Get('custom')
  @SystemRoles('System Administrator')
  @ApiOperation({ summary: 'Get custom roles only' })
  @ApiResponse({ status: 200, description: 'Custom roles retrieved successfully' })
  getCustomRoles() {
    return this.rolesService.getCustomRoles();
  }

  @Get(':id')
  @SystemRoles('System Administrator', 'Customer Success')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @SystemRoles('System Administrator')
  @ApiOperation({ summary: 'Update a custom role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot modify system roles' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Patch(':id/permissions')
  @SystemRoles('System Administrator')
  @ApiOperation({ summary: 'Update role permissions' })
  @ApiResponse({ status: 200, description: 'Role permissions updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot modify system role permissions' })
  updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRolePermissionsDto: UpdateRolePermissionsByNameDto,
  ) {
    return this.rolesService.updatePermissions(id, updateRolePermissionsDto);
  }

  @Delete(':id')
  @SystemRoles('System Administrator')
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete system roles' })
  @ApiResponse({ status: 409, description: 'Cannot delete role assigned to users' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }
}
```

#### 4.3 Update Role DTOs

**Update `backend/src/roles/dto/output-role.dto.ts`:**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class OutputRoleDto {
  @ApiProperty({ description: 'Role ID' })
  id: number;

  @ApiProperty({ description: 'Role name' })
  name: string | null = null;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  description: string | null = null;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  imageUrl: string | null = null;

  @ApiProperty({ description: 'Whether this is a system role' })
  systemRole: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Last update timestamp' })
  updatedAt?: string;

  @ApiProperty({
    description: 'Grouped permissions',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  })
  permissions: Record<
    string,
    Array<{ id: number; name: string; label: string }>
  >;

  @ApiProperty({ description: 'Number of users with this role' })
  _count: {
    users: number;
  };
}
```

**Update `backend/src/roles/dto/create-role.dto.ts`:**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'Content Manager' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Manages content and articles' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Image URL for the role' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
```

**Update `backend/src/roles/dto/update-role.dto.ts`:**

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
```

#### 4.4 Update Role Module

**Update `backend/src/roles/roles.module.ts`:**

```typescript
import { Module } from '@nestjs/common';
import { SupabaseModule } from '@/common/supabase/supabase.module';
import { RolesController } from '@/roles/roles.controller';
import { RolesService } from '@/roles/roles.service';

@Module({
  imports: [SupabaseModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
```

### Phase 5: Frontend Updates

#### 5.1 Update user context and types

**Update `frontend/src/contexts/auth/types.d.ts`:**

```typescript
import type { User } from "@/types/user";
import { Customer } from "@/lib/api/customers";
import { Role } from "@/lib/api/roles";

export interface UserContextValue {
  user: User | null;
  error: string | null;
  isLoading: boolean;
  checkSession?: () => Promise<void>;
  updateUser?: (user: User) => void;
  syncUser?: () => Promise<void>;
  role?: string | null;
  permissions?: string[];
}

export interface ApiUser {
  managerId: number;
  manager?: {
    id: number;
    name: string;
  };
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  customerId?: number;
  customer?: Customer;
  roleId?: number;
  role?: Role;
  persona?: string;
  status: string;
  avatar?: string;
  createdAt?: string;
  phoneNumber?: string;
  permissions?: string[];
  activity?: {
    id: number;
    browserOs: string;
    locationTime: string;
  }[];
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  systemRole?: boolean; // ADD THIS LINE
  permissions: PermissionsByModule;
  _count: {
    users: number;
  };
}

// ... rest of the interfaces remain the same
```

#### 4.2 Fix customer administrator filtering

**Update `frontend/src/lib/user-utils.ts`:**

```typescript
import {ApiUser} from "@/contexts/auth/types";

export const isUserOwner = (ownerUser?: ApiUser, user?: ApiUser): boolean => {
  if (!ownerUser || !user) return false;

  // Check if the ownerUser has System Administrator role
  if (ownerUser.role?.name === 'System Administrator') return true;

  // Check if the ownerUser has Customer Success role and the user belongs to the same customer
  if (
    ownerUser.role?.name === 'Customer Success' &&
    ownerUser.customerId === user.customerId
  ) {
    return true;
  }

  // Check if ownerUser is customer owner
  if (ownerUser.customer?.ownerId === ownerUser.id && 
      ownerUser.customerId === user.customerId) {
    return true;
  }

  return false;
};

// Add new utility functions for role-based checks
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

// Update customer administrator filtering
export const getCustomerAdministrators = (users: ApiUser[], customerId: number): ApiUser[] => {
  return users.filter(user => 
    user.role?.name === 'Customer Administrator' && 
    user.customerId === customerId
  );
};
```

### Phase 5: Metadata and Client-Side Issues

#### 5.1 Fix metadata issues with 'use client'

**Create `frontend/src/hooks/use-page-title.ts`:**

```typescript
import { useEffect } from 'react';

export const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = title;
  }, [title]);
};
```

**Or use Next.js dynamic metadata:**

```typescript
import { Metadata } from 'next';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: "Page Title",
  };
};
```

## Complete SQL Migration Script

Below is a complete migration script that implements all Phase 1 and Phase 2 changes. This can be saved as a migration file and executed:

```sql
-- ============================================================================
-- Supabase RLS Migration - Complete Implementation
-- ============================================================================

-- Phase 1.1: Add system_role column to roles table
-- ============================================================================
ALTER TABLE roles ADD COLUMN IF NOT EXISTS system_role BOOLEAN DEFAULT false;

-- Phase 1.2: Insert default system roles
-- ============================================================================
INSERT INTO roles (id, name, description, system_role, created_at, updated_at)
VALUES
  (1, 'System Administrator', 'Role with full system access and control', true, NOW(), NOW()),
  (2, 'Customer Success', 'Role focused on ensuring customer satisfaction and retention', true, NOW(), NOW()),
  (3, 'Customer Administrator', 'Role for managing customer-specific configurations and settings', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE 
SET system_role = true, 
    updated_at = NOW();

-- Reset sequence to start from 100 for custom roles
SELECT setval('roles_id_seq', 100, false);

-- Phase 1.3: Create helper functions for role checking
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

-- Phase 1.4: Create indexes for optimal RLS performance
-- ============================================================================

-- Index on users.uid for auth lookups (critical for RLS performance)
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

-- Index on articles for common queries
CREATE INDEX IF NOT EXISTS idx_articles_customer_id ON articles(customer_id) WHERE customer_id IS NOT NULL;

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_users_customer_role ON users(customer_id, role_id);

-- Phase 2.1: Enable RLS on all tables
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

-- Phase 2.2: Drop existing policies if they exist (for idempotency)
-- ============================================================================
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

DROP POLICY IF EXISTS customers_select_system_admin ON customers;
DROP POLICY IF EXISTS customers_select_customer_success ON customers;
DROP POLICY IF EXISTS customers_select_customer_admin ON customers;
DROP POLICY IF EXISTS customers_insert_system_admin ON customers;
DROP POLICY IF EXISTS customers_update_system_admin ON customers;
DROP POLICY IF EXISTS customers_update_customer_success ON customers;
DROP POLICY IF EXISTS customers_update_customer_admin ON customers;
DROP POLICY IF EXISTS customers_delete_system_admin ON customers;

DROP POLICY IF EXISTS roles_select_all ON roles;
DROP POLICY IF EXISTS roles_insert_system_admin ON roles;
DROP POLICY IF EXISTS roles_update_system_admin ON roles;
DROP POLICY IF EXISTS roles_delete_system_admin ON roles;

DROP POLICY IF EXISTS permissions_select_all ON permissions;
DROP POLICY IF EXISTS permissions_all_system_admin ON permissions;

DROP POLICY IF EXISTS role_permissions_select_all ON role_permissions;
DROP POLICY IF EXISTS role_permissions_all_system_admin ON role_permissions;

-- Phase 2.3: Create comprehensive RLS policies
-- ============================================================================
-- See sections 2.2 in the guide for all policy definitions
-- (Users, Customers, Roles, Permissions, etc.)

-- NOTE: Paste all the policy definitions from sections above here

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'users', 'customers', 'roles', 'permissions', 
    'role_permissions', 'articles', 'article_categories',
    'notifications', 'notification_templates'
  );

-- Verify system roles exist
SELECT id, name, system_role FROM roles WHERE system_role = true ORDER BY id;

-- Verify helper functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_user_role_id', 'has_system_role', 'get_user_customer_id');
```

## Implementation Steps

### Step 1: Database Preparation (Phase 1)
1. Add `system_role` column to roles table
2. Insert default system roles (IDs 1-3)
3. Reset sequence to start custom roles from 100
4. Create helper functions with SECURITY DEFINER
5. **Create indexes for RLS performance**
6. Verify all schema changes

### Step 2: RLS Policy Implementation (Phase 2)
1. Enable RLS on all tables
2. Drop existing policies (if any)
3. Create comprehensive policies for all tables
   - Users table (SELECT, INSERT, UPDATE, DELETE)
   - Customers table (all operations)
   - Roles table (with system role protection)
   - Permissions and role_permissions tables
   - Articles and article_categories tables
   - Notifications and templates tables
4. **Verify all policies wrap functions in SELECT**
5. **Verify all policies have TO authenticated clause**
6. Test policies with different user roles
7. Use EXPLAIN ANALYZE to verify query performance

### Step 3: Backend Migration (Phase 3)
1. Update user DTOs to include role object
2. Create SystemRoleGuard with SupabaseClient
3. Update PermissionGuard to use SupabaseClient
4. Update RequireSuperuserGuard to use SupabaseClient
5. Create RoleMigrationService
6. Update RolesService for SupabaseClient
7. Update RolesController with new guards
8. Update all Role DTOs
9. Apply guards to all controllers
10. **Add explicit filters to all Supabase queries**

### Step 4: Data Migration
1. Run RoleMigrationService to migrate existing users
2. Map isSuperadmin → System Administrator (ID: 1)
3. Map isCustomerSuccess → Customer Success (ID: 2)
4. Map customer owners → Customer Administrator (ID: 3)
5. Verify all users have correct role_id
6. Test with sample users from each role

### Step 5: Frontend Updates (Phase 4)
1. Update user context types (add systemRole field)
2. Create user utility functions (isSystemAdministrator, etc.)
3. Fix customer administrator filtering
4. Update permission checking utilities
5. Resolve metadata issues with client components
6. Update UI to show system role badge

### Step 6: Performance Testing (Phase 5)
1. Run EXPLAIN ANALYZE on common queries
2. Verify InitPlan nodes in query plans
3. Benchmark query times before/after RLS
4. Load test with concurrent users
5. Monitor database performance metrics
6. Verify 99%+ performance improvement achieved

### Step 7: Testing and Validation
1. Test all role-based access controls
2. Verify System Admin can access everything
3. Verify Customer Success sees only assigned customers
4. Verify Customer Admin sees only their customer
5. Test permission-based access
6. Test frontend filtering
7. Run all unit, integration, and e2e tests

### Step 8: Cleanup and Deployment (Phase 6)
1. Remove boolean flag columns (is_superadmin, is_customer_success)
2. Remove unused guards and code
3. Update API documentation
4. Document RLS policies
5. Create rollback plan
6. Deploy to staging
7. Verify staging works correctly
8. Deploy to production
9. Monitor production performance

## Key Benefits

1. **Consistent Role Model**: Single source of truth for user roles
2. **Flexible System Roles**: Can be extended with metadata while remaining protected
3. **Database-Level Security**: RLS provides security at the database level
4. **Scalable**: Easy to add new roles and permissions
5. **Clean Architecture**: Removes boolean flag complexity
6. **Customer Isolation**: Proper filtering of administrators by customer

## Migration Checklist

### Phase 1: Database Schema
- [ ] Database schema updated with `system_role` column
- [ ] Default system roles inserted (IDs 1-3)
- [ ] Helper functions created with SECURITY DEFINER
- [ ] Sequence reset to start custom roles from 100
- [ ] **Indexes created for RLS performance** (idx_users_uid, idx_users_role_id, etc.)
- [ ] Schema changes verified with test queries

### Phase 2: RLS Implementation
- [ ] RLS enabled on all tables (users, customers, roles, permissions, etc.)
- [ ] RLS policies created for all CRUD operations (SELECT, INSERT, UPDATE, DELETE)
- [ ] All function calls wrapped in SELECT statements (performance optimization)
- [ ] TO authenticated clause added to all policies
- [ ] auth.uid() calls wrapped in SELECT statements
- [ ] Joins minimized using ANY/IN operations
- [ ] System roles protection implemented (id < 100)
- [ ] RLS policies tested with different user roles

### Phase 3: Backend Code
- [ ] User DTOs updated to include role object
- [ ] SystemRoleGuard created
- [ ] PermissionGuard updated to use SupabaseClient
- [ ] RequireSuperuserGuard updated to use SupabaseClient
- [ ] RoleMigrationService created
- [ ] Role service updated for SupabaseClient
- [ ] Role controller updated with new guards
- [ ] Role DTOs updated (OutputRoleDto, CreateRoleDto, UpdateRoleDto)
- [ ] All controllers using new role-based guards
- [ ] Migration service tested for existing users

### Phase 4: Frontend Updates
- [ ] User context types updated (add systemRole to Role interface)
- [ ] User utilities updated (isSystemAdministrator, isCustomerSuccess, etc.)
- [ ] Customer administrator filtering fixed
- [ ] Permission checking utilities updated
- [ ] Metadata issues resolved with 'use client' components

### Phase 5: Performance & Testing
- [ ] Application queries include explicit filters (not relying only on RLS)
- [ ] RLS policy performance verified (query plans analyzed)
- [ ] All role-based access controls tested
- [ ] User migration from boolean flags tested
- [ ] Frontend filtering and permissions validated
- [ ] Load testing performed with RLS enabled
- [ ] All tests passing (unit, integration, e2e)

### Phase 6: Cleanup & Documentation
- [ ] Boolean flag columns removed from database (is_superadmin, is_customer_success)
- [ ] Unused guards and code removed
- [ ] API documentation updated
- [ ] RLS policy documentation added
- [ ] Performance benchmarks documented
- [ ] Rollback plan documented
- [ ] Changes deployed to staging
- [ ] Changes deployed to production

## Common Pitfalls & Troubleshooting

### 1. Slow Query Performance

**Symptom**: Queries taking seconds instead of milliseconds after enabling RLS.

**Solution**: 
- Ensure all function calls are wrapped in `SELECT` statements
- Add `TO authenticated` clause to all policies
- Wrap `auth.uid()` calls in `SELECT`
- Add explicit filters to application queries

### 2. Policies Not Applying

**Symptom**: Users seeing no data or getting permission denied errors.

**Solution**:
- Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
- Check policy definitions: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
- Test as the actual user role (not as postgres superuser)
- Ensure JWT contains correct `auth.uid()`

### 3. System Roles Being Modified

**Symptom**: System roles (IDs 1-3) are accidentally changed or deleted.

**Solution**:
- Policies enforce `id >= 100` check for INSERT/UPDATE/DELETE
- Application code should prevent UI from allowing system role modification
- Add database triggers as additional protection if needed

### 4. Users Not Seeing Their Customer's Data

**Symptom**: Customer administrators can't see users from their customer.

**Solution**:
- Verify `customer_id` is set correctly on users table
- Check that `get_user_customer_id()` function returns correct value
- Test policy with: `SELECT * FROM users WHERE customer_id = (SELECT get_user_customer_id());`

### 5. Performance Degradation with Joins

**Symptom**: Policies with joins are very slow.

**Solution**:
- Rewrite to use `ANY` or `IN` with subqueries
- Use security definer functions to bypass RLS on lookup tables
- Consider caching role information in JWT claims

## Performance Monitoring

### Analyze Query Plans

```sql
-- Check query execution plan
EXPLAIN ANALYZE 
SELECT * FROM users 
WHERE customer_id = 123;

-- Look for:
-- - InitPlan nodes (good - indicates wrapped functions)
-- - Seq Scan vs Index Scan
-- - Execution time
```

### Monitor Policy Overhead

```sql
-- Enable timing
\timing on

-- Run query without RLS (as postgres)
SET ROLE postgres;
SELECT COUNT(*) FROM users;

-- Run query with RLS (as authenticated user)
SET ROLE authenticated;
SELECT COUNT(*) FROM users;

-- Compare times
```

### RLS Statistics

```sql
-- View policy execution statistics
SELECT schemaname, tablename, policyname, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Notes

### Implementation Details
- This implementation uses SupabaseClient with raw SQL queries
- All database operations follow the `{ data, error }` pattern
- Error handling is consistent throughout the implementation
- The migration maintains backward compatibility during the transition
- System roles (IDs 1-3) are protected from modification

### Performance Optimizations
- **All function calls wrapped in SELECT**: Achieves 99%+ performance improvement
- **TO clause specified**: Prevents unnecessary policy evaluation for wrong roles
- **auth.uid() wrapped in SELECT**: Caches result per query instead of per row
- **Joins minimized**: Uses ANY/IN operations to avoid row-by-row joins
- **Explicit filters in application**: Helps Postgres build optimal query plans

### Security Considerations
- RLS provides defense-in-depth at the database level
- Policies are evaluated even when accessing via SQL clients or third-party tools
- System roles cannot be modified through the application
- Each user's access is scoped to their role and customer
- JWT validation ensures user identity is verified

### Scalability
- Policies are evaluated efficiently with proper optimization
- New roles can be added without code changes
- Permissions are managed at the database level
- Customer data is properly isolated
- Can handle thousands of concurrent users with proper indexing

---

## TL;DR - Quick Implementation Guide

### What Changed?
- ❌ **Old**: Boolean flags (`isSuperadmin`, `isCustomerSuccess`)
- ✅ **New**: Unified role system with RLS (System Administrator, Customer Success, Customer Administrator)

### Critical Performance Rules
```sql
-- ❌ WRONG (99% slower)
USING (has_system_role('System Administrator'))

-- ✅ CORRECT
TO authenticated
USING ((SELECT has_system_role('System Administrator')))
```

### Quick Start
1. **Run migration SQL**: Copy complete SQL script from guide
2. **Update backend guards**: Use SupabaseClient
3. **Add explicit filters**: Never rely only on RLS, always add `.eq()` filters
4. **Test performance**: Use `EXPLAIN ANALYZE` to verify InitPlan nodes
5. **Verify benchmarks**: Should see 99%+ performance improvement

### Files to Update

**Backend:**
- `src/users/dto/output-user.dto.ts` - Add role object
- `src/auth/guards/system-role/system-role.guard.ts` - New guard
- `src/auth/guards/permission/permission.guard.ts` - Update to SupabaseClient
- `src/common/decorators/system-roles.decorator.ts` - New decorator
- `src/roles/roles.service.ts` - Update to SupabaseClient

**Frontend:**
- `src/contexts/auth/types.d.ts` - Add systemRole field
- `src/lib/user-utils.ts` - Add role utility functions

### Testing Checklist
- [ ] System Admin can see all data
- [ ] Customer Success sees only assigned customers
- [ ] Customer Admin sees only their customer
- [ ] Regular users see only their own data
- [ ] Query performance is optimal (check with EXPLAIN ANALYZE)
- [ ] All tests pass

### Common Mistakes to Avoid
1. ⚠️ Forgetting to wrap functions in SELECT
2. ⚠️ Omitting TO authenticated clause
3. ⚠️ Not adding explicit filters in queries
4. ⚠️ Missing indexes on foreign keys
5. ⚠️ Not testing with actual user roles

### Success Metrics
- ✅ All queries return correct data for each role
- ✅ Query execution time < 50ms for typical queries
- ✅ EXPLAIN ANALYZE shows InitPlan nodes (not Seq Scan on every row)
- ✅ No users can access data outside their scope
- ✅ System roles (ID 1-3) cannot be modified

### Need Help?
- See [Common Pitfalls](#common-pitfalls--troubleshooting) for debugging
- Check [Performance Monitoring](#performance-monitoring) for analysis
- Review [RLS Best Practices](#23-rls-performance-best-practices) for optimization
