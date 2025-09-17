export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

export const UserStatusList = Object.values(UserStatus) as UserStatusType[];

export const UserOrderByFields = {
  id: 'id',
  email: 'email',
  name: 'name',
  createdAt: 'createdAt',
} as const;
export type UserOrderByFieldsType = keyof typeof UserOrderByFields;

export const ArticleStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;

export type ArticleStatusType =
  (typeof ArticleStatus)[keyof typeof ArticleStatus];

export const ArticleStatusList = Object.values(
  ArticleStatus,
) as ArticleStatusType[];
