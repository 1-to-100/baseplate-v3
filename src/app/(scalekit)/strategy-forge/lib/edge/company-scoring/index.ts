/// <reference lib="deno.ns" />
/**
 * Company scoring Edge Function.
 * Scores one company for one customer using OpenAI and Diffbot data.
 */
import { corsHeaders } from '../../../../../../../supabase/functions/_shared/cors.ts';
import {
  ApiError,
  createErrorResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import {
  providers,
  withLogging,
} from '../../../../../../../supabase/functions/_shared/llm/index.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';
import {
  safeParseCompanyScoringRequest,
  safeParseCompanyScoringResult,
  type CompanyScoringResult,
} from './schema.ts';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const COMPANY_SCORING_SYSTEM_PROMPT = `You are an assistant that generates company scoring results in a structured JSON format.

Your task is to analyze company data and provide a comprehensive score and description based on the following criteria:

**Scoring Criteria:**
- Company size and market presence
- Revenue and financial stability
- Location and market accessibility
- Technology stack and innovation
- Industry reputation and track record
- Growth potential and scalability
- Competitive advantages
- Risk factors

**Output Format:**
You must respond with a JSON object containing exactly these three fields:
- \`score\`: A number from 0 to 10 indicating the company's overall score
- \`short_description\`: A brief 1-2 sentence summary of your scoring rationale
- \`full_description\`: A detailed explanation of your analysis, including specific factors considered and evidence supporting your score

**Scoring Guidelines:**
- 0-3: Poor choice (significant risks, limited potential)
- 4-6: Average choice (some positive factors, but notable concerns)
- 7-8: Good choice (strong fundamentals, minor concerns)
- 9-10: Excellent choice (outstanding in most criteria)

**Important Notes:**
- Base your analysis on the provided company data
- If specific information is missing, make reasonable assumptions based on industry patterns
- Be objective and evidence-based in your assessment
- Use clear, professional language
- Do not invent specific company names, locations, or details not provided in the input`;

export interface HandlerDeps {
  createServiceClient: () => ReturnType<typeof createServiceClient>;
  callOpenaiScoring: (userMessage: string) => Promise<{ content: string }>;
}

const defaultDeps: HandlerDeps = {
  createServiceClient,
  callOpenaiScoring: async (userMessage: string) => {
    const openai = providers.openai();
    const openaiModel = 'gpt-4o-mini';
    const completion = (await withLogging('openai', 'chat.completions.create', openaiModel, () =>
      openai.chat.completions.create({
        model: openaiModel,
        messages: [
          { role: 'system', content: COMPANY_SCORING_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'company_scoring_response',
            schema: {
              type: 'object',
              properties: {
                score: {
                  type: 'number',
                  minimum: 0,
                  maximum: 10,
                  description: 'Company score from 0 to 10',
                },
                short_description: {
                  type: 'string',
                  minLength: 1,
                  description: 'Brief description',
                },
                full_description: {
                  type: 'string',
                  minLength: 1,
                  description: 'Detailed explanation',
                },
              },
              required: ['score', 'short_description', 'full_description'],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.7,
      })
    )) as { choices?: Array<{ message?: { content?: string | null } }> };
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
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new ApiError('Invalid request body', 400);
      }

      const parseResult = safeParseCompanyScoringRequest(body);
      if (!parseResult.success) {
        throw new ApiError('company_id and customer_id are required (valid UUIDs)', 400);
      }

      const { company_id: companyId, customer_id: customerId } = parseResult.data;
      const supabase = deps.createServiceClient();

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('company_id')
        .eq('company_id', companyId)
        .single();

      if (companyError || !company) {
        throw new ApiError('Company not found', 404);
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('customer_id')
        .eq('customer_id', customerId)
        .single();

      if (customerError || !customer) {
        throw new ApiError('Customer not found', 404);
      }

      const { data: customerCompany, error: ccError } = await supabase
        .from('customer_companies')
        .select('scoring_results_updated_at')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .single();

      if (ccError || !customerCompany) {
        throw new ApiError('Customer company record not found', 404);
      }

      const updatedAt = customerCompany.scoring_results_updated_at;
      if (updatedAt) {
        const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
        if (new Date(updatedAt) > cutoff) {
          return new Response(JSON.stringify({ status: 'skipped', reason: 'recently_scored' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }

      const { data: metadata, error: metaError } = await supabase
        .from('company_metadata')
        .select('diffbot_json')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (metaError || !metadata?.diffbot_json) {
        throw new ApiError(
          'Diffbot data not found for company; run segment processing first.',
          400
        );
      }

      const diffbotJson = metadata.diffbot_json as Record<string, unknown>;
      const userMessage = `Process scoring for company data: ${JSON.stringify(diffbotJson)}`;

      const { content } = await deps.callOpenaiScoring(userMessage);

      if (!content) {
        throw new ApiError('No response content from OpenAI', 500);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new ApiError('Failed to parse OpenAI response', 500);
      }

      const resultParse = safeParseCompanyScoringResult(parsed);
      if (!resultParse.success) {
        throw new ApiError('OpenAI response missing valid score or descriptions', 500);
      }

      const result: CompanyScoringResult = resultParse.data;
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('customer_companies')
        .update({
          last_scoring_results: {
            score: result.score,
            short_description: result.short_description,
            full_description: result.full_description,
          },
          scoring_results_updated_at: now,
          updated_at: now,
        })
        .eq('customer_id', customerId)
        .eq('company_id', companyId);

      if (updateError) {
        throw new ApiError('Failed to save scoring results', 500);
      }

      return new Response(
        JSON.stringify({
          status: 'completed',
          score: result.score,
          short_description: result.short_description,
          full_description: result.full_description,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
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
