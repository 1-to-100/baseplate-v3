-- =============================================================================
-- UNIFIED BASEPLATE SCHEMA
-- Following Baseplate Database Conventions
-- =============================================================================
--
-- This schema combines the Baseplate reference schema with the ATC platform
-- requirements, following all Baseplate database conventions.
--
-- Key Design Principles:
-- 1. UUID primary keys with full table name (e.g., customer_id, user_id)
-- 2. Snake_case naming throughout
-- 3. PostgreSQL enum types for type-safe status fields
-- 4. Row Level Security (RLS) enabled on all tables
-- 5. Comprehensive indexes for performance
-- 6. Automatic timestamp triggers
-- 7. Helper functions for RLS policies
-- 8. Defined paradigm for extensible data on system objects
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- Stripe subscription status enum
-- Maps directly to Stripe's subscription status values
create type StripeSubscriptionStatus as enum (
  'incomplete',           -- Initial payment attempt failed
  'incomplete_expired',   -- First invoice not paid within 23 hours (terminal)
  'trialing',             -- Currently in trial period
  'active',               -- Active subscription with successful payment
  'past_due',             -- Payment required but cannot be paid
  'canceled',             -- Subscription has been canceled
  'unpaid',               -- Subscription unpaid after exhausting retries
  'paused'                -- Trial ended without payment method
);

comment on type StripeSubscriptionStatus is 
  'Enum defining Stripe subscription status values (maps directly to Stripe API)';

-- Customer lifecycle stage enum
-- We use this for internal customer tracking in the system

create type CustomerLifecycleStage as enum (
  'onboarding',   -- Initial setup and configuration
  'active',       -- Fully onboarded and using product
  'expansion',    -- Growing usage, upsell opportunity
  'at_risk',      -- Low engagement, churn risk
  'churned'       -- No longer a customer
);

comment on type CustomerLifecycleStage is 
  'Enum defining customer lifecycle stages for customer success tracking';

-- User status enum
create type UserStatus as enum (
  'active',      -- Active user with full access
  'inactive',    -- Not yet activated or temporarily inactive
  'invited',     -- Invitation sent, not yet accepted
  'suspended',   -- Suspended by admin
  'deleted'      -- Soft deleted
);

comment on type UserStatus is 
  'Enum defining possible user status values';

-- Invitation status enum
create type InvitationStatus as enum (
  'pending',     -- Invitation sent, awaiting acceptance
  'accepted',    -- Invitation accepted
  'expired',     -- Invitation expired
  'revoked'      -- Invitation revoked by admin
);

comment on type InvitationStatus is 
  'Enum defining possible invitation status values';

-- Notification type enum
create type NotificationType as enum (
  'email',       -- Email notification
  'in_app'       -- In-app notification
);

comment on type NotificationType is 
  'Enum defining notification delivery types';

-- Notification status enum
create type NotificationStatus as enum (
  'unread',      -- Notification not yet read
  'read',        -- Notification has been read
  'archived',    -- Notification archived by user
  'deleted'      -- Notification soft deleted
);

comment on type NotificationStatus is 
  'Enum defining notification status values';

-- Article status enum
create type ArticleStatus as enum (
  'draft',       -- Article in draft state
  'review',      -- Article under review
  'published',   -- Article published and visible
  'archived'     -- Article archived
);

comment on type ArticleStatus is 
  'Enum defining article status values';

-- Extension field type enum
-- Defines the data types for extension fields
create type ExtensionFieldType as enum (
  'text',        -- Text field
  'number',      -- Numeric field
  'boolean',     -- Boolean field
  'date',        -- Date field
  'datetime',    -- DateTime field
  'json',        -- JSON field
  'select',      -- Select dropdown field
  'multiselect'  -- Multiple select field
);

comment on type ExtensionFieldType is 
  'Enum defining data types for extension fields';

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Subscription types table (independent)
-- Defines the types of subscriptions available in the system
create table public.subscription_types (
  subscription_type_id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  is_default boolean not null default false,
  stripe_product_id text,
  stripe_price_id text,
  max_users integer,
  max_contacts integer,
  features jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

comment on table public.subscription_types is 
  'Defines subscription types/tiers available in the system';

-- Roles table (independent)
create table public.roles (
  role_id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text,
  is_system_role boolean not null default false,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

comment on table public.roles is 
  'Defines user roles and their permissions';

-- Permissions table (independent)
create table public.permissions (
  permission_id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text
);

comment on table public.permissions is 
  'Defines all available permissions in the system';

-- Managers table (independent)
-- System users who manage customers
create table public.managers (
  manager_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  email text not null unique,
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

comment on table public.managers is 
  'System-level managers (customer success, account managers)';

-- Customers table (independent initially, circular with users)
create table public.customers (
  customer_id uuid primary key default gen_random_uuid(),
  name text not null unique,
  email_domain text,
  lifecycle_stage CustomerLifecycleStage not null default 'onboarding',
  active boolean not null default true,
  subscription_type_id uuid,
  stripe_customer_id text,
  owner_id uuid,
  manager_id uuid,
  onboarded_at timestamptz,
  churned_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

comment on table public.customers is 
  'Customer organizations in the multi-tenant system';

-- Users table (references customers and roles)
create table public.users (
  user_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  phone_number text,
  customer_id uuid,
  role_id uuid,
  manager_id uuid,
  status UserStatus not null default 'inactive',
  last_login_at timestamptz,
  preferences jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

comment on table public.users is 
  'Users within customer organizations. customer_id can be NULL for system-level admins and during the initial creation of customer owners (circular reference handling).';

-- Add foreign key from customers to users (circular reference)
alter table public.customers
  add constraint customers_owner_id_fkey
  foreign key (owner_id) references public.users(user_id)
  on delete set null;

-- User one-time codes table (for email verification, password reset, etc.)
create table public.user_one_time_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code text not null,
  is_used boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.user_one_time_codes is 
  'One-time codes for user verification and authentication flows';

-- Customer subscriptions table (references customers and subscription types)
create table public.customer_subscriptions (
  customer_subscription_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  subscription_type_id uuid not null,
  stripe_subscription_id text unique,
  stripe_status StripeSubscriptionStatus,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

comment on table public.customer_subscriptions is 
  'Tracks customer subscription status and Stripe integration';

-- User invitations table (references customers, users, roles)
create table public.user_invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  email text not null,
  customer_id uuid not null,
  role_id uuid,
  invited_by uuid not null,
  status InvitationStatus not null default 'pending',
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

comment on table public.user_invitations is 
  'Tracks user invitation status';

-- Taxonomies table (references customers)
create table public.taxonomies (
  taxonomy_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  name text not null,
  slug text not null,
  parent_id uuid,
  display_order integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  constraint taxonomies_customer_slug_key unique (customer_id, slug)
);

comment on table public.taxonomies is 
  'Hierarchical categorization system for customers';

-- Extension data types table (defines custom fields)
create table public.extension_data_types (
  extension_data_type_id uuid primary key default gen_random_uuid(),
  table_being_extended text not null,
  name text not null,
  external_name text not null,
  field_type ExtensionFieldType not null,
  description text,
  is_required boolean not null default false,
  is_active boolean not null default true,
  default_value text,
  validation_rules jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  constraint extension_data_types_table_name_key unique (table_being_extended, name)
);

comment on table public.extension_data_types is 
  'Defines custom field types that can be added to core tables';

-- Extension data table (stores custom field values)
create table public.extension_data (
  extension_data_id uuid primary key default gen_random_uuid(),
  extension_data_type_id uuid not null,
  data_id uuid not null,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  constraint extension_data_type_data_key unique (extension_data_type_id, data_id)
);

comment on table public.extension_data is 
  'Stores values for custom fields defined in extension_data_types';

-- Article categories table (references customers and users)
create table public.article_categories (
  article_category_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  name text not null,
  slug text not null,
  description text,
  subcategory text,
  about text,
  parent_id uuid,
  icon text,
  display_order integer not null default 0,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  constraint article_categories_customer_slug_key unique (customer_id, slug)
);

comment on table public.article_categories is 
  'Categories for organizing help articles';

-- Articles table (references article categories, customers, and users)
create table public.articles (
  article_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  category_id uuid not null,
  title text not null,
  slug text not null,
  content text,
  summary text,
  subcategory text,
  status ArticleStatus not null default 'draft',
  published_at timestamptz,
  video_url text,
  view_count integer not null default 0,
  featured boolean not null default false,
  metadata jsonb,
  created_by uuid not null,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  constraint articles_customer_slug_key unique (customer_id, slug)
);

comment on table public.articles is 
  'Help articles and documentation';

-- Notification templates table (references customers)
create table public.notification_templates (
  template_id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text not null,
  subject text,
  body text not null,
  type NotificationType not null,
  channel text not null,
  variables jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

comment on table public.notification_templates is 
  'Templates for notifications';

-- Notifications table (references users, customers, templates)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  user_id uuid not null,
  template_id uuid,
  type NotificationType not null,
  title text,
  message text not null,
  channel text,
  metadata jsonb,
  read_at timestamptz,
  sender_id uuid,
  generated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

comment on table public.notifications is 
  'User notifications';
comment on column public.notifications.read_at is 
  'Indicator of read status: NULL = unread, NOT NULL = read. Timestamp tracks when notification was read.';

-- Audit log table (references users and customers)
create table public.audit_logs (
  audit_log_id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is 
  'Audit trail for system actions';

-- API log table (for API request tracking)
create table public.api_logs (
  id uuid primary key default gen_random_uuid(),
  method text,
  url text,
  status_code integer,
  response_time integer,
  user_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.api_logs is 
  'API request logging for monitoring and debugging';

-- =============================================================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Subscription types (no foreign keys)

-- Roles (no foreign keys)

-- Permissions (no foreign keys)

-- Managers (no foreign keys initially, can add auth integration later)

-- Customers foreign keys
alter table public.customers
  add constraint customers_subscription_type_id_fkey
  foreign key (subscription_type_id) references public.subscription_types(subscription_type_id)
  on delete set null;

alter table public.customers
  add constraint customers_manager_id_fkey
  foreign key (manager_id) references public.managers(manager_id)
  on delete set null;

-- Users foreign keys
alter table public.users
  add constraint users_customer_id_fkey
  foreign key (customer_id) references public.customers(customer_id)
  on delete cascade;

alter table public.users
  add constraint users_role_id_fkey
  foreign key (role_id) references public.roles(role_id)
  on delete set null;

alter table public.users
  add constraint users_manager_id_fkey
  foreign key (manager_id) references public.managers(manager_id)
  on delete set null;

-- User one-time codes foreign keys
alter table public.user_one_time_codes
  add constraint user_one_time_codes_user_id_fkey
  foreign key (user_id) references public.users(user_id)
  on delete cascade;

-- Customer subscriptions foreign keys
alter table public.customer_subscriptions
  add constraint customer_subscriptions_customer_id_fkey
  foreign key (customer_id) references public.customers(customer_id)
  on delete cascade;

alter table public.customer_subscriptions
  add constraint customer_subscriptions_subscription_type_id_fkey
  foreign key (subscription_type_id) references public.subscription_types(subscription_type_id)
  on delete restrict;

-- User invitations foreign keys
alter table public.user_invitations
  add constraint user_invitations_customer_id_fkey
  foreign key (customer_id) references public.customers(customer_id)
  on delete cascade;

alter table public.user_invitations
  add constraint user_invitations_role_id_fkey
  foreign key (role_id) references public.roles(role_id)
  on delete set null;

alter table public.user_invitations
  add constraint user_invitations_invited_by_fkey
  foreign key (invited_by) references public.users(user_id)
  on delete cascade;

-- Taxonomies foreign keys
alter table public.taxonomies
  add constraint taxonomies_customer_id_fkey
  foreign key (customer_id) references public.customers(customer_id)
  on delete cascade;

alter table public.taxonomies
  add constraint taxonomies_parent_id_fkey
  foreign key (parent_id) references public.taxonomies(taxonomy_id)
  on delete cascade;

-- Extension data types (no foreign keys, table_being_extended is text reference)

-- Extension data foreign keys
alter table public.extension_data
  add constraint extension_data_extension_data_type_id_fkey
  foreign key (extension_data_type_id) references public.extension_data_types(extension_data_type_id)
  on delete cascade;

-- Article categories foreign keys
alter table public.article_categories
  add constraint article_categories_customer_id_fkey
  foreign key (customer_id) references public.customers(customer_id)
  on delete cascade;

alter table public.article_categories
  add constraint article_categories_parent_id_fkey
  foreign key (parent_id) references public.article_categories(article_category_id)
  on delete cascade;

alter table public.article_categories
  add constraint article_categories_created_by_fkey
  foreign key (created_by) references public.users(user_id)
  on delete restrict;

-- Articles foreign keys
alter table public.articles
  add constraint articles_customer_id_fkey
  foreign key (customer_id) references public.customers(customer_id)
  on delete cascade;

alter table public.articles
  add constraint articles_category_id_fkey
  foreign key (category_id) references public.article_categories(article_category_id)
  on delete restrict;

alter table public.articles
  add constraint articles_created_by_fkey
  foreign key (created_by) references public.users(user_id)
  on delete restrict;

alter table public.articles
  add constraint articles_updated_by_fkey
  foreign key (updated_by) references public.users(user_id)
  on delete set null;

-- Notification templates foreign keys
alter table public.notification_templates
  add constraint notification_templates_customer_id_fkey
  foreign key (customer_id) references public.customers(customer_id)
  on delete cascade;

-- Notifications foreign keys
alter table public.notifications
  add constraint notifications_customer_id_fkey
  foreign key (customer_id) references public.customers(customer_id)
  on delete cascade;

alter table public.notifications
  add constraint notifications_user_id_fkey
  foreign key (user_id) references public.users(user_id)
  on delete cascade;

alter table public.notifications
  add constraint notifications_template_id_fkey
  foreign key (template_id) references public.notification_templates(template_id)
  on delete set null;

-- Audit logs foreign keys
alter table public.audit_logs
  add constraint audit_logs_customer_id_fkey
  foreign key (customer_id) references public.customers(customer_id)
  on delete set null;

alter table public.audit_logs
  add constraint audit_logs_user_id_fkey
  foreign key (user_id) references public.users(user_id)
  on delete set null;

-- API logs foreign keys
alter table public.api_logs
  add constraint api_logs_user_id_fkey
  foreign key (user_id) references public.users(user_id)
  on delete set null;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Subscription types indexes
create index idx_subscription_types_active on public.subscription_types(active);
create index idx_subscription_types_stripe_product_id on public.subscription_types(stripe_product_id);

-- Roles indexes
create index idx_roles_is_system_role on public.roles(is_system_role);

-- Managers indexes
create index idx_managers_active on public.managers(active);
create index idx_managers_email on public.managers(email);

-- Customers indexes
create index idx_customers_lifecycle_stage on public.customers(lifecycle_stage);
create index idx_customers_active on public.customers(active);
create index idx_customers_subscription_type_id on public.customers(subscription_type_id);
create index idx_customers_manager_id on public.customers(manager_id);
create index idx_customers_owner_id on public.customers(owner_id);
create index idx_customers_stripe_customer_id on public.customers(stripe_customer_id);
create index idx_customers_created_at on public.customers(created_at);

-- Users indexes
create index idx_users_customer_id on public.users(customer_id);
create index idx_users_role_id on public.users(role_id);
create index idx_users_manager_id on public.users(manager_id);
create index idx_users_status on public.users(status);
create index idx_users_email on public.users(email);
create index idx_users_auth_user_id on public.users(auth_user_id);
create index idx_users_deleted_at on public.users(deleted_at);
create index idx_users_last_login_at on public.users(last_login_at);

-- User one-time codes indexes
create index idx_user_one_time_codes_user_id on public.user_one_time_codes(user_id);
create index idx_user_one_time_codes_code on public.user_one_time_codes(code);
create index idx_user_one_time_codes_is_used on public.user_one_time_codes(is_used);

-- Customer subscriptions indexes
create index idx_customer_subscriptions_customer_id on public.customer_subscriptions(customer_id);
create index idx_customer_subscriptions_stripe_subscription_id on public.customer_subscriptions(stripe_subscription_id);
create index idx_customer_subscriptions_stripe_status on public.customer_subscriptions(stripe_status);
create index idx_customer_subscriptions_current_period_end on public.customer_subscriptions(current_period_end);

-- User invitations indexes
create index idx_user_invitations_customer_id on public.user_invitations(customer_id);
create index idx_user_invitations_email on public.user_invitations(email);
create index idx_user_invitations_status on public.user_invitations(status);
create index idx_user_invitations_token on public.user_invitations(token);
create index idx_user_invitations_expires_at on public.user_invitations(expires_at);

-- Taxonomies indexes
create index idx_taxonomies_customer_id on public.taxonomies(customer_id);
create index idx_taxonomies_parent_id on public.taxonomies(parent_id);
create index idx_taxonomies_slug on public.taxonomies(slug);

-- Extension data types indexes
create index idx_extension_data_types_table_being_extended on public.extension_data_types(table_being_extended);
create index idx_extension_data_types_is_active on public.extension_data_types(is_active);

-- Extension data indexes
create index idx_extension_data_extension_data_type_id on public.extension_data(extension_data_type_id);
create index idx_extension_data_data_id on public.extension_data(data_id);

-- Article categories indexes
create index idx_article_categories_customer_id on public.article_categories(customer_id);
create index idx_article_categories_parent_id on public.article_categories(parent_id);
create index idx_article_categories_slug on public.article_categories(slug);

-- Articles indexes
create index idx_articles_customer_id on public.articles(customer_id);
create index idx_articles_category_id on public.articles(category_id);
create index idx_articles_status on public.articles(status);
create index idx_articles_slug on public.articles(slug);
create index idx_articles_created_by on public.articles(created_by);
create index idx_articles_published_at on public.articles(published_at);
create index idx_articles_featured on public.articles(featured) where featured = true;

-- Notification templates indexes
create index idx_notification_templates_customer_id on public.notification_templates(customer_id);
create index idx_notification_templates_type on public.notification_templates(type);
create index idx_notification_templates_is_active on public.notification_templates(is_active);
create index idx_notification_templates_deleted_at on public.notification_templates(deleted_at);

-- Notifications indexes
create index idx_notifications_customer_id on public.notifications(customer_id);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read_at on public.notifications(read_at);
create index idx_notifications_type on public.notifications(type);
create index idx_notifications_created_at on public.notifications(created_at);

-- Audit logs indexes
create index idx_audit_logs_customer_id on public.audit_logs(customer_id);
create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_entity_type on public.audit_logs(entity_type);
create index idx_audit_logs_entity_id on public.audit_logs(entity_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at);
create index idx_audit_logs_action on public.audit_logs(action);

-- API logs indexes
create index idx_api_logs_user_id on public.api_logs(user_id);
create index idx_api_logs_created_at on public.api_logs(created_at);
create index idx_api_logs_status_code on public.api_logs(status_code);
create index idx_api_logs_method on public.api_logs(method);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT FIELDS
-- =============================================================================

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

comment on function public.update_updated_at_column() is 
  'Automatically updates the updated_at timestamp on row modification';

-- Apply triggers to tables with updated_at fields
create trigger update_subscription_types_updated_at
  before update on public.subscription_types
  for each row execute function public.update_updated_at_column();

create trigger update_roles_updated_at
  before update on public.roles
  for each row execute function public.update_updated_at_column();

create trigger update_managers_updated_at
  before update on public.managers
  for each row execute function public.update_updated_at_column();

create trigger update_customers_updated_at
  before update on public.customers
  for each row execute function public.update_updated_at_column();

create trigger update_users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at_column();

create trigger update_customer_subscriptions_updated_at
  before update on public.customer_subscriptions
  for each row execute function public.update_updated_at_column();

create trigger update_user_invitations_updated_at
  before update on public.user_invitations
  for each row execute function public.update_updated_at_column();

create trigger update_taxonomies_updated_at
  before update on public.taxonomies
  for each row execute function public.update_updated_at_column();

create trigger update_extension_data_types_updated_at
  before update on public.extension_data_types
  for each row execute function public.update_updated_at_column();

create trigger update_extension_data_updated_at
  before update on public.extension_data
  for each row execute function public.update_updated_at_column();

create trigger update_article_categories_updated_at
  before update on public.article_categories
  for each row execute function public.update_updated_at_column();

create trigger update_articles_updated_at
  before update on public.articles
  for each row execute function public.update_updated_at_column();

create trigger update_notification_templates_updated_at
  before update on public.notification_templates
  for each row execute function public.update_updated_at_column();

create trigger update_notifications_updated_at
  before update on public.notifications
  for each row execute function public.update_updated_at_column();

-- =============================================================================
-- RLS (ROW LEVEL SECURITY) HELPER FUNCTIONS
-- =============================================================================

-- Get the current user's user_id from JWT
create or replace function public.current_user_id()
returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'user_id', '')::uuid;
$$ language sql stable;

comment on function public.current_user_id() is 
  'Returns the user_id from the JWT claims';

-- Get the current user's customer_id
create or replace function public.current_customer_id()
returns uuid as $$
  select customer_id from public.users where user_id = public.current_user_id();
$$ language sql stable;

comment on function public.current_customer_id() is 
  'Returns the customer_id for the current user';

-- Check if current user is system admin
create or replace function public.is_system_admin()
returns boolean as $$
  select exists (
    select 1 from public.users u
    join public.roles r on u.role_id = r.role_id
    where u.user_id = public.current_user_id()
    and r.name = 'system_admin'
  );
$$ language sql stable;

comment on function public.is_system_admin() is 
  'Returns true if current user has system_admin role';

-- Check if user has specific permission
create or replace function public.has_permission(permission_name text)
returns boolean as $$
  select exists (
    select 1 from public.users u
    join public.roles r on u.role_id = r.role_id
    where u.user_id = public.current_user_id()
    and (
      r.permissions @> to_jsonb(array[permission_name])
      or r.permissions @> to_jsonb(array['*'])
    )
  );
$$ language sql stable;

comment on function public.has_permission(text) is 
  'Returns true if current user has the specified permission';

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert default permissions
insert into public.permissions (name, display_name, description) values
  ('*', 'All Permissions', 'Full system access'),
  ('customer:*', 'All Customer Permissions', 'Full access within customer'),
  ('customer:read', 'Read Customer Data', 'View customer data'),
  ('customer:write', 'Write Customer Data', 'Create and edit customer data'),
  ('customer:delete', 'Delete Customer Data', 'Delete customer data'),
  ('users:manage', 'Manage Users', 'Create, edit, and delete users'),
  ('help_articles:manage', 'Manage Help Articles', 'Create, edit, and delete help articles'),
  ('notifications:manage', 'Manage Notifications', 'Create and send notifications');

-- Insert default system roles
insert into public.roles (name, display_name, description, is_system_role, permissions) values
  ('system_admin', 'System Administrator', 'Full system access', true, '["*"]'::jsonb),
  ('customer_success', 'Customer Success', 'Full access within mapped customers', true, '["customer:*"]'::jsonb),
  ('customer_admin', 'Customer Admin', 'Full access within customer', true, '["customer:*"]'::jsonb),
  ('customer_user', 'Customer User', 'Standard user access', true, '["customer:read", "customer:write"]'::jsonb),
  ('customer_viewer', 'Customer Viewer', 'Read-only access', true, '["customer:read"]'::jsonb);

-- Insert default subscription type
insert into public.subscription_types (name, description, active, is_default, max_users, max_contacts) values
  ('free', 'Free tier with basic features', true, true, 3, 100);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Active customers with owner information
create view public.active_customers as
select 
  c.customer_id,
  c.name,
  c.email_domain,
  c.lifecycle_stage,
  st.name as subscription_type_name,
  owner.email as owner_email,
  owner.full_name as owner_name,
  c.created_at,
  c.onboarded_at
from public.customers c
left join public.subscription_types st on c.subscription_type_id = st.subscription_type_id
left join public.users owner on c.owner_id = owner.user_id
where c.active = true;

comment on view public.active_customers is 
  'Convenience view showing active customers with subscription type and owner details';

-- Active users with role information
create view public.active_users as
select 
  u.user_id,
  u.email,
  u.full_name,
  u.status,
  c.name as customer_name,
  c.customer_id,
  r.name as role_name,
  u.last_login_at,
  u.created_at
from public.users u
join public.customers c on u.customer_id = c.customer_id
left join public.roles r on u.role_id = r.role_id
where u.status = 'active';

comment on view public.active_users is 
  'Convenience view showing active users with customer and role details';

-- Extension data enriched view
create view public.extension_data_enriched as
select 
  ed.extension_data_id,
  ed.data_id,
  edt.table_being_extended,
  edt.name as field_name,
  edt.external_name as field_external_name,
  edt.field_type,
  edt.description as field_description,
  ed.value,
  ed.created_at,
  ed.updated_at
from public.extension_data ed
join public.extension_data_types edt 
  on ed.extension_data_type_id = edt.extension_data_type_id
where edt.is_active = true;

comment on view public.extension_data_enriched is 
  'Convenience view showing extension data with field type definitions. Use data_id and table_being_extended to join to the appropriate table (users or customers).';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================
-- Grant necessary permissions to authenticated and anon roles
-- Note: service_role already has superuser access

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant all privileges on all tables to service_role (for backend operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant select/insert/update/delete to authenticated users (RLS will control access)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant limited access to anon users (for public operations like registration)
GRANT SELECT, INSERT, UPDATE ON public.user_one_time_codes TO anon;
GRANT INSERT ON public.api_logs TO anon;
GRANT INSERT ON public.users TO anon;
GRANT SELECT ON public.roles TO anon;
GRANT SELECT ON public.subscription_types TO anon;

-- Make sure future tables also get these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================

