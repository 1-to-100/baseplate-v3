# 🚀 Migration Quick Start Guide

> **TL;DR:** Remove NestJS backend, use Supabase Edge Functions + direct database calls.

## 📋 What You Need to Know

### Architecture Change
```
OLD: Frontend → NestJS Backend → Supabase
NEW: Frontend → Supabase (Edge Functions for admin ops)
```

### Key Components
- **Direct Queries:** Use `@supabase/ssr` for CRUD operations
- **Edge Functions:** Handle user invites, bans, impersonation (Deno)
- **RLS Policies:** Already implemented, enforce authorization at DB level

---

## 🎯 First Steps (Today)

### 1. Review the Full Plan
Read `MIGRATION_PLAN.md` (comprehensive 6-7 week plan)

### 2. Set Up Development Environment

```bash
# Install Supabase CLI if not already installed
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link your project
cd backend
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Create Edge Functions Directory Structure

```bash
cd supabase
mkdir -p functions/_shared
mkdir -p functions/user-management/handlers
mkdir -p functions/auth-context/handlers
mkdir -p functions/admin-operations/handlers
```

### 4. Verify RLS Policies

```bash
# Check RLS policies are enabled
supabase db diff --use-migra

# Test RLS locally
supabase start
supabase db test
```

---

## 📊 Migration Order

### Phase 1: Foundation
1. ✅ Set up Edge Functions infrastructure
2. ✅ Create shared utilities (auth, errors, CORS)
3. ✅ Deploy and test base setup

### Phase 2: Easy Wins
1. ✅ **Simple Reads:** Roles, permissions, taxonomies (RLS already handles these)
2. ✅ **User Profile:** `GET /users/me`, `PATCH /users/me`
3. ✅ **Read-only Lists:** Articles, categories

### Phase 3: Complex Queries
1. ✅ **User List:** With filtering, search, pagination
2. ✅ **Customer List:** Multi-tenant filtering
3. ✅ **Teams:** Full CRUD
4. ✅ **Write Operations:** Updates, soft deletes

### Phase 4: Admin & Edge Functions
1. ✅ **User Management Edge Function:** Invites, bans
2. ✅ **Auth Context Edge Function:** Impersonation, customer switching
3. ✅ **Testing:** Comprehensive QA
4. ✅ **Deployment:** Production rollout

---

## 🔧 Quick Implementation Examples

### Example 1: Simple Read (Roles)

**Before (Backend API):**
```typescript
// frontend/src/lib/api/roles.ts
export async function getRoles() {
  return apiFetch(`${API_URL}/roles`)
}
```

**After (Direct Supabase):**
```typescript
import { createClient } from '@/lib/supabase/client'

export async function getRoles() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data
}
```

### Example 2: User Profile

**Before:**
```typescript
export async function getUserInfo() {
  return apiFetch(`${API_URL}/users/me`)
}
```

**After:**
```typescript
export async function getUserInfo() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      customer:customers(*),
      role:roles(*)
    `)
    .eq('auth_user_id', user.id)
    .single()
  
  if (error) throw error
  return data
}
```

### Example 3: Complex Query with Filters

**Before:**
```typescript
export async function getUsers(params) {
  const query = new URLSearchParams(params)
  return apiFetch(`${API_URL}/users?${query}`)
}
```

**After:**
```typescript
export async function getUsers(params) {
  const supabase = createClient()
  let query = supabase
    .from('users')
    .select('*, customer:customers(*), role:roles(*)', { count: 'exact' })
  
  // RLS automatically filters based on user role
  
  if (params.search) {
    query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`)
  }
  
  if (params.customerId?.length > 0) {
    query = query.in('customer_id', params.customerId)
  }
  
  // Pagination
  const from = (params.page - 1) * params.perPage
  const to = from + params.perPage - 1
  query = query.range(from, to)
  
  const { data, error, count } = await query
  if (error) throw error
  
  return { data, total: count }
}
```

### Example 4: Edge Function Call (User Invite)

**Before:**
```typescript
export async function inviteUser(payload) {
  return apiFetch(`${API_URL}/users/invite`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
```

**After:**
```typescript
import { createClient } from '@/lib/supabase/client'

export async function inviteUser(payload) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('user-management', {
    body: { action: 'invite', ...payload }
  })
  
  if (error) throw error
  return data
}
```

---

## ⚠️ Critical Gotchas

### 1. Field Naming Convention
Backend uses `camelCase`, database uses `snake_case`:
```typescript
// Create mapper functions
function dbToApi(dbUser) {
  return {
    userId: dbUser.user_id,
    firstName: dbUser.first_name,
    customerId: dbUser.customer_id,
    // ...
  }
}
```

### 2. RLS Will Block Unauthorized Queries
```typescript
// This will throw an error if user doesn't have access
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('customer_id', 'some-other-customer-id')

// RLS error: "Row level security policy violation"
```

### 3. Service Role Operations Need Edge Functions
```typescript
// ❌ WRONG - Can't use service role key in frontend
const supabase = createClient(url, SERVICE_ROLE_KEY) 

// ✅ RIGHT - Use Edge Function
await supabase.functions.invoke('user-management', {
  body: { action: 'invite', email: 'user@example.com' }
})
```

### 4. JWT Claims for Context
```typescript
// Current user's JWT contains app_metadata
const { data: { user } } = await supabase.auth.getUser()
const customerId = user.app_metadata?.customer_id
const impersonatedUserId = user.app_metadata?.impersonated_user_id
```

---

## 🧪 Testing Your First Migration

### Test: Migrate GET /roles

1. **Create new Supabase function:**
```typescript
// frontend/src/lib/supabase/database.ts
export async function getRoles() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data
}
```

2. **Update existing API file:**
```typescript
// frontend/src/lib/api/roles.ts
import { getRoles as getSupabaseRoles } from '@/lib/supabase/database'

export async function getRoles() {
  return getSupabaseRoles()
}
```

3. **Test in browser:**
- Open your app
- Navigate to any page that uses roles
- Check Network tab (no backend API call)
- Check Supabase logs (should see query)

4. **Verify RLS:**
```sql
-- In Supabase SQL Editor
SELECT * FROM roles; -- Should work for any authenticated user
```

---

## 📚 Resources

### Essential Reading
1. **Full Migration Plan:** `MIGRATION_PLAN.md` (this directory)
2. **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
3. **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
4. **Supabase JS Client:** https://supabase.com/docs/reference/javascript/select

### Your Current Setup
- **Frontend:** Next.js with `@supabase/ssr`
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (JWT-based)
- **RLS:** Already implemented and tested
- **Backend:** NestJS (to be removed)

---

## 🚦 Decision Points

### When to Use Edge Functions?
✅ **Use Edge Functions for:**
- User invitations (needs service role to create auth users)
- Banning/unbanning users (needs admin API)
- Updating JWT app_metadata (impersonation, context switching)
- Complex multi-step operations with rollback logic
- Operations requiring elevated privileges

❌ **Don't Use Edge Functions for:**
- Simple CRUD operations (RLS handles authorization)
- Read queries (direct Supabase client)
- User profile updates (RLS allows self-updates)
- Most data fetching

### When to Update RLS Policies?
- If you need more granular permissions
- If you add new tables
- If business rules change

### Data Mapping Strategy
**Option A:** Keep snake_case everywhere (recommended)
- Less mapping code
- Matches database schema
- TypeScript types from Supabase CLI

**Option B:** Convert to camelCase in frontend
- Consistent with current frontend code
- More mapping logic needed
- Create utility functions

---

## ✅ Pre-Migration Checklist

Before starting migration:
- [ ] Read full migration plan
- [ ] Supabase CLI installed and configured
- [ ] Project linked to Supabase
- [ ] RLS policies verified
- [ ] Local Supabase instance running for testing
- [ ] Team aligned on approach
- [ ] Stakeholder approval

---

## 🆘 Getting Help

### Common Issues

**Issue:** "Row level security policy violation"
- **Cause:** RLS blocking your query
- **Fix:** Check which user role you're testing with, verify RLS policy allows this operation

**Issue:** Edge Function cold start timeout
- **Cause:** First invocation takes longer
- **Fix:** Normal behavior, subsequent calls are fast

**Issue:** "Invalid JWT token"
- **Cause:** Token expired or invalid
- **Fix:** Call `supabase.auth.refreshSession()`

**Issue:** Can't access service role operations
- **Cause:** Trying to use service role in frontend
- **Fix:** Create Edge Function instead

---

## 🎬 Ready to Start?

### Your First Task
Pick ONE simple endpoint to migrate:
- `GET /roles` (easiest)
- `GET /permissions` (easy)
- `GET /users/me` (easy, but requires mapping)

### Steps:
1. Create `frontend/src/lib/supabase/database.ts`
2. Implement the function
3. Update the existing API file
4. Test in your app
5. Verify it works without backend
6. Celebrate 🎉

### Then:
- Continue with other simple reads
- Build momentum
- Move to complex queries
- Implement Edge Functions
- Deploy!

---

**Questions?** Review the full `MIGRATION_PLAN.md` or reach out to the team.

**Next Steps:** Start Phase 0 (Preparation) from the main migration plan.

Good luck! 🚀

