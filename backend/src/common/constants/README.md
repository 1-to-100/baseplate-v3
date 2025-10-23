# System Roles Constants

This file defines constants for the three system roles in the application.

## Usage

### In Guards

```typescript
import { SYSTEM_ROLES } from '@/common/constants/system-roles';

// Use with @SystemRoles decorator
@SystemRoles(SYSTEM_ROLES.SYSTEM_ADMINISTRATOR, SYSTEM_ROLES.CUSTOMER_SUCCESS)
@Get('admin-only')
async adminEndpoint() {
  // ...
}
```

### Checking Role Names

```typescript
import { SYSTEM_ROLES } from '@/common/constants/system-roles';

if (userRole.name === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR) {
  // System admin logic
}
```

### Checking Role IDs

```typescript
import { SYSTEM_ROLE_IDS } from '@/common/constants/system-roles';

await supabaseService
  .getClient()
  .from('users')
  .update({ role_id: SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR })
  .eq('id', userId);
```

### Helper Functions

```typescript
import { isSystemRole, isSystemRoleId, isCustomRoleId } from '@/common/constants/system-roles';

// Check if a role name is a system role
if (isSystemRole('system_admin')) {
  // true
}

// Check if a role name is a system role
if (isSystemRole('customer_success')) {
  // true
}
```

## System Roles

| Role Name | Description |
|-----------|-------------|
| System Administrator | Full system access and control |
| Customer Success | Ensures customer satisfaction and retention |
| Customer Administrator | Manages customer-specific configurations |

## Constants

### `SYSTEM_ROLES`

Object containing all system role names as constants (matching the `name` column in the database):
- `SYSTEM_ROLES.SYSTEM_ADMINISTRATOR` = 'system_admin'
- `SYSTEM_ROLES.CUSTOMER_SUCCESS` = 'customer_success'
- `SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR` = 'customer_admin'

**Note**: These are the database role names. The `display_name` column in the database contains the human-readable versions:
- 'System Administrator'
- 'Customer Success'
- 'Customer Administrator'

### `SYSTEM_ROLE_NAMES`

Array containing all system role names for validation purposes.

## Why Use Constants?

1. **Type Safety**: Avoid typos and get autocomplete support
2. **Maintainability**: Change role names in one place
3. **Consistency**: Ensure same values throughout the codebase
4. **Refactoring**: Easy to find all usages with IDE tools

