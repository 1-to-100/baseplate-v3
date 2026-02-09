-- =============================================================================
-- LLM Management: Create llm_rate_limits table
-- =============================================================================
-- Rate limiting for LLM queries with atomic increment to prevent race conditions.
-- Part of the LLM Query Wrapper feature.
-- =============================================================================

-- Table: llm_rate_limits
-- Tracks LLM usage quotas per customer with atomic increment
create table public.llm_rate_limits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id) on delete cascade,
  period varchar(20) not null default 'monthly',  -- hourly, daily, monthly
  quota int not null,
  used int not null default 0,
  period_start timestamptz(6) not null default current_timestamp,
  reset_at timestamptz(6),  -- When this period resets
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp,

  -- One rate limit record per customer per period type
  constraint llm_rate_limits_customer_period unique (customer_id, period),

  -- Valid periods
  constraint llm_rate_limits_valid_period check (period in ('hourly', 'daily', 'monthly')),

  -- Used cannot exceed quota (enforced at increment, but safety check)
  constraint llm_rate_limits_used_not_negative check (used >= 0)
);

comment on table public.llm_rate_limits is
  'Tracks LLM usage quotas per customer with atomic increment';

comment on column public.llm_rate_limits.customer_id is
  'Customer this rate limit applies to';

comment on column public.llm_rate_limits.period is
  'Rate limit period: hourly, daily, or monthly';

comment on column public.llm_rate_limits.quota is
  'Maximum allowed requests in this period';

comment on column public.llm_rate_limits.used is
  'Number of requests used in this period';

comment on column public.llm_rate_limits.period_start is
  'When the current period started';

comment on column public.llm_rate_limits.reset_at is
  'When this period will reset';

-- Index for customer lookups
create index idx_llm_rate_limits_customer on public.llm_rate_limits(customer_id);

-- Index for reset job
create index idx_llm_rate_limits_reset on public.llm_rate_limits(period, reset_at)
  where reset_at is not null;

-- Trigger for updated_at
create trigger llm_rate_limits_updated_at
  before update on public.llm_rate_limits
  for each row
  execute function public.update_updated_at_column();

-- =============================================================================
-- Function: llm_increment_rate_limit
-- =============================================================================
-- Atomically checks and increments the rate limit counter.
-- If no rate limit record exists, creates one with the default quota.
-- Returns the updated record if quota available, NULL if exceeded.
--
-- Uses SECURITY DEFINER to allow authenticated users to call this function
-- even though they don't have direct INSERT/UPDATE access to the table.
-- This is the Supabase-recommended pattern for controlled privilege escalation.
-- =============================================================================
create or replace function public.llm_increment_rate_limit(
  p_customer_id uuid,
  p_period varchar(20) default 'monthly',
  p_default_quota int default 1000
)
returns public.llm_rate_limits
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.llm_rate_limits;
  next_reset timestamptz;
begin
  -- Calculate next reset time based on period
  case p_period
    when 'hourly' then
      next_reset := date_trunc('hour', current_timestamp) + interval '1 hour';
    when 'daily' then
      next_reset := date_trunc('day', current_timestamp) + interval '1 day';
    when 'monthly' then
      next_reset := date_trunc('month', current_timestamp) + interval '1 month';
    else
      raise exception 'Invalid period: %', p_period;
  end case;

  -- Try to increment existing record
  update public.llm_rate_limits
  set
    used = used + 1,
    updated_at = current_timestamp
  where customer_id = p_customer_id
    and period = p_period
    and used < quota
  returning * into result;

  -- If we got a result, we're done
  if result is not null then
    return result;
  end if;

  -- No update happened. Either:
  -- 1. No record exists for this customer/period
  -- 2. Record exists but quota is exceeded

  -- Check if a record exists
  select * into result
  from public.llm_rate_limits
  where customer_id = p_customer_id
    and period = p_period;

  if result is not null then
    -- Record exists but quota exceeded - return NULL to signal this
    return null;
  end if;

  -- No record exists - create one with default quota
  -- Use ON CONFLICT to handle race condition where another request
  -- creates the record between our SELECT and INSERT
  insert into public.llm_rate_limits
    (customer_id, period, quota, used, reset_at)
  values
    (p_customer_id, p_period, p_default_quota, 1, next_reset)
  on conflict (customer_id, period)
  do update set
    used = llm_rate_limits.used + 1,
    updated_at = current_timestamp
  where llm_rate_limits.used < llm_rate_limits.quota
  returning * into result;

  return result;
end;
$$;

comment on function public.llm_increment_rate_limit(uuid, varchar, int) is
  'Atomically increments rate limit counter, creating record if needed. Returns NULL if quota exceeded.';

-- Grant execute to authenticated users (SECURITY DEFINER handles the actual permissions)
grant execute on function public.llm_increment_rate_limit(uuid, varchar, int) to authenticated;

-- =============================================================================
-- Function: llm_check_rate_limit
-- =============================================================================
-- Checks rate limit status without incrementing.
-- Returns quota info for UI display.
-- =============================================================================
create or replace function public.llm_check_rate_limit(
  p_customer_id uuid,
  p_period varchar(20) default 'monthly'
)
returns table (
  quota int,
  used int,
  remaining int,
  is_exceeded boolean,
  reset_at timestamptz
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    r.quota,
    r.used,
    greatest(0, r.quota - r.used) as remaining,
    r.used >= r.quota as is_exceeded,
    r.reset_at
  from public.llm_rate_limits r
  where r.customer_id = p_customer_id
    and r.period = p_period;
end;
$$;

comment on function public.llm_check_rate_limit(uuid, varchar) is
  'Checks rate limit status without incrementing. For UI display.';

-- Grant execute to authenticated users
grant execute on function public.llm_check_rate_limit(uuid, varchar) to authenticated;

-- =============================================================================
-- Function: llm_reset_rate_limits
-- =============================================================================
-- Resets rate limits for a given period. Called by pg_cron.
-- =============================================================================
create or replace function public.llm_reset_rate_limits(p_period varchar(20))
returns int
language plpgsql
security definer
as $$
declare
  reset_count int;
begin
  update public.llm_rate_limits
  set
    used = 0,
    period_start = current_timestamp,
    reset_at = case p_period
      when 'hourly' then current_timestamp + interval '1 hour'
      when 'daily' then current_timestamp + interval '1 day'
      when 'monthly' then date_trunc('month', current_timestamp) + interval '1 month'
    end,
    updated_at = current_timestamp
  where period = p_period
    and (reset_at is null or reset_at <= current_timestamp);

  get diagnostics reset_count = row_count;
  return reset_count;
end;
$$;

comment on function public.llm_reset_rate_limits(varchar) is
  'Resets rate limits for a given period. Called by pg_cron scheduler.';

-- =============================================================================
-- pg_cron: Schedule rate limit resets
-- =============================================================================
-- Note: pg_cron must be enabled in Supabase dashboard
-- These schedules reset rate limits at appropriate intervals

-- Hourly reset: every hour at minute 0
select cron.schedule(
  'llm-reset-hourly-limits',
  '0 * * * *',
  $$select public.llm_reset_rate_limits('hourly')$$
);

-- Daily reset: every day at midnight UTC
select cron.schedule(
  'llm-reset-daily-limits',
  '0 0 * * *',
  $$select public.llm_reset_rate_limits('daily')$$
);

-- Monthly reset: first day of each month at midnight UTC
select cron.schedule(
  'llm-reset-monthly-limits',
  '0 0 1 * *',
  $$select public.llm_reset_rate_limits('monthly')$$
);

-- =============================================================================
-- RLS Policies
-- =============================================================================
-- Rate limits are customer-scoped. Users can view their own limits.
-- Only system admins can directly modify rate limits (via UI).
-- The SECURITY DEFINER functions handle increment/reset operations.

alter table public.llm_rate_limits enable row level security;

create policy llm_rate_limits_select_own
  on public.llm_rate_limits
  for select to authenticated
  using (public.can_access_customer(customer_id));

create policy llm_rate_limits_insert_system_admin
  on public.llm_rate_limits
  for insert to authenticated
  with check (public.is_system_admin());

create policy llm_rate_limits_update_system_admin
  on public.llm_rate_limits
  for update to authenticated
  using (public.is_system_admin())
  with check (public.is_system_admin());

create policy llm_rate_limits_delete_system_admin
  on public.llm_rate_limits
  for delete to authenticated
  using (public.is_system_admin());
