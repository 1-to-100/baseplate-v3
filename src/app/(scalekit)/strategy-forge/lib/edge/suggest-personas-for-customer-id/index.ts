/// <reference lib="deno.ns" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

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

interface Persona {
  name: string;
  description: string;
}

interface PersonasResponse {
  personas: Persona[];
}

// System prompt for persona generation
const SYSTEM_PROMPT = `You are an expert marketing strategist and customer research specialist with deep expertise in persona development, customer segmentation, and buyer psychology. Your role is to analyze company website content and identify the key buying and user personas that the company serves.

When website content is provided, carefully analyze:
- Target audience signals and messaging patterns
- Product/service positioning and value propositions
- Use cases and customer problems being solved
- Industry-specific language and terminology
- Customer testimonials or case studies (if present)
- Content structure and navigation patterns`;

/**
 * Generates the user prompt for persona analysis
 */
function generatePersonaUserPrompt(companyUrl: string, customerInfo: CustomerInfo): string {
  return `You are analyzing the website ${companyUrl} to identify and propose buying and user personas.

ANALYSIS APPROACH:
You will be provided with content scraped from the company website. Analyze this content to understand:
- Who are the primary target audiences?
- What buyer personas does this company serve?
- What user personas interact with their products/services?
- What are the key characteristics, needs, and pain points of each persona?

COMPANY INFORMATION:
- Company Name: ${customerInfo.company_name}
- Tagline: ${customerInfo.tagline}
- One Sentence Summary: ${customerInfo.one_sentence_summary}
- Problem Overview: ${customerInfo.problem_overview}
- Solution Overview: ${customerInfo.solution_overview}
${customerInfo.content_authoring_prompt ? `- Content Authoring Context: ${customerInfo.content_authoring_prompt}` : ''}

YOUR TASK:
Based on your analysis of the actual website content, identify 3-7 distinct personas that represent the company's target customers and users.

For each persona, provide:
1. Name: A descriptive name for the persona (e.g., "Enterprise IT Director", "Small Business Owner", "Marketing Manager", "End User - Healthcare Professional")
2. Description: A one-paragraph (4-6 sentences) description that includes:
   - Their role and context
   - Key needs and goals
   - Main pain points or challenges
   - How they interact with or benefit from the company's solution
   - Decision-making factors or purchasing considerations (for buyer personas)

IMPORTANT GUIDELINES:
- Include both BUYING personas (decision-makers, budget holders) and USER personas (people who actually use the product/service)
- Make personas specific and actionable, not generic
- Base personas on actual signals from the website content
- Ensure personas are distinct from each other
- Focus on B2B personas if the company serves businesses, B2C if serving consumers, or both if applicable

Return your response as a JSON object with the following structure:
{
  "personas": [
    {
      "name": "string (persona name, e.g., 'Enterprise IT Director')",
      "description": "string (one paragraph, 4-6 sentences describing the persona)"
    }
  ]
}

CRITICAL: You MUST return your response as valid JSON only, with no additional text, markdown formatting, or code blocks. Return ONLY the JSON object.`;
}

/**
 * Validates the generated personas response
 */
function validatePersonasResponse(response: unknown): PersonasResponse {
  let data: Record<string, unknown>;

  // Handle array response
  if (Array.isArray(response)) {
    if (response.length === 0) {
      throw new Error('No personas generated');
    }
    data = response[0] as Record<string, unknown>;
  }
  // Handle object response
  else if (response && typeof response === 'object') {
    data = response as Record<string, unknown>;
  } else {
    throw new Error('Invalid response format: Expected object or array');
  }

  // Validate personas array exists
  if (!Array.isArray(data.personas)) {
    throw new Error('No personas array in response');
  }

  // Validate and filter personas
  const personas: Persona[] = data.personas
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

  if (personas.length === 0) {
    throw new Error('No valid personas were generated');
  }

  return { personas };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== SUGGEST PERSONAS STARTED ===');

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

    const { data: accessAllowed, error: accessError } = await supabase.rpc('can_access_customer', {
      target_customer_id: customerId,
    });

    if (accessError) {
      throw new Error('Unable to verify customer access: ' + accessError.message);
    }

    if (!accessAllowed) {
      return new Response(
        JSON.stringify({ error: 'You do not have access to the requested customer.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const userPrompt = generatePersonaUserPrompt(websiteUrl, customerInfo as CustomerInfo);

    console.log('System prompt length:', SYSTEM_PROMPT.length);
    console.log('User prompt length:', userPrompt.length);

    // Get OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    // Call GPT-5 with Responses API and web_search tool
    console.log('Calling GPT-5 with web_search via Responses API...');

    // Extract domain from URL for filtering (remove http/https prefix)
    const urlObj = new URL(websiteUrl);
    const domain = urlObj.hostname.replace(/^www\./, ''); // Remove www. prefix if present
    console.log('Filtering web search to domain:', domain);

    // Combine system and user prompts into a single input string for GPT-5
    const combinedPrompt = `${SYSTEM_PROMPT}

${userPrompt}`;

    // Use Responses API with web_search tool
    // https://platform.openai.com/docs/guides/tools-web-search?api-mode=responses
    // https://platform.openai.com/docs/api-reference/responses/create
    const responsePayload = {
      model: 'gpt-5', // GPT-5 supports web_search
      input: combinedPrompt, // Single combined prompt string
      tools: [
        {
          type: 'web_search',
          // Domain filtering - limit results to customer's domain only
          filters: {
            allowed_domains: [domain], // Allow-list of domains (max 20)
          },
        },
      ],
    };

    console.log('Request payload model:', responsePayload.model);
    console.log('Input prompt length:', combinedPrompt.length);

    // Call the Responses API endpoint directly
    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
        'OpenAI-Beta': 'responses=v1', // Required beta header for Responses API
      },
      body: JSON.stringify(responsePayload),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await apiResponse.json();
    console.log('Responses API response received');
    console.log('Response status:', responseData.status);

    // Extract content from Responses API format
    // The output is an array containing reasoning, web_search_call, and message items
    // We need to find the message item and extract its text content
    const output = responseData.output || [];

    // Find the message item in the output array
    const messageItem = output.find((item: { type: string }) => item.type === 'message') as
      | { type: string; content?: Array<{ type: string; text?: string }> }
      | undefined;

    if (!messageItem) {
      console.error('No message item found in output:', responseData);
      throw new Error('No message content in OpenAI response');
    }

    // Extract text from the message content
    const content = messageItem.content || [];
    const textItem = content.find(
      (item: { type: string; text?: string }) => item.type === 'output_text'
    ) as { type: string; text?: string } | undefined;

    if (!textItem || !textItem.text) {
      console.error('No text content found in message:', messageItem);
      throw new Error('No text in message content');
    }

    const responseContent = textItem.text;
    console.log('Response content length:', responseContent.length);

    // Log web search calls
    const webSearchCalls = output.filter(
      (item: { type: string }) => item.type === 'web_search_call'
    ) as Array<{
      type: string;
      action?: { query?: string; type?: string };
    }>;
    console.log(`✓ Web search performed: ${webSearchCalls.length} searches`);
    webSearchCalls.forEach((call, idx: number) => {
      console.log(`  Search ${idx + 1}: ${call.action?.query || call.action?.type || 'unknown'}`);
    });

    // Parse the response
    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseContent);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate and extract personas data
    const personasData = validatePersonasResponse(parsedResponse);
    console.log('Personas data validated');
    console.log(`Generated ${personasData.personas.length} personas`);

    console.log('=== PERSONA GENERATION COMPLETE ===');

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        company_name: customerInfo.company_name,
        analyzed_url: websiteUrl,
        personas_count: personasData.personas.length,
        personas: personasData.personas,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in suggest-personas:', error);
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

  2. Deploy: `supabase functions deploy suggest-personas`

  3. Call from client with customer_id argument:
     
     const { data, error } = await supabase.functions.invoke('suggest-personas', {
       body: { customer_id: 'uuid-here' }
     });

     // Response format:
     // {
     //   success: true,
     //   company_name: 'Company Name',
     //   analyzed_url: 'https://www.company.com',
     //   personas_count: 5,
     //   personas: [
     //     {
     //       name: 'Enterprise IT Director',
     //       description: 'A senior-level decision-maker responsible for...'
     //     },
     //     {
     //       name: 'Small Business Owner',
     //       description: 'An entrepreneur who needs...'
     //     },
     //     // ... more personas
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
  
  3. DOMAIN FILTERING:
     Web search results are filtered to the customer's domain only:
     - Extracts domain from the company website URL
     - If no URL in customer_info, constructs one from company name
     - Passes domain to filters.allowed_domains parameter
     - Ensures AI only analyzes content from the customer's website
  
  4. AI ANALYSIS:
     GPT-5 analyzes:
     - Actual website content fetched via web_search tool
     - Multiple pages from the website (homepage, about, products, etc.)
     - Company information from customer_info table
     - Target audience signals, messaging patterns, and value propositions
     - Generates 3-7 distinct buying and user personas
  
  5. PERSONA TYPES:
     The AI identifies both:
     - BUYING PERSONAS: Decision-makers, budget holders, influencers
     - USER PERSONAS: People who actually use the product/service
     Each persona includes role, needs, pain points, and decision factors
  
  6. NO DATABASE WRITES:
     This function only reads from customer_info table.
     It does not write personas to the database.
     The frontend is responsible for displaying and potentially saving personas.

  7. WEBSITE URL:
     If customer_info has a company_website_url, it uses that.
     If not, it constructs a URL from the company name.
     The URL is used for web search domain filtering.

*/
