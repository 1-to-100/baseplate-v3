/**
 * Database Types for Supabase Client
 * Generated from Prisma schema - matches the actual database structure
 */

// Enums matching Prisma schema
export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum Action {
  MANAGE = 'manage',
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

// Base interfaces for database tables
export interface User {
  id: number;
  uid?: string | null;
  email: string;
  email_verified?: boolean | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  phone_number?: string | null;
  customer_id?: number | null;
  role_id?: number | null;
  manager_id?: number | null;
  status: string;
  is_superadmin?: boolean | null;
  is_customer_success?: boolean | null;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  domain: string;
  owner_id: number;
  status: CustomerStatus;
  subscription_id?: number | null;
  manager_id?: number | null;
  customer_success_id?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Role {
  id: number;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at?: string | null;
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
  name?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Subscription {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
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
  request_body?: string | null;
  headers?: string | null;
  created_at: string;
}

export interface ArticleCategory {
  id: number;
  name: string;
  subcategory?: string | null;
  about?: string | null;
  icon?: string | null;
  customer_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  title: string;
  category_id: number;
  subcategory?: string | null;
  customer_id: number;
  created_by: number;
  status?: string | null;
  content?: string | null;
  video_url?: string | null;
  views_number?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id?: number | null;
  customer_id?: number | null;
  sender_id?: number | null;
  type: NotificationType;
  title?: string | null;
  message?: string | null;
  template_id?: number | null;
  metadata?: any; // JSON type
  channel?: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  generated_by?: string | null;
}

export interface NotificationTemplate {
  id: number;
  title: string;
  message?: string | null;
  comment?: string | null;
  type: NotificationType[];
  channel: string;
  customer_id?: number | null;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

// Relation types - for when you need to include related data
export interface UserWithRelations extends User {
  customer?: Customer | null;
  role?: Role | null;
  manager?: Manager | null;
  success_customers?: Customer[];
  owned_customer?: Customer | null;
  articles?: Article[];
  notifications?: Notification[];
  sent_notifications?: Notification[];
}

export interface CustomerWithRelations extends Customer {
  subscription?: Subscription | null;
  manager?: Manager | null;
  owner: User;
  customer_success?: User | null;
  users?: User[];
  articles?: Article[];
  notifications?: Notification[];
  notification_templates?: NotificationTemplate[];
}

export interface RoleWithRelations extends Role {
  users?: User[];
  permissions?: RolePermission[];
}

export interface PermissionWithRelations extends Permission {
  roles?: RolePermission[];
}

export interface ManagerWithRelations extends Manager {
  users?: User[];
  customers?: Customer[];
}

export interface ArticleCategoryWithRelations extends ArticleCategory {
  articles?: Article[];
}

export interface ArticleWithRelations extends Article {
  category: ArticleCategory;
  creator: User;
  customer: Customer;
}

export interface NotificationWithRelations extends Notification {
  user?: User | null;
  sender?: User | null;
  customer?: Customer | null;
  template?: NotificationTemplate | null;
}

export interface NotificationTemplateWithRelations
  extends NotificationTemplate {
  customer?: Customer | null;
  notifications?: Notification[];
}

// Input types for creating/updating records (omit auto-generated fields)
export type CreateUserInput = Omit<User, 'id' | 'created_at' | 'updated_at'>;

export type UpdateUserInput = Partial<
  Omit<User, 'id' | 'created_at' | 'updated_at'>
>;

export type CreateCustomerInput = Omit<
  Customer,
  'id' | 'created_at' | 'updated_at'
>;

export type UpdateCustomerInput = Partial<
  Omit<Customer, 'id' | 'created_at' | 'updated_at'>
>;

export type CreateRoleInput = Omit<Role, 'id' | 'created_at' | 'updated_at'>;

export type UpdateRoleInput = Partial<
  Omit<Role, 'id' | 'created_at' | 'updated_at'>
>;

export type CreatePermissionInput = Omit<Permission, 'id'>;

export type UpdatePermissionInput = Partial<Omit<Permission, 'id'>>;

export type CreateManagerInput = Omit<
  Manager,
  'id' | 'created_at' | 'updated_at'
>;

export type UpdateManagerInput = Partial<
  Omit<Manager, 'id' | 'created_at' | 'updated_at'>
>;

export type CreateSubscriptionInput = Omit<
  Subscription,
  'id' | 'created_at' | 'updated_at'
>;

export type UpdateSubscriptionInput = Partial<
  Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
>;

export type CreateUserOneTimeCodesInput = Omit<
  UserOneTimeCodes,
  'id' | 'created_at'
>;

export type CreateApiLogInput = Omit<ApiLog, 'id' | 'created_at'>;

export type CreateArticleCategoryInput = Omit<
  ArticleCategory,
  'id' | 'created_at' | 'updated_at'
>;

export type UpdateArticleCategoryInput = Partial<
  Omit<ArticleCategory, 'id' | 'created_at' | 'updated_at'>
>;

export type CreateArticleInput = Omit<
  Article,
  'id' | 'created_at' | 'updated_at'
>;

export type UpdateArticleInput = Partial<
  Omit<Article, 'id' | 'created_at' | 'updated_at'>
>;

export type CreateNotificationInput = Omit<Notification, 'id' | 'created_at'>;

export type UpdateNotificationInput = Partial<
  Omit<Notification, 'id' | 'created_at'>
>;

export type CreateNotificationTemplateInput = Omit<
  NotificationTemplate,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export type UpdateNotificationTemplateInput = Partial<
  Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
>;

// Query filter types for common filtering patterns
export interface UserFilters {
  role_id?: number | number[];
  customer_id?: number | number[];
  has_customer?: boolean;
  status?: string | string[];
  search?: string;
  is_superadmin?: boolean;
  is_customer_success?: boolean;
  deleted_at?: null | 'not_null';
}

export interface CustomerFilters {
  id?: number | number[];
  status?: CustomerStatus | CustomerStatus[];
  subscription_id?: number | number[];
  manager_id?: number | number[];
  customer_success_id?: number | number[];
  search?: string;
}

export interface ArticleFilters {
  customer_id?: number | number[];
  category_id?: number | number[];
  created_by?: number | number[];
  status?: string | string[];
  search?: string;
}

export interface NotificationFilters {
  user_id?: number | number[];
  customer_id?: number | number[];
  sender_id?: number | number[];
  type?: NotificationType | NotificationType[];
  is_read?: boolean;
  channel?: string | string[];
}

// Pagination types
export interface PaginationOptions {
  page: number;
  per_page: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// Order by types
export type OrderDirection = 'asc' | 'desc';

export interface OrderBy {
  field: string;
  direction: OrderDirection;
}

// Supabase specific types
export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface SupabaseArrayResponse<T> {
  data: T[] | null;
  error: Error | null;
  count?: number | null;
}

// Type helpers for common operations
export type TableNames =
  | 'users'
  | 'customers'
  | 'roles'
  | 'permissions'
  | 'role_permissions'
  | 'managers'
  | 'subscriptions'
  | 'user_one_time_codes'
  | 'api_logs'
  | 'article_categories'
  | 'articles'
  | 'notifications'
  | 'notification_templates';

// Generic database record type
export interface DatabaseRecord {
  id: number;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

// Type mapping for table names to their interfaces
export interface TableTypeMap {
  users: User;
  customers: Customer;
  roles: Role;
  permissions: Permission;
  role_permissions: RolePermission;
  managers: Manager;
  subscriptions: Subscription;
  user_one_time_codes: UserOneTimeCodes;
  api_logs: ApiLog;
  article_categories: ArticleCategory;
  articles: Article;
  notifications: Notification;
  notification_templates: NotificationTemplate;
}

// Utility type for getting table type by name
export type TableType<T extends TableNames> = TableTypeMap[T];
