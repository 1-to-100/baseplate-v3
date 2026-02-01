/**
 * Company Size Utilities
 * Helper functions for parsing and working with company size values
 */

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
