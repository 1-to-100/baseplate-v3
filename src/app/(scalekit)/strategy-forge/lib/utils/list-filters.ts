import type { CompanyFilterFields } from '../types/company';

/**
 * Converts list.filters (Record<string, unknown>) to CompanyFilterFields for getCompanies params.
 */
export function listFiltersToCompanyFilterFields(
  filters: Record<string, unknown> | null | undefined
): CompanyFilterFields {
  if (!filters || typeof filters !== 'object') return {};
  const f = filters as Record<string, unknown>;
  return {
    name: typeof f.name === 'string' ? f.name : undefined,
    country: typeof f.country === 'string' ? f.country : f.country === null ? null : undefined,
    region: typeof f.region === 'string' ? f.region : f.region === null ? null : undefined,
    companySize:
      Array.isArray(f.companySize) && f.companySize.length === 2
        ? ([Number(f.companySize[0]), Number(f.companySize[1])] as [number, number])
        : undefined,
    industry: Array.isArray(f.industry) ? (f.industry as string[]) : undefined,
    technographic: Array.isArray(f.technographic) ? (f.technographic as string[]) : undefined,
  };
}

/**
 * Returns true when the list has saved filters that should be applied when viewing the list.
 * Empty object, null, or undefined = no filters (show all companies).
 */
export function hasListFilters(filters: Record<string, unknown> | null | undefined): boolean {
  if (!filters || typeof filters !== 'object') return false;
  const f = filters as Record<string, unknown>;
  if (typeof f.name === 'string' && f.name.trim() !== '') return true;
  if (typeof f.country === 'string' && f.country !== '') return true;
  if (f.country === null) return true;
  if (typeof f.region === 'string' && f.region !== '') return true;
  if (f.region === null) return true;
  if (
    Array.isArray(f.companySize) &&
    f.companySize.length === 2 &&
    (Number(f.companySize[0]) > 0 || Number(f.companySize[1]) > 0)
  )
    return true;
  if (Array.isArray(f.industry) && f.industry.length > 0) return true;
  if (Array.isArray(f.technographic) && f.technographic.length > 0) return true;
  return false;
}
