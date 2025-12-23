import { createClient } from '@/lib/supabase/client';
import type { ApiResult, Id, ListParams } from '../types';
import { schemas, type TypographyStyle, type NewTypographyStyle, type UpdateTypographyStyle } from '../types';
import { getContext } from './context';

export async function listTypographyStyles(visualStyleGuideId?: Id, params: ListParams = {}): Promise<ApiResult<TypographyStyle[]>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  let query = supabase.from('typography_styles').select('*').eq('customer_id', customerId);
  if (visualStyleGuideId) query = query.eq('visual_style_guide_id', visualStyleGuideId);
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, (params.offset + (params.limit ?? 50)) - 1);
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data as TypographyStyle[]) };
}

export async function createTypographyStyle(input: Omit<NewTypographyStyle, 'typography_style_id' | 'customer_id' | 'created_at'>): Promise<ApiResult<TypographyStyle>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const payload: NewTypographyStyle = { ...input, customer_id: customerId } as NewTypographyStyle;
  const { data, error } = await supabase.from('typography_styles').insert(payload).select('*').single();
  if (error) return { ok: false, error: error.message };
  const validated = schemas.typographyStyle.parse(data);
  return { ok: true, data: validated };
}

export async function updateTypographyStyle(id: Id, input: Partial<UpdateTypographyStyle>): Promise<ApiResult<TypographyStyle>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const { data, error } = await supabase
    .from('typography_styles')
    .update(input)
    .eq('typography_style_id', id)
    .eq('customer_id', customerId)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  const validated = schemas.typographyStyle.parse(data);
  return { ok: true, data: validated };
}

export async function deleteTypographyStyle(id: Id): Promise<ApiResult<{ deleted: boolean }>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const { error } = await supabase.from('typography_styles').delete().eq('typography_style_id', id).eq('customer_id', customerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { deleted: true } };
}


