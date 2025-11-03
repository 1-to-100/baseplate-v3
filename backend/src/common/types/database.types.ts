/**
 * Database Types for Supabase Client
 * Matches the unified Baseplate database structure
 * Following Baseplate conventions with fully qualified column names
 */

// ============================================================================
// ENUMS matching database schema
// ============================================================================

export enum StripeSubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

export enum CustomerLifecycleStage {
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  EXPANSION = 'expansion',
  AT_RISK = 'at_risk',
  CHURNED = 'churned',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  INVITED = 'invited',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum NotificationType {
  EMAIL = 'email',
  IN_APP = 'in_app',
  // todo: adjust logic to use these values
  // SYSTEM = 'system',
  // USER = 'user',
  // MARKETING = 'marketing',
  // SECURITY = 'security',
  // BILLING = 'billing',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum ArticleStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ExtensionFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  JSON = 'json',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
}

// ============================================================================
// Base interfaces for database tables
// ============================================================================

export interface SubscriptionType {
  subscription_type_id: string;
  name: string;
  description?: string | null;
  active: boolean;
  is_default: boolean;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  max_users?: number | null;
  max_contacts?: number | null;
  features?: any; // jsonb
  created_at: string;
  updated_at?: string | null;
}

export interface Role {
  role_id: string;
  name: string;
  display_name: string;
  description?: string | null;
  is_system_role: boolean;
  permissions: any; // jsonb - array of permission strings
  created_at: string;
  updated_at?: string | null;
}

export interface Permission {
  permission_id: string;
  name: string;
  display_name: string;
  description?: string | null;
}

export interface Manager {
  manager_id: string;
  auth_user_id?: string | null;
  email: string;
  full_name: string;
  active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface Customer {
  customer_id: string;
  name: string;
  email_domain?: string | null;
  lifecycle_stage: CustomerLifecycleStage;
  active: boolean;
  subscription_type_id?: string | null;
  stripe_customer_id?: string | null;
  owner_id?: string | null;
  manager_id?: string | null;
  onboarded_at?: string | null;
  churned_at?: string | null;
  metadata?: any; // jsonb
  created_at: string;
  updated_at?: string | null;
}

export interface User {
  user_id: string;
  auth_user_id?: string | null;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  customer_id?: string | null;
  role_id?: string | null;
  status: UserStatus;
  email_verified?: boolean | null;
  last_login_at?: string | null;
  preferences?: any; // jsonb
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface UserOneTimeCode {
  user_one_time_code_id: string;
  user_id: string;
  code: string;
  is_used: boolean;
  created_at: string;
}

export interface CustomerSubscription {
  customer_subscription_id: string;
  customer_id: string;
  subscription_type_id: string;
  stripe_subscription_id?: string | null;
  stripe_status?: StripeSubscriptionStatus | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  canceled_at?: string | null;
  trial_start?: string | null;
  trial_end?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Team {
  team_id: string;
  customer_id: string;
  manager_id?: string | null;
  team_name: string;
  description?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface TeamMember {
  team_member_id: string;
  team_id: string;
  user_id: string;
  created_at: string;
  updated_at?: string | null;
}

export interface CustomerSuccessOwnedCustomer {
  customer_success_owned_customer_id: string;
  user_id: string;
  customer_id: string;
  created_at: string;
  updated_at?: string | null;
}

export interface Subscription {
  subscription_id: string;
  customer_id: string;
  stripe_subscription_id: string;
  stripe_status: StripeSubscriptionStatus;
  currency?: string | null;
  description?: string | null;
  collection_method?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_start?: string | null;
  trial_end?: string | null;
  cancel_at_period_end: boolean;
  canceled_at?: string | null;
  default_payment_method?: string | null;
  latest_invoice?: string | null;
  stripe_metadata?: any; // jsonb
  stripe_raw_data?: any; // jsonb
  last_synced_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserInvitation {
  invitation_id: string;
  email: string;
  customer_id: string;
  role_id?: string | null;
  invited_by: string;
  status: InvitationStatus;
  token: string;
  expires_at: string;
  accepted_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Taxonomy {
  taxonomy_id: string;
  customer_id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  display_order: number;
  metadata?: any; // jsonb
  created_at: string;
  updated_at?: string | null;
}

export interface ExtensionDataType {
  extension_data_type_id: string;
  table_being_extended: string;
  name: string;
  external_name: string;
  field_type: ExtensionFieldType;
  description?: string | null;
  is_required: boolean;
  is_active: boolean;
  default_value?: string | null;
  validation_rules?: any; // jsonb
  display_order: number;
  created_at: string;
  updated_at?: string | null;
}

export interface ExtensionData {
  extension_data_id: string;
  extension_data_type_id: string;
  data_id: string;
  value?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface HelpArticleCategory {
  help_article_category_id: string;
  customer_id: string;
  name: string;
  slug: string;
  description?: string | null;
  subcategory?: string | null;
  about?: string | null;
  parent_id?: string | null;
  icon?: string | null;
  display_order: number;
  created_by: string;
  created_at: string;
  updated_at?: string | null;
}

export interface HelpArticle {
  help_article_id: string;
  customer_id: string;
  category_id: string;
  title: string;
  slug: string;
  content?: string | null;
  summary?: string | null;
  subcategory?: string | null;
  status: ArticleStatus;
  published_at?: string | null;
  video_url?: string | null;
  view_count: number;
  views_number?: number | null;
  featured: boolean;
  metadata?: any; // jsonb
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface NotificationTemplate {
  template_id: string;
  customer_id?: string | null;
  title: string;
  message: string;
  comment?: string | null;
  type: NotificationType[];
  channel: string;
  variables?: any; // jsonb
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface Notification {
  notification_id: string;
  customer_id?: string | null;
  user_id: string;
  template_id?: string | null;
  type: NotificationType[];
  title?: string | null;
  message: string;
  channel?: string | null;
  metadata?: any; // jsonb
  read_at?: string | null;
  sender_id?: string | null;
  generated_by?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// Action enum for audit logs
export enum Action {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

export interface AuditLog {
  audit_log_id: string;
  customer_id?: string | null;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  changes?: any; // jsonb
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface ApiLog {
  api_log_id: string;
  method?: string | null;
  url?: string | null;
  status_code?: number | null;
  response_time?: number | null;
  user_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

// ============================================================================
// Relation types - for when you need to include related data
// ============================================================================

export interface UserWithRelations extends User {
  customer?: Customer | null;
  role?: Role | null;
  owned_customer?: Customer | null;
  help_articles?: HelpArticle[];
  notifications?: Notification[];
  invitations_sent?: UserInvitation[];
}

export interface CustomerWithRelations extends Customer {
  subscription_type?: SubscriptionType | null;
  manager?: Manager | null;
  owner?: User | null;
  users?: User[];
  help_articles?: HelpArticle[];
  notifications?: Notification[];
  notification_templates?: NotificationTemplate[];
  taxonomies?: Taxonomy[];
  customer_subscriptions?: CustomerSubscription[];
  subscriptions?: Subscription[];
  teams?: Team[];
  customer_success_owned_customers?: CustomerSuccessOwnedCustomer[];
}

export interface TeamWithRelations extends Team {
  customer?: Customer | null;
  manager?: User | null;
  team_members?: TeamMember[];
}

export interface TeamMemberWithRelations extends TeamMember {
  team?: Team | null;
  user?: User | null;
}

export interface SubscriptionWithRelations extends Subscription {
  customer?: Customer | null;
}

export interface RoleWithRelations extends Role {
  users?: User[];
  role_permissions?: RolePermission[];
  permission_details?: Permission[];
}

export interface ManagerWithRelations extends Manager {
  customers?: Customer[];
}

export interface HelpArticleCategoryWithRelations extends HelpArticleCategory {
  help_articles?: HelpArticle[];
  children?: HelpArticleCategory[];
  parent?: HelpArticleCategory | null;
}

export interface HelpArticleWithRelations extends HelpArticle {
  category?: HelpArticleCategory | null;
  creator?: User | null;
  updater?: User | null;
  customer?: Customer | null;
}

export interface NotificationWithRelations extends Notification {
  user?: User | null;
  customer?: Customer | null;
  template?: NotificationTemplate | null;
}

export interface NotificationTemplateWithRelations
  extends NotificationTemplate {
  customer?: Customer | null;
  notifications?: Notification[];
}

export interface TaxonomyWithRelations extends Taxonomy {
  children?: Taxonomy[];
  parent?: Taxonomy | null;
}

export interface ExtensionDataWithRelations extends ExtensionData {
  extension_data_type?: ExtensionDataType | null;
}

// ============================================================================
// Input types for creating/updating records (omit auto-generated fields)
// ============================================================================

export type CreateSubscriptionTypeInput = Omit<
  SubscriptionType,
  'subscription_type_id' | 'created_at' | 'updated_at'
>;

export type UpdateSubscriptionTypeInput = Partial<
  Omit<SubscriptionType, 'subscription_type_id' | 'created_at' | 'updated_at'>
>;

export type CreateRoleInput = Omit<
  Role,
  'role_id' | 'created_at' | 'updated_at'
>;

export type UpdateRoleInput = Partial<
  Omit<Role, 'role_id' | 'created_at' | 'updated_at'>
>;

export type CreatePermissionInput = Omit<Permission, 'permission_id'>;

export type UpdatePermissionInput = Partial<Omit<Permission, 'permission_id'>>;

export type CreateManagerInput = Omit<
  Manager,
  'manager_id' | 'created_at' | 'updated_at'
>;

export type UpdateManagerInput = Partial<
  Omit<Manager, 'manager_id' | 'created_at' | 'updated_at'>
>;

export type CreateCustomerInput = Omit<
  Customer,
  'customer_id' | 'created_at' | 'updated_at'
>;

export type UpdateCustomerInput = Partial<
  Omit<Customer, 'customer_id' | 'created_at' | 'updated_at'>
>;

export type CreateUserInput = Omit<
  User,
  'user_id' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export type UpdateUserInput = Partial<
  Omit<User, 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
>;

export type CreateCustomerSubscriptionInput = Omit<
  CustomerSubscription,
  'customer_subscription_id' | 'created_at' | 'updated_at'
>;

export type UpdateCustomerSubscriptionInput = Partial<
  Omit<
    CustomerSubscription,
    'customer_subscription_id' | 'created_at' | 'updated_at'
  >
>;

export type CreateUserInvitationInput = Omit<
  UserInvitation,
  'invitation_id' | 'created_at' | 'updated_at'
>;

export type UpdateUserInvitationInput = Partial<
  Omit<UserInvitation, 'invitation_id' | 'created_at' | 'updated_at'>
>;

export type CreateTaxonomyInput = Omit<
  Taxonomy,
  'taxonomy_id' | 'created_at' | 'updated_at'
>;

export type UpdateTaxonomyInput = Partial<
  Omit<Taxonomy, 'taxonomy_id' | 'created_at' | 'updated_at'>
>;

export type CreateExtensionDataTypeInput = Omit<
  ExtensionDataType,
  'extension_data_type_id' | 'created_at' | 'updated_at'
>;

export type UpdateExtensionDataTypeInput = Partial<
  Omit<
    ExtensionDataType,
    'extension_data_type_id' | 'created_at' | 'updated_at'
  >
>;

export type CreateExtensionDataInput = Omit<
  ExtensionData,
  'extension_data_id' | 'created_at' | 'updated_at'
>;

export type UpdateExtensionDataInput = Partial<
  Omit<ExtensionData, 'extension_data_id' | 'created_at' | 'updated_at'>
>;

export type CreateHelpArticleCategoryInput = Omit<
  HelpArticleCategory,
  'help_article_category_id' | 'created_at' | 'updated_at'
>;

export type UpdateHelpArticleCategoryInput = Partial<
  Omit<HelpArticleCategory, 'help_article_category_id' | 'created_at' | 'updated_at'>
>;

export type CreateHelpArticleInput = Omit<
  HelpArticle,
  'help_article_id' | 'created_at' | 'updated_at'
>;

export type UpdateHelpArticleInput = Partial<
  Omit<HelpArticle, 'help_article_id' | 'created_at' | 'updated_at'>
>;

export type CreateNotificationTemplateInput = Omit<
  NotificationTemplate,
  'template_id' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export type UpdateNotificationTemplateInput = Partial<
  Omit<
    NotificationTemplate,
    'template_id' | 'created_at' | 'updated_at' | 'deleted_at'
  >
>;

export type CreateNotificationInput = Omit<
  Notification,
  'notification_id' | 'created_at' | 'updated_at'
>;

export type UpdateNotificationInput = Partial<
  Omit<Notification, 'notification_id' | 'created_at' | 'updated_at'>
>;

export type CreateAuditLogInput = Omit<AuditLog, 'audit_log_id' | 'created_at'>;

export type CreateTeamInput = Omit<
  Team,
  'team_id' | 'created_at' | 'updated_at'
>;

export type UpdateTeamInput = Partial<
  Omit<Team, 'team_id' | 'created_at' | 'updated_at'>
>;

export type CreateTeamMemberInput = Omit<
  TeamMember,
  'team_member_id' | 'created_at' | 'updated_at'
>;

export type UpdateTeamMemberInput = Partial<
  Omit<TeamMember, 'team_member_id' | 'created_at' | 'updated_at'>
>;

export type CreateCustomerSuccessOwnedCustomerInput = Omit<
  CustomerSuccessOwnedCustomer,
  'customer_success_owned_customer_id' | 'created_at' | 'updated_at'
>;

export type UpdateCustomerSuccessOwnedCustomerInput = Partial<
  Omit<CustomerSuccessOwnedCustomer, 'customer_success_owned_customer_id' | 'created_at' | 'updated_at'>
>;

export type CreateSubscriptionInput = Omit<
  Subscription,
  'subscription_id' | 'created_at' | 'updated_at'
>;

export type UpdateSubscriptionInput = Partial<
  Omit<Subscription, 'subscription_id' | 'created_at' | 'updated_at'>
>;

export type CreateRolePermissionInput = Omit<RolePermission, 'created_at'>;

// ============================================================================
// Query filter types for common filtering patterns
// ============================================================================

export interface UserFilters {
  role_id?: string | string[];
  customer_id?: string | string[];
  status?: UserStatus | UserStatus[];
  search?: string;
  deleted_at?: null | 'not_null';
}

export interface CustomerFilters {
  customer_id?: string | string[];
  lifecycle_stage?: CustomerLifecycleStage | CustomerLifecycleStage[];
  active?: boolean;
  subscription_type_id?: string | string[];
  manager_id?: string | string[];
  search?: string;
}

export interface RoleFilters {
  role_id?: string | string[];
  name?: string;
  is_system_role?: boolean;
  search?: string;
}

export interface HelpArticleFilters {
  customer_id?: string | string[];
  category_id?: string | string[];
  created_by?: string | string[];
  status?: ArticleStatus | ArticleStatus[];
  featured?: boolean;
  search?: string;
}

export interface NotificationFilters {
  user_id?: string | string[];
  customer_id?: string | string[];
  type?: NotificationType | NotificationType[];
  read_at?: string | null; // null = unread, not null = read
  channel?: string | string[];
}

export interface InvitationFilters {
  customer_id?: string | string[];
  email?: string;
  status?: InvitationStatus | InvitationStatus[];
  invited_by?: string | string[];
}

// ============================================================================
// Pagination types
// ============================================================================

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

// ============================================================================
// Order by types
// ============================================================================

export type OrderDirection = 'asc' | 'desc';

export interface OrderBy {
  field: string;
  direction: OrderDirection;
}

// ============================================================================
// Supabase specific types
// ============================================================================

export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface SupabaseArrayResponse<T> {
  data: T[] | null;
  error: Error | null;
  count?: number | null;
}

// ============================================================================
// Type helpers for common operations
// ============================================================================

export type TableNames =
  | 'subscription_types'
  | 'subscriptions'
  | 'roles'
  | 'permissions'
  | 'managers'
  | 'customers'
  | 'users'
  | 'user_one_time_codes'
  | 'customer_subscriptions'
  | 'user_invitations'
  | 'taxonomies'
  | 'extension_data_types'
  | 'extension_data'
  | 'help_article_categories'
  | 'help_articles'
  | 'notification_templates'
  | 'notifications'
  | 'audit_logs'
  | 'api_logs'
  | 'teams'
  | 'team_members'
  | 'customer_success_owned_customers'
  | 'role_permissions';

// Generic database record type
export interface DatabaseRecord {
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

// Type mapping for table names to their interfaces
export interface TableTypeMap {
  subscription_types: SubscriptionType;
  subscriptions: Subscription;
  roles: Role;
  permissions: Permission;
  managers: Manager;
  customers: Customer;
  users: User;
  user_one_time_codes: UserOneTimeCode;
  customer_subscriptions: CustomerSubscription;
  user_invitations: UserInvitation;
  taxonomies: Taxonomy;
  extension_data_types: ExtensionDataType;
  extension_data: ExtensionData;
  help_article_categories: HelpArticleCategory;
  help_articles: HelpArticle;
  notification_templates: NotificationTemplate;
  notifications: Notification;
  audit_logs: AuditLog;
  api_logs: ApiLog;
  teams: Team;
  team_members: TeamMember;
  customer_success_owned_customers: CustomerSuccessOwnedCustomer;
  role_permissions: RolePermission;
}

// Utility type for getting table type by name
export type TableType<T extends TableNames> = TableTypeMap[T];
