/**
 * Common Types Export
 * Centralized export for all type definitions
 */

// Database types
export * from './database.types';

// Re-export commonly used types for convenience
export type {
  User,
  Customer,
  Role,
  Permission,
  Manager,
  Subscription,
  Article,
  ArticleCategory,
  Notification,
  NotificationTemplate,
  UserWithRelations,
  CustomerWithRelations,
  RoleWithRelations,
  PaginatedResult,
  PaginationOptions,
  PaginationMeta,
  SupabaseResponse,
  SupabaseArrayResponse,
  TableNames,
  TableType,
} from './database.types';

// Re-export enums
export { CustomerStatus, Action, NotificationType } from './database.types';
