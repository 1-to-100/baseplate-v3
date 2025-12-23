import { useQuery } from '@tanstack/react-query';
import {
  listTypographyStyleOptions,
  listLogoTypeOptions,
  listFontOptions,
  listSocialTemplateTypes,
} from '../api/options';
import type { TypographyStyleOption, LogoTypeOption, FontOption, SocialTemplateType } from '../types';

export const optionKeys = {
  typographyStyleOptions: ['options', 'typography-style-options'] as const,
  logoTypeOptions: ['options', 'logo-type-options'] as const,
  fontOptions: ['options', 'font-options'] as const,
  socialTemplateTypes: ['options', 'social-template-types'] as const,
};

export function useTypographyStyleOptions() {
  return useQuery({
    queryKey: optionKeys.typographyStyleOptions,
    queryFn: async () => {
      const result = await listTypographyStyleOptions();
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    staleTime: Infinity, // Options rarely change
  });
}

export function useLogoTypeOptions() {
  return useQuery({
    queryKey: optionKeys.logoTypeOptions,
    queryFn: async () => {
      const result = await listLogoTypeOptions();
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    staleTime: Infinity, // Options rarely change
  });
}

export function useFontOptions() {
  return useQuery({
    queryKey: optionKeys.fontOptions,
    queryFn: async () => {
      const result = await listFontOptions();
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    staleTime: Infinity, // Options rarely change
  });
}

export function useSocialTemplateTypes() {
  return useQuery({
    queryKey: optionKeys.socialTemplateTypes,
    queryFn: async () => {
      const result = await listSocialTemplateTypes();
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    staleTime: Infinity, // Options rarely change
  });
}

