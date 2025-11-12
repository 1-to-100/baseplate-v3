# Backend Endpoint Inventory

**Purpose:** Track all backend endpoints and plan their migration strategy.  
**Status:** Template - To be filled during Phase 0  
**Last Updated:** TBD

---

## How to Use This Document

1. For each backend module, list all endpoints
2. Classify complexity (Simple/Medium/Complex)
3. Determine migration strategy
4. Note any special considerations
5. Track migration status

---

## Legend

**Complexity:**
- 🟢 **Simple:** Direct database query, RLS handles authorization
- 🟡 **Medium:** Complex query or business logic, but no service role needed
- 🔴 **Complex:** Requires Edge Function (service role operations)

**Migration Strategy:**
- **Direct Query:** Use `supabaseDB` methods
- **Edge Function:** Implement in Supabase Edge Function
- **Remove:** No longer needed

---

## Authentication Module

### Endpoints

| Method | Path | Complexity | Strategy | Notes | Status |
|--------|------|------------|----------|-------|--------|
| POST | `/auth/reset-password` | 🟡 | Direct Query | Use Supabase resetPasswordForEmail | ⏳ |
| POST | `/auth/sync/supabase` | 🟡 | Remove | Auto-sync on first login, not needed | ⏳ |
| POST | `/auth/refresh-with-context` | 🔴 | Edge Function | Updates JWT app_metadata | ⏳ |
| POST | `/auth/clear-context` | 🔴 | Edge Function | Clears JWT context | ⏳ |
| GET | `/role-test/admin` | 🟢 | Remove | Test endpoint, not for production | ⏳ |
| GET | `/role-test/manager` | 🟢 | Remove | Test endpoint, not for production | ⏳ |

**Special Considerations:**
- JWT context management is critical for impersonation
- Password reset can use Supabase Auth directly
- Role test endpoints are for development only

---

## Users Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/users` | 🟡 | Direct Query | User management page | ⏳ |
| GET | `/users/me` | 🟢 | Direct Query | User profile, header | ⏳ |
| GET | `/users/:id` | 🟢 | Direct Query | User detail page | ⏳ |
| POST | `/users` | 🔴 | Edge Function | Admin user creation | ⏳ |
| POST | `/users/invite` | 🔴 | Edge Function | User invitation flow | ⏳ |
| POST | `/users/invite-multiple` | 🔴 | Edge Function | Bulk user invite | ⏳ |
| POST | `/users/resend-invite` | 🔴 | Edge Function | Resend invite email | ⏳ |
| POST | `/users/check-email` | 🟢 | Direct Query | Email validation | ⏳ |
| PATCH | `/users/me` | 🟢 | Direct Query | Profile update | ⏳ |
| PATCH | `/users/:id` | 🟡 | Direct Query | Admin user update | ⏳ |
| DELETE | `/users/:id` | 🟡 | Direct Query | Soft delete (updates deleted_at) | ⏳ |

### System Users Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/system-users` | 🟡 | Direct Query | System admin user list | ⏳ |
| GET | `/system-users/:id` | 🟢 | Direct Query | System user detail | ⏳ |
| POST | `/system-users` | 🔴 | Edge Function | Create system user | ⏳ |
| PATCH | `/system-users/:id` | 🟡 | Direct Query | Update system user | ⏳ |
| POST | `/system-users/resend-invite` | 🔴 | Edge Function | Resend system user invite | ⏳ |

**Special Considerations:**
- User invitations require service role (create auth user + send email)
- Bulk operations need transaction handling
- Soft deletes must update `deleted_at` field
- RLS handles most authorization
- System users are users without customerId

---

## Customers Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/customers` | 🟡 | Direct Query | Customer list page | ⏳ |
| GET | `/customers/:id` | 🟢 | Direct Query | Customer detail page | ⏳ |
| GET | `/customers/:id/customer-success` | 🟢 | Direct Query | CS assignment view | ⏳ |
| POST | `/customers` | 🟡 | Direct Query or Edge Function | Admin customer creation | ⏳ |
| POST | `/customers/:id/customer-success/:userId` | 🟢 | Direct Query | Assign CS rep | ⏳ |
| PATCH | `/customers/:id` | 🟢 | Direct Query | Customer update | ⏳ |
| PATCH | `/customers/:id/customer-success` | 🟢 | Direct Query | Update CS assignments | ⏳ |
| DELETE | `/customers/:id` | 🟢 | Direct Query | Customer deletion | ⏳ |
| DELETE | `/customers/:id/customer-success/:userId` | 🟢 | Direct Query | Remove CS assignment | ⏳ |

**Special Considerations:**
- RLS already enforces customer access rules
- System admin can access all customers
- Customer Success can access assigned customers only

---

## Roles Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/roles` | 🟢 | Direct Query | Role dropdowns, everywhere | ⏳ |
| GET | `/roles/:id` | 🟢 | Direct Query | Role detail page | ⏳ |
| POST | `/roles` | 🟡 | Direct Query | Admin role creation | ⏳ |
| POST | `/roles/:id/permissions` | 🟡 | Direct Query | Update role permissions by name | ⏳ |
| PATCH | `/roles/:id` | 🟡 | Direct Query | Role update | ⏳ |

### Role Permissions Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/role-permissions/role/:roleId` | 🟢 | Direct Query | Get permissions for role | ⏳ |
| GET | `/role-permissions/permission/:permissionId` | 🟢 | Direct Query | Get roles with permission | ⏳ |
| GET | `/role-permissions/check` | 🟢 | Direct Query | Check if role has permission | ⏳ |
| POST | `/role-permissions` | 🟡 | Direct Query | Add permission to role | ⏳ |
| PUT | `/role-permissions/role/:roleId` | 🟡 | Direct Query | Set all permissions for role | ⏳ |
| DELETE | `/role-permissions` | 🟡 | Direct Query | Remove permission from role | ⏳ |

**Special Considerations:**
- System roles cannot be modified (RLS policy)
- All authenticated users can read roles
- Only system admins can modify roles
- Role permissions use JSONB array in database

---

## Permissions Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/permissions` | 🟢 | Direct Query | Permission management | ⏳ |
| GET | `/permissions/:id` | 🟢 | Direct Query | Permission detail | ⏳ |
| POST | `/permissions` | 🟡 | Direct Query | Admin permission creation | ⏳ |
| PATCH | `/permissions/:id` | 🟡 | Direct Query | Permission update | ⏳ |
| DELETE | `/permissions/:id` | 🟡 | Direct Query | Permission deletion | ⏳ |

**Special Considerations:**
- Read access for all authenticated users
- Write access only for system admins

---

## Teams Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/teams` | 🟢 | Direct Query | Teams list page | ⏳ |
| GET | `/teams/:id` | 🟢 | Direct Query | Team detail page | ⏳ |
| POST | `/teams` | 🟢 | Direct Query | Create team | ⏳ |
| POST | `/teams/:id/set-primary` | 🟢 | Direct Query | Set team as primary | ⏳ |
| PATCH | `/teams/:id` | 🟢 | Direct Query | Update team | ⏳ |
| DELETE | `/teams/:id` | 🟢 | Direct Query | Delete team | ⏳ |

### Team Members Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/team-members/team/:teamId` | 🟢 | Direct Query | Get members of team | ⏳ |
| GET | `/team-members/user/:userId` | 🟢 | Direct Query | Get teams for user | ⏳ |
| GET | `/team-members/check` | 🟢 | Direct Query | Check membership | ⏳ |
| POST | `/team-members` | 🟢 | Direct Query | Add team member | ⏳ |
| DELETE | `/team-members/:id` | 🟢 | Direct Query | Remove member by ID | ⏳ |
| DELETE | `/team-members` | 🟢 | Direct Query | Remove by teamId+userId | ⏳ |

**Special Considerations:**
- RLS policies handle customer-scoped access
- Managers can manage teams in their customer
- Teams have is_primary flag for default team

---

## Articles Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/documents/articles` | 🟡 | Direct Query | Article list, search | ⏳ |
| GET | `/documents/articles/:id` | 🟢 | Direct Query | Article view | ⏳ |
| POST | `/documents/articles` | 🟡 | Direct Query | Create article | ⏳ |
| PATCH | `/documents/articles/:id` | 🟡 | Direct Query | Update article | ⏳ |
| DELETE | `/documents/articles/:id` | 🟢 | Direct Query | Delete article | ⏳ |

**Special Considerations:**
- Supports search, pagination, filtering
- RLS enforces customer access
- May include file attachments (handle separately)

---

## Article Categories Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/documents/article-categories` | 🟢 | Direct Query | Category dropdowns | ⏳ |
| GET | `/documents/article-categories/:id` | 🟢 | Direct Query | Category detail | ⏳ |
| POST | `/documents/article-categories` | 🟢 | Direct Query | Create category | ⏳ |
| PATCH | `/documents/article-categories/:id` | 🟢 | Direct Query | Update category | ⏳ |
| DELETE | `/documents/article-categories/:id` | 🟢 | Direct Query | Delete category | ⏳ |

**Special Considerations:**
- Simple CRUD with RLS

---

## Taxonomies Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/taxonomies/customers` | 🟢 | Direct Query | Customer taxonomy | ⏳ |
| GET | `/taxonomies/roles` | 🟢 | Direct Query | Roles taxonomy | ⏳ |
| GET | `/taxonomies/managers` | 🟢 | Direct Query | Managers taxonomy | ⏳ |
| GET | `/taxonomies/subscriptions` | 🟢 | Direct Query | Subscriptions taxonomy | ⏳ |
| GET | `/taxonomies/statuses` | 🟢 | Direct Query | Statuses taxonomy | ⏳ |
| GET | `/taxonomies/user-system-roles` | 🟢 | Direct Query | User system roles | ⏳ |
| GET | `/taxonomies/notifications` | 🟢 | Direct Query | Notification types/channels | ⏳ |

**Special Considerations:**
- These are lookup/helper endpoints
- Return simplified data for dropdowns and filters
- Customer-scoped where applicable
- Static data for some (statuses, user-system-roles)

---

## Notifications Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/notifications` | 🟢 | Direct Query | Notification center | ⏳ |
| GET | `/notifications/:id` | 🟢 | Direct Query | Notification detail | ⏳ |
| GET | `/notifications/admin` | 🟡 | Direct Query | Admin notifications list | ⏳ |
| POST | `/notifications` | 🟡 | Direct Query | Create notification | ⏳ |
| PATCH | `/notifications/:id` | 🟢 | Direct Query | Mark as read | ⏳ |
| DELETE | `/notifications/:id` | 🟢 | Direct Query | Delete notification | ⏳ |

### Notification Templates Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/notification/templates` | 🟢 | Direct Query | Template management | ⏳ |
| GET | `/notification/templates/:id` | 🟢 | Direct Query | Template detail | ⏳ |
| POST | `/notification/templates` | 🟡 | Direct Query | Create template | ⏳ |
| POST | `/notification/templates/send/:templateId` | 🟡 | Direct Query | Send from template | ⏳ |
| PATCH | `/notification/templates/:id` | 🟡 | Direct Query | Update template | ⏳ |
| DELETE | `/notification/templates/:id` | 🟢 | Direct Query | Delete template | ⏳ |

**Special Considerations:**
- Real-time updates (consider Supabase Realtime)
- Template-based sending has complex authorization
- Only system admin and customer success can manage templates

---

## Subscriptions Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/subscriptions` | 🟢 | Direct Query | Subscription list | ⏳ |
| GET | `/subscriptions/stripe/:stripeId` | 🟢 | Direct Query | Get by Stripe ID | ⏳ |
| GET | `/subscriptions/active/:customerId` | 🟢 | Direct Query | Active subscriptions | ⏳ |
| GET | `/subscriptions/:id` | 🟢 | Direct Query | Subscription detail | ⏳ |
| POST | `/subscriptions` | 🟡 | Direct Query | Create subscription | ⏳ |
| PATCH | `/subscriptions/:id` | 🟡 | Direct Query | Update subscription | ⏳ |
| DELETE | `/subscriptions/:id` | 🟢 | Direct Query | Delete subscription | ⏳ |

**Special Considerations:**
- May integrate with Stripe webhooks
- Customer-scoped access
- System-level operations for webhook handling

---

## Managers Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/managers` | 🟢 | Direct Query | Manager list | ⏳ |
| GET | `/managers/:id` | 🟢 | Direct Query | Manager detail | ⏳ |
| POST | `/managers` | 🟡 | Direct Query | Create manager | ⏳ |
| PATCH | `/managers/:id` | 🟡 | Direct Query | Update manager | ⏳ |
| DELETE | `/managers/:id` | 🟢 | Direct Query | Delete manager | ⏳ |

**Special Considerations:**
- Manager role has special RLS policies
- Can manage users in their customer

---

## Register Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| POST | `/register` | 🔴 | Edge Function | Public registration | ⏳ |
| GET | `/register/validate-code/:code` | 🟢 | Direct Query | Validate one-time code | ⏳ |
| GET | `/register/validate-email/:email` | 🟢 | Direct Query | Validate email domain | ⏳ |

**Special Considerations:**
- Public endpoint (unauthenticated)
- Creates auth user + database record
- Validates against public email domains
- One-time codes for registration flow

---

## Customer Success Owned Customers Module

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/customer-success-owned-customers` | 🟢 | Direct Query | CS assignments | ⏳ |
| GET | `/customer-success-owned-customers/check` | 🟢 | Direct Query | Check assignment | ⏳ |
| GET | `/customer-success-owned-customers/:id` | 🟢 | Direct Query | Assignment detail | ⏳ |
| POST | `/customer-success-owned-customers` | 🟢 | Direct Query | Create assignment | ⏳ |
| DELETE | `/customer-success-owned-customers/:id` | 🟢 | Direct Query | Remove by ID | ⏳ |
| DELETE | `/customer-success-owned-customers` | 🟢 | Direct Query | Remove by userId+customerId | ⏳ |

**Special Considerations:**
- Junction table for CS-Customer relationships
- Used by RLS policy `get_accessible_customer_ids()`
- Allows filtering by userId or customerId

---

## System Modules

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/system-modules` | 🟢 | Direct Query | Get system modules | ⏳ |
| GET | `/system-modules/seed` | 🟢 | Remove | Seed endpoint (disabled) | ⏳ |
| GET | `/system-modules/test` | 🟢 | Remove | Test endpoint | ⏳ |

**Special Considerations:**
- System configuration endpoints
- Seed endpoint is disabled

## App Controller

### Endpoints

| Method | Path | Complexity | Strategy | Frontend Usage | Status |
|--------|------|------------|----------|----------------|--------|
| GET | `/ping` | 🟢 | Remove | Health check | ⏳ |

**Special Considerations:**
- Health check endpoint
- Can be replaced with Supabase health check

---

## Summary

### By Complexity

- 🟢 **Simple (Direct Query):** 75+ endpoints
- 🟡 **Medium (Direct Query with logic):** 20+ endpoints  
- 🔴 **Complex (Edge Function required):** 10+ endpoints

### By Module

| Module | Simple | Medium | Complex | Total |
|--------|--------|--------|---------|-------|
| Auth | 2 | 1 | 2 | 5 |
| Users | 7 | 2 | 4 | 13 |
| System Users | 2 | 1 | 2 | 5 |
| Customers | 7 | 1 | 0 | 8 |
| Roles | 2 | 3 | 0 | 5 |
| Role Permissions | 3 | 3 | 0 | 6 |
| Permissions | 2 | 3 | 0 | 5 |
| Teams | 6 | 0 | 0 | 6 |
| Team Members | 6 | 0 | 0 | 6 |
| Articles | 2 | 3 | 0 | 5 |
| Categories | 5 | 1 | 0 | 6 |
| Taxonomies | 7 | 0 | 0 | 7 |
| Notifications | 6 | 1 | 0 | 7 |
| Templates | 4 | 3 | 0 | 7 |
| Subscriptions | 4 | 2 | 0 | 6 |
| Managers | 3 | 2 | 0 | 5 |
| Register | 2 | 0 | 1 | 3 |
| CS Owned | 5 | 0 | 0 | 5 |
| System Modules | 3 | 0 | 0 | 3 |
| App | 1 | 0 | 0 | 1 |
| **TOTAL** | **79** | **26** | **9** | **114** |

### Edge Functions Required

Based on this inventory, we need these Edge Functions:

1. **user-management**
   - User invitation (single & bulk)
   - Resend invitation
   - Ban user
   - Unban user
   - Public registration

2. **auth-context**
   - Refresh with context (impersonation)
   - Clear context

3. **admin-operations** (optional, can be direct queries)
   - Create customer
   - Other admin operations as needed

### Migration Order Recommendation

**Phase 1: Quick Wins (Week 2)**
- All Simple (Green) endpoints
- User profile (`/users/me`)
- Roles and permissions (read)
- Categories and taxonomies

**Phase 2: Medium Complexity (Week 3-4)**
- User list with filtering
- Customer list
- Teams CRUD
- Article management

**Phase 3: Edge Functions (Week 5)**
- User management function
- Auth context function
- Test thoroughly

**Phase 4: Final (Week 6)**
- Any remaining complex operations
- Performance optimization
- Bug fixes

---

## Notes & Decisions

### Data Mapping Strategy
**Decision:** [TBD]
- Option A: Keep snake_case from database
- Option B: Convert to camelCase in frontend

### Error Handling
**Decision:** [TBD]
- Supabase error format vs. backend error format
- Error codes and messages

### Pagination
**Decision:** [TBD]
- Use Supabase range() for pagination
- Return format: `{ data: [], meta: { total, page, perPage } }`

### File Uploads
**Decision:** [TBD]
- Use Supabase Storage directly
- Or keep backend for file handling

---

## Action Items

- [ ] Complete this inventory (fill in all endpoints)
- [ ] Verify frontend usage for each endpoint
- [ ] Confirm complexity classifications
- [ ] Identify any missing endpoints
- [ ] Get team approval on migration order
- [ ] Create subtasks for each module migration

---

**Next Step:** Review with team and begin Phase 1 implementation.

