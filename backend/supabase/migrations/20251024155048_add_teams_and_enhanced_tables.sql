-- =============================================================================
-- Migration: Add Teams, Team Members, Customer Success Owned Customers, 
--            Enhanced Subscriptions, and Role Permissions Tables
-- Created: 2025-10-24
-- Author: Baseplate V2 Team
-- 
-- Description:
-- This migration adds the missing tables from the target Baseplate schema:
-- 1. teams - Team-based organization structure
-- 2. team_members - Junction table for users-to-teams many-to-many
-- 3. customer_success_owned_customers - Maps CS reps to customers they manage
-- 4. subscriptions - Enhanced Stripe subscription tracking (separate from customer_subscriptions)
-- 5. role_permissions - Junction table for role-permission many-to-many mapping
--
-- Dependencies:
-- - 00000000000000_initial_baseplate_schema.sql
--
-- Rollback:
-- To rollback, drop tables in reverse order of dependencies
-- =============================================================================

-- =============================================================================
-- NEW TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Teams Table
-- Purpose: Teams/departments within a customer organization
-- Replaces the direct manager concept with team-based structure
-- -----------------------------------------------------------------------------
create table public.teams (
  team_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  manager_id uuid,
  team_name text not null,
  description text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  -- Foreign keys
  constraint teams_customer_id_fkey 
    foreign key (customer_id) references public.customers(customer_id) 
    on delete cascade,
  constraint teams_manager_id_fkey 
    foreign key (manager_id) references public.users(user_id) 
    on delete set null,
    
  -- Constraints
  constraint teams_customer_team_name_unique 
    unique(customer_id, team_name)
);

comment on table public.teams is 
  'Teams/departments within customer organizations. Replaces direct manager concept.';
comment on column public.teams.manager_id is 
  'Team manager/lead user';
comment on column public.teams.is_primary is 
  'Indicates if this is the primary/default team for the customer';

-- -----------------------------------------------------------------------------
-- Team Members Table
-- Purpose: Junction table mapping users to teams (many-to-many)
-- -----------------------------------------------------------------------------
create table public.team_members (
  team_member_id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  -- Foreign keys
  constraint team_members_team_id_fkey 
    foreign key (team_id) references public.teams(team_id) 
    on delete cascade,
  constraint team_members_user_id_fkey 
    foreign key (user_id) references public.users(user_id) 
    on delete cascade,
    
  -- Unique constraint - a user can only be in a team once
  constraint team_members_team_user_unique 
    unique(team_id, user_id)
);

comment on table public.team_members is 
  'Junction table for users-to-teams many-to-many relationship';

-- -----------------------------------------------------------------------------
-- Customer Success Owned Customers Table
-- Purpose: Maps customer success representatives to customers they manage
-- Replaces the managers.manager_id -> customers.manager_id relationship
-- -----------------------------------------------------------------------------
create table public.customer_success_owned_customers (
  customer_success_owned_customer_id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  customer_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  -- Foreign keys
  constraint customer_success_owned_customers_user_id_fkey 
    foreign key (user_id) references public.users(user_id) 
    on delete cascade,
  constraint customer_success_owned_customers_customer_id_fkey 
    foreign key (customer_id) references public.customers(customer_id) 
    on delete cascade,
    
  -- Unique constraint - a CS rep can only be assigned to a customer once
  constraint customer_success_owned_customers_unique 
    unique(user_id, customer_id)
);

comment on table public.customer_success_owned_customers is 
  'Maps customer success representatives to customers they manage. Enables CS reps to access multiple customer accounts.';

-- -----------------------------------------------------------------------------
-- Subscriptions Table
-- Purpose: Enhanced Stripe subscription tracking (separate from subscription_types)
-- Stores full Stripe subscription details with metadata and raw data
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  subscription_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  stripe_subscription_id text unique not null,
  stripe_status StripeSubscriptionStatus not null,
  currency text,
  description text,
  collection_method text, -- 'charge_automatically' or 'send_invoice'
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  default_payment_method text,
  latest_invoice text,
  stripe_metadata jsonb,
  stripe_raw_data jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  -- Foreign keys
  constraint subscriptions_customer_id_fkey 
    foreign key (customer_id) references public.customers(customer_id) 
    on delete cascade
);

comment on table public.subscriptions is 
  'Enhanced Stripe subscription tracking with full metadata. Synced from Stripe webhooks.';
comment on column public.subscriptions.stripe_raw_data is 
  'Full Stripe subscription object for reference';
comment on column public.subscriptions.stripe_metadata is 
  'Stripe subscription metadata';

-- -----------------------------------------------------------------------------
-- Role Permissions Table
-- Purpose: Junction table for role-permission many-to-many mapping
-- Replaces the JSONB array in roles.permissions
-- -----------------------------------------------------------------------------
create table public.role_permissions (
  role_id uuid not null,
  permission_id uuid not null,
  created_at timestamptz not null default now(),
  
  -- Composite primary key
  primary key (role_id, permission_id),
  
  -- Foreign keys
  constraint role_permissions_role_id_fkey 
    foreign key (role_id) references public.roles(role_id) 
    on delete cascade,
  constraint role_permissions_permission_id_fkey 
    foreign key (permission_id) references public.permissions(permission_id) 
    on delete cascade
);

comment on table public.role_permissions is 
  'Junction table for many-to-many role-permission mapping. Replaces JSONB permissions array.';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Teams indexes
create index idx_teams_customer_id on public.teams(customer_id);
create index idx_teams_manager_id on public.teams(manager_id);
create index idx_teams_is_primary on public.teams(customer_id, is_primary) where is_primary = true;

-- Team members indexes
create index idx_team_members_team_id on public.team_members(team_id);
create index idx_team_members_user_id on public.team_members(user_id);

-- Customer success owned customers indexes
create index idx_cs_owned_customers_user_id on public.customer_success_owned_customers(user_id);
create index idx_cs_owned_customers_customer_id on public.customer_success_owned_customers(customer_id);

-- Subscriptions indexes
create index idx_subscriptions_customer_id on public.subscriptions(customer_id);
create index idx_subscriptions_stripe_subscription_id on public.subscriptions(stripe_subscription_id);
create index idx_subscriptions_stripe_status on public.subscriptions(stripe_status);
create index idx_subscriptions_current_period_end on public.subscriptions(current_period_end);
create index idx_subscriptions_last_synced_at on public.subscriptions(last_synced_at);

-- Role permissions indexes (covered by primary key)

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Teams
create trigger update_teams_updated_at
  before update on public.teams
  for each row execute function public.update_updated_at_column();

-- Team members
create trigger update_team_members_updated_at
  before update on public.team_members
  for each row execute function public.update_updated_at_column();

-- Customer success owned customers
create trigger update_customer_success_owned_customers_updated_at
  before update on public.customer_success_owned_customers
  for each row execute function public.update_updated_at_column();

-- Subscriptions
create trigger update_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all new tables
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.customer_success_owned_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.role_permissions enable row level security;

-- =============================================================================
-- RLS POLICIES - Teams
-- =============================================================================

-- System Admin: Full access
create policy teams_select_system_admin on public.teams
  for select to authenticated
  using ((SELECT public.has_role('system_admin')));

create policy teams_insert_system_admin on public.teams
  for insert to authenticated
  with check ((SELECT public.has_role('system_admin')));

create policy teams_update_system_admin on public.teams
  for update to authenticated
  using ((SELECT public.has_role('system_admin')));

create policy teams_delete_system_admin on public.teams
  for delete to authenticated
  using ((SELECT public.has_role('system_admin')));

-- Customer Success: Access to assigned customers
create policy teams_select_customer_success on public.teams
  for select to authenticated
  using (
    customer_id in (select public.get_accessible_customer_ids())
  );

create policy teams_insert_customer_success on public.teams
  for insert to authenticated
  with check (
    customer_id in (select public.get_accessible_customer_ids())
  );

create policy teams_update_customer_success on public.teams
  for update to authenticated
  using (
    customer_id in (select public.get_accessible_customer_ids())
  );

create policy teams_delete_customer_success on public.teams
  for delete to authenticated
  using (
    customer_id in (select public.get_accessible_customer_ids())
  );

-- Customer Admin: Access to own customer
create policy teams_select_customer_admin on public.teams
  for select to authenticated
  using (
    (SELECT public.has_role('customer_admin')) and 
    customer_id = public.current_customer_id()
  );

create policy teams_insert_customer_admin on public.teams
  for insert to authenticated
  with check (
    (SELECT public.has_role('customer_admin')) and 
    customer_id = public.current_customer_id()
  );

create policy teams_update_customer_admin on public.teams
  for update to authenticated
  using (
    (SELECT public.has_role('customer_admin')) and 
    customer_id = public.current_customer_id()
  );

create policy teams_delete_customer_admin on public.teams
  for delete to authenticated
  using (
    (SELECT public.has_role('customer_admin')) and 
    customer_id = public.current_customer_id()
  );

-- =============================================================================
-- RLS POLICIES - Team Members
-- =============================================================================

-- System Admin: Full access
create policy team_members_select_system_admin on public.team_members
  for select to authenticated
  using ((SELECT public.has_role('system_admin')));

create policy team_members_insert_system_admin on public.team_members
  for insert to authenticated
  with check ((SELECT public.has_role('system_admin')));

create policy team_members_update_system_admin on public.team_members
  for update to authenticated
  using ((SELECT public.has_role('system_admin')));

create policy team_members_delete_system_admin on public.team_members
  for delete to authenticated
  using ((SELECT public.has_role('system_admin')));

-- Customer Success: Access via team's customer
create policy team_members_select_customer_success on public.team_members
  for select to authenticated
  using (
    team_id in (
      select team_id from public.teams 
      where customer_id in (select public.get_accessible_customer_ids())
    )
  );

create policy team_members_insert_customer_success on public.team_members
  for insert to authenticated
  with check (
    team_id in (
      select team_id from public.teams 
      where customer_id in (select public.get_accessible_customer_ids())
    )
  );

create policy team_members_update_customer_success on public.team_members
  for update to authenticated
  using (
    team_id in (
      select team_id from public.teams 
      where customer_id in (select public.get_accessible_customer_ids())
    )
  );

create policy team_members_delete_customer_success on public.team_members
  for delete to authenticated
  using (
    team_id in (
      select team_id from public.teams 
      where customer_id in (select public.get_accessible_customer_ids())
    )
  );

-- Customer Admin: Access via team's customer
create policy team_members_select_customer_admin on public.team_members
  for select to authenticated
  using (
    (SELECT public.has_role('customer_admin')) and
    team_id in (
      select team_id from public.teams 
      where customer_id = public.current_customer_id()
    )
  );

create policy team_members_insert_customer_admin on public.team_members
  for insert to authenticated
  with check (
    (SELECT public.has_role('customer_admin')) and
    team_id in (
      select team_id from public.teams 
      where customer_id = public.current_customer_id()
    )
  );

create policy team_members_update_customer_admin on public.team_members
  for update to authenticated
  using (
    (SELECT public.has_role('customer_admin')) and
    team_id in (
      select team_id from public.teams 
      where customer_id = public.current_customer_id()
    )
  );

create policy team_members_delete_customer_admin on public.team_members
  for delete to authenticated
  using (
    (SELECT public.has_role('customer_admin')) and
    team_id in (
      select team_id from public.teams 
      where customer_id = public.current_customer_id()
    )
  );

-- Regular users: View their own team memberships
create policy team_members_select_self on public.team_members
  for select to authenticated
  using (
    user_id = public.current_user_id()
  );

-- =============================================================================
-- RLS POLICIES - Customer Success Owned Customers
-- =============================================================================

-- System Admin: Full access
create policy cs_owned_customers_select_system_admin on public.customer_success_owned_customers
  for select to authenticated
  using ((SELECT public.has_role('system_admin')));

create policy cs_owned_customers_insert_system_admin on public.customer_success_owned_customers
  for insert to authenticated
  with check ((SELECT public.has_role('system_admin')));

create policy cs_owned_customers_update_system_admin on public.customer_success_owned_customers
  for update to authenticated
  using ((SELECT public.has_role('system_admin')));

create policy cs_owned_customers_delete_system_admin on public.customer_success_owned_customers
  for delete to authenticated
  using ((SELECT public.has_role('system_admin')));

-- Customer Success: View their own assignments
create policy cs_owned_customers_select_self on public.customer_success_owned_customers
  for select to authenticated
  using (
    (SELECT public.has_system_role('customer_success')) and
    user_id = public.current_user_id()
  );

-- =============================================================================
-- RLS POLICIES - Subscriptions
-- =============================================================================

-- System Admin: Full access
create policy subscriptions_select_system_admin on public.subscriptions
  for select to authenticated
  using ((SELECT public.has_role('system_admin')));

create policy subscriptions_insert_system_admin on public.subscriptions
  for insert to authenticated
  with check ((SELECT public.has_role('system_admin')));

create policy subscriptions_update_system_admin on public.subscriptions
  for update to authenticated
  using ((SELECT public.has_role('system_admin')));

create policy subscriptions_delete_system_admin on public.subscriptions
  for delete to authenticated
  using ((SELECT public.has_role('system_admin')));

-- Customer Success: Access to assigned customers
create policy subscriptions_select_customer_success on public.subscriptions
  for select to authenticated
  using (
    customer_id in (select public.get_accessible_customer_ids())
  );

create policy subscriptions_insert_customer_success on public.subscriptions
  for insert to authenticated
  with check (
    customer_id in (select public.get_accessible_customer_ids())
  );

create policy subscriptions_update_customer_success on public.subscriptions
  for update to authenticated
  using (
    customer_id in (select public.get_accessible_customer_ids())
  );

create policy subscriptions_delete_customer_success on public.subscriptions
  for delete to authenticated
  using (
    customer_id in (select public.get_accessible_customer_ids())
  );

-- Customer Admin: View own customer's subscriptions
create policy subscriptions_select_customer_admin on public.subscriptions
  for select to authenticated
  using (
    (SELECT public.has_role('customer_admin')) and 
    customer_id = public.current_customer_id()
  );

-- =============================================================================
-- RLS POLICIES - Role Permissions
-- =============================================================================

-- All authenticated users can view role permissions
create policy role_permissions_select_all on public.role_permissions
  for select to authenticated
  using (true);

-- System Admin: Full management
create policy role_permissions_insert_system_admin on public.role_permissions
  for insert to authenticated
  with check ((SELECT public.has_role('system_admin')));

create policy role_permissions_delete_system_admin on public.role_permissions
  for delete to authenticated
  using ((SELECT public.has_role('system_admin')));

-- =============================================================================
-- HELPER FUNCTION UPDATES
-- =============================================================================

-- Update get_accessible_customer_ids to include customer_success_owned_customers
create or replace function public.get_accessible_customer_ids()
returns table(customer_id uuid)
language plpgsql
security definer
stable
as $$
begin
  -- System admins can access all customers
  if (SELECT public.has_role('system_admin')) then
    return query select c.customer_id from public.customers c;
  end if;

  -- Customer success can access customers they own via customer_success_owned_customers
  if (SELECT public.has_system_role('customer_success')) then
    return query 
      select csoc.customer_id 
      from public.customer_success_owned_customers csoc
      where csoc.user_id = public.current_user_id();
  end if;

  -- Regular users can only access their own customer
  return query 
    select u.customer_id 
    from public.users u 
    where u.user_id = public.current_user_id() 
      and u.customer_id is not null;
end;
$$;

comment on function public.get_accessible_customer_ids() is 
  'Returns customer IDs that the current user can access. Updated to use customer_success_owned_customers table.';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify tables created
do $$
declare
  table_count int;
begin
  select count(*) into table_count
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('teams', 'team_members', 'customer_success_owned_customers', 
                       'subscriptions', 'role_permissions');
  
  if table_count = 5 then
    raise notice '✅ All 5 new tables created successfully';
  else
    raise warning '⚠️ Expected 5 tables but found %', table_count;
  end if;
end $$;

-- Verify RLS enabled
do $$
declare
  rls_count int;
begin
  select count(*) into rls_count
  from pg_tables
  where schemaname = 'public'
    and tablename in ('teams', 'team_members', 'customer_success_owned_customers', 
                      'subscriptions', 'role_permissions')
    and rowsecurity = true;
  
  if rls_count = 5 then
    raise notice '✅ RLS enabled on all 5 new tables';
  else
    raise warning '⚠️ Expected RLS on 5 tables but found %', rls_count;
  end if;
end $$;

-- Verify indexes created
do $$
declare
  index_count int;
begin
  select count(*) into index_count
  from pg_indexes
  where schemaname = 'public'
    and tablename in ('teams', 'team_members', 'customer_success_owned_customers', 
                      'subscriptions', 'role_permissions')
    and indexname like 'idx_%';
  
  if index_count >= 12 then
    raise notice '✅ All indexes created (found %)', index_count;
  else
    raise warning '⚠️ Expected at least 12 indexes but found %', index_count;
  end if;
end $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================


