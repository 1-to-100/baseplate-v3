/// <reference lib="deno.ns" />
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import {
  providers,
  withLogging,
} from '../../../../../../../supabase/functions/_shared/llm/index.ts';
import { segmentsJsonSchema, type SegmentItem, type SegmentsResponse } from './schema.ts';

// Request body interface
interface RequestBody {
  customer_id: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Type definitions
interface CustomerInfo {
  customer_info_id: string;
  customer_id: string | null;
  company_name: string;
  problem_overview: string;
  solution_overview: string;
  one_sentence_summary: string;
  tagline: string;
  company_website_url?: string;
  content_authoring_prompt?: string;
  created_at: string;
  updated_at: string;
}

// System prompt for segment generation
const SYSTEM_PROMPT = `You are an expert market segmentation strategist and customer research specialist with deep expertise in market analysis, customer segmentation, and strategic targeting. Your role is to analyze company website content and identify the key market segments that the company serves or should target.

When website content is provided, carefully analyze:
- Market positioning and target market signals
- Product/service offerings and their differentiation
- Customer types and market categories being addressed
- Industry verticals and use cases
- Geographic, demographic, or psychographic segmentation patterns
- Business model and go-to-market strategy signals`;

/**
 * Generates the user prompt for segment analysis
 */
function generateSegmentUserPrompt(companyUrl: string, customerInfo: CustomerInfo): string {
  return `You are analyzing the website ${companyUrl} to identify and propose market segments.

ANALYSIS APPROACH:
You will be provided with content scraped from the company website. Analyze this content to understand:
- What market segments does this company target?
- How does the company categorize or segment their customers?
- What distinct customer groups or market categories are being served?
- What are the defining characteristics of each segment?

COMPANY INFORMATION:
- Company Name: ${customerInfo.company_name}
- Tagline: ${customerInfo.tagline}
- One Sentence Summary: ${customerInfo.one_sentence_summary}
- Problem Overview: ${customerInfo.problem_overview}
- Solution Overview: ${customerInfo.solution_overview}
${customerInfo.content_authoring_prompt ? `- Content Authoring Context: ${customerInfo.content_authoring_prompt}` : ''}

YOUR TASK:
Based on your analysis of the actual website content, identify 3-8 distinct market segments that represent the company's target markets or customer categories.

For each segment, provide:
1. Name: A clear, descriptive name for the segment (e.g., "Enterprise Healthcare Providers", "Small Business E-Commerce", "Financial Services Mid-Market", "Consumer - Tech Early Adopters")
2. Description: A one-paragraph (4-6 sentences) description that includes:
   - The defining characteristics of this segment
   - Market size or scope (if identifiable from content)
   - Key needs or requirements specific to this segment
   - Why this segment is distinct from others
   - How the company's solution serves this segment differently

SEGMENTATION APPROACHES TO CONSIDER:
- Industry verticals (healthcare, finance, retail, manufacturing, etc.)
- Company size (enterprise, mid-market, SMB, startup)
- Geography (regions, countries, markets)
- Use cases or application types
- Customer maturity or sophistication level
- Business model (B2B, B2C, B2B2C)
- Technology adoption stage

IMPORTANT GUIDELINES:
- Create segments that are mutually exclusive and collectively exhaustive (MECE) where possible
- Make segments specific and actionable for targeting and messaging
- Base segments on actual signals from the website content
- Ensure segments are distinct from each other
- Focus on how the company actually segments or should segment their market
- Include 3-8 segments (not too granular, not too broad)

Return your response as a JSON object with the following structure:
{
  "segments": [
    {
      "name": "string (segment name, e.g., 'Enterprise Healthcare Providers')",
      "description": "string (one paragraph, 4-6 sentences describing the segment)"
    }
  ]
}

CRITICAL: You MUST return your response as valid JSON only, with no additional text, markdown formatting, or code blocks. Return ONLY the JSON object.`;
}

/**
 * Validates the generated segments response
 */
function validateSegmentsResponse(response: unknown): SegmentsResponse {
  let data: Record<string, unknown>;

  // Handle array response
  if (Array.isArray(response)) {
    if (response.length === 0) {
      throw new Error('No segments generated');
    }
    data = response[0] as Record<string, unknown>;
  }
  // Handle object response
  else if (response && typeof response === 'object') {
    data = response as Record<string, unknown>;
  } else {
    throw new Error('Invalid response format: Expected object or array');
  }

  // Validate segments array exists
  if (!Array.isArray(data.segments)) {
    throw new Error('No segments array in response');
  }

  // Validate and filter segments
  const segments: SegmentItem[] = data.segments
    .filter(
      (item: unknown): item is { name: string; description: string } =>
        typeof item === 'object' &&
        item !== null &&
        'name' in item &&
        'description' in item &&
        typeof (item as { name: unknown }).name === 'string' &&
        typeof (item as { description: unknown }).description === 'string' &&
        (item as { name: string }).name.trim() !== '' &&
        (item as { description: string }).description.trim() !== ''
    )
    .map((item) => ({
      name: item.name.trim(),
      description: item.description.trim(),
    }));

  if (segments.length === 0) {
    throw new Error('No valid segments were generated');
  }

  return { segments };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== SUGGEST SEGMENTS STARTED ===');

    // Parse request body to get customer_id
    let requestBody: RequestBody;
    try {
      const text = await req.text();
      if (!text) {
        return new Response(
          JSON.stringify({
            error: 'Request body is required',
            usage: 'Please provide customer_id in the request body: { "customer_id": "uuid" }',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      requestBody = JSON.parse(text);
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          usage: 'Please provide customer_id in the request body: { "customer_id": "uuid" }',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = requestBody.customer_id;
    if (!customerId) {
      return new Response(
        JSON.stringify({
          error: 'customer_id is required',
          usage: 'Please provide customer_id in the request body: { "customer_id": "uuid" }',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Customer ID from request:', customerId);

    // Authentication - Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with auth context
    // This way your row-level-security (RLS) policies are applied
    // See: https://supabase.com/docs/guides/functions/auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Extract token from Authorization header and pass to getUser()
    // This is the recommended approach per Supabase docs
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    // Get Baseplate context
    const { data: userRecord, error: userRecordError } = await supabase
      .from('users')
      .select('customer_id, user_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (userRecordError || !userRecord) {
      throw new Error('Failed to load Baseplate user record');
    }

    const { data: canAccess, error: accessError } = await supabase.rpc('can_access_customer', {
      target_customer_id: customerId,
    });

    if (accessError) {
      throw new Error('Unable to verify customer access: ' + accessError.message);
    }

    if (!canAccess) {
      return new Response(
        JSON.stringify({ error: 'You do not have access to the requested customer.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseplateUserId = userRecord.user_id;
    console.log('Baseplate user_id:', baseplateUserId);
    console.log('User customer_id:', userRecord.customer_id);

    // Fetch customer info
    console.log('Fetching customer info for customer_id:', customerId);
    const { data: customerInfo, error: customerInfoError } = await supabase
      .from('customer_info')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerInfoError || !customerInfo) {
      throw new Error(
        'Failed to fetch customer info: ' + (customerInfoError?.message || 'No customer info found')
      );
    }

    console.log('Customer info retrieved:', customerInfo.company_name);

    // Determine website URL
    let websiteUrl = customerInfo.company_website_url;

    if (!websiteUrl || websiteUrl.trim() === '') {
      // Try to construct URL from company name
      const companyNameSlug = customerInfo.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '');
      websiteUrl = `https://www.${companyNameSlug}.com`;
      console.log('No website URL in customer_info, constructed:', websiteUrl);
    }

    console.log('Using website URL:', websiteUrl);

    // Build the prompt with customer info
    const userPrompt = generateSegmentUserPrompt(websiteUrl, customerInfo as CustomerInfo);

    console.log('System prompt length:', SYSTEM_PROMPT.length);
    console.log('User prompt length:', userPrompt.length);

    // Get OpenAI client from provider adapters (handles credentials automatically)
    const openai = providers.openai();

    // Call GPT-5 with Responses API and web_search tool
    console.log('Calling GPT-5 with web_search via Responses API...');

    // Extract domain from URL for filtering (remove http/https prefix)
    const urlObj = new URL(websiteUrl);
    const domain = urlObj.hostname.replace(/^www\./, ''); // Remove www. prefix if present
    console.log('Filtering web search to domain:', domain);

    // Combine system and user prompts into a single input string for GPT-5
    const combinedPrompt = `${SYSTEM_PROMPT}

${userPrompt}`;

    console.log('Input prompt length:', combinedPrompt.length);

    // Use Responses API with web_search tool (wrapped with logging)
    const responseData = await withLogging('openai', 'responses.create', 'gpt-5', () =>
      openai.responses.create({
        model: 'gpt-5',
        input: combinedPrompt,
        tools: [
          {
            type: 'web_search' as const,
            search_context_size: 'medium' as const,
            filters: { allowed_domains: [domain] },
          },
        ],
        text: {
          format: {
            type: 'json_schema' as const,
            name: segmentsJsonSchema.name,
            strict: segmentsJsonSchema.strict,
            schema: segmentsJsonSchema.schema,
          },
        },
      })
    );

    console.log('Responses API response received');
    console.log('Response status:', responseData.status);

    // Extract text using SDK's output_text helper
    const responseContent = responseData.output_text;
    if (!responseContent) {
      console.error('No output_text in response:', responseData);
      throw new Error('No text content in OpenAI response');
    }
    console.log('Response content length:', responseContent.length);

    // Parse the response
    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseContent);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate and extract segments data
    const segmentsData = validateSegmentsResponse(parsedResponse);
    console.log('Segments data validated');
    console.log(`Generated ${segmentsData.segments.length} segments`);

    // Insert segments into database
    console.log('=== INSERTING SEGMENTS INTO DATABASE ===');

    const segmentRecords = segmentsData.segments.map((segment) => ({
      name: segment.name,
      description: segment.description,
      code: null,
      external_id: null,
      customer_id: customerId,
      created_by: baseplateUserId,
      updated_by: baseplateUserId,
    }));

    console.log(`Inserting ${segmentRecords.length} segments...`);

    const { data: insertedSegments, error: insertError } = await supabase
      .from('segments')
      .insert(segmentRecords)
      .select('segment_id, name');

    if (insertError) {
      console.error('Error inserting segments:', insertError);
      throw new Error('Failed to insert segments: ' + insertError.message);
    }

    const insertedCount = insertedSegments?.length || 0;
    console.log(`✓ Successfully inserted ${insertedCount} segments`);

    console.log('=== SEGMENT GENERATION COMPLETE ===');

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        company_name: customerInfo.company_name,
        analyzed_url: websiteUrl,
        segments_created: insertedCount,
        segments: insertedSegments,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in suggest-segments:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unexpected error',
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/* To invoke:

  1. Set environment variables:
     - SUPABASE_URL
     - SUPABASE_ANON_KEY
     - OPENAI_API_KEY

  2. Deploy: `supabase functions deploy suggest-segments`

  3. Call from client with customer_id argument:
     
     const { data, error } = await supabase.functions.invoke('suggest-segments', {
       body: { customer_id: 'uuid-here' }
     });

     // Response format:
     // {
     //   success: true,
     //   company_name: 'Company Name',
     //   analyzed_url: 'https://www.company.com',
     //   segments_created: 5,
     //   segments: [
     //     {
     //       segment_id: 'uuid',
     //       name: 'Enterprise Healthcare Providers'
     //     },
     //     // ... more segments
     //   ]
     // }

  IMPORTANT NOTES:
  
  1. CUSTOMER_ID REQUIRED:
     This function requires a customer_id in the request body.
     The function validates that the customer_id matches the authenticated user's customer.
  
  2. OPENAI RESPONSES API WITH WEB SEARCH:
     The function uses OpenAI's Responses API (beta) with web_search tool enabled.
     - API Endpoint: POST https://api.openai.com/v1/responses
     - Requires OpenAI-Beta: responses=v1 header
     - Model: gpt-5 (GPT-5)
     - Web search tool allows the AI to browse and spider the website in real-time
     - Domain filtering ensures searches are limited to the customer's domain only
  
  3. DATABASE WRITES:
     This function writes directly to the segments table.
     Each segment includes:
     - name: AI-generated segment name
     - description: AI-generated segment description
     - customer_id: From request body (validated)
     - created_by/updated_by: Baseplate user_id
     - code: null (can be added later)
     - external_id: null (can be added later)
  
  4. AI ANALYSIS:
     GPT-5 analyzes:
     - Actual website content fetched via web_search tool
     - Multiple pages from the website
     - Company information from customer_info table
     - Market positioning, target markets, and segmentation signals
     - Generates 3-8 distinct market segments
  
  5. SEGMENTATION TYPES:
     The AI considers multiple segmentation approaches:
     - Industry verticals
     - Company size (enterprise, SMB, etc.)
     - Geography
     - Use cases
     - Business model (B2B, B2C)
     - Technology adoption stage
  
  6. WEBSITE URL:
     If customer_info has a company_website_url, it uses that.
     If not, it constructs a URL from the company name.
     The URL is used for web search domain filtering.

*/
