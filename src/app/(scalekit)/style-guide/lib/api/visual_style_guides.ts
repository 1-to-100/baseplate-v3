import { z } from 'zod';

import { createClient } from '@/lib/supabase/client';
import type { ApiResult, Id, ListParams } from '../types';
import { schemas, type NewVisualStyleGuide, type UpdateVisualStyleGuide, type VisualStyleGuide } from '../types';
import { getContext } from './context';

const upsertVsgSchema = schemas.visualStyleGuide.pick({
  name: true,
  description: true,
  default_logo_asset_id: true,
  imagery_guidelines: true,
});

export async function listVisualStyleGuides(params: ListParams = {}): Promise<ApiResult<VisualStyleGuide[]>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };

  let query = supabase.from('visual_style_guides').select('*').eq('customer_id', customerId);
  if (params.orderBy) query = query.order(params.orderBy.column, { ascending: params.orderBy.ascending ?? true });
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, (params.offset + (params.limit ?? 50)) - 1);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as VisualStyleGuide[] };
}

export async function getVisualStyleGuideById(id: Id): Promise<ApiResult<VisualStyleGuide>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const { data, error } = await supabase
    .from('visual_style_guides')
    .select('*')
    .eq('visual_style_guide_id', id)
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? 'Not found' };
  const parsed = schemas.visualStyleGuide.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  return { ok: true, data: parsed.data };
}

export async function createVisualStyleGuide(input: Omit<NewVisualStyleGuide, 'customer_id' | 'visual_style_guide_id' | 'created_at' | 'updated_at'>): Promise<ApiResult<VisualStyleGuide>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const parsed = upsertVsgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const payload: NewVisualStyleGuide = { ...parsed.data, customer_id: customerId } as NewVisualStyleGuide;
  const { data, error } = await supabase.from('visual_style_guides').insert(payload).select('*').single();
  if (error) return { ok: false, error: error.message };
  const validated = schemas.visualStyleGuide.parse(data);
  return { ok: true, data: validated };
}

export async function updateVisualStyleGuide(id: Id, input: Partial<UpdateVisualStyleGuide>): Promise<ApiResult<VisualStyleGuide>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const parsed = upsertVsgSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { data, error } = await supabase
    .from('visual_style_guides')
    .update(parsed.data)
    .eq('visual_style_guide_id', id)
    .eq('customer_id', customerId)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  const validated = schemas.visualStyleGuide.parse(data);
  return { ok: true, data: validated };
}

export async function deleteVisualStyleGuide(id: Id): Promise<ApiResult<{ deleted: boolean }>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const { error } = await supabase
    .from('visual_style_guides')
    .delete()
    .eq('visual_style_guide_id', id)
    .eq('customer_id', customerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { deleted: true } };
}


