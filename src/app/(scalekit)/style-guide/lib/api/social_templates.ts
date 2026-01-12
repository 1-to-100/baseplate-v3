import { createClient } from '@/lib/supabase/client';
import type { ApiResult, Id, ListParams } from '../types';
import {
  schemas,
  type SocialTemplate,
  type NewSocialTemplate,
  type UpdateSocialTemplate,
} from '../types';
import { getContext } from './context';

export async function listSocialTemplates(
  visualStyleGuideId?: Id,
  params: ListParams = {}
): Promise<ApiResult<SocialTemplate[]>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  let query = supabase.from('social_templates').select('*').eq('customer_id', customerId);
  if (visualStyleGuideId) query = query.eq('visual_style_guide_id', visualStyleGuideId);
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1);
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as SocialTemplate[] };
}

export async function createSocialTemplate(
  input: Omit<NewSocialTemplate, 'social_template_id' | 'customer_id' | 'created_at'>
): Promise<ApiResult<SocialTemplate>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const payload: NewSocialTemplate = { ...input, customer_id: customerId } as NewSocialTemplate;
  const { data, error } = await supabase
    .from('social_templates')
    .insert(payload)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  const validated = schemas.socialTemplate.parse(data);
  return { ok: true, data: validated };
}

export async function updateSocialTemplate(
  id: Id,
  input: Partial<UpdateSocialTemplate>
): Promise<ApiResult<SocialTemplate>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const { data, error } = await supabase
    .from('social_templates')
    .update(input)
    .eq('social_template_id', id)
    .eq('customer_id', customerId)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  const validated = schemas.socialTemplate.parse(data);
  return { ok: true, data: validated };
}

export async function deleteSocialTemplate(id: Id): Promise<ApiResult<{ deleted: boolean }>> {
  const supabase = createClient();
  const { customerId } = await getContext();
  if (!customerId) return { ok: false, error: 'No customer context' };
  const { error } = await supabase
    .from('social_templates')
    .delete()
    .eq('social_template_id', id)
    .eq('customer_id', customerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { deleted: true } };
}
