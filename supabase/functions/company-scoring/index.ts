/**
 * Company scoring Edge Function.
 * Scores one company for one customer using OpenAI and Diffbot data.
 * Requires OPENAI_API_KEY in Supabase Edge Function secrets.
 */
import { corsHeaders } from '../_shared/cors.ts';
import { ApiError, createErrorResponse } from '../_shared/errors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

interface CompanyScoringBody {
  company_id: string;
  customer_id: string;
}

interface CompanyScoringResult {
  score: number;
  short_description: string;
  full_description: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: CompanyScoringBody;
    try {
      body = await req.json();
    } catch {
      throw new ApiError('Invalid request body', 400);
    }

    const companyId = body?.company_id;
    const customerId = body?.customer_id;
    if (
      !companyId ||
      !customerId ||
      typeof companyId !== 'string' ||
      typeof customerId !== 'string' ||
      !UUID_REGEX.test(companyId.trim()) ||
      !UUID_REGEX.test(customerId.trim())
    ) {
      throw new ApiError('company_id and customer_id are required (valid UUIDs)', 400);
    }

    const supabase = createServiceClient();

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
        return new Response(
          JSON.stringify({ status: 'skipped', reason: 'recently_scored' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
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

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new ApiError('OPENAI_API_KEY not configured', 500);
    }

    const diffbotJson = metadata.diffbot_json as Record<string, unknown>;
    const userMessage = `Process scoring for company data: ${JSON.stringify(diffbotJson)}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
                  description: 'Brief description of the company score rationale',
                },
                full_description: {
                  type: 'string',
                  minLength: 1,
                  description:
                    'Detailed explanation of the company score with supporting evidence',
                },
              },
              required: ['score', 'short_description', 'full_description'],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.7,
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
      throw new ApiError('No response content from OpenAI', 500);
    }

    let result: CompanyScoringResult;
    try {
      result = JSON.parse(content) as CompanyScoringResult;
    } catch {
      throw new ApiError('Failed to parse OpenAI response', 500);
    }

    if (
      typeof result.score !== 'number' ||
      result.score < 0 ||
      result.score > 10
    ) {
      throw new ApiError(`Invalid score range: ${result.score}. Score must be between 0 and 10`, 500);
    }
    if (typeof result.short_description !== 'string' || !result.short_description.trim()) {
      throw new ApiError('OpenAI response missing valid short_description', 500);
    }
    if (typeof result.full_description !== 'string' || !result.full_description.trim()) {
      throw new ApiError('OpenAI response missing valid full_description', 500);
    }

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
      console.error('Failed to update customer_companies:', updateError);
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
    console.error('Error in company-scoring:', error);
    return createErrorResponse(
      new ApiError(error instanceof Error ? error.message : 'Internal server error', 500)
    );
  }
});
