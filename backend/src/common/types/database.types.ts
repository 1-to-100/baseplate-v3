/**
 * Database Types for Supabase Client
 * Matches the actual database structure
 */

// Enums matching database schema
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
  id: string;
  uid?: string | null;
  email: string;
  email_verified?: boolean | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  phone_number?: string | null;
  customer_id?: string | null;
  role_id?: string | null;
  manager_id?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface UserWithRole extends User {
  role?: Role | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  domain: string;
  owner_id: string;
  status: CustomerStatus;
  subscription_id?: string | null;
  manager_id?: string | null;
  customer_success_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Role {
  id: string;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Permission {
  id: string;
  name: string;
  label: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface Manager {
  id: string;
  name?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Subscription {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface UserOneTimeCodes {
  id: string;
  code: string;
  user_id: string;
  is_used: boolean;
  created_at: string;
}

export interface ApiLog {
  id: string;
  method: string;
  url: string;
  status_code: number;
  duration: number;
  request_body?: string | null;
  headers?: string | null;
  created_at: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
  subcategory?: string | null;
  about?: string | null;
  icon?: string | null;
  customer_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  title: string;
  category_id: string;
  subcategory?: string | null;
  customer_id: string;
  created_by: string;
  status?: string | null;
  content?: string | null;
  video_url?: string | null;
  views_number?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id?: string | null;
  customer_id?: string | null;
  sender_id?: string | null;
  type: NotificationType;
  title?: string | null;
  message?: string | null;
  template_id?: string | null;
  metadata?: any; // JSON type
  channel?: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  generated_by?: string | null;
}

export interface NotificationTemplate {
  id: string;
  title: string;
  message?: string | null;
  comment?: string | null;
  type: NotificationType[];
  channel: string;
  customer_id?: string | null;
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
  role_id?: string | string[];
  customer_id?: string | string[];
  has_customer?: boolean;
  status?: string | string[];
  search?: string;
  deleted_at?: null | 'not_null';
}

export interface CustomerFilters {
  id?: string | string[];
  status?: CustomerStatus | CustomerStatus[];
  subscription_id?: string | string[];
  manager_id?: string | string[];
  customer_success_id?: string | string[];
  search?: string;
}

export interface RoleFilters {
  id?: string | string[];
  name?: string;
  description?: string;
  search?: string;
  or?: { name: { ilike: string } }[];
}

export interface ArticleFilters {
  customer_id?: string | string[];
  category_id?: string | string[];
  created_by?: string | string[];
  status?: string | string[];
  search?: string;
}

export interface NotificationFilters {
  user_id?: string | string[];
  customer_id?: string | string[];
  sender_id?: string | string[];
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
  id: string;
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
