# Row Level Security (RLS) Policies Documentation

**Purpose:** Document all RLS policies, helper functions, and authorization rules for the Baseplate database.

**Status:** Complete  
**Last Updated:** November 11, 2025

---

## Overview

Row Level Security (RLS) is enabled on all tables in the public schema. RLS policies enforce authorization at the database level, ensuring users can only access data they're permitted to see, regardless of which application layer (backend, frontend, Edge Functions) makes the query.

### Key Principles

1. **Defense in Depth:** RLS is the final authorization layer
2. **Zero Trust:** Every query is validated against policies
3. **Role-Based:** Policies use user roles for access control
4. **Multi-Tenant:** Customer isolation is enforced at database level

---

## Helper Functions

These functions are used throughout RLS policies to check user permissions and context.

### Core Identity Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `user_id()` | `uuid` | Current authenticated user's user_id |
| `customer_id()` | `uuid` | Current user's customer_id |
| `role_id()` | `uuid` | Current user's role_id |
| `current_user_id()` | `uuid` | Get user_id from auth.uid() |
| `current_customer_id()` | `uuid` | Get customer_id for current user |

### Role Check Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `is_system_admin()` | `boolean` | True if user has system_admin role |
| `is_customer_success()` | `boolean` | True if user has customer_success role |
| `is_customer_admin()` | `boolean` | True if user has customer_admin role |
| `is_manager()` | `boolean` | True if user has manager role |
| `is_system_role()` | `boolean` | True if user has any system role |

### Permission Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `has_role(role_name)` | `boolean` | Check if user has specific role by name |
| `has_system_role(role_name)` | `boolean` | Check if user has system role by name |
| `has_permission(permission_name)` | `boolean` | Check if user has specific permission |
| `has_any_permission(permission_names[])` | `boolean` | Check if user has any of the permissions |
| `has_all_permissions(permission_names[])` | `boolean` | Check if user has all permissions |

### Access Control Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `can_access_customer(customer_id)` | `boolean` | Check if user can access specific customer |
| `get_accessible_customer_ids()` | `table(customer_id)` | Get all customer IDs user can access |

---

## Tables with RLS Enabled

All tables in the public schema have RLS enabled:

- `users`
- `customers`
- `roles`
- `permissions`
- `role_permissions`
- `managers`
- `teams`
- `team_members`
- `help_articles`
- `help_article_categories`
- `notifications`
- `notification_templates`
- `subscriptions`
- `subscription_types`
- `customer_subscriptions`
- `taxonomies`
- `customer_success_owned_customers`
- `user_invitations`
- `user_one_time_codes`
- `audit_logs`
- `api_logs`
- `extension_data`
- `extension_data_types`

---

## RLS Policies by Table

### Users Table

**Table:** `public.users`

#### SELECT Policies

| Policy Name | Who | Can See |
|-------------|-----|---------|
| `users_select_system_admin` | System Admin | All users |
| `users_select_customer_admin` | Customer Admin | Users in their customer |
| `users_select_customer_success` | Customer Success | Users in assigned customers |
| `users_select_manager` | Manager | Users in their customer |
| `users_select_self` | Any User | Their own record |

#### INSERT Policies

| Policy Name | Who | Can Create |
|-------------|-----|------------|
| `users_insert_system_admin` | System Admin | Any user |
| `users_insert_customer_admin` | Customer Admin | Users in their customer |
| `users_insert_customer_success` | Customer Success | Users in assigned customers |
| `users_insert_manager` | Manager | Users in their customer |

#### UPDATE Policies

| Policy Name | Who | Can Update |
|-------------|-----|------------|
| `users_update_system_admin` | System Admin | Any user |
| `users_update_customer_admin` | Customer Admin | Users in their customer |
| `users_update_customer_success` | Customer Success | Users in assigned customers |
| `users_update_manager` | Manager | Users in their customer |
| `users_update_self` | Any User | Their own record |

#### DELETE Policies

| Policy Name | Who | Can Delete |
|-------------|-----|------------|
| `users_delete_system_admin` | System Admin | Any user |
| `users_delete_customer_admin` | Customer Admin | Users in their customer |
| `users_delete_customer_success` | Customer Success | Users in assigned customers |
| `users_delete_manager` | Manager | Users in their customer |

**Authorization Logic:**
```sql
-- System admins can access all users
USING (public.is_system_admin())

-- Customer admins/managers can access users in their customer
USING (
  public.is_customer_admin() AND
  customer_id = public.customer_id()
)

-- Customer success can access users in assigned customers
USING (
  customer_id IN (SELECT public.get_accessible_customer_ids())
)

-- Users can always see themselves
USING (user_id = public.user_id())
```

---

### Customers Table

**Table:** `public.customers`

#### SELECT Policies

| Policy Name | Who | Can See |
|-------------|-----|---------|
| `customers_select_system_admin` | System Admin | All customers |
| `customers_select_customer_admin` | Customer Admin | Their customer |
| `customers_select_customer_success` | Customer Success | Assigned customers |
| `customers_update_manager` | Manager | Their customer |

#### INSERT Policies

| Policy Name | Who | Can Create |
|-------------|-----|------------|
| `customers_insert_system_admin` | System Admin | Any customer |

#### UPDATE Policies

| Policy Name | Who | Can Update |
|-------------|-----|------------|
| `customers_update_system_admin` | System Admin | Any customer |
| `customers_update_customer_admin` | Customer Admin | Their customer |
| `customers_update_customer_success` | Customer Success | Assigned customers |
| `customers_update_manager` | Manager | Their customer |

#### DELETE Policies

| Policy Name | Who | Can Delete |
|-------------|-----|------------|
| `customers_delete_system_admin` | System Admin | Any customer |

---

### Roles & Permissions Tables

**Tables:** `public.roles`, `public.permissions`

#### SELECT Policies

| Policy Name | Who | Can See |
|-------------|-----|---------|
| `roles_select_all` | Any Authenticated | All roles |
| `permissions_select_all` | Any Authenticated | All permissions |

#### WRITE Policies

| Policy Name | Who | Can Modify |
|-------------|-----|------------|
| `roles_insert_system_admin` | System Admin | Non-system roles |
| `roles_update_system_admin` | System Admin | Non-system roles |
| `roles_delete_system_admin` | System Admin | Non-system roles |
| `permissions_*_system_admin` | System Admin | All permissions |

**Important:** System roles (`is_system_role = true`) cannot be modified via RLS policies.

---

### Teams & Team Members Tables

**Tables:** `public.teams`, `public.team_members`

#### Authorization Rules

- System Admin: Full access to all teams
- Customer Admin/Manager: Full access to teams in their customer
- Team Members: Can view teams they belong to

#### Policies

| Operation | Who | Access |
|-----------|-----|--------|
| SELECT | System Admin | All teams |
| SELECT | Customer Admin/Manager | Teams in their customer |
| SELECT | Team Member | Teams they belong to |
| INSERT/UPDATE/DELETE | System Admin | All teams |
| INSERT/UPDATE/DELETE | Customer Admin/Manager | Teams in their customer |

---

### Help Articles & Categories

**Tables:** `public.help_articles`, `public.help_article_categories`

#### Authorization Rules

- System Admin: Full access to all articles
- Customer Admin/Manager: Full access to articles in their customer
- Customer Success: Full access to articles in assigned customers
- Regular Users: Can view articles in their customer

#### Policies

| Operation | Who | Access |
|-----------|-----|--------|
| SELECT | All Authenticated | Articles in accessible customers |
| INSERT/UPDATE/DELETE | System Admin | All articles |
| INSERT/UPDATE/DELETE | Customer Admin/Manager | Articles in their customer |
| INSERT/UPDATE/DELETE | Customer Success | Articles in assigned customers |

---

### Notifications

**Tables:** `public.notifications`, `public.notification_templates`

#### Notifications Table

| Operation | Who | Access |
|-----------|-----|--------|
| SELECT | User | Their own notifications |
| SELECT | Customer Success | Notifications for assigned customers |
| INSERT | System | All notifications |
| UPDATE | User | Their own notifications (mark as read) |
| UPDATE | Customer Success | Notifications in assigned customers |

#### Notification Templates Table

| Operation | Who | Access |
|-----------|-----|--------|
| SELECT | Customer Admin/Manager | Templates in their customer |
| SELECT | Customer Success | Templates in assigned customers |
| INSERT/UPDATE/DELETE | System Admin | All templates |
| INSERT/UPDATE/DELETE | Customer Success | Templates in assigned customers |
| INSERT/UPDATE/DELETE | Customer Admin/Manager | Templates in their customer |

---

### Subscriptions

**Tables:** `public.subscriptions`, `public.customer_subscriptions`, `public.subscription_types`

#### Authorization Rules

- System Admin: Full access
- Customer Admin/Manager: Can view/manage subscriptions for their customer
- Customer Success: Can view/manage subscriptions for assigned customers

#### Policies

| Operation | Who | Access |
|-----------|-----|--------|
| SELECT | System Admin | All subscriptions |
| SELECT | Customer Admin/Manager | Subscriptions for their customer |
| SELECT | Customer Success | Subscriptions for assigned customers |
| INSERT/UPDATE/DELETE | System Admin | All subscriptions |
| INSERT/UPDATE/DELETE | Customer Success | Subscriptions for assigned customers |

---

### Customer Success Owned Customers

**Table:** `public.customer_success_owned_customers`

This junction table tracks which Customer Success representatives are assigned to which customers.

#### Policies

| Operation | Who | Access |
|-----------|-----|--------|
| SELECT | System Admin | All assignments |
| SELECT | Customer Success | Their own assignments |
| INSERT/UPDATE/DELETE | System Admin | All assignments |

**Usage:** The `get_accessible_customer_ids()` function uses this table to determine which customers a Customer Success rep can access.

---

## Testing RLS Policies

### Test Scenarios

#### Test 1: System Admin Access

```sql
-- Login as system admin
-- Should see all users
SELECT * FROM users;

-- Should see all customers
SELECT * FROM customers;
```

#### Test 2: Customer Admin Access

```sql
-- Login as customer admin (Customer A)
-- Should only see users from Customer A
SELECT * FROM users WHERE customer_id = 'customer-a-id';

-- Should NOT see users from Customer B
SELECT * FROM users WHERE customer_id = 'customer-b-id';
-- Expected: Returns empty (RLS blocks)
```

#### Test 3: Customer Success Access

```sql
-- Login as customer success assigned to Customer A
-- Should see users from Customer A
SELECT * FROM users WHERE customer_id = 'customer-a-id';

-- Should NOT see users from unassigned Customer B
SELECT * FROM users WHERE customer_id = 'customer-b-id';
-- Expected: Returns empty (RLS blocks)
```

#### Test 4: Regular User Access

```sql
-- Login as regular user
-- Should only see their own record
SELECT * FROM users WHERE user_id = public.user_id();

-- Should NOT see other users
SELECT * FROM users;
-- Expected: Returns only their own record
```

#### Test 5: Manager Access

```sql
-- Login as manager (Customer A)
-- Should see all users in Customer A
SELECT * FROM users WHERE customer_id = public.customer_id();

-- Can create users in their customer
INSERT INTO users (email, customer_id, role_id)
VALUES ('newuser@company.com', public.customer_id(), 'role-id');
```

---

## Common Patterns

### Pattern 1: Multi-Tenant Isolation

```sql
-- Ensure customer_id matches
USING (customer_id = public.customer_id())
```

### Pattern 2: System Admin Bypass

```sql
-- System admins can access all records
USING (public.is_system_admin())

-- OR regular access rules
OR (condition_for_regular_users)
```

### Pattern 3: Self-Access

```sql
-- Users can always access their own records
USING (user_id = public.user_id())

-- Or for foreign key relationships
USING (created_by = public.user_id())
```

### Pattern 4: Role-Based Access

```sql
-- Only specific roles can access
USING (
  public.has_role('customer_admin') OR
  public.has_role('manager')
)
```

### Pattern 5: Customer Success Access

```sql
-- Customer Success can access assigned customers
USING (
  customer_id IN (SELECT public.get_accessible_customer_ids())
)
```

---

## Security Considerations

### Best Practices

1. **Always Test Policies:** Use multiple user roles to verify RLS
2. **Avoid Bypassing RLS:** Never use service role in frontend
3. **Log Policy Violations:** Monitor for unauthorized access attempts
4. **Keep Policies Simple:** Complex policies are harder to audit
5. **Document Changes:** Update this file when policies change

### Common Pitfalls

1. **Missing Policies:** Forgetting to add policies for all operations (SELECT, INSERT, UPDATE, DELETE)
2. **Policy Conflicts:** Multiple policies with contradictory logic
3. **Performance:** Complex policies can slow down queries
4. **Service Role:** Using service role bypasses all RLS policies

### When to Use Edge Functions vs RLS

**Use Edge Functions when:**
- Creating auth users (requires service role)
- Updating JWT app_metadata
- Banning/unbanning users
- Complex multi-step operations with rollback

**Use RLS when:**
- Simple CRUD operations
- Reading data
- Updating own records
- Most write operations

---

## Migration Checklist

When migrating from backend to frontend with RLS:

- [ ] Verify all tables have RLS enabled
- [ ] Test each policy with different user roles
- [ ] Check for policy gaps (missing operations)
- [ ] Verify customer isolation works
- [ ] Test impersonation scenarios
- [ ] Verify Customer Success assigned access
- [ ] Test with manager role
- [ ] Check self-access policies
- [ ] Verify system role protections
- [ ] Test error handling when RLS blocks queries

---

## Troubleshooting

### Error: "Row level security policy violation"

**Cause:** User doesn't have permission to access the requested data.

**Solutions:**
1. Verify user has correct role
2. Check if user belongs to correct customer
3. Verify policy exists for the operation (SELECT/INSERT/UPDATE/DELETE)
4. Check if Customer Success is assigned to the customer

### Error: "Permission denied for table X"

**Cause:** RLS is not enabled or no policies exist.

**Solution:** Run `ALTER TABLE X ENABLE ROW LEVEL SECURITY;`

### Slow Queries

**Cause:** Complex RLS policies or missing indexes.

**Solutions:**
1. Add indexes on columns used in policies (customer_id, user_id, role_id)
2. Simplify policy logic
3. Use EXPLAIN ANALYZE to identify bottlenecks

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Migration SQL: `supabase/migrations/00000000000000_initial_combined_schema.sql`
- Helper Functions: Lines 1065-1340 in initial migration

---

**Document Version:** 1.0  
**Last Reviewed:** November 11, 2025

