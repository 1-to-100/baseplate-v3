# Database Column Migration Map

This document maps old column names to new column names following Baseplate conventions.

## Key Changes

### 1. Primary Key Changes
- All primary keys now use full table name prefix
- Format: `{table_name}_id` instead of just `id`

### 2. Foreign Key Changes
- All foreign keys use full table name prefix
- Format: `{referenced_table}_id`

### 3. User Fields
- `first_name` + `last_name` → `full_name` (combined in application layer)
- `uid` → `auth_user_id`
- `avatar` → `avatar_url`
- `email_verified` → remains same
- Status enum updated to `UserStatus` type

### 4. Customer Fields
- `domain` → `email_domain`
- `status` → `lifecycle_stage` (enum changed from CustomerStatus to CustomerLifecycleStage)
- `subscription_id` → `subscription_type_id` (references subscription_types, not subscriptions)
- Added: `active` (boolean)
- Added: `onboarded_at`, `churned_at`
- Removed: `customer_success_id` reference (now handled via manager_id pattern)

### 5. Role Fields
- Roles now use `permissions` JSONB field instead of role_permissions junction table
- Added: `display_name`, `is_system_role`
- Changed: permissions stored as JSON array

### 6. Article Fields
- `category_id` → references `article_category_id`
- Added: `slug`, `summary`, `published_at`, `featured`, `metadata`, `updated_by`
- `status` changed to `ArticleStatus` enum
- `views_number` → `view_count`

### 7. Notification Fields
- Added: `status` (NotificationStatus enum)
- Changed: `type` to `notification_type`
- Changed: `is_read` removed, status used instead
- Primary key: `notification_id`

### 8. New Tables
- `subscription_types` - replaces subscription plans (was `subscriptions`)
- `customer_subscriptions` - tracks customer subscription status
- `user_invitations` - formal invitation system
- `taxonomies` - hierarchical categorization
- `extension_data_types` - custom field definitions
- `extension_data` - custom field values
- `audit_logs` - system audit trail

## Table-by-Table Mapping

### users table
| Old Column | New Column | Type Change | Notes |
|------------|------------|-------------|-------|
| `id` | `user_id` | - | Primary key renamed |
| `uid` | `auth_user_id` | - | Clearer naming |
| `first_name` | (removed) | - | Combined into `full_name` |
| `last_name` | (removed) | - | Combined into `full_name` |
| - | `full_name` | NEW | Single field for name |
| `avatar` | `avatar_url` | - | Clearer naming |
| `status` | `status` | ENUM | Now uses UserStatus enum |
| - | `last_login_at` | NEW | Track last login |
| - | `preferences` | NEW | JSONB for user prefs |

### customers table
| Old Column | New Column | Type Change | Notes |
|------------|------------|-------------|-------|
| `id` | `customer_id` | - | Primary key renamed |
| `domain` | `email_domain` | - | Clearer naming |
| `status` | `lifecycle_stage` | ENUM | CustomerLifecycleStage enum |
| - | `active` | NEW | Boolean active flag |
| `subscription_id` | `subscription_type_id` | FK | References subscription_types |
| - | `stripe_customer_id` | NEW | Stripe integration |
| - | `onboarded_at` | NEW | Track onboarding |
| - | `churned_at` | NEW | Track churn |
| - | `metadata` | NEW | JSONB for extra data |

### roles table
| Old Column | New Column | Type Change | Notes |
|------------|------------|-------------|-------|
| `id` | `role_id` | - | Primary key renamed |
| `name` | `name` | - | Unchanged |
| - | `display_name` | NEW | User-friendly name |
| `description` | `description` | - | Unchanged |
| `image_url` | (removed) | - | Not needed |
| - | `is_system_role` | NEW | Flag for system roles |
| - | `permissions` | NEW | JSONB array of permissions |

### article_categories table
| Old Column | New Column | Type Change | Notes |
|------------|------------|-------------|-------|
| `id` | `article_category_id` | - | Primary key renamed |
| `name` | `name` | - | Unchanged |
| `subcategory` | (removed) | - | Use parent_id instead |
| - | `slug` | NEW | URL-friendly identifier |
| - | `description` | NEW | Category description |
| - | `parent_id` | NEW | Hierarchical structure |
| `about` | (removed) | - | Use description |
| `icon` | `icon` | - | Unchanged |
| - | `display_order` | NEW | Ordering support |

### articles table
| Old Column | New Column | Type Change | Notes |
|------------|------------|-------------|-------|
| `id` | `article_id` | - | Primary key renamed |
| `category_id` | `category_id` | FK | References article_category_id |
| `subcategory` | (removed) | - | Use category hierarchy |
| - | `slug` | NEW | URL-friendly identifier |
| - | `summary` | NEW | Article summary |
| `status` | `status` | ENUM | ArticleStatus enum |
| - | `published_at` | NEW | Publication timestamp |
| `video_url` | `video_url` | - | Unchanged |
| `views_number` | `view_count` | - | Renamed |
| - | `featured` | NEW | Featured flag |
| - | `metadata` | NEW | JSONB for extra data |
| `created_by` | `created_by` | - | Unchanged |
| - | `updated_by` | NEW | Track who updated |

### notification_templates table
| Old Column | New Column | Type Change | Notes |
|------------|------------|-------------|-------|
| `id` | `template_id` | - | Primary key renamed |
| `title` | (removed) | - | Use name |
| - | `name` | NEW | Template name |
| - | `subject` | NEW | Email subject |
| `message` | `body` | - | Renamed |
| `comment` | (removed) | - | Not needed |
| `type` | `notification_type` | ENUM | NotificationType enum |
| `channel` | `channel` | - | Unchanged |
| - | `variables` | NEW | JSONB for template vars |
| - | `is_active` | NEW | Active flag |

### notifications table
| Old Column | New Column | Type Change | Notes |
|------------|------------|-------------|-------|
| `id` | `notification_id` | - | Primary key renamed |
| `user_id` | `user_id` | - | Unchanged |
| `customer_id` | `customer_id` | - | Unchanged |
| `sender_id` | (removed) | - | Not in new schema |
| `type` | `notification_type` | ENUM | NotificationType enum |
| - | `status` | NEW | NotificationStatus enum |
| `title` | `subject` | - | Renamed |
| `message` | `body` | - | Renamed |
| `template_id` | `template_id` | - | Unchanged |
| `metadata` | `metadata` | - | Unchanged |
| `channel` | `channel` | - | Unchanged |
| `is_read` | (removed) | - | Use status instead |
| `read_at` | `read_at` | - | Unchanged |
| - | `archived_at` | NEW | Archive timestamp |
| `generated_by` | (removed) | - | Not needed |

### managers table
| Old Column | New Column | Type Change | Notes |
|------------|------------|-------------|-------|
| `id` | `manager_id` | - | Primary key renamed |
| - | `auth_user_id` | NEW | Link to auth system |
| - | `email` | NEW | Manager email |
| - | `full_name` | NEW | Manager name |
| `name` | (removed) | - | Use full_name |
| - | `active` | NEW | Active flag |

## Migration Strategy

1. **Phase 1: Database Schema** ✅
   - Create new initial migration with correct schema
   - Update database.types.ts with new types

2. **Phase 2: Service Layer** (Current)
   - Update all database queries to use new column names
   - Update enum usages
   - Handle first_name/last_name → full_name conversion

3. **Phase 3: DTO Layer**
   - DTOs can keep camelCase for API consistency
   - Update internal field mappings

4. **Phase 4: Controllers**
   - Update any direct database references
   - Verify API responses match DTOs

5. **Phase 5: Testing**
   - Update test data
   - Verify all endpoints work

## Conversion Functions Needed

```typescript
// User name handling
function combineUserName(firstName?: string, lastName?: string): string {
  return `${firstName || ''} ${lastName || ''}`.trim() || 'Unnamed User';
}

function parseUserName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

// Status conversions
function mapOldCustomerStatusToLifecycleStage(status: string): CustomerLifecycleStage {
  const mapping: Record<string, CustomerLifecycleStage> = {
    'active': CustomerLifecycleStage.ACTIVE,
    'inactive': CustomerLifecycleStage.ONBOARDING,
    'suspended': CustomerLifecycleStage.CHURNED,
  };
  return mapping[status] || CustomerLifecycleStage.ONBOARDING;
}
```

## Breaking Changes

1. **API Responses**: If any APIs return raw database objects, they will have different field names
2. **Permissions System**: Changed from junction table to JSONB array
3. **Customer Status**: Enum values changed
4. **Notification Status**: Changed from boolean `is_read` to enum `status`
5. **User Names**: Backend now stores as single `full_name` field

## Backward Compatibility Notes

- DTOs should maintain camelCase for API consistency
- Internal database wrapper handles snake_case conversion
- Legacy migration functions provided in database.types.ts

