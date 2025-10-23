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
  SubscriptionType,
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

// Re-export Subscription as alias for SubscriptionType
export type { SubscriptionType as Subscription } from './database.types';

// Re-export enums
export { CustomerLifecycleStage, Action, NotificationType, UserStatus, ArticleStatus, NotificationStatus } from './database.types';
