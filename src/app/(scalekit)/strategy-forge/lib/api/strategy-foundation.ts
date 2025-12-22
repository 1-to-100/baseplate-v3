import { createClient } from "@/lib/supabase/client";
import type {
  CompanyStrategy,
  StrategyPrinciple,
  StrategyValue,
  Competitor,
  CompetitorSignal,
  StrategyChangeLog,
  OptionPublicationStatus,
  OptionCompetitorStatus,
  OptionCompetitorSignalType,
  OptionDataSource,
  OptionStrategyChangeType,
  StrategyWorkspaceData,
} from "../types";
import {
  createCompanyStrategyInputSchema,
  updateCompanyStrategyInputSchema,
  createStrategyPrincipleInputSchema,
  updateStrategyPrincipleInputSchema,
  createStrategyValueInputSchema,
  updateStrategyValueInputSchema,
  createCompetitorInputSchema,
  updateCompetitorInputSchema,
  createCompetitorSignalInputSchema,
  updateCompetitorSignalInputSchema,
  createStrategyChangeLogInputSchema,
  createOptionInputSchema,
  updateOptionInputSchema,
  type CreateCompanyStrategyInput,
  type UpdateCompanyStrategyInput,
  type CreateStrategyPrincipleInput,
  type UpdateStrategyPrincipleInput,
  type CreateStrategyValueInput,
  type UpdateStrategyValueInput,
  type CreateCompetitorInput,
  type UpdateCompetitorInput,
  type CreateCompetitorSignalInput,
  type UpdateCompetitorSignalInput,
  type CreateStrategyChangeLogInput,
  type CreateOptionInput,
  type UpdateOptionInput,
} from "../schemas/strategy-foundation";

type Nullable<T> = T | null | undefined;

interface SupabaseContext {
  supabase: ReturnType<typeof createClient>;
  customerId: string;
  authUserId: string;
  userId: string;
}

export interface SupabaseContextOptions {
  customerId?: string;
}

export interface CompetitorListParams {
  search?: string;
  statusId?: string;
  sourceId?: string;
  limit?: number;
  offset?: number;
}

export interface StrategyChangeLogListParams {
  limit?: number;
  offset?: number;
}

const normalizeNullable = <T>(value: Nullable<T>): T | null =>
  value === undefined ? null : (value ?? null);

async function getSupabaseContext(
  options?: SupabaseContextOptions
): Promise<SupabaseContext> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    throw new Error(`Failed to resolve authenticated user: ${authError.message}`);
  }
  if (!user) {
    throw new Error("User not authenticated");
  }

  const [{ data: userRow, error: userRowError }] = await Promise.all([
    supabase
      .from("users")
      .select("user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
  ]);

  const customerIdResult =
    options?.customerId !== undefined
      ? { data: options.customerId, error: null }
      : await supabase.rpc("current_customer_id");

  if (customerIdResult.error || !customerIdResult.data) {
    throw new Error(
      `Unable to resolve current customer id: ${customerIdResult.error?.message ?? "not available"}`
    );
  }

  if (userRowError || !userRow?.user_id) {
    throw new Error(
      `Unable to resolve application user id: ${userRowError?.message ?? "user record not found"}`
    );
  }

  return {
    supabase,
    customerId: customerIdResult.data,
    authUserId: user.id,
    userId: userRow.user_id,
  };
}

async function assertSystemAdmin(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { data, error } = await supabase.rpc("is_system_admin");
  if (error) {
    throw new Error(`Unable to verify system administrator privileges: ${error.message}`);
  }
  if (!data) {
    throw new Error("Operation requires system administrator privileges.");
  }
}

export async function getCompanyStrategy(
  options?: SupabaseContextOptions
): Promise<CompanyStrategy | null> {
  const { supabase, customerId } = await getSupabaseContext(options);
  const { data, error } = await supabase
    .from("company_strategies")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch company strategy: ${error.message}`);
  }

  return data ?? null;
}

export async function getCompanyStrategyById(strategyId: string): Promise<CompanyStrategy> {
  const { supabase, customerId } = await getSupabaseContext();
  const { data, error } = await supabase
    .from("company_strategies")
    .select("*")
    .eq("strategy_id", strategyId)
    .eq("customer_id", customerId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch company strategy ${strategyId}: ${error.message}`);
  }

  return data;
}

export async function createCompanyStrategy(
  input: CreateCompanyStrategyInput
): Promise<CompanyStrategy> {
  const payload = createCompanyStrategyInputSchema.parse(input);
  const { supabase, customerId, userId } = await getSupabaseContext();

  const insertPayload: Record<string, unknown> = {
    mission: payload.mission,
    mission_description: normalizeNullable(payload.mission_description),
    vision: payload.vision,
    vision_description: normalizeNullable(payload.vision_description),
    publication_status_id: payload.publication_status_id,
    owner_user_id: normalizeNullable(payload.owner_user_id),
    is_published: payload.is_published ?? false,
    effective_at: normalizeNullable(payload.effective_at),
    customer_id: customerId,
    created_by_user_id: userId,
    updated_by_user_id: userId,
  };

  if (payload.strategy_id) {
    insertPayload.strategy_id = payload.strategy_id;
  }

  const { data, error } = await supabase
    .from("company_strategies")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create company strategy: ${error.message}`);
  }

  return data as CompanyStrategy;
}

export async function updateCompanyStrategy(
  strategyId: string,
  input: UpdateCompanyStrategyInput
): Promise<CompanyStrategy> {
  const payload = updateCompanyStrategyInputSchema.parse(input);
  const { supabase, customerId, userId } = await getSupabaseContext();

  const updatePayload: Record<string, unknown> = {
    updated_by_user_id: userId,
  };

  if (payload.mission !== undefined) updatePayload.mission = payload.mission;
  if (payload.mission_description !== undefined)
    updatePayload.mission_description = normalizeNullable(payload.mission_description);
  if (payload.vision !== undefined) updatePayload.vision = payload.vision;
  if (payload.vision_description !== undefined)
    updatePayload.vision_description = normalizeNullable(payload.vision_description);
  if (payload.publication_status_id !== undefined)
    updatePayload.publication_status_id = payload.publication_status_id;
  if (payload.owner_user_id !== undefined)
    updatePayload.owner_user_id = normalizeNullable(payload.owner_user_id);
  if (payload.is_published !== undefined) updatePayload.is_published = payload.is_published;
  if (payload.effective_at !== undefined)
    updatePayload.effective_at = normalizeNullable(payload.effective_at);

  const { data, error } = await supabase
    .from("company_strategies")
    .update(updatePayload)
    .eq("strategy_id", strategyId)
    .eq("customer_id", customerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update company strategy: ${error.message}`);
  }

  return data as CompanyStrategy;
}

export async function deleteCompanyStrategy(strategyId: string): Promise<void> {
  const { supabase, customerId } = await getSupabaseContext();
  const { error } = await supabase
    .from("company_strategies")
    .delete()
    .eq("strategy_id", strategyId)
    .eq("customer_id", customerId);

  if (error) {
    throw new Error(`Failed to delete company strategy: ${error.message}`);
  }
}

export async function listStrategyPrinciples(strategyId: string): Promise<StrategyPrinciple[]> {
  const { supabase } = await getSupabaseContext();
  const { data, error } = await supabase
    .from("strategy_principles")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch strategy principles: ${error.message}`);
  }

  return data ?? [];
}

export async function createStrategyPrinciple(
  input: CreateStrategyPrincipleInput
): Promise<StrategyPrinciple> {
  const payload = createStrategyPrincipleInputSchema.parse(input);
  const { supabase, userId } = await getSupabaseContext();

  const insertPayload = {
    strategy_id: payload.strategy_id,
    name: payload.name,
    description: normalizeNullable(payload.description),
    order_index: payload.order_index ?? 0,
    is_active: payload.is_active ?? true,
    created_by_user_id: userId,
    updated_by_user_id: userId,
  };

  const { data, error } = await supabase
    .from("strategy_principles")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create strategy principle: ${error.message}`);
  }

  return data as StrategyPrinciple;
}

export async function updateStrategyPrinciple(
  principleId: string,
  input: UpdateStrategyPrincipleInput
): Promise<StrategyPrinciple> {
  const payload = updateStrategyPrincipleInputSchema.parse(input);
  const { supabase, userId } = await getSupabaseContext();

  const updatePayload: Record<string, unknown> = {
    updated_by_user_id: userId,
  };
  if (payload.name !== undefined) updatePayload.name = payload.name;
  if (payload.description !== undefined)
    updatePayload.description = normalizeNullable(payload.description);
  if (payload.order_index !== undefined) updatePayload.order_index = payload.order_index;
  if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;

  const { data, error } = await supabase
    .from("strategy_principles")
    .update(updatePayload)
    .eq("principle_id", principleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update strategy principle: ${error.message}`);
  }

  return data as StrategyPrinciple;
}

export async function deleteStrategyPrinciple(principleId: string): Promise<void> {
  const { supabase } = await getSupabaseContext();
  const { error } = await supabase.from("strategy_principles").delete().eq("principle_id", principleId);
  if (error) {
    throw new Error(`Failed to delete strategy principle: ${error.message}`);
  }
}

export async function listStrategyValues(strategyId: string): Promise<StrategyValue[]> {
  const { supabase } = await getSupabaseContext();
  const { data, error } = await supabase
    .from("strategy_values")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch strategy values: ${error.message}`);
  }

  return data ?? [];
}

export async function createStrategyValue(
  input: CreateStrategyValueInput
): Promise<StrategyValue> {
  const payload = createStrategyValueInputSchema.parse(input);
  const { supabase, userId } = await getSupabaseContext();

  const insertPayload = {
    strategy_id: payload.strategy_id,
    name: payload.name,
    description: normalizeNullable(payload.description),
    order_index: payload.order_index ?? 0,
    is_active: payload.is_active ?? true,
    created_by_user_id: userId,
    updated_by_user_id: userId,
  };

  const { data, error } = await supabase
    .from("strategy_values")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create strategy value: ${error.message}`);
  }

  return data as StrategyValue;
}

export async function updateStrategyValue(
  valueId: string,
  input: UpdateStrategyValueInput
): Promise<StrategyValue> {
  const payload = updateStrategyValueInputSchema.parse(input);
  const { supabase, userId } = await getSupabaseContext();

  const updatePayload: Record<string, unknown> = {
    updated_by_user_id: userId,
  };
  if (payload.name !== undefined) updatePayload.name = payload.name;
  if (payload.description !== undefined)
    updatePayload.description = normalizeNullable(payload.description);
  if (payload.order_index !== undefined) updatePayload.order_index = payload.order_index;
  if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;

  const { data, error } = await supabase
    .from("strategy_values")
    .update(updatePayload)
    .eq("value_id", valueId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update strategy value: ${error.message}`);
  }

  return data as StrategyValue;
}

export async function deleteStrategyValue(valueId: string): Promise<void> {
  const { supabase } = await getSupabaseContext();
  const { error } = await supabase.from("strategy_values").delete().eq("value_id", valueId);
  if (error) {
    throw new Error(`Failed to delete strategy value: ${error.message}`);
  }
}

export async function listCompetitors(
  params: CompetitorListParams = {},
  options?: SupabaseContextOptions
): Promise<Competitor[]> {
  const { supabase, customerId } = await getSupabaseContext(options);

  let query = supabase
    .from("competitors")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,category.ilike.%${params.search}%,summary.ilike.%${params.search}%`
    );
  }

  if (params.statusId) {
    query = query.eq("status_id", params.statusId);
  }

  if (params.sourceId) {
    query = query.eq("source_id", params.sourceId);
  }

  if (typeof params.limit === "number") {
    const from = params.offset ?? 0;
    const to = from + params.limit - 1;
    query = query.range(from, to);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch competitors: ${error.message}`);
  }

  return data ?? [];
}

export async function getCompetitorById(
  competitorId: string,
  options?: SupabaseContextOptions
): Promise<Competitor> {
  const { supabase, customerId } = await getSupabaseContext(options);
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("competitor_id", competitorId)
    .eq("customer_id", customerId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch competitor ${competitorId}: ${error.message}`);
  }

  return data;
}

export async function createCompetitor(
  input: CreateCompetitorInput,
  options?: SupabaseContextOptions
): Promise<Competitor> {
  const payload = createCompetitorInputSchema.parse(input);
  const { supabase, customerId, userId } = await getSupabaseContext(options);

  const insertPayload = {
    customer_id: customerId,
    name: payload.name,
    website_url: normalizeNullable(payload.website_url),
    category: normalizeNullable(payload.category),
    summary: normalizeNullable(payload.summary),
    status_id: payload.status_id,
    source_id: normalizeNullable(payload.source_id),
    created_by_user_id: userId,
    updated_by_user_id: userId,
  };

  const { data, error } = await supabase
    .from("competitors")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create competitor: ${error.message}`);
  }

  return data as Competitor;
}

export async function updateCompetitor(
  competitorId: string,
  input: UpdateCompetitorInput,
  options?: SupabaseContextOptions
): Promise<Competitor> {
  const payload = updateCompetitorInputSchema.parse(input);
  const { supabase, customerId, userId } = await getSupabaseContext(options);

  const updatePayload: Record<string, unknown> = {
    updated_by_user_id: userId,
  };

  if (payload.name !== undefined) updatePayload.name = payload.name;
  if (payload.website_url !== undefined)
    updatePayload.website_url = normalizeNullable(payload.website_url);
  if (payload.category !== undefined)
    updatePayload.category = normalizeNullable(payload.category);
  if (payload.summary !== undefined)
    updatePayload.summary = normalizeNullable(payload.summary);
  if (payload.status_id !== undefined) updatePayload.status_id = payload.status_id;
  if (payload.source_id !== undefined)
    updatePayload.source_id = normalizeNullable(payload.source_id);

  const { data, error } = await supabase
    .from("competitors")
    .update(updatePayload)
    .eq("competitor_id", competitorId)
    .eq("customer_id", customerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update competitor: ${error.message}`);
  }

  return data as Competitor;
}

export async function deleteCompetitor(
  competitorId: string,
  options?: SupabaseContextOptions
): Promise<void> {
  const { supabase, customerId } = await getSupabaseContext(options);
  const { error } = await supabase
    .from("competitors")
    .delete()
    .eq("competitor_id", competitorId)
    .eq("customer_id", customerId);

  if (error) {
    throw new Error(`Failed to delete competitor: ${error.message}`);
  }
}

export async function listCompetitorSignals(
  competitorId: string
): Promise<CompetitorSignal[]> {
  const { supabase } = await getSupabaseContext();
  const { data, error } = await supabase
    .from("competitor_signals")
    .select("*")
    .eq("competitor_id", competitorId)
    .order("observed_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch competitor signals: ${error.message}`);
  }

  return data ?? [];
}

export async function createCompetitorSignal(
  input: CreateCompetitorSignalInput
): Promise<CompetitorSignal> {
  const payload = createCompetitorSignalInputSchema.parse(input);
  const { supabase, userId } = await getSupabaseContext();

  const insertPayload: Record<string, unknown> = {
    competitor_id: payload.competitor_id,
    signal_type_id: payload.signal_type_id,
    observed_at: payload.observed_at ?? new Date().toISOString(),
    source_url: normalizeNullable(payload.source_url),
    note: normalizeNullable(payload.note),
    created_by_user_id: userId,
    updated_by_user_id: userId,
  };

  const { data, error } = await supabase
    .from("competitor_signals")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create competitor signal: ${error.message}`);
  }

  return data as CompetitorSignal;
}

export async function updateCompetitorSignal(
  signalId: string,
  input: UpdateCompetitorSignalInput
): Promise<CompetitorSignal> {
  const payload = updateCompetitorSignalInputSchema.parse(input);
  const { supabase, userId } = await getSupabaseContext();

  const updatePayload: Record<string, unknown> = {
    updated_by_user_id: userId,
  };

  if (payload.signal_type_id !== undefined) updatePayload.signal_type_id = payload.signal_type_id;
  if (payload.observed_at !== undefined) updatePayload.observed_at = payload.observed_at;
  if (payload.source_url !== undefined)
    updatePayload.source_url = normalizeNullable(payload.source_url);
  if (payload.note !== undefined) updatePayload.note = normalizeNullable(payload.note);

  const { data, error } = await supabase
    .from("competitor_signals")
    .update(updatePayload)
    .eq("signal_id", signalId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update competitor signal: ${error.message}`);
  }

  return data as CompetitorSignal;
}

export async function deleteCompetitorSignal(signalId: string): Promise<void> {
  const { supabase } = await getSupabaseContext();
  const { error } = await supabase.from("competitor_signals").delete().eq("signal_id", signalId);
  if (error) {
    throw new Error(`Failed to delete competitor signal: ${error.message}`);
  }
}

export async function listStrategyChangeLogs(
  strategyId: string,
  params: StrategyChangeLogListParams = {}
): Promise<StrategyChangeLog[]> {
  const { supabase } = await getSupabaseContext();
  let query = supabase
    .from("strategy_change_logs")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("changed_at", { ascending: false });

  if (typeof params.limit === "number") {
    const from = params.offset ?? 0;
    const to = from + params.limit - 1;
    query = query.range(from, to);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch strategy change logs: ${error.message}`);
  }

  return data ?? [];
}

export async function createStrategyChangeLog(
  input: CreateStrategyChangeLogInput
): Promise<StrategyChangeLog> {
  const payload = createStrategyChangeLogInputSchema.parse(input);
  const { supabase, userId } = await getSupabaseContext();

  const insertPayload = {
    strategy_id: payload.strategy_id,
    change_type_id: payload.change_type_id,
    summary: payload.summary,
    justification: normalizeNullable(payload.justification),
    meta: payload.meta ?? null,
    changed_by_user_id: userId,
  };

  const { data, error } = await supabase
    .from("strategy_change_logs")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create strategy change log: ${error.message}`);
  }

  return data as StrategyChangeLog;
}

export async function deleteStrategyChangeLog(changeLogId: string): Promise<void> {
  const { supabase } = await getSupabaseContext();
  const { error } = await supabase
    .from("strategy_change_logs")
    .delete()
    .eq("change_log_id", changeLogId);
  if (error) {
    throw new Error(`Failed to delete strategy change log: ${error.message}`);
  }
}

export async function listPublicationStatuses(
  includeInactive = false
): Promise<OptionPublicationStatus[]> {
  const { supabase } = await getSupabaseContext();
  let query = supabase
    .from("option_publication_status")
    .select("*")
    .order("sort_order", { ascending: true });
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch publication statuses: ${error.message}`);
  }
  return data ?? [];
}

export async function listCompetitorStatuses(
  includeInactive = false
): Promise<OptionCompetitorStatus[]> {
  const { supabase } = await getSupabaseContext();
  let query = supabase
    .from("option_competitor_status")
    .select("*")
    .order("sort_order", { ascending: true });
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch competitor statuses: ${error.message}`);
  }
  return data ?? [];
}

export async function listCompetitorSignalTypes(
  includeInactive = false
): Promise<OptionCompetitorSignalType[]> {
  const { supabase } = await getSupabaseContext();
  let query = supabase
    .from("option_competitor_signal_type")
    .select("*")
    .order("sort_order", { ascending: true });
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch competitor signal types: ${error.message}`);
  }
  return data ?? [];
}

export async function listDataSources(includeInactive = false): Promise<OptionDataSource[]> {
  const { supabase } = await getSupabaseContext();
  let query = supabase
    .from("option_data_source")
    .select("*")
    .order("sort_order", { ascending: true });
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch data sources: ${error.message}`);
  }
  return data ?? [];
}

export async function listStrategyChangeTypes(
  includeInactive = false
): Promise<OptionStrategyChangeType[]> {
  const { supabase } = await getSupabaseContext();
  let query = supabase
    .from("option_strategy_change_type")
    .select("*")
    .order("sort_order", { ascending: true });
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch strategy change types: ${error.message}`);
  }
  return data ?? [];
}

export async function createPublicationStatusOption(
  input: CreateOptionInput
): Promise<OptionPublicationStatus> {
  const payload = createOptionInputSchema.parse(input);
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);

  const { data, error } = await supabase
    .from("option_publication_status")
    .insert({
      programmatic_name: payload.programmatic_name,
      display_name: payload.display_name,
      description: normalizeNullable(payload.description),
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create publication status option: ${error.message}`);
  }

  return data as OptionPublicationStatus;
}

export async function updatePublicationStatusOption(
  optionId: string,
  input: UpdateOptionInput
): Promise<OptionPublicationStatus> {
  const payload = updateOptionInputSchema.parse(input);
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);

  const updatePayload: Record<string, unknown> = {};
  if (payload.programmatic_name !== undefined)
    updatePayload.programmatic_name = payload.programmatic_name;
  if (payload.display_name !== undefined) updatePayload.display_name = payload.display_name;
  if (payload.description !== undefined)
    updatePayload.description = normalizeNullable(payload.description);
  if (payload.sort_order !== undefined) updatePayload.sort_order = payload.sort_order;
  if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;

  const { data, error } = await supabase
    .from("option_publication_status")
    .update(updatePayload)
    .eq("option_id", optionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update publication status option: ${error.message}`);
  }

  return data as OptionPublicationStatus;
}

export async function deletePublicationStatusOption(optionId: string): Promise<void> {
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const { error } = await supabase
    .from("option_publication_status")
    .delete()
    .eq("option_id", optionId);
  if (error) {
    throw new Error(`Failed to delete publication status option: ${error.message}`);
  }
}

export async function createCompetitorStatusOption(
  input: CreateOptionInput
): Promise<OptionCompetitorStatus> {
  const payload = createOptionInputSchema.parse(input);
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const { data, error } = await supabase
    .from("option_competitor_status")
    .insert({
      programmatic_name: payload.programmatic_name,
      display_name: payload.display_name,
      description: normalizeNullable(payload.description),
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to create competitor status option: ${error.message}`);
  }
  return data as OptionCompetitorStatus;
}

export async function updateCompetitorStatusOption(
  optionId: string,
  input: UpdateOptionInput
): Promise<OptionCompetitorStatus> {
  const payload = updateOptionInputSchema.parse(input);
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const updatePayload: Record<string, unknown> = {};
  if (payload.programmatic_name !== undefined)
    updatePayload.programmatic_name = payload.programmatic_name;
  if (payload.display_name !== undefined) updatePayload.display_name = payload.display_name;
  if (payload.description !== undefined)
    updatePayload.description = normalizeNullable(payload.description);
  if (payload.sort_order !== undefined) updatePayload.sort_order = payload.sort_order;
  if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;
  const { data, error } = await supabase
    .from("option_competitor_status")
    .update(updatePayload)
    .eq("option_id", optionId)
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to update competitor status option: ${error.message}`);
  }
  return data as OptionCompetitorStatus;
}

export async function deleteCompetitorStatusOption(optionId: string): Promise<void> {
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const { error } = await supabase
    .from("option_competitor_status")
    .delete()
    .eq("option_id", optionId);
  if (error) {
    throw new Error(`Failed to delete competitor status option: ${error.message}`);
  }
}

export async function createCompetitorSignalTypeOption(
  input: CreateOptionInput
): Promise<OptionCompetitorSignalType> {
  const payload = createOptionInputSchema.parse(input);
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const { data, error } = await supabase
    .from("option_competitor_signal_type")
    .insert({
      programmatic_name: payload.programmatic_name,
      display_name: payload.display_name,
      description: normalizeNullable(payload.description),
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to create competitor signal type option: ${error.message}`);
  }
  return data as OptionCompetitorSignalType;
}

export async function updateCompetitorSignalTypeOption(
  optionId: string,
  input: UpdateOptionInput
): Promise<OptionCompetitorSignalType> {
  const payload = updateOptionInputSchema.parse(input);
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const updatePayload: Record<string, unknown> = {};
  if (payload.programmatic_name !== undefined)
    updatePayload.programmatic_name = payload.programmatic_name;
  if (payload.display_name !== undefined) updatePayload.display_name = payload.display_name;
  if (payload.description !== undefined)
    updatePayload.description = normalizeNullable(payload.description);
  if (payload.sort_order !== undefined) updatePayload.sort_order = payload.sort_order;
  if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;
  const { data, error } = await supabase
    .from("option_competitor_signal_type")
    .update(updatePayload)
    .eq("option_id", optionId)
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to update competitor signal type option: ${error.message}`);
  }
  return data as OptionCompetitorSignalType;
}

export async function deleteCompetitorSignalTypeOption(optionId: string): Promise<void> {
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const { error } = await supabase
    .from("option_competitor_signal_type")
    .delete()
    .eq("option_id", optionId);
  if (error) {
    throw new Error(`Failed to delete competitor signal type option: ${error.message}`);
  }
}

export async function createDataSourceOption(
  input: CreateOptionInput
): Promise<OptionDataSource> {
  const payload = createOptionInputSchema.parse(input);
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const { data, error } = await supabase
    .from("option_data_source")
    .insert({
      programmatic_name: payload.programmatic_name,
      display_name: payload.display_name,
      description: normalizeNullable(payload.description),
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to create data source option: ${error.message}`);
  }
  return data as OptionDataSource;
}

export async function updateDataSourceOption(
  optionId: string,
  input: UpdateOptionInput
): Promise<OptionDataSource> {
  const payload = updateOptionInputSchema.parse(input);
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const updatePayload: Record<string, unknown> = {};
  if (payload.programmatic_name !== undefined)
    updatePayload.programmatic_name = payload.programmatic_name;
  if (payload.display_name !== undefined) updatePayload.display_name = payload.display_name;
  if (payload.description !== undefined)
    updatePayload.description = normalizeNullable(payload.description);
  if (payload.sort_order !== undefined) updatePayload.sort_order = payload.sort_order;
  if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;
  const { data, error } = await supabase
    .from("option_data_source")
    .update(updatePayload)
    .eq("option_id", optionId)
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to update data source option: ${error.message}`);
  }
  return data as OptionDataSource;
}

export async function deleteDataSourceOption(optionId: string): Promise<void> {
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const { error } = await supabase.from("option_data_source").delete().eq("option_id", optionId);
  if (error) {
    throw new Error(`Failed to delete data source option: ${error.message}`);
  }
}

export async function createStrategyChangeTypeOption(
  input: CreateOptionInput
): Promise<OptionStrategyChangeType> {
  const payload = createOptionInputSchema.parse(input);
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const { data, error } = await supabase
    .from("option_strategy_change_type")
    .insert({
      programmatic_name: payload.programmatic_name,
      display_name: payload.display_name,
      description: normalizeNullable(payload.description),
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to create strategy change type option: ${error.message}`);
  }
  return data as OptionStrategyChangeType;
}

export async function updateStrategyChangeTypeOption(
  optionId: string,
  input: UpdateOptionInput
): Promise<OptionStrategyChangeType> {
  const payload = updateOptionInputSchema.parse(input);
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const updatePayload: Record<string, unknown> = {};
  if (payload.programmatic_name !== undefined)
    updatePayload.programmatic_name = payload.programmatic_name;
  if (payload.display_name !== undefined) updatePayload.display_name = payload.display_name;
  if (payload.description !== undefined)
    updatePayload.description = normalizeNullable(payload.description);
  if (payload.sort_order !== undefined) updatePayload.sort_order = payload.sort_order;
  if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;
  const { data, error } = await supabase
    .from("option_strategy_change_type")
    .update(updatePayload)
    .eq("option_id", optionId)
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to update strategy change type option: ${error.message}`);
  }
  return data as OptionStrategyChangeType;
}

export async function deleteStrategyChangeTypeOption(optionId: string): Promise<void> {
  const { supabase } = await getSupabaseContext();
  await assertSystemAdmin(supabase);
  const { error } = await supabase
    .from("option_strategy_change_type")
    .delete()
    .eq("option_id", optionId);
  if (error) {
    throw new Error(`Failed to delete strategy change type option: ${error.message}`);
  }
}

export async function getStrategyWorkspaceData(): Promise<StrategyWorkspaceData> {
  const strategy = await getCompanyStrategy();
  const strategyId = strategy?.strategy_id ?? null;

  const [principles, values, competitors, publicationStatuses, competitorStatuses, signalTypes, dataSources, changeTypes] =
    await Promise.all([
      strategyId ? listStrategyPrinciples(strategyId) : Promise.resolve([]),
      strategyId ? listStrategyValues(strategyId) : Promise.resolve([]),
      listCompetitors(),
      listPublicationStatuses(true),
      listCompetitorStatuses(true),
      listCompetitorSignalTypes(true),
      listDataSources(true),
      listStrategyChangeTypes(true),
    ]);

  const competitorSignals =
    competitors.length > 0
      ? (
          await Promise.all(
            competitors.map((competitor) => listCompetitorSignals(competitor.competitor_id))
          )
        ).flat()
      : [];

  const changeLogs = strategyId ? await listStrategyChangeLogs(strategyId) : [];

  return {
    strategy,
    principles,
    values,
    competitors,
    competitorSignals,
    changeLogs,
    publicationStatuses,
    competitorStatuses,
    competitorSignalTypes: signalTypes,
    dataSources,
    changeTypes,
  };
}


