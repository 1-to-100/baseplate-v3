# UsersService Migration Comparison

This document shows the key differences between the Prisma-based and Supabase-based implementations.

## Key Changes Summary

### 1. **Service Injection**
```typescript
// Before (Prisma)
constructor(
  private readonly prisma: PrismaService,
  private readonly supabaseService: SupabaseService,
  private readonly frontendPathsService: FrontendPathsService,
) {}

// After (Supabase)
constructor(
  private readonly database: DatabaseService,
  private readonly supabaseService: SupabaseService,
  private readonly frontendPathsService: FrontendPathsService,
) {}
```

### 2. **Basic CRUD Operations**
```typescript
// Before (Prisma)
await this.prisma.user.create({ data: createUserDto });

// After (Supabase)
await this.database.create('users', { data: createUserDto });
```

### 3. **Field Name Mapping**
```typescript
// Prisma field names → Supabase field names
customerId → customer_id
firstName → first_name
lastName → last_name
deletedAt → deleted_at
emailVerified → email_verified
isSuperadmin → REMOVED (use role_id instead)
isCustomerSuccess → REMOVED (use role_id instead)
```

### 4. **Complex Queries with Relations**
```typescript
// Before (Prisma)
const user = await this.prisma.user.findFirst({
  where: { id, deletedAt: null },
  include: {
    role: true,
    customer: { select: { id: true, name: true, ownerId: true } },
    manager: true,
  },
});

// After (Supabase)
const user = await this.database.findFirst('users', {
  where: { id, deleted_at: null },
  include: {
    role: true,
    customer: { select: 'id, name, owner_id' },
    manager: true,
  },
});
```

### 5. **Search with OR Conditions**
```typescript
// Before (Prisma)
const where = {
  OR: [
    { firstName: { contains: search, mode: 'insensitive' } },
    { lastName: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
  ],
  deletedAt: null,
};

// After (Supabase)
const where = {
  OR: [
    { first_name: { contains: search } },
    { last_name: { contains: search } },
    { email: { contains: search } },
  ],
  deleted_at: null,
};
```

### 6. **Pagination**
```typescript
// Before (Prisma with prisma-pagination)
const paginate = createPaginator({ perPage });
return paginate(this.prisma.user, { where, orderBy, include }, { page });

// After (Supabase with built-in pagination)
return this.database.paginate('users', 
  { page, per_page: perPage },
  { where, orderBy, select: '*, customers!customer_id(id, name, owner_id)' }
);
```

### 7. **Auth User Access**
```typescript
// Before (Prisma)
const rawQueryResult = await this.prisma.$queryRaw`
  SELECT * FROM auth.users WHERE email = ${email};
`;

// After (Supabase with Admin Client)
const { data: authUsers } = await this.supabaseService.admin.listUsers();
const existingAuthUser = authUsers?.users?.find(u => u.email === email);
```

### 8. **Soft Delete**
```typescript
// Before (Prisma)
await this.prisma.user.update({
  where: { id },
  data: {
    email: `__deleted__${user.email}`,
    deletedAt: new Date(),
    status: UserStatus.SUSPENDED,
  },
});

// After (Supabase)
await this.database.update('users', {
  where: { id },
  data: {
    email: `__deleted__${user.email}`,
    deleted_at: new Date().toISOString(),
    status: UserStatus.SUSPENDED,
  },
});
```

## Benefits of the Migration

### ✅ **Advantages**
1. **Consistent API**: Same method signatures and patterns
2. **Type Safety**: Full TypeScript support maintained
3. **Relations Support**: Include syntax works similarly to Prisma
4. **Error Handling**: Consistent NestJS exception mapping
5. **Pagination**: Built-in pagination with same interface
6. **Performance**: Direct database queries without ORM overhead

### 🚨 **Key Differences to Note**
1. **Field Names**: Must use snake_case instead of camelCase
2. **Auth Access**: Use Admin Client instead of direct SQL queries
3. **Date Handling**: Must convert to/from ISO strings
4. **Relations**: Supabase foreign table syntax instead of Prisma includes

## Migration Strategy

1. **Parallel Services**: Keep both services running during migration
2. **Feature Flags**: Use environment variables to switch between implementations
3. **Gradual Migration**: Migrate one endpoint at a time
4. **Testing**: Comprehensive testing of each migrated method
5. **Rollback Plan**: Keep Prisma service as fallback

## Next Steps

1. ✅ ~~Create PostgreSQL RPC functions~~ (Using Admin Client instead)
2. Test the new service methods
3. Update controllers to use the new service (with feature flags)
4. Monitor performance and error rates
5. Complete migration and remove Prisma dependencies
