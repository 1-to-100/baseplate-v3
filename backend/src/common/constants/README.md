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
if (isSystemRole('System Administrator')) {
  // true
}

// Check if a role name is a system role
if (isSystemRole('Customer Success')) {
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

Object containing all system role names as constants:
- `SYSTEM_ROLES.SYSTEM_ADMINISTRATOR` = 'System Administrator'
- `SYSTEM_ROLES.CUSTOMER_SUCCESS` = 'Customer Success'
- `SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR` = 'Customer Administrator'

### `SYSTEM_ROLE_NAMES`

Array containing all system role names for validation purposes.

## Why Use Constants?

1. **Type Safety**: Avoid typos and get autocomplete support
2. **Maintainability**: Change role names in one place
3. **Consistency**: Ensure same values throughout the codebase
4. **Refactoring**: Easy to find all usages with IDE tools

