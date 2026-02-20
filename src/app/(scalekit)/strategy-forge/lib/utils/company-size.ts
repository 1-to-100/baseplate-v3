/**
 * Company Size Utilities
 * Helper functions for parsing and working with company size values.
 * Multi-select segment filter: no Self-Employed option.
 */

/** Ordered company size options (matches option_company_sizes table, no Self-Employed) */
export const COMPANY_SIZE_OPTIONS = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1001-5000 employees',
  '5001-10,000 employees',
  '10,001+ employees',
] as const;

export type CompanySizeLiteral = (typeof COMPANY_SIZE_OPTIONS)[number];

/**
 * Parse company size string (e.g., "1-10 employees", "10,001+ employees") into min/max range
 */
export function parseCompanySizeRange(value: string): { min: number; max: number | null } {
  // Remove "employees" and trim
  const cleaned = value.replace(/employees/gi, '').trim();

  // Handle ranges like "1-10", "501-1000", "1,001-5,000" (allow 4+ digits with or without comma)
  const rangeMatch = cleaned.match(/^(\d+(?:,\d{3})*)\s*-\s*(\d+(?:,\d{3})*)$/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]?.replace(/,/g, '') || '0', 10);
    const max = parseInt(rangeMatch[2]?.replace(/,/g, '') || '0', 10);
    return { min, max };
  }

  // Handle "+" ranges like "10,001+", "10001+"
  const plusMatch = cleaned.match(/^(\d+(?:,\d{3})*)\+$/);
  if (plusMatch) {
    const min = parseInt(plusMatch[1]?.replace(/,/g, '') || '0', 10);
    return { min, max: null }; // null means no upper limit
  }

  // Fallback: try to extract a single number
  const singleMatch = cleaned.match(/^(\d+(?:,\d{3})*)$/);
  if (singleMatch) {
    const num = parseInt(singleMatch[1]?.replace(/,/g, '') || '0', 10);
    return { min: num, max: num };
  }

  // Default fallback
  return { min: 0, max: null };
}

/** [min, max] for a label (max 0 means unbounded for "10,001+") */
function parseCompanySizeLabel(label: string | null): [number, number] {
  if (!label) return [0, 0];
  switch (label) {
    case '1-10 employees':
      return [1, 10];
    case '11-50 employees':
      return [11, 50];
    case '51-200 employees':
      return [51, 200];
    case '201-500 employees':
      return [201, 500];
    case '501-1000 employees':
      return [501, 1000];
    case '1001-5000 employees':
      return [1001, 5000];
    case '5001-10,000 employees':
      return [5001, 10000];
    case '10,001+ employees':
      return [10001, 0];
    default:
      return [0, 0];
  }
}

/** Index of a company size option in COMPANY_SIZE_OPTIONS (or -1) */
export function getCompanySizeIndex(
  label: string,
  options: readonly string[] = COMPANY_SIZE_OPTIONS
): number {
  return options.indexOf(label);
}

/** All options between two indices (inclusive) */
export function getOptionsBetween(
  startIndex: number,
  endIndex: number,
  options: readonly string[] = COMPANY_SIZE_OPTIONS
): string[] {
  const start = Math.min(startIndex, endIndex);
  const end = Math.max(startIndex, endIndex);
  return options.slice(start, end + 1);
}

/**
 * Format selected company size labels into a single range string for the API
 * (e.g. ["1-10 employees", "11-50 employees"] → "1-50 employees")
 * If any selection is unbounded (e.g. "10,001+ employees"), returns "min+ employees".
 */
export function formatEmployeesFromSelections(selections: string[]): string {
  if (selections.length === 0) return '';
  if (selections.length === 1) return selections[0] ?? '';

  const ranges = selections.map((s) => parseCompanySizeLabel(s));
  const mins = ranges.map(([min]) => min).filter((min) => min > 0);
  if (mins.length === 0) return '';

  const min = Math.min(...mins);
  const hasUnbounded = ranges.some(([, max]) => max === 0);
  if (hasUnbounded) return `${min.toLocaleString('en-US')}+ employees`;

  const maxs = ranges.map(([, max]) => max).filter((max) => max > 0);
  if (maxs.length === 0) return `${min.toLocaleString('en-US')}+ employees`;
  const max = Math.max(...maxs);
  return `${min.toLocaleString('en-US')}-${max.toLocaleString('en-US')} employees`;
}

/**
 * Whether an option can be removed from the chip list (only min/max of range are removable when multiple)
 */
export function isRemovableOption(option: string, selections: string[]): boolean {
  if (selections.length <= 1) return true;
  const indices = selections
    .map((s) => getCompanySizeIndex(s))
    .filter((idx) => idx !== -1)
    .sort((a, b) => a - b);
  if (indices.length === 0) return true;
  const optionIndex = getCompanySizeIndex(option);
  const minIndex = Math.min(...indices);
  const maxIndex = Math.max(...indices);
  return optionIndex === minIndex || optionIndex === maxIndex;
}

/**
 * Parse an employees string (from API) back to individual company size option labels
 * e.g. "501-10,000 employees" → ["501-1000 employees", "1001-5000 employees", "5001-10,000 employees"]
 */
export function parseEmployeesRangeToSelections(employeesString: string): string[] {
  if (!employeesString || !employeesString.trim()) return [];

  const trimmed = employeesString.trim();
  if (COMPANY_SIZE_OPTIONS.includes(trimmed as CompanySizeLiteral)) return [trimmed];

  const plusMatch = trimmed.match(/^([\d,]+)\+\s*employees$/i);
  if (plusMatch?.[1]) {
    const minValue = parseInt(plusMatch[1].replace(/,/g, ''), 10);
    const result: string[] = [];
    for (const option of COMPANY_SIZE_OPTIONS) {
      const [optMin] = parseCompanySizeLabel(option);
      if (optMin >= minValue) result.push(option);
    }
    return result.length > 0 ? result : [trimmed];
  }

  const rangeMatch = trimmed.match(/^([\d,]+)-([\d,]+)\s*employees$/i);
  if (rangeMatch?.[1] && rangeMatch?.[2]) {
    const minValue = parseInt(rangeMatch[1].replace(/,/g, ''), 10);
    const maxValue = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
    const result: string[] = [];
    for (const option of COMPANY_SIZE_OPTIONS) {
      const [optMin, optMax] = parseCompanySizeLabel(option);
      if (optMax === 0) {
        if (optMin <= maxValue || maxValue === 0) result.push(option);
      } else {
        if (optMin >= minValue && optMax <= maxValue) result.push(option);
      }
    }
    return result.length > 0 ? result : [trimmed];
  }

  return [employeesString];
}
