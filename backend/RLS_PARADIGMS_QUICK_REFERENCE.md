# RLS Paradigms Quick Reference

## The Four RLS Paradigms

### 📊 Decision Matrix: Which Paradigm to Use?

| Table Characteristics | Paradigm | Example Tables |
|----------------------|----------|----------------|
| **No customer_id, no user_id, no role_id**<br>System-wide configuration | **System** | `roles`, `permissions`, `subscriptions`, `system_settings` |
| **Has customer_id**<br>Data belongs to a customer | **Customer** | `articles`, `documents`, `article_categories`, `customer_settings` |
| **Has user_id AND customer_id**<br>Data belongs to a specific user | **User** | `notifications`, `user_preferences`, `user_documents`, `bookmarks` |
| **Has role_id**<br>Data belongs to a specific role | **Role** | `role_settings`, `role_permissions`, `role_configurations` |

---

## 1️⃣ System Tables Paradigm

**Pattern:** Single table accessible across the entire system.

**Access Rules:**
- ✅ **View:** Everyone authenticated
- ✅ **Edit:** Only System Administrators

**SQL Template:**
```sql
-- SELECT: Everyone can view
CREATE POLICY {table}_select_all
  ON {table} FOR SELECT
  TO authenticated
  USING (true);

-- MANAGE: Only System Administrators
CREATE POLICY {table}_manage_system_admin
  ON {table} FOR ALL
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));
```

**Example Tables:**
- `roles` - System and custom roles
- `permissions` - Available permissions
- `subscriptions` - Subscription plans
- `system_settings` - Global configuration

---

## 2️⃣ Customer Tables Paradigm

**Pattern:** Table with `customer_id UUID NOT NULL` foreign key.

**Access Rules:**
- ✅ **View:**
  - System Administrators → All customers
  - Customer Success → Assigned customers only
  - Customer Administrators → Their customer only
  - Customer Users → Their customer only (optional, feature-dependent)
- ✅ **Edit:**
  - System Administrators → All customers
  - Customer Success → Assigned customers only
  - Customer Administrators → Their customer only
  - Customer Users → May be allowed (feature-dependent)

**SQL Template:**
```sql
-- SELECT: Multiple policies for different roles
CREATE POLICY {table}_select_system_admin
  ON {table} FOR SELECT
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

CREATE POLICY {table}_select_customer_success
  ON {table} FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Success')) AND
    customer_id IN (SELECT get_accessible_customer_ids())
  );

CREATE POLICY {table}_select_customer_admin
  ON {table} FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  );

-- Optional: Allow all users in customer to view
CREATE POLICY {table}_select_customer_users
  ON {table} FOR SELECT
  TO authenticated
  USING (customer_id = (SELECT get_user_customer_id()));

-- INSERT: System Admin + Customer Success + Customer Admin
CREATE POLICY {table}_insert_system_admin
  ON {table} FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT has_system_role('System Administrator')));

CREATE POLICY {table}_insert_customer_success
  ON {table} FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT has_system_role('Customer Success')) AND
    customer_id IN (SELECT get_accessible_customer_ids())
  );

CREATE POLICY {table}_insert_customer_admin
  ON {table} FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  );

-- Optional: Allow users with permission
CREATE POLICY {table}_insert_with_permission
  ON {table} FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT has_permission('{Module}:create')) AND
    customer_id = (SELECT get_user_customer_id())
  );

-- UPDATE/DELETE: Similar pattern, adjust based on requirements
```

**Example Tables:**
- `articles` - Customer's knowledge base articles
- `article_categories` - Customer's article categories
- `documents` - Customer's documents
- `notification_templates` - Customer-specific templates
- `custom_fields` - Customer-specific field definitions

**Key Points:**
- **Always include customer_id in filters:** Even though RLS filters, add explicit `.eq('customer_id', id)` in queries for performance
- **System templates:** Some tables (like `notification_templates`) may have `customer_id IS NULL` for system-wide records
- **Permission-based access:** Can combine with permission checks for fine-grained control

---

## 3️⃣ User Tables Paradigm

**Pattern:** Table with `user_id UUID NOT NULL` AND `customer_id UUID NOT NULL` foreign keys.

**Access Rules:**
- ✅ **View:**
  - System Administrators → All users' data
  - Customer Success → Users in assigned customers
  - Customer Administrators → Users in their customer
  - User → Only their own data
- ✅ **Edit:**
  - System Administrators → All users' data
  - Customer Success → Users in assigned customers
  - Customer Administrators → Users in their customer
  - User → Only their own data

**SQL Template:**
```sql
-- SELECT: Users see own, admins see based on customer access
CREATE POLICY {table}_select_own
  ON {table} FOR SELECT
  TO authenticated
  USING (user_id = (SELECT get_current_user_id()));

CREATE POLICY {table}_select_system_admin
  ON {table} FOR SELECT
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

CREATE POLICY {table}_select_customer_success
  ON {table} FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Success')) AND
    customer_id IN (SELECT get_accessible_customer_ids())
  );

CREATE POLICY {table}_select_customer_admin
  ON {table} FOR SELECT
  TO authenticated
  USING (
    (SELECT has_system_role('Customer Administrator')) AND
    customer_id = (SELECT get_user_customer_id())
  );

-- INSERT: Users can create for themselves
CREATE POLICY {table}_insert_own
  ON {table} FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT get_current_user_id()) AND
    customer_id = (SELECT get_user_customer_id())
  );

-- System can create for anyone (e.g., notifications)
CREATE POLICY {table}_insert_system
  ON {table} FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Application-level control

-- UPDATE: Users update own, admins can update any
CREATE POLICY {table}_update_own
  ON {table} FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT get_current_user_id()))
  WITH CHECK (user_id = (SELECT get_current_user_id()));

CREATE POLICY {table}_update_system_admin
  ON {table} FOR UPDATE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

-- DELETE: Usually only admins
CREATE POLICY {table}_delete_system_admin
  ON {table} FOR DELETE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));
```

**Example Tables:**
- `notifications` - User-specific notifications
- `user_preferences` - User settings and preferences
- `user_documents` - Documents uploaded by user
- `user_one_time_codes` - Authentication codes
- `bookmarks` - User's saved bookmarks
- `favorites` - User's favorited items

**Key Points:**
- **Dual ownership:** Data belongs to both a user AND a customer
- **Privacy:** Users can only see their own data (except admins)
- **Customer scope:** Even admins are scoped by customer access (except System Admin)

---

## 4️⃣ Role-Specific Tables Paradigm

**Pattern:** Table with `role_id UUID NOT NULL` foreign key.

**Access Rules:**
- ✅ **View:**
  - System Administrators → All roles' data
  - Users with that role → Their role's data only
- ✅ **Edit:**
  - System Administrators → All roles' data
  - Users with that role → Their role's data only (usually limited to certain operations)

**SQL Template:**
```sql
-- SELECT: System Admin and users with that role
CREATE POLICY {table}_select_system_admin
  ON {table} FOR SELECT
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));

CREATE POLICY {table}_select_own_role
  ON {table} FOR SELECT
  TO authenticated
  USING (role_id = (SELECT get_user_role_id()));

-- INSERT: System Admin and users with that role
CREATE POLICY {table}_insert_system_admin
  ON {table} FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT has_system_role('System Administrator')));

CREATE POLICY {table}_insert_own_role
  ON {table} FOR INSERT
  TO authenticated
  WITH CHECK (role_id = (SELECT get_user_role_id()));

-- UPDATE: System Admin and users with that role
CREATE POLICY {table}_update_system_admin
  ON {table} FOR UPDATE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')))
  WITH CHECK ((SELECT has_system_role('System Administrator')));

CREATE POLICY {table}_update_own_role
  ON {table} FOR UPDATE
  TO authenticated
  USING (role_id = (SELECT get_user_role_id()))
  WITH CHECK (role_id = (SELECT get_user_role_id()));

-- DELETE: Usually only System Admin
CREATE POLICY {table}_delete_system_admin
  ON {table} FOR DELETE
  TO authenticated
  USING ((SELECT has_system_role('System Administrator')));
```

**Example Tables:**
- `role_settings` - Settings specific to a role
- `role_permissions` - Permissions granted to a role
- `role_configurations` - Role-specific configurations
- `role_dashboards` - Dashboard layouts per role

**Key Points:**
- **Shared by all users with that role:** Data is accessible to all users who have the role
- **Role-based collaboration:** Multiple users in the same role can collaborate on shared data
- **System roles protection:** If dealing with system roles (IDs 1-3), add extra protection

---

## 🔧 Helper Functions Reference

These functions are used across all paradigms:

```sql
-- Get current user's UUID
get_current_user_id() → UUID

-- Get current user's role UUID
get_user_role_id_v2() → UUID

-- Check if user has a system role
has_system_role_v2(role_name TEXT) → BOOLEAN

-- Get current user's customer UUID
get_user_customer_id_v2() → UUID

-- Get customer IDs accessible by Customer Success user
get_accessible_customer_ids() → SETOF UUID

-- Check if user has a specific permission
has_permission(permission_name TEXT) → BOOLEAN

-- Check if user belongs to a customer
user_belongs_to_customer(check_customer_id UUID) → BOOLEAN
```

---

## 🎯 Decision Tree

```
┌─ Does table have customer_id?
│
├─ NO ─┬─ Does it have role_id?
│      │
│      ├─ YES → PARADIGM 4: ROLE-SPECIFIC
│      │
│      └─ NO ─┬─ Does it have user_id?
│             │
│             ├─ YES → ERROR: User tables need customer_id!
│             │
│             └─ NO → PARADIGM 1: SYSTEM
│
└─ YES ─┬─ Does it have user_id?
        │
        ├─ YES → PARADIGM 3: USER
        │
        └─ NO → PARADIGM 2: CUSTOMER
```

---

## ⚠️ Critical Performance Rules

These rules apply to ALL paradigms:

### 1. Wrap All Function Calls in SELECT
```sql
-- ❌ BAD (99% slower - calls function on every row)
USING (has_system_role('System Administrator'))

-- ✅ GOOD (calls function once per query)
USING ((SELECT has_system_role('System Administrator')))
```

### 2. Always Add TO Clause
```sql
-- ❌ BAD
CREATE POLICY my_policy ON users FOR SELECT
USING (condition);

-- ✅ GOOD
CREATE POLICY my_policy ON users FOR SELECT
TO authenticated
USING (condition);
```

### 3. Wrap auth.uid() Calls
```sql
-- ❌ BAD
USING (uid = auth.uid())

-- ✅ GOOD
USING (uid = (SELECT auth.uid()::text))
```

### 4. Add Explicit Filters in Application Code
```typescript
// ❌ BAD - Relies only on RLS
const { data } = await supabase
  .from('articles')
  .select();

// ✅ GOOD - Adds explicit filter
const { data } = await supabase
  .from('articles')
  .select()
  .eq('customer_id', customerId);
```

### 5. Create Proper Indexes
```sql
-- CRITICAL: Index on foreign keys used in RLS
CREATE INDEX idx_{table}_customer_id ON {table}(customer_id);
CREATE INDEX idx_{table}_user_id ON {table}(user_id);
CREATE INDEX idx_{table}_role_id ON {table}(role_id);

-- CRITICAL: Index on auth lookup
CREATE INDEX idx_users_uid ON users(uid);
```

---

## 📝 Implementation Checklist

For each new table:

- [ ] **1. Identify paradigm** using decision tree
- [ ] **2. Add foreign keys**
  - Customer tables: `customer_id UUID NOT NULL`
  - User tables: `user_id UUID NOT NULL, customer_id UUID NOT NULL`
  - Role tables: `role_id UUID NOT NULL`
- [ ] **3. Create indexes** on all foreign keys
- [ ] **4. Enable RLS** on the table
- [ ] **5. Create policies** using the paradigm's template
- [ ] **6. Wrap functions** in SELECT statements
- [ ] **7. Add TO authenticated** to all policies
- [ ] **8. Test policies** with different roles
- [ ] **9. Verify performance** with EXPLAIN ANALYZE
- [ ] **10. Add explicit filters** in application code

---

## 🧪 Testing Each Paradigm

### System Table Test
```sql
-- Test as any authenticated user
SET ROLE authenticated;
SELECT * FROM roles_v2;  
-- Expected: Returns all roles ✅

-- Test insert as non-admin
INSERT INTO roles_v2 (name, description) VALUES ('Test', 'Test');
-- Expected: Permission denied ❌

-- Test insert as System Admin
-- Expected: Success ✅
```

### Customer Table Test
```sql
-- Test as user in customer A
SET ROLE authenticated;
SELECT * FROM articles_v2;
-- Expected: Returns only customer A's articles ✅

-- Test inserting article for customer B
INSERT INTO articles_v2 (title, customer_id) 
VALUES ('Test', 'customer-b-uuid');
-- Expected: Permission denied ❌
```

### User Table Test
```sql
-- Test as user A
SET ROLE authenticated;
SELECT * FROM notifications_v2;
-- Expected: Returns only user A's notifications ✅

-- Test viewing user B's notifications
SELECT * FROM notifications_v2 WHERE user_id = 'user-b-uuid';
-- Expected: Returns nothing (RLS filters it out) ✅
```

### Role Table Test
```sql
-- Test as user with role A
SET ROLE authenticated;
SELECT * FROM role_settings_v2;
-- Expected: Returns only role A's settings ✅

-- Test inserting setting for role B
INSERT INTO role_settings_v2 (role_id, setting_key) 
VALUES ('role-b-uuid', 'test');
-- Expected: Permission denied ❌
```

---

## 🚀 Quick Start

1. **Choose your paradigm** from the decision tree
2. **Copy the SQL template** for that paradigm
3. **Replace {table}** with your table name
4. **Adjust policies** based on your specific requirements
5. **Create indexes** on foreign keys
6. **Test with different roles**
7. **Verify performance** with EXPLAIN ANALYZE

---

## 📚 Examples by Use Case

### Blog/Articles System
- `articles` → **Customer** (customer-owned content)
- `article_categories` → **Customer** (customer-owned categories)
- `article_comments` → **User** (user-created comments)
- `article_tags` → **System** (shared across all)

### Document Management
- `documents` → **Customer** (customer-owned documents)
- `document_versions` → **User** (created by specific user)
- `document_permissions` → **Customer** (who can access)
- `document_templates` → **System** (shared templates)

### Notification System
- `notifications` → **User** (sent to specific user)
- `notification_templates` → **Customer** (customer-specific templates)
- `notification_preferences` → **User** (user's preferences)
- `notification_channels` → **System** (available channels)

### Settings & Configuration
- `system_settings` → **System** (global settings)
- `customer_settings` → **Customer** (customer-specific)
- `user_preferences` → **User** (user-specific)
- `role_settings` → **Role** (role-specific)

---

## 🎓 Best Practices

1. **Start with the most restrictive paradigm** - It's easier to loosen security than tighten it
2. **Always add explicit filters** - Don't rely solely on RLS for performance
3. **Test with actual user roles** - Don't test as postgres superuser
4. **Monitor query performance** - Use EXPLAIN ANALYZE regularly
5. **Document table paradigms** - Add comments to migrations explaining which paradigm
6. **Use consistent naming** - Follow the policy naming conventions
7. **Version your helper functions** - Use suffixes like `_v2` when updating
8. **Create integration tests** - Test each paradigm with different roles

---

## 🔗 Related Documents

- **[V2_SCHEMA_MIGRATION_GUIDE.md](./V2_SCHEMA_MIGRATION_GUIDE.md)** - Full implementation guide
- **[SUPABASE_ROLE_MIGRATION_GUIDE.md](./SUPABASE_ROLE_MIGRATION_GUIDE.md)** - Role-based auth setup
- **[SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md)** - Original Supabase migration

---

**Last Updated:** 2025-10-22
**Version:** 2.0

