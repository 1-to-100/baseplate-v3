/// <reference lib="deno.ns" />
import { corsHeaders } from '../../../../../../../supabase/functions/_shared/cors.ts';
import { authenticateRequest } from '../../../../../../../supabase/functions/_shared/auth.ts';
import {
  ApiError,
  createErrorResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import {
  providers,
  withLogging,
} from '../../../../../../../supabase/functions/_shared/llm/index.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';
import { buildSystemPrompt } from './prompt.ts';
import {
  safeParseAskAiSegmentRequest,
  safeParseRawAiSegmentResponse,
  type AiGeneratedSegmentResponse,
  type RawAiSegmentResponse,
} from './schema.ts';
import type { OptionIndustry, OptionCompanySize } from './types.ts';

export interface HandlerDeps {
  authenticateRequest: (req: Request) => Promise<{ user_id: string; customer_id: string | null }>;
  createServiceClient: () => ReturnType<typeof createServiceClient>;
  callOpenaiChat: (params: {
    model: string;
    systemPrompt: string;
    userContent: string;
  }) => Promise<{ content: string }>;
}

const defaultDeps: HandlerDeps = {
  authenticateRequest: async (req) => {
    const user = await authenticateRequest(req);
    return { user_id: user.user_id, customer_id: user.customer_id };
  },
  createServiceClient,
  callOpenaiChat: async ({ model, systemPrompt, userContent }) => {
    const openai = providers.openai();
    const completion = await withLogging('openai', 'chat.completions.create', model, () =>
      openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      })
    );
    const content = completion.choices?.[0]?.message?.content ?? '';
    return { content };
  },
};

export function createHandler(deps: HandlerDeps = defaultDeps) {
  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { customer_id } = await deps.authenticateRequest(req);
      if (!customer_id) {
        throw new ApiError('User must belong to a customer', 403);
      }

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new ApiError('Invalid request body', 400);
      }

      const parseResult = safeParseAskAiSegmentRequest(body);
      if (!parseResult.success) {
        const first = parseResult.error.issues[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Validation failed';
        throw new ApiError(msg, 400);
      }

      const description = parseResult.data.description.trim();
      if (description.length < 3) {
        throw new ApiError('Description must be at least 3 characters', 400);
      }
      if (description.length > 1000) {
        throw new ApiError('Description must be less than 1000 characters', 400);
      }

      const openaiModel = Deno.env.get('OPENAI_MODEL_SEGMENT') || 'gpt-4o-mini';
      const supabase = deps.createServiceClient();

      const [industriesResult, companySizesResult] = await Promise.all([
        supabase.from('option_industries').select('industry_id, value').order('value'),
        supabase
          .from('option_company_sizes')
          .select('company_size_id, value')
          .order('company_size_id'),
      ]);

      if (industriesResult.error) {
        throw new ApiError('Failed to fetch filter options', 500);
      }
      if (companySizesResult.error) {
        throw new ApiError('Failed to fetch filter options', 500);
      }

      const industries = (industriesResult.data as OptionIndustry[]) || [];
      const companySizes = (companySizesResult.data as OptionCompanySize[]) || [];
      const industryValues = industries.map((i) => i.value);
      const companySizeValues = companySizes.map((cs) => cs.value);
      const systemPrompt = buildSystemPrompt(industryValues, companySizeValues);

      const { content } = await deps.callOpenaiChat({
        model: openaiModel,
        systemPrompt,
        userContent: description,
      });

      if (!content) {
        throw new ApiError('AI generated empty response', 500);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new ApiError('AI generated invalid response format', 500);
      }

      const rawParse = safeParseRawAiSegmentResponse(parsed);
      if (!rawParse.success) {
        throw new ApiError('AI generated invalid response format', 500);
      }

      const rawResponse: RawAiSegmentResponse = rawParse.data;
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

      const mappedFilters: AiGeneratedSegmentResponse['filters'] = {};
      if (filters.country) mappedFilters.country = filters.country;
      if (filters.location) mappedFilters.location = filters.location;
      if (filters.employees) {
        const matchingSize = companySizes.find(
          (cs) => cs.value.toLowerCase() === filters.employees?.toLowerCase()
        );
        if (matchingSize) mappedFilters.employees = [matchingSize.value];
      }
      if (filters.categories && filters.categories.length > 0) {
        const validCategories = filters.categories.filter((cat) =>
          industryValues.some((ind) => ind.toLowerCase() === cat.toLowerCase())
        );
        if (validCategories.length > 0) {
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

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return createErrorResponse(error);
      }
      return createErrorResponse(
        new ApiError(error instanceof Error ? error.message : 'Internal server error', 500)
      );
    }
  };
}

Deno.serve(createHandler());
