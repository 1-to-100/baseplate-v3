import { createClient } from '@/lib/supabase/client';
import type { ApiResult, Id, ListParams } from '../types';
import { schemas, type LogoAsset, type NewLogoAsset, type UpdateLogoAsset } from '../types';
import { getContext } from './context';

export async function listLogoAssets(
  visualStyleGuideId?: Id,
  params: ListParams = {}
): Promise<ApiResult<LogoAsset[]>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  let query = supabase.from('logo_assets').select('*').eq('customer_id', customerId);
  if (visualStyleGuideId) query = query.eq('visual_style_guide_id', visualStyleGuideId);
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1);
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as LogoAsset[] };
}

export async function createLogoAsset(
  input: Omit<NewLogoAsset, 'logo_asset_id' | 'customer_id' | 'created_at'>
): Promise<ApiResult<LogoAsset>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const payload: NewLogoAsset = { ...input, customer_id: customerId } as NewLogoAsset;
  const { data, error } = await supabase.from('logo_assets').insert(payload).select('*').single();
  if (error) return { ok: false, error: error.message };
  const validated = schemas.logoAsset.parse(data);
  return { ok: true, data: validated };
}

export async function updateLogoAsset(
  id: Id,
  input: Partial<UpdateLogoAsset>
): Promise<ApiResult<LogoAsset>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const { data, error } = await supabase
    .from('logo_assets')
    .update(input)
    .eq('logo_asset_id', id)
    .eq('customer_id', customerId)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  const validated = schemas.logoAsset.parse(data);
  return { ok: true, data: validated };
}

export async function deleteLogoAsset(id: Id): Promise<ApiResult<{ deleted: boolean }>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const { error } = await supabase
    .from('logo_assets')
    .delete()
    .eq('logo_asset_id', id)
    .eq('customer_id', customerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { deleted: true } };
}
