# RLS Implementation Summary

## 📚 Documentation Overview

This project uses a **four-paradigm RLS (Row Level Security) system** for database security. Here's your complete documentation guide:

### 1. Quick Reference (Start Here!)
**📄 [RLS_PARADIGMS_QUICK_REFERENCE.md](./RLS_PARADIGMS_QUICK_REFERENCE.md)**
- Decision tree for choosing the right paradigm
- SQL templates for each paradigm  
- Testing strategies
- Best practices

### 2. Full Implementation Guide
**📄 [V2_SCHEMA_MIGRATION_GUIDE.md](./V2_SCHEMA_MIGRATION_GUIDE.md)**
- Complete V2 schema with UUIDs
- Step-by-step migration from V1 to V2
- Helper functions
- Code updates
- Data migration scripts

### 3. Role-Based Authorization Setup
**📄 [SUPABASE_ROLE_MIGRATION_GUIDE.md](./SUPABASE_ROLE_MIGRATION_GUIDE.md)**
- System roles setup (System Administrator, Customer Success, Customer Administrator)
- Backend guards implementation
- Performance optimization
- Existing RLS policies for V1 schema

---

## 🎯 The Four RLS Paradigms

### Visual Overview

```
┌────────────────────────────────────────────────────────────┐
│                  DATABASE SECURITY LAYERS                   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  ┌──────┐ │
│  │   SYSTEM    │  │  CUSTOMER   │  │   USER   │  │ ROLE │ │
│  │   TABLES    │  │   TABLES    │  │  TABLES  │  │ TABLES│ │
│  └─────────────┘  └─────────────┘  └──────────┘  └──────┘ │
│         │                │                │            │    │
│         ▼                ▼                ▼            ▼    │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              ROW LEVEL SECURITY (RLS)               │  │
│  │  • System Admin sees all                            │  │
│  │  • Customer Success sees assigned customers         │  │
│  │  • Customer Admin sees their customer               │  │
│  │  • Users see their own data                         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 1. System Tables (Global Configuration)

**Who can access:**
- 👁️ View: Everyone authenticated
- ✏️ Edit: System Administrators only

**Examples:**
- `roles` - System and custom roles
- `permissions` - Available permissions  
- `subscriptions` - Subscription plans
- `system_settings` - Global configuration

**When to use:** Table has no `customer_id`, `user_id`, or `role_id`

### 2. Customer Tables (Customer-Owned Data)

**Who can access:**
- 👁️ View: 
  - System Administrators → All customers
  - Customer Success → Assigned customers
  - Customer Administrators → Their customer
  - Users → Their customer (optional)
- ✏️ Edit: Same as view, sometimes permission-based

**Examples:**
- `articles` - Knowledge base articles
- `documents` - Customer documents
- `article_categories` - Article categories
- `notification_templates` - Custom templates

**When to use:** Table has `customer_id UUID NOT NULL`

### 3. User Tables (User-Owned Data)

**Who can access:**
- 👁️ View:
  - System Administrators → All users
  - Customer Success → Users in assigned customers
  - Customer Administrators → Users in their customer  
  - Users → Only their own data
- ✏️ Edit: Same as view

**Examples:**
- `notifications` - User notifications
- `user_preferences` - User settings
- `user_documents` - User-uploaded files
- `bookmarks` - User bookmarks

**When to use:** Table has `user_id UUID NOT NULL` AND `customer_id UUID NOT NULL`

### 4. Role-Specific Tables (Role-Shared Data)

**Who can access:**
- 👁️ View:
  - System Administrators → All roles
  - Users with that role → Their role's data
- ✏️ Edit: Same as view

**Examples:**
- `role_settings` - Role-specific settings
- `role_configurations` - Role configurations
- `role_dashboards` - Dashboard layouts

**When to use:** Table has `role_id UUID NOT NULL`

---

## 🚀 Implementation Steps

### For V1 (Current Schema with Integers)

Your current schema uses integer IDs and has basic RLS. See:
- **[SUPABASE_ROLE_MIGRATION_GUIDE.md](./SUPABASE_ROLE_MIGRATION_GUIDE.md)** for current implementation

**Status:** ✅ Implemented
- Integer primary keys
- Basic RLS policies
- System roles setup
- Helper functions created

### For V2 (UUID Schema - Future)

When you're ready to migrate to UUIDs and comprehensive RLS. See:
- **[V2_SCHEMA_MIGRATION_GUIDE.md](./V2_SCHEMA_MIGRATION_GUIDE.md)** for migration guide

**Migration Benefits:**
- 🔑 UUID primary keys for distributed systems
- 🛡️ Comprehensive RLS for all four paradigms
- 📦 Extensible schema with JSONB metadata
- ⚡ Performance-optimized helper functions
- 🔄 Blue-green migration strategy

---

## 🔧 Helper Functions

### Core Functions (V1 - Current)
```sql
get_user_role_id() → INTEGER
has_system_role(role_name TEXT) → BOOLEAN  
get_user_customer_id() → INTEGER
```

### Core Functions (V2 - Future)
```sql
get_current_user_id() → UUID
get_user_role_id_v2() → UUID
has_system_role_v2(role_name TEXT) → BOOLEAN
get_user_customer_id_v2() → UUID
get_accessible_customer_ids() → SETOF UUID
has_permission(permission_name TEXT) → BOOLEAN
user_belongs_to_customer(check_customer_id UUID) → BOOLEAN
```

---

## 📊 Access Control Matrix

### System Administrators
| Resource Type | Access Level |
|--------------|-------------|
| System Tables | Full (Read/Write) |
| Customer Tables | Full (All Customers) |
| User Tables | Full (All Users) |
| Role Tables | Full (All Roles) |

### Customer Success
| Resource Type | Access Level |
|--------------|-------------|
| System Tables | Read Only |
| Customer Tables | Read/Write (Assigned Customers) |
| User Tables | Read/Write (Assigned Customers) |
| Role Tables | Read Only |

### Customer Administrators  
| Resource Type | Access Level |
|--------------|-------------|
| System Tables | Read Only |
| Customer Tables | Read/Write (Own Customer) |
| User Tables | Read/Write (Own Customer) |
| Role Tables | Read Only |

### Regular Users
| Resource Type | Access Level |
|--------------|-------------|
| System Tables | Read Only |
| Customer Tables | Read (Own Customer) |
| User Tables | Read/Write (Own Data Only) |
| Role Tables | Read (Own Role) |

---

## ⚡ Performance Checklist

### Database Level
- [ ] All RLS functions wrapped in `SELECT` statements
- [ ] `TO authenticated` clause on all policies
- [ ] `auth.uid()` wrapped in `SELECT`
- [ ] Indexes on all foreign keys (`customer_id`, `user_id`, `role_id`)
- [ ] Index on `users.uid` for auth lookups
- [ ] Helper functions marked as `STABLE` and `SECURITY DEFINER`

### Application Level
- [ ] Explicit filters added to all queries (don't rely only on RLS)
- [ ] Queries tested with EXPLAIN ANALYZE
- [ ] No sequential scans on large tables
- [ ] InitPlan nodes visible in query plans (function caching)
- [ ] Query execution time < 50ms for typical queries

---

## 🧪 Testing Strategy

### 1. Unit Tests (Per Paradigm)
```typescript
describe('System Tables RLS', () => {
  it('allows all authenticated users to read', async () => {
    // Test as regular user
    const { data } = await supabase.from('roles').select();
    expect(data).toBeDefined();
  });

  it('denies non-admins from writing', async () => {
    // Test as regular user
    const { error } = await supabase.from('roles').insert({ name: 'Test' });
    expect(error).toBeDefined();
  });
});

describe('Customer Tables RLS', () => {
  it('filters data by customer_id', async () => {
    // Test as user in customer A
    const { data } = await supabase.from('articles').select();
    expect(data.every(a => a.customer_id === userCustomerId)).toBe(true);
  });
});

describe('User Tables RLS', () => {
  it('shows only own data', async () => {
    // Test as user A
    const { data } = await supabase.from('notifications').select();
    expect(data.every(n => n.user_id === currentUserId)).toBe(true);
  });
});

describe('Role Tables RLS', () => {
  it('shows only own role data', async () => {
    // Test as user with role A
    const { data } = await supabase.from('role_settings').select();
    expect(data.every(s => s.role_id === currentRoleId)).toBe(true);
  });
});
```

### 2. Integration Tests
- Test each system role's access across all paradigms
- Verify Customer Success sees only assigned customers
- Verify Customer Admin isolation
- Verify user data privacy

### 3. Performance Tests
```sql
-- Run for each table
EXPLAIN ANALYZE SELECT * FROM {table} WHERE {filter};

-- Verify:
-- ✓ InitPlan present (function caching)
-- ✓ Index Scan (not Seq Scan)
-- ✓ Execution time < 50ms
```

---

## 📝 Adding a New Table

### Step-by-Step Process

1. **Identify the paradigm**
   ```
   Does it have customer_id?
   ├─ NO → Does it have role_id?
   │   ├─ YES → Role-Specific
   │   └─ NO → System
   └─ YES → Does it have user_id?
       ├─ YES → User
       └─ NO → Customer
   ```

2. **Create the table**
   ```sql
   CREATE TABLE my_new_table (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     -- Add foreign keys based on paradigm
     customer_id UUID NOT NULL REFERENCES customers(id),  -- For Customer/User paradigm
     user_id UUID NOT NULL REFERENCES users(id),         -- For User paradigm
     role_id UUID NOT NULL REFERENCES roles(id),         -- For Role paradigm
     -- Other fields
     metadata JSONB DEFAULT '{}',  -- Extensible data
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ
   );
   ```

3. **Create indexes**
   ```sql
   CREATE INDEX idx_my_new_table_customer_id ON my_new_table(customer_id);
   CREATE INDEX idx_my_new_table_user_id ON my_new_table(user_id);
   CREATE INDEX idx_my_new_table_role_id ON my_new_table(role_id);
   ```

4. **Enable RLS**
   ```sql
   ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;
   ```

5. **Create policies**
   - Copy template from **[RLS_PARADIGMS_QUICK_REFERENCE.md](./RLS_PARADIGMS_QUICK_REFERENCE.md)**
   - Replace `{table}` with your table name
   - Adjust based on specific requirements

6. **Test**
   - Test with System Admin (should see all)
   - Test with Customer Success (should see assigned customers)
   - Test with Customer Admin (should see own customer)
   - Test with regular user (should see own data)
   - Run EXPLAIN ANALYZE

7. **Add to DatabaseService**
   ```typescript
   get my_new_table(): any {
     return this.client.from('my_new_table');
   }
   ```

---

## 🎓 Best Practices

### Security
1. ✅ **Always enable RLS** on tables with sensitive data
2. ✅ **Use SECURITY DEFINER** for helper functions
3. ✅ **Test with actual user roles**, not as postgres superuser
4. ✅ **Audit policies regularly** for security holes
5. ✅ **Document exceptions** to standard paradigms

### Performance
1. ✅ **Wrap all function calls** in SELECT statements
2. ✅ **Add explicit filters** in application code
3. ✅ **Create indexes** on all foreign keys
4. ✅ **Monitor query performance** with EXPLAIN ANALYZE
5. ✅ **Use pagination** for large result sets

### Maintenance
1. ✅ **Version helper functions** (e.g., `_v2` suffix)
2. ✅ **Document paradigm** in table comments
3. ✅ **Follow naming conventions** for policies
4. ✅ **Test migrations** in development first
5. ✅ **Keep policies synchronized** with application logic

---

## 🔍 Troubleshooting

### Users Can't See Data
1. Check if RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'your_table';`
2. Check user has correct role: `SELECT role_id FROM users WHERE email = 'user@example.com';`
3. Test policy directly: Set role and run query in SQL editor
4. Verify helper functions return correct values

### Slow Query Performance  
1. Check if functions are wrapped in SELECT
2. Verify indexes exist on foreign keys
3. Run EXPLAIN ANALYZE and look for:
   - InitPlan nodes (good - function caching)
   - Index Scans (good)
   - Seq Scans (bad - missing index)
4. Add explicit filters in application code

### Policy Not Working
1. Verify `TO authenticated` clause exists
2. Check `auth.uid()` is wrapped in SELECT
3. Test with actual user token, not postgres user
4. Verify user's JWT contains correct uid

---

## 📈 Migration Path

### Current State (V1)
- ✅ Integer primary keys
- ✅ Basic RLS on core tables
- ✅ System roles implemented
- ✅ Helper functions created
- ⚠️ Not all tables have RLS
- ⚠️ Limited extensibility

### Future State (V2)
- 🎯 UUID primary keys
- 🎯 Comprehensive RLS on all tables
- 🎯 Four paradigms fully implemented
- 🎯 Extensible schema with JSONB
- 🎯 Performance optimized
- 🎯 Production-ready

### Migration Timeline
1. **Phase 1 (Now):** Understand paradigms and current state
2. **Phase 2:** Plan V2 schema design
3. **Phase 3:** Create V2 schema alongside V1
4. **Phase 4:** Migrate data from V1 to V2
5. **Phase 5:** Update application code
6. **Phase 6:** Switch to V2 and verify
7. **Phase 7:** Drop V1 tables

---

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL RLS Docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Performance](https://supabase.com/docs/guides/database/postgres/row-level-security#performance)

---

## 🎯 Quick Decisions

### "I need to add a new table..."

**Does it store customer-specific data?**
- YES → Customer or User paradigm
  - **Does each row belong to a specific user?**
    - YES → User Paradigm (`customer_id` + `user_id`)
    - NO → Customer Paradigm (`customer_id` only)
- NO → System or Role paradigm
  - **Does each row belong to a specific role?**
    - YES → Role Paradigm (`role_id`)
    - NO → System Paradigm (no special FK)

### "Should regular users see this data?"

**System Tables:** Yes (read only)
**Customer Tables:** Yes (their customer only)
**User Tables:** Only their own data
**Role Tables:** Only their role's data

### "Who can edit this data?"

**System Tables:** Only System Administrators
**Customer Tables:** Admins + Customer Success + Customer Admin (+ users with permission)
**User Tables:** Admins + the specific user
**Role Tables:** Admins + users with that role

---

## ✅ Implementation Checklist

### For Each New Table
- [ ] Paradigm identified using decision tree
- [ ] Table created with appropriate FKs
- [ ] Indexes created on all FKs
- [ ] RLS enabled
- [ ] Policies created from template
- [ ] Functions wrapped in SELECT
- [ ] TO authenticated added
- [ ] Tested with different roles
- [ ] EXPLAIN ANALYZE verified
- [ ] Explicit filters added in code
- [ ] DatabaseService updated
- [ ] Types added/updated
- [ ] Documentation updated

### For Full System
- [ ] All tables have paradigm documented
- [ ] All helper functions optimized
- [ ] All indexes created
- [ ] All policies tested
- [ ] Performance benchmarked
- [ ] Security audit completed
- [ ] Integration tests passing
- [ ] Documentation complete

---

**Last Updated:** 2025-10-22  
**Version:** 2.0  
**Status:** 📘 Documentation Complete

For questions or issues, refer to the specific guides:
- **Quick lookup:** [RLS_PARADIGMS_QUICK_REFERENCE.md](./RLS_PARADIGMS_QUICK_REFERENCE.md)
- **Full implementation:** [V2_SCHEMA_MIGRATION_GUIDE.md](./V2_SCHEMA_MIGRATION_GUIDE.md)
- **Current setup:** [SUPABASE_ROLE_MIGRATION_GUIDE.md](./SUPABASE_ROLE_MIGRATION_GUIDE.md)

