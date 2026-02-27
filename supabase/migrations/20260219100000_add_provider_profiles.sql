-- =============================================================================
-- LLM Management: Add provider profiles
-- =============================================================================
-- Per-feature model presets keyed by name (typically feature_slug).
-- Simple mutable table — to change a model, UPDATE the row.
-- Jobs store the resolved model directly for fast reads at processing time.
-- =============================================================================

-- Table: llm_provider_profiles
create table public.llm_provider_profiles (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.llm_providers(id),
  name varchar(50) not null,
  model varchar(100) not null,
  config jsonb not null default '{}',
  created_at timestamptz(6) not null default current_timestamp,

  constraint uq_provider_profiles_name unique (provider_id, name)
);

comment on table public.llm_provider_profiles is
  'Per-feature model presets. Name is typically a feature_slug or "default".';

-- Lookup index for profile resolution
create index idx_llm_provider_profiles_lookup
  on public.llm_provider_profiles (provider_id, name);

-- =============================================================================
-- RLS Policies
-- =============================================================================

alter table public.llm_provider_profiles enable row level security;

create policy llm_provider_profiles_select_authenticated
  on public.llm_provider_profiles
  for select to authenticated
  using (true);

create policy llm_provider_profiles_insert_system_admin
  on public.llm_provider_profiles
  for insert to authenticated
  with check (public.is_system_admin());

create policy llm_provider_profiles_update_system_admin
  on public.llm_provider_profiles
  for update to authenticated
  using (public.is_system_admin());

-- =============================================================================
-- Add provider_profile_id and model to llm_jobs
-- =============================================================================

alter table public.llm_jobs
  add column provider_profile_id uuid references public.llm_provider_profiles(id),
  add column model varchar(100);

-- =============================================================================
-- Seed Data: Provider default profiles
-- =============================================================================

insert into public.llm_provider_profiles (provider_id, name, model)
values
  ((select id from public.llm_providers where slug = 'openai'),    'default', 'gpt-4o'),
  ((select id from public.llm_providers where slug = 'anthropic'), 'default', 'claude-sonnet-4-20250514'),
  ((select id from public.llm_providers where slug = 'gemini'),    'default', 'gemini-2.0-flash');
