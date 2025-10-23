# Database Migration Guide

## Overview

This guide documents the migration from the old database schema to the **Unified Baseplate Schema** following Baseplate database conventions.

## What Changed

### ✅ Completed

1. **New Initial Migration** (`20241001000000_baseplate_unified_schema.sql`)
   - Complete schema with Baseplate conventions
   - UUID primary keys with full table names (e.g., `user_id`, `customer_id`)
   - Comprehensive enum types
   - RLS helper functions
   - Automatic timestamp triggers
   - Extension data paradigm

2. **Updated Database Types** (`src/common/types/database.types.ts`)
   - All interfaces match new schema
   - New enum types (UserStatus, CustomerLifecycleStage, etc.)
   - Updated column names with proper prefixes

3. **Helper Functions** (`src/common/helpers/schema-mappers.ts`)
   - User name conversion (first_name + last_name ↔ full_name)
   - Status mapping functions
   - Database data builders (buildUserDbData, buildCustomerDbData)
   - Column name mapping utilities

4. **RLS Policies** (`20251022000000_enable_rls_policies.sql`)
   - Comprehensive RLS policies for all tables
   - Updated helper functions using new column names
   - Performance indexes

5. **Subscription Types Seed** (`20251021130435_seed_subscription_types.sql`)
   - Seeds subscription_types table (was subscriptions)

## Migration Files Status

| File | Status | Notes |
|------|--------|-------|
| `20241001000000_initial_schema_uuid.sql` | ❌ DELETED | Replaced by unified schema |
| `20241001000000_baseplate_unified_schema.sql` | ✅ NEW | Complete unified schema |
| `20251013204433_add_rls_and_system_roles.sql` | ❌ DELETED | Now in initial schema + RLS migration |
| `20251015184440_remove_superadmin_flags.sql` | ❌ DELETED | No longer needed |
| `20251021130435_add_subscriptions.sql` | ✅ UPDATED | Renamed to seed_subscription_types.sql |
| `20251022000000_enable_rls_policies.sql` | ✅ NEW | RLS policies for unified schema |

## Key Schema Changes

### Table Name Changes
- `subscriptions` → `subscription_types` (subscription plans)
- New table: `customer_subscriptions` (customer subscription status)
- New table: `user_invitations`
- New table: `taxonomies`
- New table: `extension_data_types`
- New table: `extension_data`
- New table: `audit_logs`

### Primary Key Changes
All primary keys now use full table name:
- `id` → `user_id` (users table)
- `id` → `customer_id` (customers table)
- `id` → `role_id` (roles table)
- `id` → `article_category_id` (article_categories)
- `id` → `article_id` (articles)
- `id` → `notification_id` (notifications)
- `id` → `template_id` (notification_templates)
- `id` → `manager_id` (managers)

### User Fields
- `first_name` + `last_name` → `full_name` (combined)
- `uid` → `auth_user_id`
- `avatar` → `avatar_url`
- `status` now uses `UserStatus` enum

### Customer Fields
- `domain` → `email_domain`
- `status` → `lifecycle_stage` (now CustomerLifecycleStage enum)
- `subscription_id` → `subscription_type_id`
- Added: `active` (boolean)
- Added: `stripe_customer_id`
- Added: `onboarded_at`, `churned_at`
- Added: `metadata` (jsonb)

### Role Fields
- `system_role` → `is_system_role`
- Added: `display_name`
- Added: `permissions` (jsonb array, replacing role_permissions junction)

### Article Fields
- Added: `slug`, `summary`, `published_at`, `featured`, `metadata`, `updated_by`
- `views_number` → `view_count`
- `status` now uses `ArticleStatus` enum
- Categories now use hierarchical `parent_id` instead of flat subcategory

### Notification Fields
- Added: `status` (NotificationStatus enum)
- `type` → `notification_type`
- `is_read` removed (use status instead)
- `title` → `subject`
- `message` → `body`

## Code Migration Strategy

### Phase 1: Database Layer (✅ DONE)
- New migration files
- Updated database.types.ts
- Helper functions

### Phase 2: Service Layer (🔨 IN PROGRESS)

Services need updates to:
1. Use new column names in queries
2. Handle first_name/last_name → full_name conversion
3. Use new enum values
4. Reference correct table names

**Example: User Service Updates**

```typescript
// OLD CODE
const userData = {
  email: dto.email,
  first_name: dto.firstName,
  last_name: dto.lastName,
  uid: dto.uid,
  avatar: dto.avatar,
};

// NEW CODE
import { buildUserDbData } from '@/common/helpers/schema-mappers';

const userData = buildUserDbData({
  email: dto.email,
  firstName: dto.firstName,
  lastName: dto.lastName,
  uid: dto.uid,
  avatar: dto.avatar,
});
```

**Example: Customer Service Updates**

```typescript
// OLD CODE
const customerData = {
  name: dto.name,
  domain: getDomainFromEmail(email),
  status: 'active',
  subscription_id: dto.subscriptionId,
};

// NEW CODE
import { buildCustomerDbData, CustomerLifecycleStage } from '@/common/helpers/schema-mappers';

const customerData = buildCustomerDbData({
  name: dto.name,
  emailDomain: getDomainFromEmail(email),
  lifecycleStage: CustomerLifecycleStage.ACTIVE,
  subscriptionTypeId: dto.subscriptionId,
  active: true,
});
```

**Query Updates**

```typescript
// OLD: Using old column names
await database.findFirst('users', {
  where: { uid: authUid, deleted_at: null },
});

// NEW: Using new column names
await database.findFirst('users', {
  where: { auth_user_id: authUid, deleted_at: null },
});
```

**Parsing Database Results**

```typescript
// OLD: Direct mapping
return {
  id: user.id,
  firstName: user.first_name,
  lastName: user.last_name,
};

// NEW: Using helper
import { parseUserFromDb } from '@/common/helpers/schema-mappers';

return parseUserFromDb(user);
```

### Phase 3: DTO Layer (⏳ TODO)

DTOs can remain camelCase for API consistency. The mapping happens at service layer.

**Review needed for:**
- ✅ `OutputUserDto` - already camelCase, good
- ✅ `CreateUserDto` - already camelCase, good
- ✅ `CreateCustomerDto` - already camelCase, good
- ⚠️ Any DTOs that directly expose database column names

### Phase 4: Controllers (⏳ TODO)

Controllers typically don't need changes if:
- They use DTOs (already camelCase)
- They use services (which handle mapping)

**Check for:**
- Direct database queries in controllers (move to services)
- Response transformations that assume old column names

### Phase 5: Testing (⏳ TODO)

- Update test fixtures with new column names
- Update seed data
- Test all CRUD operations
- Verify RLS policies work correctly

## Files That Need Updates

### High Priority (Core Functionality)

1. **Users Service** (`src/users/users.service.ts`)
   - [ ] Update all database queries to use `auth_user_id` instead of `uid`
   - [ ] Use `buildUserDbData()` for inserts/updates
   - [ ] Use `parseUserFromDb()` for result mapping
   - [ ] Update queries to use `full_name` field
   - [ ] Handle UserStatus enum properly

2. **Customers Service** (`src/customers/customers.service.ts`)
   - [ ] Update to use `email_domain` instead of `domain`
   - [ ] Change `status` references to `lifecycle_stage`
   - [ ] Update `subscription_id` to `subscription_type_id`
   - [ ] Use `buildCustomerDbData()` helper
   - [ ] Use CustomerLifecycleStage enum

3. **Roles Service** (`src/roles/roles.service.ts`)
   - [ ] Update to use `role_id` instead of `id`
   - [ ] Handle `is_system_role` flag
   - [ ] Update permissions handling (now JSONB instead of junction table)

4. **Articles Service** (`src/articles/articles.service.ts`)
   - [ ] Update to use `article_id`, `article_category_id`
   - [ ] Handle ArticleStatus enum
   - [ ] Update `views_number` to `view_count`

5. **Notifications Service** (`src/notifications/notifications.service.ts`)
   - [ ] Update to use `notification_id`, `template_id`
   - [ ] Change `is_read` boolean to `status` enum
   - [ ] Update `type` to `notification_type`
   - [ ] Handle NotificationStatus enum

### Medium Priority

6. **Managers Service** (`src/managers/managers.service.ts`)
   - [ ] Update to use `manager_id`
   - [ ] Handle new `auth_user_id`, `email`, `full_name` fields

7. **Bootstrap Service** (`src/common/bootstrap/bootstrap.service.ts`)
   - [ ] Update initialization logic for new schema
   - [ ] Ensure system roles are created correctly

8. **Register Service** (`src/register/register.service.ts`)
   - [ ] Update customer registration flow
   - [ ] Handle new lifecycle_stage
   - [ ] Use subscription_types instead of subscriptions

### Low Priority

9. **Taxonomies Service** (`src/taxonomies/taxonomies.service.ts`)
   - [ ] Update for new taxonomies table structure

10. **System Modules** (`src/system-modules/`)
    - [ ] Review and update any hard-coded references

## Helper Functions Reference

### User Name Handling

```typescript
import {
  combineUserName,
  parseUserName,
} from '@/common/helpers/schema-mappers';

// Combine first and last name
const fullName = combineUserName('John', 'Doe'); // "John Doe"

// Parse full name
const { firstName, lastName } = parseUserName('John Doe');
```

### Status Conversions

```typescript
import {
  mapOldCustomerStatusToLifecycleStage,
  mapLifecycleStageToOldStatus,
} from '@/common/helpers/schema-mappers';

// Convert old status to new
const stage = mapOldCustomerStatusToLifecycleStage('active');
// Returns: CustomerLifecycleStage.ACTIVE

// Convert new to old (for API compatibility)
const status = mapLifecycleStageToOldStatus(CustomerLifecycleStage.ACTIVE);
// Returns: 'active'
```

### Database Data Builders

```typescript
import {
  buildUserDbData,
  buildCustomerDbData,
} from '@/common/helpers/schema-mappers';

// Build user data for database
const userData = buildUserDbData({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  uid: 'auth-uid-123',
  customerId: 'customer-uuid',
});
// Returns: { email, full_name, auth_user_id, customer_id }

// Build customer data
const customerData = buildCustomerDbData({
  name: 'Acme Corp',
  domain: 'acme.com',
  status: 'active',
  subscriptionId: 'sub-uuid',
});
// Returns: { name, email_domain, lifecycle_stage, subscription_type_id }
```

### Database Result Parsers

```typescript
import {
  parseUserFromDb,
  parseCustomerFromDb,
} from '@/common/helpers/schema-mappers';

// Parse database user to DTO format
const user = await database.findOne('users', { where: { user_id: id } });
const userDto = parseUserFromDb(user);
// Returns: { id, firstName, lastName, uid, avatar, ... }

// Parse database customer to DTO format
const customer = await database.findOne('customers', {
  where: { customer_id: id },
});
const customerDto = parseCustomerFromDb(customer);
// Returns: { id, name, domain, status, ... }
```

## Testing the Migration

### 1. Database Reset
```bash
# Reset your local database
cd backend
npm run supabase:reset
```

### 2. Run Migrations
```bash
# Migrations should run automatically on reset
# Or manually:
npm run supabase:migrate
```

### 3. Verify Schema
```sql
-- Check tables exist with correct columns
\d users
\d customers
\d roles
-- etc.

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check helper functions exist
\df public.current_user_id
\df public.current_customer_id
\df public.has_role
```

### 4. Test CRUD Operations
- Create a user
- Create a customer
- Assign roles
- Test RLS policies

## Rollback Plan

If you need to rollback:

1. The old migration file was deleted, but you can restore from git history
2. Revert the database.types.ts changes
3. Remove the helper functions file
4. Reset the database and re-run old migrations

## Next Steps

1. ✅ Database schema updated
2. ✅ Types updated
3. ✅ Helper functions created
4. 🔨 Update services systematically (use helpers)
5. ⏳ Update DTOs if needed
6. ⏳ Test all endpoints
7. ⏳ Update frontend if column names leaked to API
8. ⏳ Deploy to staging
9. ⏳ Final testing
10. ⏳ Deploy to production

## Questions or Issues?

If you encounter issues:

1. Check `COLUMN_MIGRATION_MAP.md` for column name mappings
2. Use helper functions in `schema-mappers.ts`
3. Verify database types in `database.types.ts`
4. Check RLS policies in the migration file

## Additional Resources

- [Baseplate Database Conventions](./COLUMN_MIGRATION_MAP.md)
- [Schema Mapper Utilities](../src/common/helpers/schema-mappers.ts)
- [Database Types](../src/common/types/database.types.ts)
- [RLS Implementation](./RLS_IMPLEMENTATION_SUMMARY.md)

