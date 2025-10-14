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

// Check if a role ID is a system role (1-3)
if (isSystemRoleId(1)) {
  // true
}

// Check if a role ID is a custom role (>= 100)
if (isCustomRoleId(150)) {
  // true
}
```

## System Roles

| Role Name | ID | Description |
|-----------|-----|-------------|
| System Administrator | 1 | Full system access and control |
| Customer Success | 2 | Ensures customer satisfaction and retention |
| Customer Administrator | 3 | Manages customer-specific configurations |

## Constants

### `SYSTEM_ROLES`

Object containing all system role names as constants:
- `SYSTEM_ROLES.SYSTEM_ADMINISTRATOR` = 'System Administrator'
- `SYSTEM_ROLES.CUSTOMER_SUCCESS` = 'Customer Success'
- `SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR` = 'Customer Administrator'

### `SYSTEM_ROLE_IDS`

Object containing all system role IDs as constants:
- `SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR` = 1
- `SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS` = 2
- `SYSTEM_ROLE_IDS.CUSTOMER_ADMINISTRATOR` = 3

### `CUSTOM_ROLE_MIN_ID`

The minimum ID for custom roles (100). System roles have IDs 1-99.

## Why Use Constants?

1. **Type Safety**: Avoid typos and get autocomplete support
2. **Maintainability**: Change role names in one place
3. **Consistency**: Ensure same values throughout the codebase
4. **Refactoring**: Easy to find all usages with IDE tools

