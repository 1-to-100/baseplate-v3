# Customer ID NULL Handling

## Overview
This document explains how the system handles NULL `customer_id` values in the `users` table and the circular reference between `users` and `customers`.

## Problem
The system has a circular reference:
- `customers` table has an `owner_id` field that references `users.user_id`
- `users` table has a `customer_id` field that references `customers.customer_id`

This creates a chicken-and-egg problem: you can't create a customer without an owner user, but you can't create a user with a valid `customer_id` if the customer doesn't exist yet.

## Solution
The `users.customer_id` field is **nullable** to support:
1. **System-level administrators** - Users with `system_admin` role don't belong to any customer
2. **Customer owner creation** - Temporary state during the customer creation flow

### Database Schema
```sql
create table public.users (
  user_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  phone_number text,
  customer_id uuid,  -- NULLABLE
  role_id uuid,
  status UserStatus not null default 'inactive',
  last_login_at timestamptz,
  preferences jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);
```

## Creation Flow for Customer Owners

### 1. Seed Command Flow
```typescript
// Step 1: Create owner user without customer_id
const owner = await usersService.create({
  email: 'owner@testcustomer.com',
  firstName: 'John',
  lastName: 'Doe',
  status: 'active',
});

// Step 2: Create customer with owner_id
const customer = await customersService.create({
  name: 'Test Customer Inc.',
  subscriptionId,
  ownerId: owner.id,
});

// Step 3: customersService.create() automatically updates the user with customer_id
// This happens inside customersService.create():
await database.update('users', {
  where: { user_id: ownerId },
  data: { customer_id: customer.customer_id },
});
```

### 2. Registration Flow (register.service.ts)
```typescript
// Step 1: Create user without customer_id (or with existing customer_id if domain matches)
const newUser = await usersService.create({
  email,
  firstName,
  lastName,
  customerId: existingCustomer?.id,  // NULL if no existing customer
}, true);

// Step 2: If no existing customer, create new customer
if (!existingCustomer) {
  const { data: newCustomer } = await adminClient
    .from('customers')
    .insert({
      name: domain,
      email,
      domain,
      owner_id: newUser.id,
    })
    .select()
    .single();

  // Step 3: Update user with customer_id
  await adminClient
    .from('users')
    .update({
      customer_id: newCustomer.id,
      role_id: customerAdminRoleId,
    })
    .eq('id', newUser.id);
}
```

### 3. Bootstrap System Admin (bootstrap.service.ts)
```typescript
// System admin is created with NULL customer_id
await adminClient
  .from('users')
  .insert({
    email: 'admin@system.local',
    uid: authData?.user?.id,
    first_name: 'System',
    last_name: 'Administrator',
    role_id: systemAdminRole?.id,
    status: 'active',
    customer_id: null,  // System-level admin
  });
```

## RLS Policies
The RLS policies properly handle NULL `customer_id`:

### System Admins
- Can see ALL users (including those with NULL customer_id)
- Can create users with ANY customer_id (including NULL)
- Can update users to ANY customer_id (including NULL)

### Customer Admins
- Can only see users with THEIR customer_id
- Can only create users with THEIR customer_id (enforced by WITH CHECK)
- Can only update users with THEIR customer_id

### Users
- Can see themselves regardless of customer_id
- Can update themselves (but not change customer_id)

## Valid States for customer_id

| User Role          | customer_id | Valid? | Use Case                                |
|--------------------|-------------|--------|-----------------------------------------|
| system_admin       | NULL        | ✅     | System-level administrators             |
| system_admin       | <uuid>      | ✅     | System admin assigned to a customer     |
| customer_admin     | NULL        | ⚠️     | Temporary during owner creation only    |
| customer_admin     | <uuid>      | ✅     | Normal customer administrator           |
| customer_user      | NULL        | ⚠️     | Temporary during owner creation only    |
| customer_user      | <uuid>      | ✅     | Normal customer user                    |
| customer_viewer    | NULL        | ⚠️     | Temporary during owner creation only    |
| customer_viewer    | <uuid>      | ✅     | Normal customer viewer                  |

⚠️ = Should be temporary state only, will be updated immediately after customer creation

## TypeScript Types
```typescript
export interface User {
  user_id: string;
  auth_user_id?: string | null;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  customer_id?: string | null;  // NULLABLE
  role_id?: string | null;
  status: UserStatus;
  last_login_at?: string | null;
  preferences?: any;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}
```

## Best Practices

1. **Never leave customer_id NULL permanently** - Except for system_admin role
2. **Always update customer_id immediately** - After creating the customer
3. **Use the proper creation flow** - As shown in the examples above
4. **Validate in application logic** - Don't rely solely on database constraints
5. **Use service_role for registration** - To bypass RLS during the circular reference resolution

## Related Files
- `/backend/supabase/migrations/20241001000000_baseplate_unified_schema.sql` - Schema definition
- `/backend/supabase/migrations/20251022000000_enable_rls_policies.sql` - RLS policies
- `/backend/src/common/types/database.types.ts` - TypeScript types
- `/backend/src/customers/customers.service.ts` - Customer creation logic
- `/backend/src/register/register.service.ts` - Registration flow
- `/backend/src/common/bootstrap/bootstrap.service.ts` - System admin creation
- `/backend/src/cli/commands/seed.command.ts` - Seeding logic

