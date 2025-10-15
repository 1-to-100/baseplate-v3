# Comprehensive Migration Plan: Prisma to Supabase Client

> **📝 Note**: This migration has been completed. This document is kept for historical reference.

Based on the analysis of the current codebase, here's a detailed migration plan to transition from Prisma to the native Supabase JavaScript client.

## Current State Analysis

**Current Setup:**
- ✅ Supabase client already installed (`@supabase/supabase-js@2.57.4`)
- ✅ Existing SupabaseService for auth operations
- ✅ PostgreSQL database hosted on Supabase
- ✅ Complex schema with 11+ models and relationships
- ✅ Extensive use of Prisma throughout 42+ files

## Migration Plan Overview

### Phase 1: Preparation & Setup (1-2 days)

#### 1.1 Environment Setup
```bash
# Already installed, but verify version
npm list @supabase/supabase-js
# Should be @2.57.4 or newer
```

#### 1.2 Create Database Service Layer
Create a new database abstraction service that will replace PrismaService:

```typescript
// src/common/database/database.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/common/supabase/supabase.service';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private client: SupabaseClient;

  constructor(private readonly supabaseService: SupabaseService) {}

  onModuleInit() {
    this.client = this.supabaseService.getClient();
  }

  // Database operations will be implemented here
  get users() { return this.client.from('users'); }
  get customers() { return this.client.from('customers'); }
  get roles() { return this.client.from('roles'); }
  get permissions() { return this.client.from('permissions'); }
  get role_permissions() { return this.client.from('role_permissions'); }
  get managers() { return this.client.from('managers'); }
  get subscriptions() { return this.client.from('subscriptions'); }
  get user_one_time_codes() { return this.client.from('user_one_time_codes'); }
  get api_logs() { return this.client.from('api_logs'); }
  get article_categories() { return this.client.from('article_categories'); }
  get articles() { return this.client.from('articles'); }
  get notifications() { return this.client.from('notifications'); }
  get notification_templates() { return this.client.from('notification_templates'); }
}
```

#### 1.3 Type Definitions
Create TypeScript interfaces based on your Prisma schema:

```typescript
// src/common/types/database.types.ts
export interface User {
  id: number;
  uid?: string;
  email: string;
  email_verified?: boolean;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  phone_number?: string;
  customer_id?: number;
  role_id?: number;
  manager_id?: number;
  status: string;
  is_superadmin?: boolean;
  is_customer_success?: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  domain: string;
  owner_id: number;
  status: 'active' | 'inactive' | 'suspended';
  subscription_id?: number;
  manager_id?: number;
  customer_success_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface Role {
  id: number;
  name?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  label: string;
}

export interface RolePermission {
  role_id: number;
  permission_id: number;
}

export interface Manager {
  id: number;
  name?: string;
  created_at: string;
  updated_at?: string;
}

export interface Subscription {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserOneTimeCodes {
  id: number;
  code: string;
  user_id: number;
  is_used: boolean;
  created_at: string;
}

export interface ApiLog {
  id: number;
  method: string;
  url: string;
  status_code: number;
  duration: number;
  request_body?: string;
  headers?: string;
  created_at: string;
}

export interface ArticleCategory {
  id: number;
  name: string;
  subcategory?: string;
  about?: string;
  icon?: string;
  customer_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  title: string;
  category_id: number;
  subcategory?: string;
  customer_id: number;
  created_by: number;
  status?: string;
  content?: string;
  video_url?: string;
  views_number?: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id?: number;
  customer_id?: number;
  sender_id?: number;
  type: 'EMAIL' | 'IN_APP';
  title?: string;
  message?: string;
  template_id?: number;
  metadata?: any;
  channel?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  generated_by?: string;
}

export interface NotificationTemplate {
  id: number;
  title: string;
  message?: string;
  comment?: string;
  type: ('EMAIL' | 'IN_APP')[];
  channel: string;
  customer_id?: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}
```

### Phase 2: Query Pattern Migration (3-4 days)

#### 2.1 Basic CRUD Operations Translation

**Prisma → Supabase Client Mappings:**

| Prisma Operation | Supabase Client Equivalent |
|------------------|---------------------------|
| `prisma.user.findMany()` | `supabase.from('users').select('*')` |
| `prisma.user.findUnique({ where: { id } })` | `supabase.from('users').select('*').eq('id', id).single()` |
| `prisma.user.findFirst({ where })` | `supabase.from('users').select('*').eq('field', value).limit(1).single()` |
| `prisma.user.create({ data })` | `supabase.from('users').insert(data).select().single()` |
| `prisma.user.update({ where, data })` | `supabase.from('users').update(data).eq('id', id).select().single()` |
| `prisma.user.updateMany({ where, data })` | `supabase.from('users').update(data).eq('field', value).select()` |
| `prisma.user.delete({ where })` | `supabase.from('users').delete().eq('id', id)` |
| `prisma.user.count({ where })` | `supabase.from('users').select('*', { count: 'exact', head: true }).eq('field', value)` |

#### 2.2 Complex Query Patterns

**Filtering & Searching:**
```typescript
// Prisma
const users = await prisma.user.findMany({
  where: {
    OR: [
      { firstName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ],
    deletedAt: null,
    status: { in: ['active', 'inactive'] }
  }
});

// Supabase Client
const { data: users } = await supabase
  .from('users')
  .select('*')
  .or(`first_name.ilike.%${search}%,email.ilike.%${search}%`)
  .is('deleted_at', null)
  .in('status', ['active', 'inactive']);
```

**Relations & Joins:**
```typescript
// Prisma
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    customer: {
      select: {
        id: true,
        name: true,
        ownerId: true
      }
    },
    role: true,
    manager: true
  }
});

// Supabase Client
const { data: user } = await supabase
  .from('users')
  .select(`
    *,
    customers!customer_id(id, name, owner_id),
    roles!role_id(*),
    managers!manager_id(*)
  `)
  .eq('id', id)
  .single();
```

**Ordering and Limiting:**
```typescript
// Prisma
const users = await prisma.user.findMany({
  orderBy: [
    { firstName: 'asc' },
    { lastName: 'asc' }
  ],
  take: 10,
  skip: 20
});

// Supabase Client
const { data: users } = await supabase
  .from('users')
  .select('*')
  .order('first_name', { ascending: true })
  .order('last_name', { ascending: true })
  .range(20, 29);
```

### Phase 3: Service-by-Service Migration (5-7 days)

#### 3.1 Migration Priority Order
1. **Core Services** (Users, Customers) - Most complex
2. **Supporting Services** (Roles, Managers, Subscriptions)
3. **Feature Services** (Articles, Notifications)
4. **Utility Services** (CLI commands, middleware)

#### 3.2 Service Migration Template

For each service, follow this pattern:

```typescript
// Before (Prisma)
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ 
      where: { id },
      include: { customer: true, role: true }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}

// After (Supabase Client)
@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  async findOne(id: number) {
    const { data: user, error } = await this.database.users
      .select(`
        *,
        customers!customer_id(*),
        roles!role_id(*)
      `)
      .eq('id', id)
      .single();
    
    if (error || !user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
```

#### 3.3 Error Handling Pattern
Create a utility function for consistent error handling:

```typescript
// src/common/utils/supabase-error-handler.ts
export function handleSupabaseError(error: any, defaultMessage: string = 'Operation failed') {
  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundException('Resource not found');
    }
    if (error.code === '23505') {
      throw new ConflictException('Resource already exists');
    }
    throw new InternalServerErrorException(error.message || defaultMessage);
  }
}

// Usage in services
const { data, error } = await this.database.users.select('*').eq('id', id).single();
handleSupabaseError(error, 'Failed to fetch user');
return data;
```

### Phase 4: Advanced Features Migration (2-3 days)

#### 4.1 Pagination
Replace `prisma-pagination` with custom Supabase pagination:

```typescript
// Create pagination utility
// src/common/utils/pagination.util.ts
export interface PaginationOptions {
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export async function paginateSupabaseQuery<T>(
  query: any,
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const { page, perPage } = options;
  const offset = (page - 1) * perPage;

  // Get total count
  const { count } = await query.select('*', { count: 'exact', head: true });

  // Get paginated data
  const { data, error } = await query
    .select('*')
    .range(offset, offset + perPage - 1);

  if (error) throw new Error(error.message);

  return {
    data: data || [],
    meta: {
      total: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage)
    }
  };
}

// Usage in services
async findAll(listUsersInput: ListUsersInputDto): Promise<PaginatedResult<User>> {
  let query = this.database.users.select('*');
  
  // Apply filters
  if (listUsersInput.search) {
    query = query.or(`first_name.ilike.%${listUsersInput.search}%,email.ilike.%${listUsersInput.search}%`);
  }
  
  return paginateSupabaseQuery(query, {
    page: listUsersInput.page,
    perPage: listUsersInput.perPage
  });
}
```

#### 4.2 Transactions
Supabase doesn't have built-in transactions like Prisma, but you can use RPC calls for complex operations:

```sql
-- Create PostgreSQL functions for complex operations
-- migrations/create_user_with_customer.sql
CREATE OR REPLACE FUNCTION create_user_with_customer(
  user_data jsonb,
  customer_data jsonb
) RETURNS jsonb AS $$
DECLARE
  new_user_id int;
  new_customer_id int;
  result jsonb;
BEGIN
  -- Insert user
  INSERT INTO users (
    email, first_name, last_name, status
  ) VALUES (
    user_data->>'email',
    user_data->>'first_name',
    user_data->>'last_name',
    user_data->>'status'
  ) RETURNING id INTO new_user_id;
  
  -- Insert customer
  INSERT INTO customers (
    name, email, domain, owner_id
  ) VALUES (
    customer_data->>'name',
    customer_data->>'email',
    customer_data->>'domain',
    new_user_id
  ) RETURNING id INTO new_customer_id;
  
  -- Update user with customer_id
  UPDATE users SET customer_id = new_customer_id WHERE id = new_user_id;
  
  -- Return both IDs
  SELECT jsonb_build_object(
    'user_id', new_user_id,
    'customer_id', new_customer_id
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// Call from TypeScript
async createUserWithCustomer(userData: any, customerData: any) {
  const { data, error } = await this.database.client.rpc('create_user_with_customer', {
    user_data: userData,
    customer_data: customerData
  });
  
  if (error) throw new Error(error.message);
  return data;
}
```

#### 4.3 Raw Queries
Replace Prisma's `$queryRaw` with Supabase RPC or direct SQL:

```typescript
// Prisma
const result = await this.prisma.$queryRaw`
  SELECT * FROM auth.users WHERE email = ${email}
`;

// Supabase Client (via RPC)
// First create the function:
-- CREATE OR REPLACE FUNCTION get_auth_user_by_email(user_email text)
-- RETURNS TABLE(id uuid, email text, created_at timestamptz) AS $$
-- BEGIN
--   RETURN QUERY SELECT au.id, au.email, au.created_at FROM auth.users au WHERE au.email = user_email;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

const { data, error } = await supabase.rpc('get_auth_user_by_email', {
  user_email: email
});
```

#### 4.4 Soft Deletes Pattern
```typescript
// Utility for soft delete queries
function withoutDeleted(query: any) {
  return query.is('deleted_at', null);
}

// Usage
const { data: users } = await withoutDeleted(this.database.users.select('*'));
```

### Phase 5: Testing & Validation (2-3 days)

#### 5.1 Test Strategy
1. **Unit Tests**: Update existing service tests to work with Supabase client
2. **Integration Tests**: Test database operations end-to-end
3. **E2E Tests**: Verify complete workflows still function
4. **Performance Tests**: Compare query performance between Prisma and Supabase

#### 5.2 Test Examples

```typescript
// Update unit tests
describe('UsersService', () => {
  let service: UsersService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: DatabaseService,
          useValue: {
            users: {
              select: jest.fn(),
              insert: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            }
          }
        }
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  it('should find a user by id', async () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
    };
    
    jest.spyOn(databaseService.users, 'select').mockReturnValue(mockQuery);

    const result = await service.findOne(1);
    expect(result).toEqual(mockUser);
    expect(databaseService.users.select).toHaveBeenCalledWith('*');
    expect(mockQuery.eq).toHaveBeenCalledWith('id', 1);
  });
});
```

#### 5.3 Migration Validation Checklist
- [ ] All CRUD operations work correctly
- [ ] Complex queries return expected results
- [ ] Pagination functions properly
- [ ] Error handling is consistent
- [ ] Performance is acceptable or improved
- [ ] All existing tests pass
- [ ] New Supabase-specific features work
- [ ] Real-time subscriptions (if implemented)
- [ ] Row Level Security policies (if needed)

### Phase 6: Deployment & Cleanup (1 day)

#### 6.1 Feature Flag Implementation
```typescript
// src/common/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_SUPABASE_CLIENT: process.env.USE_SUPABASE_CLIENT === 'true'
};

// In services, temporarily support both
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly database: DatabaseService
  ) {}

  async findOne(id: number) {
    if (FEATURE_FLAGS.USE_SUPABASE_CLIENT) {
      return this.findOneWithSupabase(id);
    }
    return this.findOneWithPrisma(id);
  }
}
```

#### 6.2 Deployment Steps
1. Deploy with feature flag disabled (Prisma still active)
2. Enable feature flag in staging environment
3. Run comprehensive tests
4. Monitor performance and error rates
5. Gradual rollout to production (percentage-based)
6. Full rollout once stable
7. Remove Prisma dependencies

#### 6.3 Cleanup Tasks
```bash
# Remove Prisma dependencies
npm uninstall @prisma/client prisma prisma-pagination

# Remove Prisma files
rm -rf prisma/
rm -f src/common/prisma/prisma.service.ts

# Update package.json scripts (remove Prisma scripts)
# Remove: prisma:migrate, prisma:generate
```

#### 6.4 Update Module Imports
```typescript
// Update app.module.ts
@Module({
  imports: [
    // ... other imports
    SupabaseModule,
  ],
  providers: [
    AppService, 
    DatabaseService, // Replace PrismaService
    FrontendPathsService
  ],
})
export class AppModule {}
```

## Breaking Changes & Considerations

### 🚨 Critical Breaking Changes

1. **Query Result Structure**
   - Prisma returns plain objects
   - Supabase returns `{ data, error }` structure
   - **Solution**: Wrap all queries with error handling

2. **Error Handling**
   - Prisma throws exceptions automatically
   - Supabase returns errors in response object
   - **Solution**: Create error handling utilities

3. **Null vs Undefined**
   - Prisma uses `null` for optional fields
   - Supabase may return `undefined` for missing fields
   - **Solution**: Normalize data with utility functions

4. **Date Handling**
   - Prisma auto-converts to Date objects
   - Supabase returns ISO strings
   - **Solution**: Create date conversion utilities

5. **Transactions**
   - Prisma has built-in `$transaction()` support
   - Supabase requires PostgreSQL functions for complex transactions
   - **Solution**: Identify transaction usage and create RPC functions

6. **Generated Types**
   - Prisma generates types automatically
   - Supabase requires manual type definitions
   - **Solution**: Create comprehensive type definitions

7. **Relation Loading**
   - Prisma uses `include` and `select`
   - Supabase uses foreign table syntax in `select`
   - **Solution**: Update all relation queries

8. **Case Sensitivity**
   - Prisma uses camelCase field names
   - Supabase uses database column names (snake_case)
   - **Solution**: Map between naming conventions

### 🔧 Compatibility Solutions

1. **Create Wrapper Functions**
```typescript
// src/common/utils/database-wrapper.ts
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null, error: any }>
): Promise<T> {
  const { data, error } = await queryFn();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new NotFoundException('Resource not found');
  }
  return data;
}

// Usage
const user = await safeQuery(() => 
  this.database.users.select('*').eq('id', id).single()
);
```

2. **Type Conversion Utilities**
```typescript
// src/common/utils/type-converters.ts
export function convertDates(obj: any): any {
  if (!obj) return obj;
  
  const converted = { ...obj };
  for (const key in converted) {
    if (typeof converted[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(converted[key])) {
      converted[key] = new Date(converted[key]);
    } else if (typeof converted[key] === 'object' && converted[key] !== null) {
      converted[key] = convertDates(converted[key]);
    }
  }
  return converted;
}

export function convertToSnakeCase(obj: any): any {
  const converted: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    converted[snakeKey] = obj[key];
  }
  return converted;
}

export function convertToCamelCase(obj: any): any {
  const converted: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = obj[key];
  }
  return converted;
}
```

3. **Migration Helper Service**
```typescript
// src/common/services/migration-helper.service.ts
@Injectable()
export class MigrationHelperService {
  // Helper methods for common migration patterns
  
  async findUniqueOrThrow<T>(
    query: any,
    errorMessage: string = 'Resource not found'
  ): Promise<T> {
    const { data, error } = await query.single();
    if (error || !data) {
      throw new NotFoundException(errorMessage);
    }
    return data;
  }

  async createWithReturn<T>(
    query: any,
    data: any
  ): Promise<T> {
    const { data: result, error } = await query.insert(data).select().single();
    if (error) {
      throw new ConflictException(error.message);
    }
    return result;
  }

  // Add more helper methods as needed
}
```

## Performance Considerations

### Query Optimization
1. **Use specific selects** instead of `select('*')` when possible
2. **Limit relation depth** to avoid over-fetching
3. **Use indexes** for frequently queried fields
4. **Implement proper pagination** for large datasets

### Monitoring
1. **Query performance**: Monitor slow queries
2. **Error rates**: Track Supabase client errors
3. **Memory usage**: Compare with Prisma baseline
4. **Database connections**: Monitor connection pooling

## Estimated Timeline

- **Phase 1 (Preparation)**: 1-2 days
- **Phase 2 (Query Patterns)**: 3-4 days  
- **Phase 3 (Service Migration)**: 5-7 days
- **Phase 4 (Advanced Features)**: 2-3 days
- **Phase 5 (Testing)**: 2-3 days
- **Phase 6 (Deployment)**: 1 day

**Total Duration**: 14-20 days
**Team Size**: 2-3 developers  
**Risk Level**: Medium-High (due to complexity and scope)

## Recommended Approach

1. **Parallel Development**: Keep Prisma running while building Supabase integration
2. **Feature Flags**: Use feature toggles to switch between implementations
3. **Gradual Migration**: Migrate one service at a time, starting with least critical
4. **Comprehensive Testing**: Test each migration thoroughly before moving to next
5. **Rollback Plan**: Keep Prisma as fallback during initial deployment
6. **Team Training**: Ensure team understands Supabase client patterns
7. **Documentation**: Update all documentation with new patterns

## Benefits After Migration

- ✅ **Reduced Dependencies**: Remove Prisma and related packages (~50MB+ savings)
- ✅ **Better Integration**: Native Supabase features (real-time, RLS, edge functions)
- ✅ **Simplified Stack**: One client for database, auth, storage, and real-time
- ✅ **Real-time Capabilities**: Built-in subscriptions for live data
- ✅ **Row Level Security**: Better security model with database-level policies
- ✅ **Edge Compatibility**: Works better with edge functions and serverless
- ✅ **Reduced Complexity**: No need for Prisma schema management
- ✅ **Direct Database Access**: More control over queries and performance

## Risks and Mitigation

### High Risk Items
1. **Complex Queries**: Some Prisma queries may be difficult to translate
   - *Mitigation*: Create PostgreSQL functions for complex operations
2. **Transaction Logic**: Loss of Prisma's transaction capabilities  
   - *Mitigation*: Use PostgreSQL functions and proper error handling
3. **Type Safety**: Loss of generated types
   - *Mitigation*: Create comprehensive manual type definitions
4. **Team Learning Curve**: New query patterns and error handling
   - *Mitigation*: Training sessions and comprehensive documentation

### Medium Risk Items  
1. **Performance Changes**: Different query optimization characteristics
   - *Mitigation*: Thorough performance testing and monitoring
2. **Testing Overhead**: Need to update all existing tests
   - *Mitigation*: Systematic test migration with the service migration

This migration plan provides a structured, risk-aware approach to transitioning from Prisma to Supabase client while maintaining system stability and data integrity throughout the process.
