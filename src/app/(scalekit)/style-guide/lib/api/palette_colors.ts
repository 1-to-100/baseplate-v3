import { createClient } from '@/lib/supabase/client';
import type { ApiResult, Id, ListParams } from '../types';
import {
  schemas,
  type PaletteColor,
  type NewPaletteColor,
  type UpdatePaletteColor,
} from '../types';
import { getContext } from './context';

export async function listPaletteColors(
  params: ListParams = {}
): Promise<ApiResult<PaletteColor[]>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  let query = supabase
    .from('palette_colors')
    .select('*')
    .eq('customer_id', customerId)
    .order('sort_order', { ascending: true });
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1);
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as PaletteColor[] };
}

export async function createPaletteColor(
  input: Omit<NewPaletteColor, 'palette_color_id' | 'customer_id' | 'created_at'>
): Promise<ApiResult<PaletteColor>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const payload: NewPaletteColor = { ...input, customer_id: customerId } as NewPaletteColor;
  const { data, error } = await supabase
    .from('palette_colors')
    .insert(payload)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  const validated = schemas.paletteColor.parse(data);
  return { ok: true, data: validated };
}

export async function updatePaletteColor(
  id: Id,
  input: Partial<UpdatePaletteColor>
): Promise<ApiResult<PaletteColor>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const { data, error } = await supabase
    .from('palette_colors')
    .update(input)
    .eq('palette_color_id', id)
    .eq('customer_id', customerId)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  const validated = schemas.paletteColor.parse(data);
  return { ok: true, data: validated };
}

export async function deletePaletteColor(id: Id): Promise<ApiResult<{ deleted: boolean }>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const { error } = await supabase
    .from('palette_colors')
    .delete()
    .eq('palette_color_id', id)
    .eq('customer_id', customerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { deleted: true } };
}
