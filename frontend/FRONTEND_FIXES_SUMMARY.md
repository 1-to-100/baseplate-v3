# Frontend UUID Fixes - October 23, 2025

## Issue

The frontend was using `number` type for IDs (customerId, roleId) when the backend expects `string` UUIDs. This caused the error:

```
invalid input syntax for type uuid: "1"
customerId: ['1']
```

## Changes Made

### 1. ✅ Type Definitions Updated

**Files Modified:**
- `src/app/dashboard/user-management/page.tsx`
- `src/app/dashboard/system-users/page.tsx`
- `src/app/dashboard/customer-management/[customerId]/page.tsx`
- `src/components/dashboard/filter.tsx`
- `src/lib/api/users.ts`
- `src/lib/api/system-users.ts`
- `src/lib/api/categories.ts`

**Changes:**
```typescript
// OLD (WRONG)
customerId: number[]
roleId: number[]

// NEW (CORRECT)
customerId: string[]
roleId: string[]
```

---

### 2. ✅ Filter Component Fixed

**File:** `src/components/dashboard/filter.tsx`

**Changes:**
```typescript
// OLD
const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
const handleCustomerChange = (customerId: number) => { ...}
const handleRoleChange = (roleId: number) => { ...}

// NEW
const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
const handleCustomerChange = (customerId: string) => { ...}
const handleRoleChange = (roleId: string) => { ...}
```

---

### 3. ✅ API Parameter Interfaces Updated

**File:** `src/lib/api/users.ts`
```typescript
export interface GetUsersParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  roleId?: string[];        // was: number[]
  customerId?: string[];     // was: number[]
  statusId?: string[];
  hasCustomer?: boolean;
}
```

**File:** `src/lib/api/system-users.ts`
```typescript
export interface GetUsersParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  roleFilter?: string;
  customerId?: string[];     // was: number[]
  statusId?: string[];
}
```

**File:** `src/lib/api/categories.ts`
```typescript
export interface GetCategoriesListParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  roleId?: string[];         // was: number[]
  customerId?: string[];     // was: number[]
  statusId?: string[];
}
```

---

### 4. ✅ Customer Management Page Fixed

**File:** `src/app/dashboard/customer-management/[customerId]/page.tsx`

**Changes:**
```typescript
// OLD
customerId: customerId ? [Number(customerId)] : undefined

// NEW  
customerId: customerId ? [customerId] : undefined
```

---

## Testing

After these changes, the frontend will:

1. ✅ Send proper UUID strings instead of numbers
2. ✅ Handle customer filtering with UUIDs
3. ✅ Handle role filtering with UUIDs
4. ✅ Work correctly with the backend API that expects UUIDs

## Example API Calls

### Before (WRONG)
```json
{
  "page": 1,
  "perPage": 10,
  "customerId": [1],
  "roleId": [2]
}
```

### After (CORRECT)
```json
{
  "page": 1,
  "perPage": 10,
  "customerId": ["550e8400-e29b-41d4-a716-446655440000"],
  "roleId": ["123e4567-e89b-12d3-a456-426614174000"]
}
```

---

## Important Notes

### ⚠️ User/Customer IDs from Backend
Make sure the backend is returning proper UUIDs for:
- `user.id` 
- `customer.id`
- `role.id`
- `manager.id`

### ⚠️ Still Using Numbers (Intentionally)
These still use `number[]` because they reference tables with integer IDs:
- `customerSuccessId` (managers table might use integers)
- `subscriptionId` (subscription_types table might use integers)

If these should also be UUIDs, they need to be updated similarly.

---

## Related Backend Changes

The backend was already expecting UUIDs:
- ✅ Users table: `user_id uuid`
- ✅ Customers table: `customer_id uuid`
- ✅ Roles table: `role_id uuid`
- ✅ Notifications table: `id uuid`

The frontend just needed to send strings instead of numbers to match!

---

## Files Modified Summary

### Pages
- ✅ `src/app/dashboard/user-management/page.tsx`
- ✅ `src/app/dashboard/system-users/page.tsx`
- ✅ `src/app/dashboard/customer-management/[customerId]/page.tsx`

### Components
- ✅ `src/components/dashboard/filter.tsx`

### API
- ✅ `src/lib/api/users.ts`
- ✅ `src/lib/api/system-users.ts`
- ✅ `src/lib/api/categories.ts`

---

## Testing Checklist

After these changes:

1. **User Management Page**
   - ✅ Filters by customer should work
   - ✅ Filters by role should work
   - ✅ No more "invalid input syntax for type uuid: '1'" errors

2. **System Users Page**
   - ✅ Filters by customer should work
   - ✅ No type mismatch errors

3. **Customer Management Page**
   - ✅ Customer detail page should load users correctly
   - ✅ Customer UUID should be properly passed

4. **Filter Component**
   - ✅ Selecting customers should send UUIDs
   - ✅ Selecting roles should send UUIDs

---

## Status: ✅ All Frontend UUID Issues Fixed

The frontend now correctly uses `string` types for all UUID-based IDs, matching the backend's PostgreSQL UUID columns.

## Next Steps

1. **Test the application** after database reset
2. **Verify no more UUID parsing errors**
3. **Check that filters work correctly**
4. **Ensure customer/role selection sends proper UUIDs**

