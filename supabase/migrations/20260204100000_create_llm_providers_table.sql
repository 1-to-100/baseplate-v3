-- =============================================================================
-- LLM Management: Create llm_providers table
-- =============================================================================
-- Stores LLM provider configurations including timeout and retry settings.
-- Part of the LLM Query Wrapper feature.
-- =============================================================================

-- Enable pg_cron extension for scheduled jobs (rate limit resets, cleanup, watchdog)
create extension if not exists pg_cron;

-- Table: llm_providers
-- Stores LLM provider configurations with timeout and retry settings
create table public.llm_providers (
  id uuid primary key default gen_random_uuid(),
  slug varchar(50) not null unique,
  name varchar(100) not null,
  is_active boolean not null default true,
  timeout_seconds int not null default 600,
  max_retries int not null default 1,
  retry_delay_seconds int not null default 60,
  config jsonb not null default '{}',
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp
);

comment on table public.llm_providers is
  'Stores LLM provider configurations for the job queue system';

comment on column public.llm_providers.id is
  'Primary key identifier';

comment on column public.llm_providers.slug is
  'Unique identifier used in code (e.g., openai, anthropic)';

comment on column public.llm_providers.name is
  'Human-readable provider name';

comment on column public.llm_providers.is_active is
  'Whether this provider is available for use';

comment on column public.llm_providers.timeout_seconds is
  'How long to wait for a response before considering the job stuck';

comment on column public.llm_providers.max_retries is
  'Maximum number of retry attempts for stuck jobs';

comment on column public.llm_providers.retry_delay_seconds is
  'Delay between retry attempts';

comment on column public.llm_providers.config is
  'Provider-specific configuration (models, endpoints, etc.)';

-- Index for active provider lookups
create index idx_llm_providers_active on public.llm_providers(is_active) where is_active = true;

-- Trigger for updated_at
create trigger llm_providers_updated_at
  before update on public.llm_providers
  for each row
  execute function public.update_updated_at_column();

-- =============================================================================
-- Seed Data: Default LLM Providers
-- =============================================================================

insert into public.llm_providers (slug, name, timeout_seconds, max_retries, retry_delay_seconds, config)
values
  (
    'openai',
    'OpenAI',
    600,  -- 10 minutes
    1,
    60,
    '{
      "default_model": "gpt-4o",
      "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
      "supports_background": true,
      "supports_streaming": true
    }'::jsonb
  ),
  (
    'anthropic',
    'Anthropic',
    900,  -- 15 minutes (Claude can be slower)
    2,
    60,
    '{
      "default_model": "claude-sonnet-4-20250514",
      "models": ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
      "supports_background": true,
      "supports_streaming": true
    }'::jsonb
  ),
  (
    'gemini',
    'Google Gemini',
    600,
    1,
    60,
    '{
      "default_model": "gemini-1.5-pro",
      "models": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-exp"],
      "supports_background": false,
      "supports_streaming": true
    }'::jsonb
  );

-- =============================================================================
-- RLS Policies
-- =============================================================================
-- Providers are system configuration, readable by all authenticated users.
-- Only system admins can modify providers.

alter table public.llm_providers enable row level security;

create policy llm_providers_select_authenticated
  on public.llm_providers
  for select to authenticated
  using (true);

create policy llm_providers_insert_system_admin
  on public.llm_providers
  for insert to authenticated
  with check (public.is_system_admin());

create policy llm_providers_update_system_admin
  on public.llm_providers
  for update to authenticated
  using (public.is_system_admin())
  with check (public.is_system_admin());

create policy llm_providers_delete_system_admin
  on public.llm_providers
  for delete to authenticated
  using (public.is_system_admin());
