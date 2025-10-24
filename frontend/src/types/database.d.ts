/**
 * Database Types for Frontend
 * Matches the unified Baseplate database structure (UUID-based schema)
 */

// ============================================================================
// ENUMS
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

// ============================================================================
// NEW TABLE TYPES
// ============================================================================

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
  stripe_metadata?: Record<string, any>;
  stripe_raw_data?: Record<string, any>;
  last_synced_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

// ============================================================================
// WITH RELATIONS TYPES
// ============================================================================

export interface TeamWithRelations extends Team {
  customer?: {
    customer_id: string;
    name: string;
  };
  manager?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  team_members?: TeamMember[];
}

export interface TeamMemberWithRelations extends TeamMember {
  team?: Team;
  user?: {
    user_id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
}

export interface CustomerSuccessOwnedCustomerWithRelations extends CustomerSuccessOwnedCustomer {
  user?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  customer?: {
    customer_id: string;
    name: string;
    email_domain?: string | null;
  };
}

export interface SubscriptionWithRelations extends Subscription {
  customer?: {
    customer_id: string;
    name: string;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

// ============================================================================
// INPUT TYPES (for creating/updating records)
// ============================================================================

export type CreateTeamInput = Omit<Team, 'team_id' | 'created_at' | 'updated_at'>;
export type UpdateTeamInput = Partial<CreateTeamInput>;

export type CreateTeamMemberInput = Omit<TeamMember, 'team_member_id' | 'created_at' | 'updated_at'>;
export type UpdateTeamMemberInput = Partial<CreateTeamMemberInput>;

export type CreateCustomerSuccessOwnedCustomerInput = Omit<
  CustomerSuccessOwnedCustomer,
  'customer_success_owned_customer_id' | 'created_at' | 'updated_at'
>;
export type UpdateCustomerSuccessOwnedCustomerInput = Partial<CreateCustomerSuccessOwnedCustomerInput>;

export type CreateSubscriptionInput = Omit<Subscription, 'subscription_id' | 'created_at' | 'updated_at'>;
export type UpdateSubscriptionInput = Partial<CreateSubscriptionInput>;

export type CreateRolePermissionInput = Omit<RolePermission, 'created_at'>;

