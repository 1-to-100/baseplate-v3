import { createClient } from '@/lib/supabase/client';
import type { ApiResult, ListParams } from '../types';
import { schemas, type TypographyStyleOption, type LogoTypeOption, type FontOption, type SocialTemplateType } from '../types';

export async function listTypographyStyleOptions(params: ListParams = {}): Promise<ApiResult<TypographyStyleOption[]>> {
  const supabase = createClient();
  let query = supabase.from('typography_style_options').select('*').eq('is_active', true).order('sort_order', { ascending: true });
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, (params.offset + (params.limit ?? 50)) - 1);
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  const validated = (data ?? []).map((r) => schemas.typographyStyleOption.parse(r));
  return { ok: true, data: validated };
}

export async function listLogoTypeOptions(): Promise<ApiResult<LogoTypeOption[]>> {
  const supabase = createClient();
  const { data, error } = await supabase.from('logo_type_options').select('*').eq('is_active', true).order('display_name', { ascending: true });
  if (error) return { ok: false, error: error.message };
  const validated = (data ?? []).map((r) => schemas.logoTypeOption.parse(r));
  return { ok: true, data: validated };
}

export async function listFontOptions(params: ListParams = {}): Promise<ApiResult<FontOption[]>> {
  const supabase = createClient();
  let query = supabase.from('font_options').select('*').order('display_name', { ascending: true });
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, (params.offset + (params.limit ?? 50)) - 1);
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  const validated = (data ?? []).map((r) => schemas.fontOption.parse(r));
  return { ok: true, data: validated };
}

export async function listSocialTemplateTypes(): Promise<ApiResult<SocialTemplateType[]>> {
  const supabase = createClient();
  const { data, error } = await supabase.from('social_template_types').select('*').order('display_name', { ascending: true });
  if (error) return { ok: false, error: error.message };
  const validated = (data ?? []).map((r) => schemas.socialTemplateType.parse(r));
  return { ok: true, data: validated };
}


