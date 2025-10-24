# Customer Success Owned Customers Module

This module provides backend API endpoints for managing customer success representative assignments to customers.

## Overview

The `customer_success_owned_customers` table enables a many-to-many relationship between customer success representatives and customers they manage. This replaces the old one-to-one `customers.manager_id` relationship.

## Module Structure

```
customer-success-owned-customers/
├── customer-success-owned-customers.module.ts      # NestJS module
├── customer-success-owned-customers.controller.ts  # API endpoints
├── customer-success-owned-customers.service.ts     # Business logic
├── dto/
│   └── create-customer-success-owned-customer.dto.ts
└── README.md (this file)
```

## API Endpoints

### GET /customer-success-owned-customers

Get all CS rep assignments, optionally filtered.

**Query Parameters:**
- `userId` (optional) - Filter by CS rep user ID
- `customerId` (optional) - Filter by customer ID

**Response:**
```json
[
  {
    "customer_success_owned_customer_id": "uuid",
    "user_id": "uuid",
    "customer_id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "user": {
      "user_id": "uuid",
      "full_name": "John Doe",
      "email": "john@example.com",
      "avatar_url": "..."
    },
    "customer": {
      "customer_id": "uuid",
      "name": "Acme Corp",
      "email_domain": "acme.com",
      "lifecycle_stage": "active"
    }
  }
]
```

**Permissions Required:** `customer:read`

---

### GET /customer-success-owned-customers/check

Check if a CS rep is assigned to a customer.

**Query Parameters:**
- `userId` (required) - CS rep user ID
- `customerId` (required) - Customer ID

**Response:**
```json
{
  "isAssigned": true
}
```

**Permissions Required:** `customer:read`

---

### GET /customer-success-owned-customers/:id

Get a specific CS rep assignment by ID.

**Response:**
```json
{
  "customer_success_owned_customer_id": "uuid",
  "user_id": "uuid",
  "customer_id": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "user": { ... },
  "customer": { ... }
}
```

**Permissions Required:** `customer:read`

---

### POST /customer-success-owned-customers

Assign a CS rep to a customer.

**Request Body:**
```json
{
  "user_id": "uuid",
  "customer_id": "uuid"
}
```

**Validations:**
- User must exist and have `customer_success` role
- Customer must exist
- Assignment must not already exist

**Response:**
```json
{
  "customer_success_owned_customer_id": "uuid",
  "user_id": "uuid",
  "customer_id": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Permissions Required:** `customer:write`

---

### DELETE /customer-success-owned-customers/:id

Remove a CS rep assignment by ID.

**Response:**
```json
{
  "message": "Assignment removed successfully"
}
```

**Permissions Required:** `customer:delete`

---

### DELETE /customer-success-owned-customers

Remove assignment by userId and customerId (query params).

**Query Parameters:**
- `userId` (required) - CS rep user ID
- `customerId` (required) - Customer ID

**Response:**
```json
{
  "message": "Assignment removed successfully"
}
```

**Permissions Required:** `customer:delete`

## Service Methods

### `findAll(filters?: { userId?: string; customerId?: string })`
Get all assignments with optional filtering.

### `findOne(id: string)`
Get a specific assignment by ID.

### `getCustomersByCSRep(userId: string)`
Get all customers assigned to a CS rep.

### `getCSRepsByCustomer(customerId: string)`
Get all CS reps assigned to a customer.

### `create(data: CreateCustomerSuccessOwnedCustomerInput)`
Create a new CS rep assignment. Validates that:
- User exists and has customer_success role
- Customer exists
- Assignment doesn't already exist

### `remove(id: string)`
Remove assignment by ID.

### `removeByUserAndCustomer(userId: string, customerId: string)`
Remove assignment by user and customer IDs.

### `isAssigned(userId: string, customerId: string)`
Check if a CS rep is assigned to a customer.

## Usage Examples

### Backend Service Usage

```typescript
import { CustomerSuccessOwnedCustomersService } from './customer-success-owned-customers.service';

// Inject the service
constructor(
  private readonly csService: CustomerSuccessOwnedCustomersService
) {}

// Get all customers for a CS rep
const customers = await this.csService.getCustomersByCSRep(userId);

// Assign CS rep to customer
await this.csService.create({
  user_id: 'cs-rep-uuid',
  customer_id: 'customer-uuid',
});

// Check assignment
const isAssigned = await this.csService.isAssigned(userId, customerId);
```

### Frontend API Client Usage

```typescript
import { 
  assignCSRepToCustomer,
  getCustomersByCSRep 
} from '@/lib/api/customer-success';

// Assign CS rep
const { data, error } = await assignCSRepToCustomer({
  user_id: csRepId,
  customer_id: customerId,
});

// Get customers
const { data: customers } = await getCustomersByCSRep(csRepId);
```

## Row Level Security (RLS)

The `customer_success_owned_customers` table has RLS enabled with policies:

- **System Admin**: Full access (SELECT, INSERT, UPDATE, DELETE)
- **Customer Success**: 
  - SELECT: View their own assignments
  - No INSERT/UPDATE/DELETE (managed by admins)
- **Customer Admin**: No direct access
- **Regular Users**: No direct access

## Database Schema

```sql
create table public.customer_success_owned_customers (
  customer_success_owned_customer_id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  customer_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  constraint customer_success_owned_customers_user_id_fkey 
    foreign key (user_id) references public.users(user_id) 
    on delete cascade,
  constraint customer_success_owned_customers_customer_id_fkey 
    foreign key (customer_id) references public.customers(customer_id) 
    on delete cascade,
  constraint customer_success_owned_customers_unique 
    unique(user_id, customer_id)
);
```

## Migration

This module was added in migration: `20251024155048_add_teams_and_enhanced_tables.sql`

## Notes

- CS reps can be assigned to multiple customers (many-to-many)
- Assignments are automatically deleted if user or customer is deleted (ON DELETE CASCADE)
- Duplicate assignments are prevented by unique constraint
- Only users with `customer_success` role can be assigned

