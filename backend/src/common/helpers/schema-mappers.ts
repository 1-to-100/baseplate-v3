/**
 * Schema Mappers
 *
 * Helper functions to handle mapping between old and new database schema
 * Following the unified Baseplate schema conventions
 */

import {
  CustomerLifecycleStage,
  UserStatus,
  ArticleStatus,
  NotificationStatus,
} from '@/common/types/database.types';

/**
 * User Name Handling
 * New schema uses single full_name field instead of first_name + last_name
 */
export function combineUserName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  const combined = `${first} ${last}`.trim();
  return combined || 'Unnamed User';
}

export function parseUserName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName?.trim() || '';
  const parts = trimmed.split(' ');

  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  } else if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  } else {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }
}

/**
 * Customer Status Mapping
 * Old schema used CustomerStatus enum, new uses CustomerLifecycleStage
 */
export function mapOldCustomerStatusToLifecycleStage(
  status: string,
): CustomerLifecycleStage {
  const mapping: Record<string, CustomerLifecycleStage> = {
    active: CustomerLifecycleStage.ACTIVE,
    inactive: CustomerLifecycleStage.ONBOARDING,
    suspended: CustomerLifecycleStage.CHURNED,
  };
  return mapping[status] || CustomerLifecycleStage.ONBOARDING;
}

export function mapLifecycleStageToOldStatus(
  stage: CustomerLifecycleStage,
): string {
  const mapping: Record<CustomerLifecycleStage, string> = {
    [CustomerLifecycleStage.ONBOARDING]: 'inactive',
    [CustomerLifecycleStage.ACTIVE]: 'active',
    [CustomerLifecycleStage.EXPANSION]: 'active',
    [CustomerLifecycleStage.AT_RISK]: 'active',
    [CustomerLifecycleStage.CHURNED]: 'suspended',
  };
  return mapping[stage] || 'inactive';
}

/**
 * User Status Validation
 */
export function validateUserStatus(status: string): status is UserStatus {
  return Object.values(UserStatus).includes(status as UserStatus);
}

/**
 * Article Status Validation
 */
export function validateArticleStatus(status: string): status is ArticleStatus {
  return Object.values(ArticleStatus).includes(status as ArticleStatus);
}

/**
 * Notification Status Mapping
 * Old schema used is_read boolean, new uses NotificationStatus enum
 */
export function mapReadStatusToNotificationStatus(
  isRead: boolean,
): NotificationStatus {
  return isRead ? NotificationStatus.READ : NotificationStatus.UNREAD;
}

export function isNotificationRead(status: NotificationStatus): boolean {
  return status === NotificationStatus.READ;
}

/**
 * Column Name Mapping for Database Queries
 * Maps old column names to new ones for backward compatibility
 */
export const columnNameMap: Record<string, Record<string, string>> = {
  users: {
    id: 'user_id',
    uid: 'auth_user_id',
    avatar: 'avatar_url',
  },
  customers: {
    id: 'customer_id',
    domain: 'email_domain',
    status: 'lifecycle_stage',
    subscription_id: 'subscription_type_id',
  },
  roles: {
    id: 'role_id',
  },
  article_categories: {
    id: 'article_category_id',
  },
  articles: {
    id: 'article_id',
    views_number: 'view_count',
  },
  notifications: {
    // Using simplified schema - no mappings needed
  },
  notification_templates: {
    id: 'template_id',
    message: 'body',
  },
  managers: {
    id: 'manager_id',
  },
  subscription_types: {
    id: 'subscription_type_id',
  },
};

/**
 * Maps old table names to new ones
 */
export const tableNameMap: Record<string, string> = {
  subscriptions: 'subscription_types',
};

/**
 * Get mapped column name for a table
 */
export function getMappedColumnName(
  tableName: string,
  columnName: string,
): string {
  return columnNameMap[tableName]?.[columnName] || columnName;
}

/**
 * Get mapped table name
 */
export function getMappedTableName(tableName: string): string {
  return tableNameMap[tableName] || tableName;
}

/**
 * Build database insert/update data for User
 * Handles conversion from DTO format (camelCase with first/last name)
 * to database format (snake_case with full_name)
 */
export interface UserDtoInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  customerId?: string;
  roleId?: string;
  managerId?: string;
  status?: string;
  avatar?: string;
  avatarUrl?: string;
  uid?: string;
  authUserId?: string;
  emailVerified?: boolean;
}

export function buildUserDbData(dto: UserDtoInput): Record<string, any> {
  const data: Record<string, any> = {};

  if (dto.email !== undefined) data.email = dto.email;

  // Handle name fields - prefer fullName if provided, otherwise combine first/last
  if (dto.fullName !== undefined) {
    data.full_name = dto.fullName;
  } else if (dto.firstName !== undefined || dto.lastName !== undefined) {
    data.full_name = combineUserName(dto.firstName, dto.lastName);
  }

  if (dto.phoneNumber !== undefined) data.phone_number = dto.phoneNumber;
  if (dto.customerId !== undefined) data.customer_id = dto.customerId;
  if (dto.roleId !== undefined) data.role_id = dto.roleId;
  if (dto.managerId !== undefined) data.manager_id = dto.managerId;
  if (dto.status !== undefined) data.status = dto.status;

  // Handle avatar field name change
  if (dto.avatarUrl !== undefined) {
    data.avatar_url = dto.avatarUrl;
  } else if (dto.avatar !== undefined) {
    data.avatar_url = dto.avatar;
  }

  // Handle uid field name change
  if (dto.authUserId !== undefined) {
    data.auth_user_id = dto.authUserId;
  } else if (dto.uid !== undefined) {
    data.auth_user_id = dto.uid;
  }

  if (dto.emailVerified !== undefined) data.email_verified = dto.emailVerified;

  return data;
}

/**
 * Build database insert/update data for Customer
 */
export interface CustomerDtoInput {
  name?: string;
  email?: string;
  emailDomain?: string;
  domain?: string;
  lifecycleStage?: CustomerLifecycleStage | string;
  status?: string;
  active?: boolean;
  subscriptionTypeId?: string;
  subscriptionId?: string;
  stripeCustomerId?: string;
  ownerId?: string;
  managerId?: string;
  onboardedAt?: string;
  churnedAt?: string;
  metadata?: any;
}

export function buildCustomerDbData(
  dto: CustomerDtoInput,
): Record<string, any> {
  const data: Record<string, any> = {};

  if (dto.name !== undefined) data.name = dto.name;
  if (dto.email !== undefined) data.email = dto.email;

  // Handle domain field name change
  if (dto.emailDomain !== undefined) {
    data.email_domain = dto.emailDomain;
  } else if (dto.domain !== undefined) {
    data.email_domain = dto.domain;
  }

  // Handle lifecycle stage / status mapping
  if (dto.lifecycleStage !== undefined) {
    data.lifecycle_stage = dto.lifecycleStage;
  } else if (dto.status !== undefined) {
    data.lifecycle_stage = mapOldCustomerStatusToLifecycleStage(dto.status);
  }

  if (dto.active !== undefined) data.active = dto.active;

  // Handle subscription field name change
  if (dto.subscriptionTypeId !== undefined) {
    data.subscription_type_id = dto.subscriptionTypeId;
  } else if (dto.subscriptionId !== undefined) {
    data.subscription_type_id = dto.subscriptionId;
  }

  if (dto.stripeCustomerId !== undefined)
    data.stripe_customer_id = dto.stripeCustomerId;
  if (dto.ownerId !== undefined) data.owner_id = dto.ownerId;
  if (dto.managerId !== undefined) data.manager_id = dto.managerId;
  if (dto.onboardedAt !== undefined) data.onboarded_at = dto.onboardedAt;
  if (dto.churnedAt !== undefined) data.churned_at = dto.churnedAt;
  if (dto.metadata !== undefined) data.metadata = dto.metadata;

  return data;
}

/**
 * Parse database User to DTO format
 */
export function parseUserFromDb(dbUser: any): any {
  if (!dbUser) return null;

  const { firstName, lastName } = parseUserName(dbUser.full_name || '');

  return {
    id: dbUser.user_id,
    uid: dbUser.auth_user_id,
    email: dbUser.email,
    firstName,
    lastName,
    fullName: dbUser.full_name,
    avatar: dbUser.avatar_url,
    avatarUrl: dbUser.avatar_url,
    phoneNumber: dbUser.phone_number,
    customerId: dbUser.customer_id,
    roleId: dbUser.role_id,
    managerId: dbUser.manager_id,
    status: dbUser.status,
    emailVerified: dbUser.email_verified,
    lastLoginAt: dbUser.last_login_at,
    preferences: dbUser.preferences,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    deletedAt: dbUser.deleted_at,
  };
}

/**
 * Parse database Customer to DTO format
 */
export function parseCustomerFromDb(dbCustomer: any): any {
  if (!dbCustomer) return null;

  return {
    id: dbCustomer.customer_id,
    name: dbCustomer.name,
    email: dbCustomer.email,
    domain: dbCustomer.email_domain,
    emailDomain: dbCustomer.email_domain,
    lifecycleStage: dbCustomer.lifecycle_stage,
    status: mapLifecycleStageToOldStatus(dbCustomer.lifecycle_stage),
    active: dbCustomer.active,
    subscriptionTypeId: dbCustomer.subscription_type_id,
    subscriptionId: dbCustomer.subscription_type_id, // For backward compatibility
    stripeCustomerId: dbCustomer.stripe_customer_id,
    ownerId: dbCustomer.owner_id,
    managerId: dbCustomer.manager_id,
    onboardedAt: dbCustomer.onboarded_at,
    churnedAt: dbCustomer.churned_at,
    metadata: dbCustomer.metadata,
    createdAt: dbCustomer.created_at,
    updatedAt: dbCustomer.updated_at,
  };
}
