import { DiffbotOrganizationResponse, DiffbotOrganization } from './types.ts';
import { DIFFBOT_COMPANIES_LIMIT } from './index.ts';

/**
 * Diffbot API client for organization search
 */
export class DiffbotClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl || Deno.env.get('DIFFBOT_API_URL') || 'https://kg.diffbot.com/kg/v3/dql';
    this.token = token || Deno.env.get('DIFFBOT_API_TOKEN') || '';

    if (!this.token) {
      throw new Error('DIFFBOT_API_TOKEN environment variable is required');
    }
  }

  /**
   * Search for organizations using Diffbot Query Language (DQL)
   */
  async searchOrganizations(
    query: string[],
    options?: {
      size?: number;
      from?: number;
      getClause?: string;
    }
  ): Promise<{
    data: DiffbotOrganization[];
    totalCount: number;
  }> {
    const size = options?.size || DIFFBOT_COMPANIES_LIMIT;
    const from = options?.from || 0;
    const getClause =
      options?.getClause ||
      'id,name,fullName,type,logo,image,diffbotUri,location,nbActiveEmployeeEdges,nbEmployees,nbEmployeesMin,nbEmployeesMax,homepageUri,categories';

    // Build DQL query string
    const queryString = `type:Organization ${query.join(' ')} get:${getClause}`;
    const encodedQuery = encodeURIComponent(queryString);

    // Build full URL with pagination and searchInfo
    const url = `${this.baseUrl}?type=query&token=${this.token}&query=${encodedQuery}&size=${size}&from=${from}&include=searchInfo`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Diffbot API] Error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        // Check if it's a temporary error (5xx)
        if (response.status >= 500) {
          throw new Error('DIFFBOT_SERVICE_UNAVAILABLE');
        }

        throw new Error(`Diffbot API error: ${response.status} ${response.statusText}`);
      }

      const data: DiffbotOrganizationResponse = await response.json();

      // Extract total count from hits or searchInfo
      const totalCount =
        typeof data.hits === 'number' ? data.hits : data.searchInfo?.totalHits || 0;

      // Extract entities from response
      const organizations = (data.data || []).map((item) => item.entity);

      return {
        data: organizations,
        totalCount,
      };
    } catch (error) {
      // Check for network/timeout errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('DIFFBOT_SERVICE_UNAVAILABLE');
      }

      // Re-throw our custom errors
      if (error instanceof Error && error.message.includes('DIFFBOT_')) {
        throw error;
      }

      // Re-throw other errors
      throw new Error(
        `Failed to search organizations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
