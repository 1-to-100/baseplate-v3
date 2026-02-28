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

/** Company shape sufficient for filter matching (DB row or CompanyItem). */
export interface CompanyForFilterMatch {
  display_name?: string | null;
  legal_name?: string | null;
  name?: string | null;
  domain?: string | null;
  country?: string | null;
  region?: string | null;
  employees?: number | null;
  categories?: string[] | null;
  technologies?: string[] | null;
}

/**
 * Returns true if the company matches the list's filters.
 * Mirrors the semantics of applyCompaniesFilters in companies API.
 * If the list has no filters (hasListFilters false), returns false (empty list).
 */
export function companyMatchesListFilters(
  company: CompanyForFilterMatch,
  listFilters: Record<string, unknown> | null | undefined
): boolean {
  if (!hasListFilters(listFilters)) return false;
  const f = listFiltersToCompanyFilterFields(listFilters);

  const search = (f.name || '').trim().toLowerCase();
  if (search) {
    const name = (company.display_name ?? company.legal_name ?? company.name ?? '').toLowerCase();
    const domain = (company.domain ?? '').toLowerCase();
    if (!name.includes(search) && !domain.includes(search)) return false;
  }

  if (f.country != null) {
    const companyCountry = company.country ?? '';
    if (Array.isArray(f.country)) {
      if (f.country.length > 0 && !f.country.includes(companyCountry)) return false;
    } else if (companyCountry !== f.country) {
      return false;
    }
  }

  if (f.region != null) {
    const companyRegion = company.region ?? '';
    if (Array.isArray(f.region)) {
      if (f.region.length > 0 && !f.region.includes(companyRegion)) return false;
    } else if (companyRegion !== f.region) {
      return false;
    }
  }

  if (f.companySize?.length === 2) {
    const [min, max] = f.companySize;
    const emp = company.employees ?? 0;
    if (min != null && min > 0 && emp < min) return false;
    if (max != null && max > 0 && emp > max) return false;
  }

  if (f.industry && f.industry.length > 0) {
    const toTitleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
    const filterCategories = f.industry.map((c) => toTitleCase(String(c).trim())).filter(Boolean);
    const companyCats = (company.categories ?? []).map((c) => toTitleCase(String(c).trim()));
    const overlap = filterCategories.some((fc) => companyCats.includes(fc));
    if (!overlap) return false;
  }

  if (f.technographic && f.technographic.length > 0) {
    const companyTech = company.technologies ?? [];
    const hasAny = f.technographic.some((t) =>
      companyTech.some((ct) => String(ct).toLowerCase() === String(t).toLowerCase())
    );
    if (!hasAny) return false;
  }

  return true;
}
