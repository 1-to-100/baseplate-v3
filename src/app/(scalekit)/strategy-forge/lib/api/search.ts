import { createClient } from '@/lib/supabase/client';
import type {
  SearchByFiltersRequest,
  SearchByFiltersResponse,
  SegmentFilterDto,
} from '../types/search';

/**
 * Search for companies matching the provided segment filters
 * Calls the segments-search Supabase Edge Function
 */
export async function searchByFilters(
  filters: SegmentFilterDto,
  options?: {
    page?: number;
    perPage?: number;
  }
): Promise<SearchByFiltersResponse> {
  const supabase = createClient();

  // Get the current session for authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to search for companies');
  }

  const payload: SearchByFiltersRequest = {
    filters,
    page: options?.page || 1,
    perPage: options?.perPage || 50,
  };

  // Call the edge function
  const response = await supabase.functions.invoke('segments-search', {
    body: payload,
  });

  // Handle errors - Supabase Functions returns error in data when status is non-2xx
  if (response.error) {
    // Try to extract the actual error message from the response
    let errorMessage = 'Failed to search for companies';

    // The error object has a 'context' property which is the Response object
    // We need to parse its JSON body to get the actual error message
    const errorObj = response.error as {
      context?: Response;
      error?: string;
      message?: string;
    };

    try {
      // Check if the error has a context property (Response object)
      if (errorObj.context && typeof errorObj.context.json === 'function') {
        // Clone the response so we can read it
        const errorResponse = errorObj.context.clone();
        const errorData = await errorResponse.json();

        // Extract the error message from the JSON body
        if (errorData && typeof errorData === 'object') {
          const data = errorData as { error?: string; message?: string };
          errorMessage = data.error || data.message || errorMessage;
        }
      } else if (errorObj.error) {
        errorMessage = errorObj.error;
      } else if (
        errorObj.message &&
        errorObj.message !== 'Edge Function returned a non-2xx status code'
      ) {
        errorMessage = errorObj.message;
      }
    } catch (parseError) {
      // Fall back to generic message
      errorMessage = errorObj.message || errorMessage;
    }

    // Create a custom error with additional context
    const customError = new Error(errorMessage) as Error & {
      statusCode?: number;
      isNoResults?: boolean;
    };

    // Mark as "no results" error if it contains the characteristic message
    if (errorMessage.includes('No matches found') || errorMessage.includes('Try broadening')) {
      customError.isNoResults = true;
      customError.statusCode = 409;
    }

    throw customError;
  }

  if (!response.data) {
    throw new Error('No data returned from search');
  }

  return response.data as SearchByFiltersResponse;
}
