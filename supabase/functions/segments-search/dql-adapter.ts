import { SegmentFilterDto } from './types.ts';

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
    if (dto.employees && dto.employees.trim()) {
      const employeesStr = dto.employees.trim();

      // Handle range format: "1000-5000" or "10,000-50,000"
      if (employeesStr.includes('-')) {
        const parts = employeesStr.split('-');
        if (parts.length === 2) {
          const min = parseInt(parts[0].replace(/,/g, ''), 10);
          const max = parseInt(parts[1].replace(/,/g, ''), 10);
          if (!isNaN(min) && !isNaN(max)) {
            dql.push(`nbEmployees>=${min} nbEmployees<=${max}`);
          }
        }
      }
      // Handle minimum with plus suffix: "10001+" or "10,001+"
      else if (employeesStr.endsWith('+')) {
        const minStr = employeesStr.replace(/[+,]/g, '');
        const min = parseInt(minStr, 10);
        if (!isNaN(min)) {
          dql.push(`nbEmployees>=${min}`);
        }
      }
      // Handle single number (minimum): "10001" or "10,001"
      else {
        const minStr = employeesStr.replace(/,/g, '');
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

    if (filters.employees && filters.employees.trim()) {
      activeFilters.push(`Company Size: "${filters.employees}"`);
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
