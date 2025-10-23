# Code Changes Summary

## Overview
This document tracks the code changes made to adapt to the new unified Baseplate database schema.

## ✅ Completed Changes

### 1. Database Layer
- [x] Created new unified schema migration (`20241001000000_baseplate_unified_schema.sql`)
- [x] Updated `database.types.ts` with all new interfaces and enums
- [x] Created `schema-mappers.ts` helper functions
- [x] Updated `database.service.ts` table accessors (added `subscription_types`)
- [x] Created RLS policies migration (`20251022000000_enable_rls_policies.sql`)
- [x] Created seed data migration (`20251021130435_seed_subscription_types.sql`)

### 2. Services - Fully Updated
- [x] **users.service.ts** - Complete rewrite with:
  - All column names updated (uid → auth_user_id, first_name/last_name → full_name, etc.)
  - Using `buildUserDbData()` and `parseUserFromDb()` helpers
  - Updated all where clauses to use new primary keys (user_id)
  - UserStatus enum usage
  - Proper handling of full_name field

- [x] **customers.service.ts** - Complete rewrite with:
  - All column names updated (domain → email_domain, status → lifecycle_stage, etc.)
  - Using CustomerLifecycleStage enum
  - Updated primary keys (customer_id)
  - Updated foreign keys (subscription_type_id instead of subscription_id)
  - Using `parseUserName()` for name handling

- [x] **roles.service.ts** - Complete rewrite with:
  - JSONB permissions instead of junction table
  - Updated column names (role_id, is_system_role)
  - Removed role_permissions junction table logic
  - Added new methods: `getRolePermissions()`, `hasPermission()`
  - System role protection using is_system_role flag

### 3. Documentation
- [x] `DATABASE_MIGRATION_GUIDE.md` - Comprehensive migration guide
- [x] `COLUMN_MIGRATION_MAP.md` - Detailed column mapping reference
- [x] `CODE_CHANGES_SUMMARY.md` - This file

## 🔨 Remaining Changes Needed

### Services to Update

#### 1. article-categories.service.ts
**Key Changes Needed:**
```typescript
// Primary key
- where: { id, customer_id }
+ where: { article_category_id, customer_id }

// New fields to support
+ slug: string
+ parent_id: string (for hierarchy)
+ display_order: number
- subcategory (replaced by hierarchy)
```

#### 2. articles.service.ts
**Key Changes Needed:**
```typescript
// Primary keys
- id → article_id
- category_id already references article_category_id

// Column renames
- views_number → view_count

// New fields
+ slug: string
+ summary: string
+ published_at: timestamptz
+ featured: boolean
+ metadata: jsonb
+ updated_by: user_id

// Status enum
- status: string
+ status: ArticleStatus enum

// In queries
- article_categories!category_id(*)
+ article_categories!category_id(article_category_id, name, slug)

- users!created_by(id, first_name, last_name)
+ users!created_by(user_id, full_name)
```

#### 3. notifications.service.ts
**Key Changes Needed:**
```typescript
// Primary key
- id → notification_id

// Column renames
- type → notification_type
- is_read → removed (use status enum instead)
+ status: NotificationStatus enum
- title → subject
- message → body
+ archived_at: timestamptz

// Status handling
- is_read: boolean
+ status: 'unread' | 'read' | 'archived' | 'deleted'

// In queries
- notification_id
- notification_type
- status (enum)
```

#### 4. templates.service.ts (notification templates)
**Key Changes Needed:**
```typescript
// Primary key
- id → template_id

// Column renames
- type → notification_type
- message → body
+ subject: string
+ variables: jsonb
+ is_active: boolean

// Removed fields
- title (use name)
- comment
```

#### 5. managers.service.ts
**Key Changes Needed:**
```typescript
// Primary key
- id → manager_id

// New fields (significant change!)
+ auth_user_id: uuid
+ email: string
+ full_name: string
+ active: boolean
- name (use full_name)

// Managers are now proper user entities with auth
```

#### 6. bootstrap.service.ts
**Key Changes Needed:**
```typescript
// Role creation
- Use new role structure with JSONB permissions
- Use is_system_role flag
- Create subscription_types instead of subscriptions

// System roles
- Use role_id as primary key
- Set permissions as JSONB array
- Set is_system_role = true
```

#### 7. register.service.ts
**Key Changes Needed:**
```typescript
// Customer creation
- domain → email_domain
- status → lifecycle_stage (CustomerLifecycleStage.ONBOARDING)
- subscription_id → subscription_type_id
+ active: true

// User creation
- Use buildUserDbData() helper
- first_name/last_name → full_name
```

### Helper Files to Update

#### 8. decorators/customer-id.decorator.ts
**Check For:**
- Any hardcoded column names
- Update to use customer_id if needed

#### 9. guards (auth guards)
**Check For:**
- uid → auth_user_id in queries
- role checks using is_system_role
- Permission checks using JSONB field

### DTOs - Review Only

Most DTOs are fine as they use camelCase for the API. The service layer handles the conversion.

**Check These:**
- Any DTOs that directly expose database column names
- Ensure status fields map to correct enums
- Update any hard-coded 'id' references to be specific (userId, customerId, etc.)

## Conversion Pattern

For each service, follow this pattern:

### 1. Update Column Names in Where Clauses
```typescript
// OLD
where: { id: userId, customer_id: customerId }

// NEW
where: { user_id: userId, customer_id: customerId }
```

### 2. Update Column Names in Data
```typescript
// OLD
data: {
  first_name: dto.firstName,
  last_name: dto.lastName,
  uid: dto.uid,
}

// NEW - use helpers
import { buildUserDbData } from '@/common/helpers/schema-mappers';

data: buildUserDbData({
  firstName: dto.firstName,
  lastName: dto.lastName,
  uid: dto.uid,
})
```

### 3. Update Column Names in Select Queries
```typescript
// OLD
select: `
  *,
  users!created_by(id, first_name, last_name)
`

// NEW
select: `
  *,
  users!created_by(user_id, full_name)
`
```

### 4. Update Result Parsing
```typescript
// OLD
return {
  id: user.id,
  firstName: user.first_name,
  lastName: user.last_name,
}

// NEW - use helpers
import { parseUserFromDb } from '@/common/helpers/schema-mappers';

return parseUserFromDb(user);
```

### 5. Update Foreign Key References
```typescript
// OLD
subscription_id: dto.subscriptionId,

// NEW
subscription_type_id: dto.subscriptionId,  // Points to subscription_types table
```

## Testing Checklist

After updates:

1. [ ] All services compile without errors
2. [ ] Database migrations run successfully
3. [ ] User CRUD operations work
4. [ ] Customer CRUD operations work  
5. [ ] Role CRUD operations work
6. [ ] Article CRUD operations work
7. [ ] Notification operations work
8. [ ] Authentication still works (uid → auth_user_id)
9. [ ] RLS policies work correctly
10. [ ] Frontend API still works (DTOs maintained compatibility)

## Quick Reference: Common Substitutions

### Primary Keys
| Old | New |
|-----|-----|
| `users.id` | `users.user_id` |
| `customers.id` | `customers.customer_id` |
| `roles.id` | `roles.role_id` |
| `articles.id` | `articles.article_id` |
| `article_categories.id` | `article_categories.article_category_id` |
| `notifications.id` | `notifications.notification_id` |
| `notification_templates.id` | `notification_templates.template_id` |
| `managers.id` | `managers.manager_id` |

### Column Renames
| Old | New | Table |
|-----|-----|-------|
| `uid` | `auth_user_id` | users |
| `first_name + last_name` | `full_name` | users |
| `avatar` | `avatar_url` | users |
| `domain` | `email_domain` | customers |
| `status` | `lifecycle_stage` | customers |
| `subscription_id` | `subscription_type_id` | customers |
| `system_role` | `is_system_role` | roles |
| `views_number` | `view_count` | articles |
| `is_read` | `status` (enum) | notifications |
| `type` | `notification_type` | notifications |
| `title` | `subject` | notifications |
| `message` | `body` | notifications |

### Table Renames
| Old | New |
|-----|-----|
| `subscriptions` | `subscription_types` |

### New Tables
- `customer_subscriptions` - Tracks customer subscription status
- `user_invitations` - Formal invitation system
- `taxonomies` - Hierarchical categorization
- `extension_data_types` - Custom field definitions
- `extension_data` - Custom field values
- `audit_logs` - System audit trail

## Status Summary

**Services:**
- ✅ Completed: 3/11 (users, customers, roles)
- 🔨 In Progress: 0/11
- ⏳ Pending: 8/11 (articles, article-categories, notifications, templates, managers, bootstrap, register, +misc)

**Estimated Remaining Work:**
- ~4-6 hours for remaining services
- ~2-3 hours for testing and fixes
- Total: ~6-9 hours

## Next Steps

1. Update article-categories.service.ts
2. Update articles.service.ts
3. Update notifications.service.ts
4. Update templates.service.ts
5. Update managers.service.ts
6. Update bootstrap.service.ts
7. Update register.service.ts
8. Review and update remaining helpers/decorators
9. Run comprehensive tests
10. Fix any issues that arise

## Notes

- Helper functions in `schema-mappers.ts` significantly reduce repetitive code
- DTOs remain camelCase for API compatibility
- Service layer handles all snake_case ↔ camelCase conversion
- RLS policies use new column names and functions
- System roles now use JSONB permissions (simpler, more performant)

