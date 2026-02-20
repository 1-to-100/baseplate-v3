/// <reference lib="deno.ns" />
import { handleCors } from '../../../../../../../supabase/functions/_shared/cors.ts';
import { authenticateRequest } from '../../../../../../../supabase/functions/_shared/auth.ts';
import {
  ApiError,
  createErrorResponse,
  createSuccessResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import { DiffbotClient, DIFFBOT_COMPANIES_LIMIT } from './diffbot-client.ts';
import { DqlAdapter } from './dql-adapter.ts';
import { safeParseSearchByFiltersRequest, type CompanyPreview } from './schema.ts';
import type { SegmentFilterDto } from './types.ts';
import type { DiffbotOrganization } from './types.ts';

export { DIFFBOT_COMPANIES_LIMIT } from './diffbot-client.ts';

export interface HandlerDeps {
  authenticateRequest: (req: Request) => Promise<unknown>;
  searchOrganizations: (
    query: string[],
    options: { size: number; from: number; getClause?: string }
  ) => Promise<{ data: DiffbotOrganization[]; totalCount: number }>;
}

const defaultDeps: HandlerDeps = {
  authenticateRequest: (req) => authenticateRequest(req),
  searchOrganizations: async (query, options) => {
    const client = new DiffbotClient();
    return client.searchOrganizations(query, options);
  },
};

function mapToCompanyPreview(org: DiffbotOrganization): CompanyPreview {
  return {
    id: org.id,
    diffbotId: org.diffbotId,
    name: org.name,
    fullName: org.fullName,
    logo: org.logo || org.image,
    type: org.type,
    location: org.location,
    nbEmployees: org.nbEmployees,
    nbEmployeesMin: org.nbEmployeesMin,
    nbEmployeesMax: org.nbEmployeesMax,
    categories: org.categories,
    homepageUri: org.homepageUri,
  };
}

export function createHandler(deps: HandlerDeps = defaultDeps) {
  return async function handler(req: Request): Promise<Response> {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
      await deps.authenticateRequest(req);

      if (req.method !== 'POST') {
        throw new ApiError('Method not allowed', 405);
      }

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new ApiError('Invalid request body', 400);
      }

      const parseResult = safeParseSearchByFiltersRequest(body);
      if (!parseResult.success) {
        const first = parseResult.error.issues[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Validation failed';
        throw new ApiError(msg, 400);
      }

      const { filters, page = 1, perPage = DIFFBOT_COMPANIES_LIMIT } = parseResult.data;

      if (page < 1) {
        throw new ApiError('Page must be >= 1', 400);
      }

      const dqlQuery = DqlAdapter.convert(filters as SegmentFilterDto);
      if (dqlQuery.length === 0) {
        throw new ApiError('No valid filters provided. Please select at least one filter.', 400);
      }

      const from = (page - 1) * perPage;

      const { data: organizations, totalCount } = await deps.searchOrganizations(dqlQuery, {
        size: perPage,
        from,
        getClause:
          'id,name,fullName,type,logo,location,nbEmployees,nbEmployeesMin,nbEmployeesMax,categories',
      });

      if (organizations.length === 0 && from === 0) {
        const errorMessage = DqlAdapter.formatActiveFilters(filters as SegmentFilterDto);
        throw new ApiError(errorMessage, 409);
      }

      const companyPreviews: CompanyPreview[] = organizations.map(mapToCompanyPreview);

      const response = {
        data: companyPreviews,
        totalCount,
        page,
        perPage,
        diffbotQueries: [`company: ${dqlQuery.join(' ')}`],
      };

      return createSuccessResponse(response);
    } catch (error) {
      console.error('[Segments Search] Error:', error);
      if (error instanceof Error && error.message === 'DIFFBOT_SERVICE_UNAVAILABLE') {
        return createErrorResponse(
          new ApiError("We couldn't load results due to a temporary issue. Please try again.", 503)
        );
      }
      return createErrorResponse(error);
    }
  };
}

Deno.serve(createHandler());
