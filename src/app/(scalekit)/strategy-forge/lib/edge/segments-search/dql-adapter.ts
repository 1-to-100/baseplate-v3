import { SegmentFilterDto } from './types.ts';

/**
 * Safely extract employees value from string or array
 */
function extractEmployeesValue(employees: string | string[] | null | undefined): string | null {
  if (employees === null || employees === undefined) {
    return null;
  }

  if (Array.isArray(employees)) {
    const firstElement = employees.length > 0 ? employees[0] : null;
    if (firstElement !== null && firstElement !== undefined && typeof firstElement === 'string') {
      return firstElement;
    }
    return null;
  }

  if (typeof employees === 'string') {
    return employees;
  }

  return null;
}

/**
 * Converts segment filters to Diffbot Query Language (DQL)
 * Based on creso-ai-api SegmentDtoToDqlAdapter
 */
export class DqlAdapter {
  static convert(dto: SegmentFilterDto): string[] {
    const dql: string[] = [];

    // Country filter
    if (dto.country && dto.country.trim()) {
      const country = `"${dto.country.trim()}"`;
      dql.push(`location.country.name:${country}`);
    }

    // Location/City/State filter
    if (dto.location && dto.location.trim()) {
      const location = `"${dto.location.trim()}"`;
      dql.push(`location.city.name:${location}`);
    }

    // Categories/Industries - multiple separate clauses (AND logic)
    if (dto.categories && dto.categories.length > 0) {
      dto.categories.forEach((category) => {
        if (category && category.trim()) {
          const categoryQuoted = `"${category.trim()}"`;
          dql.push(`categories.name:${categoryQuoted}`);
        }
      });
    }

    // Technographics - OR syntax (match ANY technology)
    if (dto.technographics && dto.technographics.length > 0) {
      const validTechs = dto.technographics.filter((tech) => tech && tech.trim());
      if (validTechs.length > 0) {
        const techsQuoted = validTechs.map((tech) => `"${tech.trim()}"`).join(', ');
        dql.push(`technographics.technology.name:or(${techsQuoted})`);
      }
    }

    // Employee count filter
    // Handle both string and array formats
    const employeesStr = extractEmployeesValue(dto.employees);

    if (employeesStr && employeesStr.trim()) {
      const employeesValue = employeesStr.trim();

      // Handle range format: "1000-5000" or "10,000-50,000" or "501-1000 employees"
      // Remove "employees" suffix if present
      const cleanValue = employeesValue.replace(/\s+employees?$/i, '');

      if (cleanValue.includes('-')) {
        const parts = cleanValue.split('-');
        if (parts.length === 2) {
          const min = parseInt(parts[0].replace(/,/g, '').trim(), 10);
          const max = parseInt(parts[1].replace(/,/g, '').trim(), 10);
          if (!isNaN(min) && !isNaN(max)) {
            dql.push(`nbEmployees>=${min} nbEmployees<=${max}`);
          }
        }
      }
      // Handle minimum with plus suffix: "10001+" or "10,001+"
      else if (cleanValue.endsWith('+')) {
        const minStr = cleanValue.replace(/[+,]/g, '');
        const min = parseInt(minStr, 10);
        if (!isNaN(min)) {
          dql.push(`nbEmployees>=${min}`);
        }
      }
      // Handle single number (minimum): "10001" or "10,001"
      else {
        const minStr = cleanValue.replace(/,/g, '');
        const min = parseInt(minStr, 10);
        if (!isNaN(min)) {
          dql.push(`nbEmployees>=${min}`);
        }
      }
    }

    return dql;
  }

  /**
   * Format active filters for error messages
   */
  static formatActiveFilters(filters: SegmentFilterDto): string {
    const activeFilters: string[] = [];

    if (filters.country && filters.country.trim()) {
      activeFilters.push(`Country: "${filters.country}"`);
    }

    if (filters.location && filters.location.trim()) {
      activeFilters.push(`Location: "${filters.location}"`);
    }

    const employeesDisplay = extractEmployeesValue(filters.employees);
    if (employeesDisplay && employeesDisplay.trim()) {
      activeFilters.push(`Company Size: "${employeesDisplay}"`);
    }

    if (filters.categories && filters.categories.length > 0) {
      const categoriesList = filters.categories
        .filter((cat) => cat && cat.trim())
        .map((cat) => `"${cat}"`)
        .join(', ');
      activeFilters.push(`Industry: ${categoriesList}`);
    }

    if (filters.technographics && filters.technographics.length > 0) {
      const techsList = filters.technographics
        .filter((tech) => tech && tech.trim())
        .map((tech) => `"${tech}"`)
        .join(', ');
      activeFilters.push(`Technologies: ${techsList}`);
    }

    if (activeFilters.length === 0) {
      return 'No matches found. Please select some filters to search for companies.';
    }

    return `No matches found for: ${activeFilters.join(', ')}. Try broadening your criteria.`;
  }
}
