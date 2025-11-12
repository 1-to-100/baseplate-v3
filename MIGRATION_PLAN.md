# 🚀 Backend to Frontend Migration Plan

**Goal:** Eliminate the NestJS backend and migrate all functionality to the frontend with direct Supabase database access and Supabase Edge Functions for privileged operations.

**Status:** Planning Phase  
**Strategy:** Full Frontend (Option A)

---

## 📊 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture](#current-architecture)
3. [Target Architecture](#target-architecture)
4. [Migration Phases](#migration-phases)
5. [Detailed Implementation Plan](#detailed-implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Success Metrics](#success-metrics)

---

## Executive Summary

### Why This Migration?

- **Simplified Architecture:** Remove the middle-tier backend layer
- **Reduced Complexity:** Fewer moving parts, easier to maintain
- **Cost Reduction:** One less service to deploy and scale
- **Faster Development:** Direct database access without API layer

### Key Challenges

1. **Service Role Operations:** User invites, banning, admin actions require elevated privileges
2. **Complex Business Logic:** Authorization rules currently in NestJS controllers
3. **JWT Context Management:** Impersonation and customer switching need secure handling
4. **Data Validation:** Moving validation from backend to frontend + database

### Solution Approach

- **Supabase Edge Functions:** Handle privileged operations (invites, bans, context switching)
- **Row Level Security (RLS):** Enforce authorization at database level (already implemented)
- **Frontend Validation:** Client-side validation with database constraints as backup
- **Direct Queries:** Use Supabase JS client for all CRUD operations

---

## Current Architecture

### Backend Modules (NestJS)

```
backend/src/
├── auth/                    # Authentication, JWT context management
├── users/                   # User CRUD, invitations, management
├── customers/               # Customer management
├── roles/                   # Role & permission management
├── teams/                   # Team & team member management
├── articles/                # Help article management
├── article-categories/      # Article category management
├── taxonomies/              # Taxonomy management
├── notifications/           # Notification & template management
├── subscriptions/           # Subscription management
├── managers/                # Manager management
├── register/                # User registration
└── customer-success-owned-customers/  # CS customer assignments
```

### Current Request Flow

```
Frontend → API Gateway (NestJS) → Authorization Guards → Business Logic → Supabase (via Service Role)
```

### Technologies to Remove

- ❌ NestJS backend
- ❌ Express/Fastify HTTP server
- ❌ Backend API deployment
- ❌ Backend environment variables
- ❌ API route definitions

### Technologies to Keep/Add

- ✅ Supabase Database (PostgreSQL)
- ✅ Supabase Auth (existing)
- ✅ Supabase Row Level Security (already implemented)
- ✅ Next.js Frontend
- ➕ Supabase Edge Functions (Deno)
- ➕ Direct Supabase Client Queries

---

## Target Architecture

### New Request Flow

```
Frontend → Supabase Client → RLS Policies → Database
                          ↓
                   Edge Functions (for privileged operations)
```

### Component Breakdown

#### 1. Frontend (Next.js)
- Direct Supabase queries using `@supabase/ssr`
- Client-side validation
- Business logic for UI concerns
- Error handling and user feedback

#### 2. Supabase Database
- Row Level Security (RLS) for authorization
- Database constraints for data integrity
- Triggers for complex business logic
- Functions for computed values

#### 3. Edge Functions (Deno)
- User invitation system
- User ban/unban operations
- JWT context management (impersonation)
- Admin-level operations requiring service role

#### 4. Supabase Auth
- JWT token generation
- Session management
- App metadata for context (customer_id, impersonated_user_id)

---

## Migration Phases

### Phase 0: Preparation & Assessment ✅
**Risk Level:** Low  
**Dependencies:** None  
**Status:** COMPLETE

### Phase 1: Infrastructure Setup
**Risk Level:** Medium  
**Dependencies:** Phase 0

### Phase 2: Core Authentication & User Profile
**Risk Level:** Low  
**Dependencies:** Phase 1

### Phase 3: Simple Read Operations
**Risk Level:** Low  
**Dependencies:** Phase 2

### Phase 4: Complex Queries & Multi-tenant Data
**Risk Level:** Medium  
**Dependencies:** Phase 3

### Phase 5: Write Operations & Business Logic
**Risk Level:** High  
**Dependencies:** Phase 4

### Phase 6: Admin Operations & Edge Functions
**Risk Level:** High  
**Dependencies:** Phase 5

### Phase 7: Testing & Quality Assurance
**Risk Level:** Low  
**Dependencies:** Phase 6

### Phase 8: Deployment & Backend Deprecation
**Risk Level:** High  
**Dependencies:** Phase 7

---

## Detailed Implementation Plan

## Phase 0: Preparation & Assessment

### Goals
- Audit all backend endpoints
- Document RLS policies
- Identify privileged operations
- Plan data structure mappings

### Tasks

#### 0.1: Endpoint Inventory ✅
- [x] Create spreadsheet of all backend endpoints
- [x] Categorize by complexity (Simple/Medium/Complex)
- [x] Identify which need Edge Functions
- [x] Map to frontend usage locations

**Deliverable:** `ENDPOINT_INVENTORY.md` (Complete - 114 endpoints documented)

#### 0.2: RLS Policy Verification ✅
- [x] Review all existing RLS policies
- [x] Test policies with different user roles
- [x] Document any gaps or issues
- [x] Create test cases for RLS

**Deliverable:** `RLS_POLICIES.md` (Complete - All policies documented)

#### 0.3: Data Structure Mapping ✅
- [x] Map backend DTOs to Supabase schema
- [x] Identify field name differences (snake_case vs camelCase)
- [x] Create mapping utilities
- [x] Document transformation logic

**Deliverable:** `frontend/src/lib/supabase/mappers.ts` (Complete)

#### 0.4: Environment Setup ✅
- [x] Document Supabase environment variables
- [x] Set up Edge Functions locally
- [x] Configure Supabase CLI
- [x] Test local development workflow

**Deliverable:** Edge Functions structure created

---

## Phase 1: Infrastructure Setup

### Goals
- Set up Edge Functions infrastructure
- Create shared utilities
- Deploy base functions
- Test deployment pipeline

### Tasks

#### 1.1: Edge Functions Setup

**Create Directory Structure:**
```bash
supabase/functions/
├── _shared/
│   ├── cors.ts
│   ├── supabase.ts
│   ├── auth.ts
│   ├── types.ts
│   └── errors.ts
├── user-management/
│   ├── index.ts
│   └── handlers/
│       ├── invite.ts
│       ├── ban.ts
│       └── resend-invite.ts
├── auth-context/
│   ├── index.ts
│   └── handlers/
│       ├── refresh-context.ts
│       └── clear-context.ts
└── admin-operations/
    ├── index.ts
    └── handlers/
        ├── create-customer.ts
        └── update-subscription.ts
```

- [ ] Create directory structure
- [ ] Set up TypeScript configuration for Deno
- [ ] Create shared utilities
- [ ] Set up local testing environment

**Files to Create:**

##### `functions/_shared/cors.ts`
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
```

##### `functions/_shared/supabase.ts`
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

export const createServiceClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export const createAnonClient = (authToken: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    }
  })
}
```

##### `functions/_shared/auth.ts`
```typescript
import { createServiceClient } from './supabase.ts'

export interface AuthenticatedUser {
  id: string
  email: string
  user_id: string
  customer_id: string | null
  role: {
    name: string
    is_system_role: boolean
  } | null
}

export async function authenticateRequest(req: Request): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Missing authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createServiceClient()

  // Verify JWT and get auth user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    throw new Error('Invalid or expired token')
  }

  // Get database user with role
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select(`
      user_id,
      customer_id,
      role:roles(name, is_system_role)
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (userError || !dbUser) {
    throw new Error('User not found in database')
  }

  return {
    id: user.id,
    email: user.email!,
    user_id: dbUser.user_id,
    customer_id: dbUser.customer_id,
    role: dbUser.role
  }
}

export function isSystemAdmin(user: AuthenticatedUser): boolean {
  return user.role?.name === 'system_admin'
}

export function isCustomerSuccess(user: AuthenticatedUser): boolean {
  return user.role?.name === 'customer_success'
}

export function isCustomerAdmin(user: AuthenticatedUser): boolean {
  return user.role?.name === 'customer_admin' || user.role?.name === 'manager'
}

export function canAccessCustomer(user: AuthenticatedUser, targetCustomerId: string): boolean {
  if (isSystemAdmin(user)) return true
  return user.customer_id === targetCustomerId
}
```

##### `functions/_shared/errors.ts`
```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function createErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: error.code 
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  console.error('Unexpected error:', error)
  
  return new Response(
    JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
```

#### 1.2: Deploy Base Edge Functions

- [ ] Deploy shared utilities
- [ ] Test authentication helper
- [ ] Set up secrets in Supabase
- [ ] Configure CORS properly

**Commands:**
```bash
# Set secrets
supabase secrets set SITE_URL=your-production-url
supabase secrets set SUPABASE_URL=your-supabase-url
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Deploy functions
supabase functions deploy user-management
supabase functions deploy auth-context
supabase functions deploy admin-operations
```

#### 1.3: Create Frontend Supabase Service Layer

- [ ] Create `frontend/src/lib/supabase/database.ts`
- [ ] Create `frontend/src/lib/supabase/edge-functions.ts`
- [ ] Create `frontend/src/lib/supabase/mappers.ts`
- [ ] Create type definitions

**File: `frontend/src/lib/supabase/database.ts`**
```typescript
import { createClient } from './client'
import type { Database } from '@/types/supabase'

export class SupabaseDatabase {
  private client = createClient()

  // Helper to get current auth user
  private async getAuthUser() {
    const { data: { user }, error } = await this.client.auth.getUser()
    if (error || !user) throw new Error('Not authenticated')
    return user
  }

  // Users
  async getCurrentUser() {
    const user = await this.getAuthUser()
    
    const { data, error } = await this.client
      .from('users')
      .select(`
        *,
        customer:customers(*),
        role:roles(*),
        manager:managers(*)
      `)
      .eq('auth_user_id', user.id)
      .single()

    if (error) throw error
    return data
  }

  async getUsers(params: {
    page?: number
    perPage?: number
    search?: string
    customerId?: string[]
    roleId?: string[]
    status?: string[]
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
  }) {
    let query = this.client
      .from('users')
      .select(`
        *,
        customer:customers(*),
        role:roles(*),
        manager:managers(*)
      `, { count: 'exact' })

    // Search filter
    if (params.search) {
      query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`)
    }

    // Customer filter
    if (params.customerId && params.customerId.length > 0) {
      query = query.in('customer_id', params.customerId)
    }

    // Role filter
    if (params.roleId && params.roleId.length > 0) {
      query = query.in('role_id', params.roleId)
    }

    // Status filter
    if (params.status && params.status.length > 0) {
      query = query.in('status', params.status)
    }

    // Sorting
    const orderBy = params.orderBy || 'created_at'
    const orderDirection = params.orderDirection || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Pagination
    const page = params.page || 1
    const perPage = params.perPage || 10
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data,
      meta: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    }
  }

  async getUserById(userId: string) {
    const { data, error } = await this.client
      .from('users')
      .select(`
        *,
        customer:customers(*),
        role:roles(*),
        manager:managers(*)
      `)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data
  }

  async updateUser(userId: string, updates: {
    full_name?: string
    phone_number?: string
    avatar_url?: string
    role_id?: string
    manager_id?: string
    status?: string
  }) {
    const { data, error } = await this.client
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async softDeleteUser(userId: string) {
    const { data, error } = await this.client
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Customers
  async getCustomers(params: {
    page?: number
    perPage?: number
    search?: string
    id?: string[]
  }) {
    let query = this.client
      .from('customers')
      .select('*', { count: 'exact' })

    if (params.search) {
      query = query.ilike('name', `%${params.search}%`)
    }

    if (params.id && params.id.length > 0) {
      query = query.in('customer_id', params.id)
    }

    const page = params.page || 1
    const perPage = params.perPage || 10
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
      data,
      meta: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    }
  }

  async getCustomerById(customerId: string) {
    const { data, error } = await this.client
      .from('customers')
      .select('*')
      .eq('customer_id', customerId)
      .single()

    if (error) throw error
    return data
  }

  async updateCustomer(customerId: string, updates: {
    name?: string
    domain?: string
    lifecycle_stage?: string
    status?: string
  }) {
    const { data, error } = await this.client
      .from('customers')
      .update(updates)
      .eq('customer_id', customerId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Roles
  async getRoles() {
    const { data, error } = await this.client
      .from('roles')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  }

  async getRoleById(roleId: string) {
    const { data, error } = await this.client
      .from('roles')
      .select('*')
      .eq('role_id', roleId)
      .single()

    if (error) throw error
    return data
  }

  // Teams
  async getTeams(customerId?: string) {
    let query = this.client
      .from('teams')
      .select(`
        *,
        customer:customers(*)
      `)

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  async getTeamById(teamId: string) {
    const { data, error } = await this.client
      .from('teams')
      .select(`
        *,
        customer:customers(*),
        members:team_members(
          *,
          user:users(*)
        )
      `)
      .eq('team_id', teamId)
      .single()

    if (error) throw error
    return data
  }

  async createTeam(team: {
    name: string
    description?: string
    customer_id: string
  }) {
    const { data, error } = await this.client
      .from('teams')
      .insert(team)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTeam(teamId: string, updates: {
    name?: string
    description?: string
  }) {
    const { data, error } = await this.client
      .from('teams')
      .update(updates)
      .eq('team_id', teamId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteTeam(teamId: string) {
    const { error } = await this.client
      .from('teams')
      .delete()
      .eq('team_id', teamId)

    if (error) throw error
  }

  // Articles
  async getArticles(params: {
    page?: number
    perPage?: number
    search?: string
    categoryId?: string[]
    status?: string[]
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
  }) {
    let query = this.client
      .from('help_articles')
      .select(`
        *,
        category:help_article_categories(*)
      `, { count: 'exact' })

    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,content.ilike.%${params.search}%`)
    }

    if (params.categoryId && params.categoryId.length > 0) {
      query = query.in('category_id', params.categoryId)
    }

    if (params.status && params.status.length > 0) {
      query = query.in('status', params.status)
    }

    const orderBy = params.orderBy || 'created_at'
    const orderDirection = params.orderDirection || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    const page = params.page || 1
    const perPage = params.perPage || 10
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
      data,
      meta: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    }
  }

  // Notifications
  async getNotifications(params: {
    page?: number
    perPage?: number
    read?: boolean
  }) {
    const user = await this.getAuthUser()
    
    let query = this.client
      .from('notifications')
      .select('*', { count: 'exact' })

    if (params.read !== undefined) {
      query = query.eq('read', params.read)
    }

    query = query.order('created_at', { ascending: false })

    const page = params.page || 1
    const perPage = params.perPage || 20
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
      data,
      meta: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    }
  }

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await this.client
      .from('notifications')
      .update({ read: true })
      .eq('notification_id', notificationId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Export singleton instance
export const supabaseDB = new SupabaseDatabase()
```

**File: `frontend/src/lib/supabase/edge-functions.ts`**
```typescript
import { createClient } from './client'

export class EdgeFunctions {
  private client = createClient()

  // User Management Functions
  async inviteUser(payload: {
    email: string
    customerId: string
    roleId: string
    managerId?: string
  }) {
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { action: 'invite', ...payload }
    })

    if (error) throw new Error(error.message)
    return data
  }

  async inviteMultipleUsers(payload: {
    emails: string[]
    customerId: string
    roleId: string
    managerId?: string
  }) {
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { action: 'invite-multiple', ...payload }
    })

    if (error) throw new Error(error.message)
    return data
  }

  async resendInvite(email: string) {
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { action: 'resend-invite', email }
    })

    if (error) throw new Error(error.message)
    return data
  }

  async banUser(userId: string) {
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { action: 'ban', userId }
    })

    if (error) throw new Error(error.message)
    return data
  }

  async unbanUser(userId: string) {
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { action: 'unban', userId }
    })

    if (error) throw new Error(error.message)
    return data
  }

  // Auth Context Functions
  async refreshWithContext(context: {
    customerId?: string
    impersonatedUserId?: string
  }) {
    const { data, error } = await this.client.functions.invoke('auth-context', {
      body: { action: 'refresh', ...context }
    })

    if (error) throw new Error(error.message)

    // Refresh session to get new JWT with updated app_metadata
    await this.client.auth.refreshSession()

    return data
  }

  async clearContext() {
    const { data, error } = await this.client.functions.invoke('auth-context', {
      body: { action: 'clear' }
    })

    if (error) throw new Error(error.message)

    // Refresh session
    await this.client.auth.refreshSession()

    return data
  }

  // Admin Operations
  async createCustomer(customer: {
    name: string
    domain?: string
    lifecycle_stage?: string
  }) {
    const { data, error } = await this.client.functions.invoke('admin-operations', {
      body: { action: 'create-customer', ...customer }
    })

    if (error) throw new Error(error.message)
    return data
  }
}

// Export singleton instance
export const edgeFunctions = new EdgeFunctions()
```

#### 1.4: Testing Infrastructure

- [ ] Write unit tests for shared utilities
- [ ] Test Edge Functions locally
- [ ] Test RLS policies
- [ ] Create integration test suite

---

## Phase 2: Core Authentication & User Profile

### Goals
- Migrate user profile endpoints
- Test authentication flow
- Verify JWT context works

### Tasks

#### 2.1: Migrate User Profile Endpoints

**Endpoints to Migrate:**
- ✅ `GET /users/me` → `supabaseDB.getCurrentUser()`
- ✅ `PATCH /users/me` → `supabaseDB.updateUser(currentUserId, updates)`

**Steps:**
1. [ ] Update `frontend/src/lib/api/users.ts`
2. [ ] Replace `apiFetch` calls with `supabaseDB` calls
3. [ ] Update data mapping (snake_case ↔ camelCase)
4. [ ] Test in user profile page
5. [ ] Verify RLS allows self-updates

**File Changes:**
- `frontend/src/lib/api/users.ts` - Update `getUserInfo()` and `editUserInfo()`
- `frontend/src/contexts/auth/supabase/user-context.tsx` - Update user fetch logic

#### 2.2: Update Authentication Context

- [ ] Remove backend `/auth/sync/supabase` dependency
- [ ] Update user context to fetch from Supabase directly
- [ ] Test session refresh
- [ ] Verify JWT claims are accessible

#### 2.3: Testing

- [ ] User can view their profile
- [ ] User can update their own information
- [ ] User cannot update other users (RLS blocks)
- [ ] Session persistence works
- [ ] Token refresh works

**Success Criteria:**
✅ User profile page works without backend  
✅ Profile updates save correctly  
✅ RLS blocks unauthorized access

---

## Phase 3: Simple Read Operations

### Goals
- Migrate read-only endpoints with simple queries
- Establish patterns for frontend queries
- Verify RLS filtering works

### Endpoints to Migrate (Priority Order)

#### 3.1: Roles & Permissions (READ ONLY)
**Backend:** `GET /roles`, `GET /permissions`  
**Frontend:** Direct Supabase queries  
**RLS:** Already allows all authenticated users to read

**Steps:**
1. [ ] Create `supabaseDB.getRoles()`
2. [ ] Replace API calls in role selector components
3. [ ] Test with different user roles
4. [ ] Verify no performance issues

**Files to Update:**
- `frontend/src/lib/api/roles.ts` (create if doesn't exist)
- Components using role dropdowns

#### 3.2: Taxonomies
**Backend:** `GET /taxonomies`  
**Frontend:** `supabaseDB.getTaxonomies()`  
**RLS:** Customer-scoped read access

**Steps:**
1. [ ] Create taxonomy queries
2. [ ] Update components
3. [ ] Test customer isolation
4. [ ] Verify search/filter works

#### 3.3: Article Categories
**Backend:** `GET /documents/article-categories`  
**Frontend:** `supabaseDB.getArticleCategories()`

**Steps:**
1. [ ] Create category queries
2. [ ] Update article management UI
3. [ ] Test filtering

#### 3.4: Help Articles (Read)
**Backend:** `GET /documents/articles`  
**Frontend:** `supabaseDB.getArticles(params)`

**Steps:**
1. [ ] Implement paginated article queries
2. [ ] Add search functionality
3. [ ] Add category filtering
4. [ ] Update article list pages

**Success Criteria:**
✅ All read-only lists work  
✅ Pagination works correctly  
✅ Search/filter works  
✅ RLS enforces customer isolation

---

## Phase 4: Complex Queries & Multi-tenant Data

### Goals
- Migrate complex read operations
- Handle customer-scoped queries
- Implement proper pagination

### Endpoints to Migrate

#### 4.1: User List (GET /users)
**Complexity:** HIGH  
**Reason:** Complex filtering, role-based access, customer scoping

**Current Backend Logic:**
- System admins see all users (optional customer filter)
- Customer Success sees users from owned customers
- Customer Admins/Managers see users from their customer only
- Regular users cannot access this endpoint

**Migration Strategy:**
1. [ ] RLS already handles access control
2. [ ] Frontend adds filters as query params
3. [ ] Implement search across name and email
4. [ ] Add role filtering
5. [ ] Add status filtering
6. [ ] Implement proper pagination

**Code:**
```typescript
// Already implemented in supabaseDB.getUsers()
```

**Testing:**
- [ ] System admin can see all users
- [ ] Customer admin sees only their customer's users
- [ ] Customer success sees users from assigned customers
- [ ] Regular users get access denied (RLS)
- [ ] Pagination works correctly
- [ ] Search works across fields
- [ ] Filters combine properly

#### 4.2: Customer List (GET /customers)
**Complexity:** MEDIUM  
**Backend Logic:**
- System admins see all customers
- Customer Success sees assigned customers
- Others see their own customer only

**Migration:**
- [ ] Use `supabaseDB.getCustomers()`
- [ ] RLS handles filtering automatically
- [ ] Test with all role types

#### 4.3: Teams (GET /teams)
**Complexity:** MEDIUM

**Migration:**
- [ ] Implement `supabaseDB.getTeams(customerId?)`
- [ ] Support optional customer filter
- [ ] Include team members in response
- [ ] Test RLS filtering

#### 4.4: Notifications (GET /notifications)
**Complexity:** LOW  
**Note:** Already user-scoped

**Migration:**
- [ ] Use `supabaseDB.getNotifications()`
- [ ] Support read/unread filtering
- [ ] Implement mark as read
- [ ] Test realtime updates (if needed)

**Success Criteria:**
✅ Complex queries return correct data  
✅ RLS properly filters based on user role  
✅ Performance is acceptable  
✅ Pagination works with large datasets

---

## Phase 5: Write Operations & Business Logic

### Goals
- Migrate create/update/delete operations
- Ensure business logic is preserved
- Validate data integrity

### Endpoints to Migrate

#### 5.1: User Updates (PATCH /users/:id)
**Complexity:** MEDIUM  
**Business Logic:**
- Users can only update users in their customer
- Cannot change customer_id (except system admin)
- Role changes require proper authorization

**Migration:**
1. [ ] Use `supabaseDB.updateUser(userId, updates)`
2. [ ] RLS validates access
3. [ ] Add client-side validation
4. [ ] Handle errors gracefully

**Testing:**
- [ ] User can update users in their customer
- [ ] User cannot update users in other customers
- [ ] User cannot escalate their own role
- [ ] Customer ID cannot be changed

#### 5.2: Customer Updates (PATCH /customers/:id)
**Complexity:** LOW  
**Authorization:** System admin only (for most fields)

**Migration:**
- [ ] Use `supabaseDB.updateCustomer()`
- [ ] RLS enforces admin-only writes
- [ ] Test with non-admin users (should fail)

#### 5.3: Team Management
**Endpoints:**
- `POST /teams` → Create team
- `PATCH /teams/:id` → Update team
- `DELETE /teams/:id` → Delete team
- `POST /teams/:id/members` → Add member
- `DELETE /teams/:id/members/:userId` → Remove member

**Migration:**
1. [ ] Implement team CRUD methods
2. [ ] Implement team member management
3. [ ] Test RLS policies
4. [ ] Verify foreign key constraints work

#### 5.4: Article Management
**Endpoints:**
- `POST /documents/articles` → Create article
- `PATCH /documents/articles/:id` → Update article
- `DELETE /documents/articles/:id` → Delete article

**Migration:**
1. [ ] Create article methods in `supabaseDB`
2. [ ] Handle file uploads (if any)
3. [ ] Test with different user roles
4. [ ] Verify RLS policies

#### 5.5: Soft Deletes
**Endpoints:**
- `DELETE /users/:id` → Soft delete user

**Migration:**
1. [ ] Implement `supabaseDB.softDeleteUser()`
2. [ ] Update `deleted_at` field instead of actual delete
3. [ ] Test restoration (if needed)

**Success Criteria:**
✅ Write operations work correctly  
✅ Business rules are enforced  
✅ RLS blocks unauthorized writes  
✅ Data validation works  
✅ Errors are handled gracefully

---

## Phase 6: Admin Operations & Edge Functions

### Goals
- Implement privileged operations in Edge Functions
- Migrate operations requiring service role
- Handle complex multi-step processes

### Edge Functions to Implement

#### 6.1: User Management Function

**File:** `supabase/functions/user-management/index.ts`

**Operations:**
- `invite` - Create auth user + database record + send email
- `invite-multiple` - Batch invite users
- `resend-invite` - Resend invitation email
- `ban` - Ban user using admin API
- `unban` - Unban user

**Implementation Steps:**

1. [ ] Create function structure
2. [ ] Implement authentication middleware
3. [ ] Implement authorization checks
4. [ ] Implement each operation handler
5. [ ] Add error handling
6. [ ] Add logging
7. [ ] Deploy function
8. [ ] Test each operation

**Full Implementation:**

<details>
<summary>Click to see full user-management function code</summary>

```typescript
// supabase/functions/user-management/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { authenticateRequest, isSystemAdmin, isCustomerAdmin, canAccessCustomer, ApiError, createErrorResponse } from '../_shared/auth.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const user = await authenticateRequest(req)
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'invite':
        return await handleInvite(user, body)
      case 'invite-multiple':
        return await handleInviteMultiple(user, body)
      case 'resend-invite':
        return await handleResendInvite(user, body)
      case 'ban':
        return await handleBan(user, body)
      case 'unban':
        return await handleUnban(user, body)
      default:
        throw new ApiError('Invalid action', 400)
    }
  } catch (error) {
    return createErrorResponse(error)
  }
})

async function handleInvite(user, body) {
  const { email, customerId, roleId, managerId } = body

  // Authorization
  if (!isSystemAdmin(user) && !user.customer_id) {
    throw new ApiError('No access to invite users', 403)
  }

  if (!isSystemAdmin(user) && user.customer_id !== customerId) {
    throw new ApiError('Cannot invite users for another customer', 403)
  }

  const supabase = createServiceClient()

  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('user_id')
    .eq('email', email)
    .single()

  if (existing) {
    throw new ApiError('User with this email already exists', 409)
  }

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: {
      invited: true,
      invited_by: user.user_id,
      invited_at: new Date().toISOString()
    }
  })

  if (authError) {
    throw new ApiError(`Failed to create auth user: ${authError.message}`, 400)
  }

  // Create database record
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.user.id,
      email,
      customer_id: customerId,
      role_id: roleId,
      manager_id: managerId,
      status: 'invited'
    })
    .select(`
      *,
      customer:customers(*),
      role:roles(*),
      manager:managers(*)
    `)
    .single()

  if (dbError) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authUser.user.id)
    throw new ApiError(`Failed to create user record: ${dbError.message}`, 400)
  }

  // Send invitation email
  const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3001'
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`
  })

  if (inviteError) {
    console.error('Failed to send invite email:', inviteError)
    // Don't throw - user is created, email failure is not critical
  }

  return new Response(
    JSON.stringify({ data: dbUser }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleInviteMultiple(user, body) {
  const { emails, customerId, roleId, managerId } = body

  // Authorization
  if (!isSystemAdmin(user) && !user.customer_id) {
    throw new ApiError('No access to invite users', 403)
  }

  if (!isSystemAdmin(user) && user.customer_id !== customerId) {
    throw new ApiError('Cannot invite users for another customer', 403)
  }

  // Check for duplicates
  const uniqueEmails = [...new Set(emails)]
  if (uniqueEmails.length !== emails.length) {
    throw new ApiError('Duplicate emails in request', 400)
  }

  const supabase = createServiceClient()

  // Check if any emails already exist
  const { data: existing } = await supabase
    .from('users')
    .select('email')
    .in('email', uniqueEmails)

  if (existing && existing.length > 0) {
    const existingEmails = existing.map(u => u.email)
    throw new ApiError(
      `The following emails already exist: ${existingEmails.join(', ')}`,
      409
    )
  }

  // Create users in parallel
  const results = await Promise.allSettled(
    uniqueEmails.map(email => 
      inviteUser(supabase, email, customerId, roleId, managerId, user.user_id)
    )
  )

  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
  
  const failed = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason)

  return new Response(
    JSON.stringify({ 
      data: successful,
      errors: failed,
      summary: {
        total: uniqueEmails.length,
        successful: successful.length,
        failed: failed.length
      }
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function inviteUser(supabase, email, customerId, roleId, managerId, invitedBy) {
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: {
      invited: true,
      invited_by: invitedBy,
      invited_at: new Date().toISOString()
    }
  })

  if (authError) throw new Error(`Failed to create ${email}: ${authError.message}`)

  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.user.id,
      email,
      customer_id: customerId,
      role_id: roleId,
      manager_id: managerId,
      status: 'invited'
    })
    .select()
    .single()

  if (dbError) {
    await supabase.auth.admin.deleteUser(authUser.user.id)
    throw new Error(`Failed to create ${email}: ${dbError.message}`)
  }

  const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3001'
  await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`
  })

  return dbUser
}

async function handleResendInvite(user, body) {
  const { email } = body

  const supabase = createServiceClient()

  // Get user
  const { data: targetUser } = await supabase
    .from('users')
    .select('user_id, customer_id, auth_user_id, status')
    .eq('email', email)
    .single()

  if (!targetUser) {
    throw new ApiError('User not found', 404)
  }

  if (targetUser.status === 'active') {
    throw new ApiError('User is already active', 400)
  }

  // Authorization
  if (!isSystemAdmin(user) && user.customer_id !== targetUser.customer_id) {
    throw new ApiError('Cannot resend invite for user from another customer', 403)
  }

  // Resend invitation
  const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3001'
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`
  })

  if (error) {
    throw new ApiError(`Failed to resend invite: ${error.message}`, 400)
  }

  return new Response(
    JSON.stringify({ message: 'Invitation resent successfully' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleBan(user, body) {
  const { userId } = body

  // Only system admins can ban users
  if (!isSystemAdmin(user)) {
    throw new ApiError('Only system administrators can ban users', 403)
  }

  const supabase = createServiceClient()

  // Get target user
  const { data: targetUser } = await supabase
    .from('users')
    .select('auth_user_id, email')
    .eq('user_id', userId)
    .single()

  if (!targetUser) {
    throw new ApiError('User not found', 404)
  }

  // Ban user
  const { error } = await supabase.auth.admin.updateUserById(
    targetUser.auth_user_id,
    { ban_duration: '876000h' } // 100 years
  )

  if (error) {
    throw new ApiError(`Failed to ban user: ${error.message}`, 400)
  }

  return new Response(
    JSON.stringify({ message: 'User banned successfully' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleUnban(user, body) {
  const { userId } = body

  // Only system admins can unban users
  if (!isSystemAdmin(user)) {
    throw new ApiError('Only system administrators can unban users', 403)
  }

  const supabase = createServiceClient()

  // Get target user
  const { data: targetUser } = await supabase
    .from('users')
    .select('auth_user_id, email')
    .eq('user_id', userId)
    .single()

  if (!targetUser) {
    throw new ApiError('User not found', 404)
  }

  // Unban user
  const { error } = await supabase.auth.admin.updateUserById(
    targetUser.auth_user_id,
    { ban_duration: 'none' }
  )

  if (error) {
    throw new ApiError(`Failed to unban user: ${error.message}`, 400)
  }

  return new Response(
    JSON.stringify({ message: 'User unbanned successfully' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}
```
</details>

2. [ ] Deploy function
3. [ ] Test each operation
4. [ ] Update frontend to use edge function

#### 6.2: Auth Context Function

**File:** `supabase/functions/auth-context/index.ts`

**Operations:**
- `refresh` - Update JWT app_metadata for context switching
- `clear` - Clear context claims

**Steps:**
1. [ ] Implement function
2. [ ] Test impersonation flow
3. [ ] Test customer switching
4. [ ] Deploy
5. [ ] Update frontend auth service

#### 6.3: Admin Operations Function

**File:** `supabase/functions/admin-operations/index.ts`

**Operations:**
- `create-customer` - Create new customer (system admin only)
- Other admin operations as needed

**Steps:**
1. [ ] Implement customer creation
2. [ ] Test authorization
3. [ ] Deploy
4. [ ] Update frontend

### Frontend Integration

#### 6.4: Update Frontend to Use Edge Functions

**Files to Update:**
- `frontend/src/lib/api/users.ts` - User invite functions
- `frontend/src/lib/auth/auth-service.ts` - Context switching
- `frontend/src/lib/api/customers.ts` - Customer creation

**Changes:**
```typescript
// Before
await apiFetch(`${API_URL}/users/invite`, {
  method: 'POST',
  body: JSON.stringify(payload)
})

// After
await edgeFunctions.inviteUser(payload)
```

**Testing:**
- [ ] User invitation works
- [ ] Multiple user invitation works
- [ ] Resend invite works
- [ ] Ban/unban works
- [ ] Context switching works
- [ ] Error handling works

**Success Criteria:**
✅ All admin operations work via Edge Functions  
✅ Authorization is enforced  
✅ Errors are handled properly  
✅ Performance is acceptable

---

## Phase 7: Testing & Quality Assurance

### Goals
- Comprehensive testing of migrated functionality
- Performance testing
- Security audit
- User acceptance testing

### Testing Tasks

#### 7.1: Functional Testing

**User Management:**
- [ ] Create user
- [ ] Invite user
- [ ] Invite multiple users
- [ ] Resend invitation
- [ ] Update user
- [ ] Delete user (soft delete)
- [ ] Ban user
- [ ] Unban user
- [ ] View user list (all roles)
- [ ] Search users
- [ ] Filter users

**Customer Management:**
- [ ] View customers
- [ ] Create customer (admin)
- [ ] Update customer
- [ ] Customer isolation works

**Teams:**
- [ ] Create team
- [ ] Update team
- [ ] Delete team
- [ ] Add team member
- [ ] Remove team member
- [ ] View teams

**Articles:**
- [ ] View articles
- [ ] Create article
- [ ] Update article
- [ ] Delete article
- [ ] Search articles
- [ ] Filter by category

**Authentication:**
- [ ] Sign in
- [ ] Sign up
- [ ] Password reset
- [ ] Token refresh
- [ ] Session persistence
- [ ] Sign out

**Authorization:**
- [ ] System admin access
- [ ] Customer admin access
- [ ] Customer success access
- [ ] Manager access
- [ ] Standard user access
- [ ] Impersonation
- [ ] Customer switching

#### 7.2: RLS Policy Testing

Create test suite for RLS policies:

**Test Users:**
- System Administrator
- Customer Success (with owned customers)
- Customer Administrator (Customer A)
- Manager (Customer A)
- Standard User (Customer A)
- Standard User (Customer B)

**Test Scenarios:**
```typescript
// Example test structure
describe('RLS Policies - Users Table', () => {
  it('System admin can view all users', async () => {
    // Login as system admin
    // Query users table
    // Expect all users returned
  })

  it('Customer admin can only view users from their customer', async () => {
    // Login as customer admin from Customer A
    // Query users table
    // Expect only Customer A users
  })

  it('Customer admin cannot view users from other customers', async () => {
    // Login as customer admin from Customer A
    // Try to query users from Customer B
    // Expect RLS to block
  })

  it('Standard user cannot list users', async () => {
    // Login as standard user
    // Try to query users table (list)
    // Expect RLS to block (only can view self)
  })
})
```

**RLS Test Coverage:**
- [ ] Users table (all policies)
- [ ] Customers table (all policies)
- [ ] Roles table (all policies)
- [ ] Teams table (all policies)
- [ ] Articles table (all policies)
- [ ] Notifications table (all policies)

#### 7.3: Performance Testing

**Metrics to Measure:**
- Query response times
- Edge function cold start times
- Page load times
- Time to interactive

**Test Scenarios:**
- [ ] Load user list with 1000+ users
- [ ] Search with various terms
- [ ] Complex filters
- [ ] Pagination performance
- [ ] Concurrent user sessions

**Performance Targets:**
- Simple queries: < 100ms
- Complex queries: < 500ms
- Edge functions (warm): < 200ms
- Edge functions (cold): < 2000ms
- Page loads: < 2000ms

#### 7.4: Security Audit

**Areas to Audit:**
- [ ] RLS policies cover all tables
- [ ] No service role key in frontend
- [ ] JWT tokens are validated
- [ ] Edge functions authenticate requests
- [ ] Authorization checks are comprehensive
- [ ] No SQL injection vulnerabilities
- [ ] No data leakage between customers
- [ ] Impersonation requires proper authorization
- [ ] Sensitive operations are logged

#### 7.5: Error Handling Testing

Test error scenarios:
- [ ] Network failures
- [ ] Invalid tokens
- [ ] Expired sessions
- [ ] RLS policy violations
- [ ] Database constraint violations
- [ ] Edge function errors
- [ ] Invalid input data

#### 7.6: User Acceptance Testing

**Test with real users:**
- [ ] Admin user workflow
- [ ] Standard user workflow
- [ ] Manager workflow
- [ ] Customer success workflow

**Feedback Areas:**
- Performance perception
- Error messages clarity
- Missing functionality
- UI/UX issues

**Success Criteria:**
✅ All functional tests pass  
✅ RLS policies work correctly  
✅ Performance meets targets  
✅ Security audit passes  
✅ No critical bugs  
✅ Users accept the changes

---

## Phase 8: Deployment & Backend Deprecation

### Goals
- Deploy frontend changes
- Deploy Edge Functions
- Deprecate backend
- Monitor for issues

### Deployment Steps

#### 8.1: Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Edge Functions deployed to production
- [ ] Environment variables configured
- [ ] Secrets set in Supabase
- [ ] Database migrations applied
- [ ] RLS policies verified in production
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Team notified

#### 8.2: Deploy Edge Functions

```bash
# Deploy to production
supabase functions deploy user-management --project-ref YOUR_PROJECT_REF
supabase functions deploy auth-context --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-operations --project-ref YOUR_PROJECT_REF

# Set production secrets
supabase secrets set SITE_URL=https://your-domain.com --project-ref YOUR_PROJECT_REF
```

**Verify:**
- [ ] Functions are deployed
- [ ] Functions are accessible
- [ ] Environment variables are set
- [ ] Test function calls work

#### 8.3: Deploy Frontend

**Steps:**
1. [ ] Update environment variables (remove NEXT_PUBLIC_API_URL)
2. [ ] Build production frontend
3. [ ] Run pre-deployment tests
4. [ ] Deploy to staging first
5. [ ] Test staging thoroughly
6. [ ] Deploy to production
7. [ ] Verify production works

**Environment Variables to Remove:**
```bash
# Remove from .env
NEXT_PUBLIC_API_URL=...  # No longer needed
```

**Environment Variables to Keep:**
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

#### 8.4: Backend Deprecation

**Option A: Immediate Removal**
- [ ] Stop backend service
- [ ] Remove backend from deployment
- [ ] Archive backend code
- [ ] Update documentation

**Option B: Gradual Deprecation (Recommended)**
1. [ ] Deploy frontend with new logic
2. [ ] Monitor for stability
3. [ ] Keep backend running (but unused)
4. [ ] If no issues, stop backend
5. [ ] After sufficient monitoring period, remove backend deployment
6. [ ] Archive backend code

**Monitoring:**
- [ ] Check error logs
- [ ] Monitor Edge Function logs
- [ ] Track performance metrics
- [ ] Monitor user reports
- [ ] Check Supabase logs

#### 8.5: Post-Deployment Tasks

- [ ] Update documentation
- [ ] Update README
- [ ] Update deployment docs
- [ ] Remove backend API references
- [ ] Update architecture diagrams
- [ ] Clean up unused dependencies
- [ ] Remove backend-related CI/CD

**Files to Update:**
- `README.md` - Remove backend setup instructions
- `docker-compose.yml` - Remove backend service
- `.github/workflows/*` - Remove backend deployment
- Architecture documentation

#### 8.6: Cost Analysis

**Before:**
- Backend server instance
- Backend deployment
- Backend monitoring

**After:**
- Supabase Edge Functions (pay-per-use)
- Direct database queries (included in Supabase plan)

**Expected Savings:**
Calculate and document cost savings.

**Success Criteria:**
✅ Frontend deployed successfully  
✅ All features working  
✅ No critical issues  
✅ Backend can be safely removed  
✅ Documentation updated  
✅ Team trained on new architecture

---

## Testing Strategy

### Unit Tests

**Frontend Tests:**
- Supabase query methods
- Data mappers (snake_case ↔ camelCase)
- Error handling
- Input validation

**Edge Function Tests:**
- Authentication helpers
- Authorization checks
- Individual handlers
- Error responses

### Integration Tests

**Test Scenarios:**
- End-to-end user flows
- Multi-step operations
- Edge Function + Database interactions
- RLS policy enforcement

**Tools:**
- Playwright for E2E tests
- Supabase Test Helpers for database tests
- Mock Supabase for unit tests

### RLS Policy Tests

Create dedicated test suite:
```typescript
// supabase/tests/rls-policies.test.ts
describe('RLS Policies', () => {
  // Test each policy with different user types
})
```

### Performance Tests

**Metrics:**
- Query response times
- Edge Function latency
- Page load times
- Time to first byte (TTFB)

**Tools:**
- Lighthouse
- WebPageTest
- Custom performance monitoring

### Security Tests

**Areas:**
- SQL injection attempts
- Authorization bypass attempts
- Token manipulation
- Cross-tenant data access

---

## Rollback Plan

### If Issues Occur During Migration

#### Minor Issues
- Fix forward (patch and deploy)
- No rollback needed

#### Major Issues
- Revert frontend deployment
- Backend still running (parallel deployment)
- Switch DNS/load balancer back to backend
- Investigate and fix issues
- Retry deployment

### Rollback Steps

1. [ ] Revert frontend deployment to previous version
2. [ ] Update environment variables to point back to backend API
3. [ ] Verify backend is operational
4. [ ] Test critical paths
5. [ ] Notify team
6. [ ] Root cause analysis
7. [ ] Fix issues
8. [ ] Plan retry

### Data Rollback

**If database changes were made:**
- [ ] Use database backup
- [ ] Rollback migrations if needed
- [ ] Verify data integrity

**Note:** RLS policies and Edge Functions can coexist with backend, so no immediate rollback needed.

---

## Success Metrics

### Technical Metrics

- **Uptime:** > 99.9%
- **Error Rate:** < 0.1%
- **Query Performance:** < 500ms p95
- **Edge Function Performance:** < 1000ms p95
- **Page Load Time:** < 2000ms p95

### Business Metrics

- **Cost Reduction:** Target XX% reduction in infrastructure costs
- **Deployment Complexity:** Reduced from 2 services to 1
- **Development Velocity:** Faster feature development (measure after migration stabilizes)

### Quality Metrics

- **Bug Count:** < 5 critical bugs post-migration
- **User Satisfaction:** > 90% (survey after migration)
- **Support Tickets:** No increase in support volume

---

## Risk Management

### Identified Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| RLS policy gaps | High | Medium | Comprehensive testing, audit |
| Edge Function cold starts | Medium | High | Accept or optimize functions |
| Data exposure | High | Low | Security audit, testing |
| Performance degradation | Medium | Medium | Performance testing, monitoring |
| Missing business logic | High | Medium | Thorough endpoint mapping |
| User resistance | Low | Low | Good documentation, training |

### Mitigation Strategies

1. **Parallel Deployment:** Run both systems temporarily
2. **Feature Flags:** Gradual rollout of new features
3. **Monitoring:** Comprehensive logging and alerting
4. **Rollback Plan:** Quick revert if needed
5. **Testing:** Extensive testing before deployment

---

## Team Responsibilities

### Frontend Developer
- Migrate API calls to Supabase
- Update components
- Implement error handling
- Create data mappers
- Testing

### Backend/Edge Function Developer
- Create Edge Functions
- Implement authorization logic
- Set up Edge Function infrastructure
- Testing

### Database Developer
- Review/update RLS policies
- Create database functions if needed
- Performance optimization
- Testing

### QA Engineer
- Create test plans
- Execute tests
- Performance testing
- Security testing
- User acceptance testing

### DevOps Engineer
- Deploy Edge Functions
- Configure Supabase
- Set up monitoring
- Deployment automation
- Rollback procedures

---

## Communication Plan

### Stakeholders

- Development team
- QA team
- DevOps team
- Product management
- End users (if applicable)

### Communication Frequency

- **Daily:** Standup updates during active migration
- **Weekly:** Progress reports
- **Ad-hoc:** Blocker notifications
- **Post-migration:** Retrospective

### Status Reporting

**Weekly Status Template:**
```markdown
## Migration Status - Week X

### Completed This Week
- Task 1
- Task 2

### In Progress
- Task 3

### Blockers
- Issue 1

### Next Week
- Task 4
- Task 5

### Risks/Concerns
- Risk 1
```

---

## Post-Migration Activities

### Immediate Post-Migration
- [ ] Daily monitoring
- [ ] Quick bug fixes
- [ ] User feedback collection
- [ ] Performance monitoring

### Short-term Post-Migration
- [ ] Optimization based on usage patterns
- [ ] Address user feedback
- [ ] Knowledge base updates
- [ ] Team training

### Long-term Post-Migration
- [ ] Backend removal (if stable)
- [ ] Architecture documentation
- [ ] Lessons learned document
- [ ] Retrospective meeting

---

## Appendix

### Useful Commands

**Supabase CLI:**
```bash
# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Run database migrations
supabase db push

# Deploy Edge Function
supabase functions deploy FUNCTION_NAME

# Set secrets
supabase secrets set KEY=VALUE

# View logs
supabase functions logs FUNCTION_NAME

# Generate types
supabase gen types typescript --linked > types/supabase.ts
```

**Testing:**
```bash
# Run frontend tests
cd frontend && pnpm test

# Run E2E tests
cd testing && pnpm test

# Performance test
lighthouse https://your-app.com
```

### Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JS Client Documentation](https://supabase.com/docs/reference/javascript/introduction)
- Deno Documentation
- Project README

### Key Files Reference

**Frontend:**
- `frontend/src/lib/supabase/database.ts` - Main database service
- `frontend/src/lib/supabase/edge-functions.ts` - Edge function calls
- `frontend/src/lib/supabase/client.ts` - Supabase client initialization
- `frontend/src/lib/api/*` - API layer (to be updated)

**Backend/Supabase:**
- `supabase/functions/*` - Edge Functions
- `supabase/migrations/*` - Database migrations
- `supabase/types/supabase.ts` - Generated types

**Documentation:**
- `MIGRATION_PLAN.md` - This file
- `ENDPOINT_INVENTORY.md` - Endpoint mapping (to be created)
- `RLS_POLICY_AUDIT.md` - RLS audit (to be created)

---

## Conclusion

This migration plan provides a comprehensive roadmap for moving from a NestJS backend to a full frontend architecture with Supabase Edge Functions. The phased approach allows for gradual migration, thorough testing, and minimal risk.

**Key Success Factors:**
1. Thorough testing at each phase
2. Proper RLS policy implementation
3. Comprehensive Edge Functions for privileged operations
4. Good monitoring and logging
5. Clear rollback procedures
6. Team communication

**Next Steps:**
1. Review this plan with the team
2. Get stakeholder approval
3. Create detailed task breakdown
4. Begin Phase 0: Preparation
5. Set up project tracking
6. Schedule kickoff meeting

---

**Document Version:** 1.1  
**Last Updated:** November 11, 2025  
**Status:** Draft - Pending Approval

**Note:** This plan focuses on phases and tasks without time estimates. Complete phases in order based on your team's capacity and priorities.

