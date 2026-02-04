import { corsHeaders } from '../../../../../../../supabase/functions/_shared/cors.ts';
import { authenticateRequest } from '../../../../../../../supabase/functions/_shared/auth.ts';
import {
  ApiError,
  createErrorResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';
import { buildSystemPrompt } from './prompt.ts';
import type {
  AskAiSegmentRequest,
  AiGeneratedSegmentResponse,
  RawAiSegmentResponse,
  OptionIndustry,
  OptionCompanySize,
} from './types.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    console.log('User authenticated:', { user_id: user.user_id, customer_id: user.customer_id });

    if (!user.customer_id) {
      throw new ApiError('User must belong to a customer', 403);
    }

    // Parse request body
    let body: AskAiSegmentRequest;
    try {
      body = await req.json();
      console.log('Request body received:', { description: body.description?.substring(0, 100) });
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new ApiError('Invalid request body', 400);
    }

    // Validate input
    if (!body.description || typeof body.description !== 'string') {
      throw new ApiError('Description is required', 400);
    }

    const trimmedDescription = body.description.trim();
    if (trimmedDescription.length < 3) {
      throw new ApiError('Description must be at least 3 characters', 400);
    }

    if (trimmedDescription.length > 1000) {
      throw new ApiError('Description must be less than 1000 characters', 400);
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      throw new ApiError('AI service not configured', 500);
    }

    const openaiModel = Deno.env.get('OPENAI_MODEL_SEGMENT') || 'gpt-4o-mini';

    const supabase = createServiceClient();

    // Fetch industries and company sizes for the prompt
    const [industriesResult, companySizesResult] = await Promise.all([
      supabase.from('option_industries').select('industry_id, value').order('value'),
      supabase
        .from('option_company_sizes')
        .select('company_size_id, value')
        .order('company_size_id'),
    ]);

    if (industriesResult.error) {
      console.error('Failed to fetch industries:', industriesResult.error);
      throw new ApiError('Failed to fetch filter options', 500);
    }

    if (companySizesResult.error) {
      console.error('Failed to fetch company sizes:', companySizesResult.error);
      throw new ApiError('Failed to fetch filter options', 500);
    }

    const industries = (industriesResult.data as OptionIndustry[]) || [];
    const companySizes = (companySizesResult.data as OptionCompanySize[]) || [];

    const industryValues = industries.map((i) => i.value);
    const companySizeValues = companySizes.map((cs) => cs.value);

    // Build the system prompt with available options
    const systemPrompt = buildSystemPrompt(industryValues, companySizeValues);

    console.log('Calling OpenAI API with model:', openaiModel);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: trimmedDescription },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      throw new ApiError('AI service error', 500);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Empty response from OpenAI');
      throw new ApiError('AI generated empty response', 500);
    }

    console.log('OpenAI response:', content);

    // Parse the AI response
    let rawResponse: RawAiSegmentResponse;
    try {
      rawResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new ApiError('AI generated invalid response format', 500);
    }

    // Validate required fields
    if (!rawResponse.name || typeof rawResponse.name !== 'string') {
      throw new ApiError('AI did not generate a valid segment name', 500);
    }

    if (!rawResponse.filters || typeof rawResponse.filters !== 'object') {
      throw new ApiError('AI did not generate valid filters', 500);
    }

    // Validate that at least one filter is present
    const { filters } = rawResponse;
    const hasFilter =
      filters.country ||
      filters.location ||
      filters.employees ||
      (filters.categories && filters.categories.length > 0) ||
      (filters.technographics && filters.technographics.length > 0);

    if (!hasFilter) {
      throw new ApiError(
        'AI could not generate filters from the description. Please provide more specific criteria.',
        400
      );
    }

    // Map the AI response to the expected format
    // Convert single employees value to array if present
    const mappedFilters: AiGeneratedSegmentResponse['filters'] = {};

    if (filters.country) {
      mappedFilters.country = filters.country;
    }

    if (filters.location) {
      mappedFilters.location = filters.location;
    }

    if (filters.employees) {
      // Find the matching company size and add to array
      const matchingSize = companySizes.find(
        (cs) => cs.value.toLowerCase() === filters.employees?.toLowerCase()
      );
      if (matchingSize) {
        mappedFilters.employees = [matchingSize.value];
      }
    }

    if (filters.categories && filters.categories.length > 0) {
      // Validate categories against available industries
      const validCategories = filters.categories.filter((cat) =>
        industryValues.some((ind) => ind.toLowerCase() === cat.toLowerCase())
      );
      if (validCategories.length > 0) {
        // Map to exact industry values (correct casing)
        mappedFilters.categories = validCategories.map((cat) => {
          const match = industryValues.find((ind) => ind.toLowerCase() === cat.toLowerCase());
          return match || cat;
        });
      }
    }

    if (filters.technographics && filters.technographics.length > 0) {
      mappedFilters.technographics = filters.technographics;
    }

    const response: AiGeneratedSegmentResponse = {
      name: rawResponse.name.trim(),
      filters: mappedFilters,
    };

    console.log('Returning AI-generated segment:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in segments-ai:', error);

    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }

    // For unexpected errors, create an ApiError instance
    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
    return createErrorResponse(apiError);
  }
});
