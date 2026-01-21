import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';
import { ApiError, createErrorResponse, createSuccessResponse } from '../_shared/errors.ts';
import { DiffbotClient } from './diffbot-client.ts';
import { DqlAdapter } from './dql-adapter.ts';
import { SearchByFiltersRequest, SearchByFiltersResponse, CompanyPreview } from './types.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate the request
    const user = await authenticateRequest(req);
    
    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new ApiError('Method not allowed', 405);
    }

    // Parse request body
    const body: SearchByFiltersRequest = await req.json();
    
    if (!body.filters) {
      throw new ApiError('Filters are required', 400);
    }

    const { filters, page = 1, perPage = 50 } = body;

    // Validate pagination parameters
    if (page < 1) {
      throw new ApiError('Page must be >= 1', 400);
    }
    if (perPage < 1 || perPage > 100) {
      throw new ApiError('perPage must be between 1 and 100', 400);
    }

    // Convert filters to DQL
    const dqlQuery = DqlAdapter.convert(filters);

    if (dqlQuery.length === 0) {
      throw new ApiError(
        'No valid filters provided. Please select at least one filter.',
        400
      );
    }

    // Calculate pagination offset
    const from = (page - 1) * perPage;

    // Search organizations via Diffbot
    const diffbotClient = new DiffbotClient();
    const { data: organizations, totalCount } = await diffbotClient.searchOrganizations(
      dqlQuery,
      {
        size: perPage,
        from,
        // Use preview fields to reduce response size
        getClause: 'id,name,fullName,type,logo,location,nbEmployees,nbEmployeesMin,nbEmployeesMax,categories',
      }
    );

    // Check if any results were found
    if (organizations.length === 0 && from === 0) {
      const errorMessage = DqlAdapter.formatActiveFilters(filters);
      throw new ApiError(errorMessage, 409); // 409 Conflict - no results found
    }

    // Format response
    const companyPreviews: CompanyPreview[] = organizations.map((org) => ({
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
    }));

    const response: SearchByFiltersResponse = {
      data: companyPreviews,
      totalCount,
      page,
      perPage,
      diffbotQueries: [`company: ${dqlQuery.join(' ')}`],
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('[Segments Search] Error:', error);

    // Handle specific Diffbot errors
    if (error instanceof Error && error.message === 'DIFFBOT_SERVICE_UNAVAILABLE') {
      return createErrorResponse(
        new ApiError(
          "We couldn't load results due to a temporary issue. Please try again.",
          503
        )
      );
    }

    return createErrorResponse(error);
  }
});
