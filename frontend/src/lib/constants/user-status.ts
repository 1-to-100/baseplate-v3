export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

export const UserStatusList = Object.values(UserStatus) as UserStatusType[];

// Display names for statuses
export const UserStatusDisplayNames: Record<UserStatusType, string> = {
  [UserStatus.ACTIVE]: 'Active',
  [UserStatus.INACTIVE]: 'Inactive',
  [UserStatus.SUSPENDED]: 'Suspended',
} as const;

