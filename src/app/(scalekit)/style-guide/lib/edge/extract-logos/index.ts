/// <reference lib="deno.ns" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

// Request body interface
interface RequestBody {
  visual_style_guide_id: string;
  starting_url: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Type definitions
interface LogoTypeOption {
  logo_type_option_id: string;
  display_name: string;
  programmatic_name: string;
  description: string;
}

interface LogoAssetData {
  logo_type_option_id: string;
  description?: string;
  file_url?: string;
}

interface ExtractedLogos {
  logo_assets: LogoAssetData[];
}

// System prompt for logo extraction
const SYSTEM_PROMPT = `You are an expert brand designer and logo analyst. Your role is to analyze websites, take a screenshot of two or more pages, and identify all logo variations and their usage patterns, including primary logos, secondary logos, icons, wordmarks, and stacked versions.`;

/**
 * Generates the user prompt for logo extraction
 */
function generateLogoExtractionPrompt(
  websiteUrl: string,
  logoTypeOptions: LogoTypeOption[]
): string {
  return `Analyze the website ${websiteUrl} to identify all logo variations.

ANALYSIS APPROACH:
Browse the website, take a screenshot of two or more pages, and look for logos in:
- Header/navigation areas
- Footer
- Favicon
- About/Brand pages
- Different page layouts (mobile vs desktop)
- Social media links/graphics

LOGO TYPE OPTIONS:
For each logo variation you discover, select the MOST APPROPRIATE type from these options:

${logoTypeOptions.map((opt) => `- UUID: ${opt.logo_type_option_id} | Name: ${opt.display_name} | Type: ${opt.programmatic_name} | Description: ${opt.description}`).join('\n')}

For EACH logo variation found, provide:
- logo_type_option_id: UUID from the list above (REQUIRED)
- description: Brief description of the logo variation and where it's used (OPTIONAL)
- file_url: Direct URL to the logo file if you can find it (OPTIONAL - look for .svg, .png files in img tags)

**CRITICAL INSTRUCTIONS**:
- Use EXACT UUID strings from the logo_type_option list above
- DO NOT make up or generate UUIDs
- Only include logos that you actually find on the website
- It's okay to return an empty array if no logos are clearly visible
- If you find the same logo type used multiple times, only include it once
- Return PURE JSON with NO markdown formatting or code blocks

Return your response as a JSON object with this EXACT structure:
{
  "logo_assets": [
    {
      "logo_type_option_id": "uuid-from-options",
      "description": "Full color primary logo used in header",
      "file_url": "https://example.com/logo.svg"
    }
  ]
}

NOTE: logo_assets can be an empty array [] if no clear logos are found.`;
}

/**
 * Validates the extracted logos response
 */
function validateLogosResponse(response: unknown): ExtractedLogos {
  console.log('Validating logos response...');

  let data: Record<string, unknown>;

  if (Array.isArray(response)) {
    if (response.length === 0) throw new Error('Empty response array');
    data = response[0] as Record<string, unknown>;
  } else if (response && typeof response === 'object') {
    data = response as Record<string, unknown>;
  } else {
    throw new Error('Invalid response format');
  }

  if (!Array.isArray(data.logo_assets)) {
    throw new Error('logo_assets must be an array');
  }

  const logoAssets = (data.logo_assets as Array<Record<string, unknown>>)
    .filter((item) => item && typeof item.logo_type_option_id === 'string')
    .map((item) => ({
      logo_type_option_id: item.logo_type_option_id,
      description: typeof item.description === 'string' ? item.description : undefined,
      file_url: typeof item.file_url === 'string' ? item.file_url : undefined,
    }));

  console.log(`✓ Validated ${logoAssets.length} logo assets`);

  // It's okay to have zero logos if none were found
  if (logoAssets.length === 0) {
    console.log('No logos found on website');
  }

  return { logo_assets: logoAssets };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== EXTRACT LOGOS STARTED ===');

    // Parse request body
    let requestBody: RequestBody;
    try {
      const text = await req.text();
      if (!text) throw new Error('Request body is required');
      requestBody = JSON.parse(text);
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          usage:
            'Please provide: { "visual_style_guide_id": "uuid", "starting_url": "https://..." }',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { visual_style_guide_id, starting_url } = requestBody;

    if (!visual_style_guide_id || !starting_url) {
      return new Response(
        JSON.stringify({
          error: 'Both visual_style_guide_id and starting_url are required',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Visual Style Guide ID:', visual_style_guide_id);
    console.log('Starting URL:', starting_url);

    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

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

    // Verify visual style guide exists and get customer_id
    console.log('Fetching visual style guide...');
    const { data: visualGuide, error: guideError } = await supabase
      .from('visual_style_guides')
      .select('visual_style_guide_id, customer_id')
      .eq('visual_style_guide_id', visual_style_guide_id)
      .maybeSingle();

    if (guideError || !visualGuide) {
      throw new Error('Visual style guide not found. Create one first.');
    }

    const customerId = visualGuide.customer_id;
    console.log('Customer ID:', customerId);

    // Fetch logo type options
    console.log('Fetching logo type options...');
    const { data: logoTypeOptions, error: logoTypeError } = await supabase
      .from('logo_type_options')
      .select('*')
      .eq('is_active', true);

    if (logoTypeError) {
      throw new Error(`Failed to fetch logo type options: ${logoTypeError.message}`);
    }

    console.log(`✓ Loaded ${logoTypeOptions?.length || 0} logo type options`);

    // Build the prompt
    const userPrompt = generateLogoExtractionPrompt(
      starting_url,
      logoTypeOptions as LogoTypeOption[]
    );

    console.log('System prompt length:', SYSTEM_PROMPT.length);
    console.log('User prompt length:', userPrompt.length);

    // Get OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    // Call GPT-5 with web_search
    console.log('Calling GPT-5 with web_search...');

    const urlObj = new URL(starting_url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    console.log('Filtering web search to domain:', domain);

    const combinedPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nCRITICAL: Return ONLY valid JSON, no markdown or code blocks.`;

    const responsePayload = {
      model: 'gpt-5',
      input: combinedPrompt,
      tools: [
        {
          type: 'web_search',
          filters: { allowed_domains: [domain] },
        },
      ],
    };

    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
        'OpenAI-Beta': 'responses=v1',
      },
      body: JSON.stringify(responsePayload),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await apiResponse.json();
    console.log('Response received from GPT-5');

    const output = (responseData.output || []) as Array<Record<string, unknown>>;
    const messageItem = output.find((item) => item.type === 'message') as
      | { content?: Array<Record<string, unknown>> }
      | undefined;

    if (!messageItem) {
      throw new Error('No message in OpenAI response');
    }

    const content = (messageItem.content || []) as Array<Record<string, unknown>>;
    const textItem = content.find((item) => item.type === 'output_text') as
      | { text?: string }
      | undefined;

    if (!textItem || !textItem.text) {
      throw new Error('No text in message content');
    }

    const responseContent = textItem.text;
    console.log('Response content length:', responseContent.length);

    // Log web search calls
    const webSearchCalls = output.filter((item) => item.type === 'web_search_call');
    console.log(`✓ Web searches performed: ${webSearchCalls.length}`);

    // Parse and validate
    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse response:', responseContent);
      throw new Error('Invalid JSON response from OpenAI');
    }

    const extractedData = validateLogosResponse(parsedResponse);
    console.log('Logo data validated');

    // Insert logo assets (if any were found)
    if (extractedData.logo_assets.length > 0) {
      console.log(`Inserting ${extractedData.logo_assets.length} logo assets...`);

      const logoAssetRecords = extractedData.logo_assets.map((logo) => ({
        customer_id: customerId,
        visual_style_guide_id: visual_style_guide_id,
        logo_type_option_id: logo.logo_type_option_id,
        is_default: false,
        is_vector: false,
        is_circular_crop: false,
        circular_safe_area: null,
        width: null,
        height: null,
        svg_text: null,
        file_blob: null,
        storage_path: null,
        file_url: logo.file_url || null,
        created_by_user_id: null,
      }));

      const { data: insertedLogos, error: logosError } = await supabase
        .from('logo_assets')
        .insert(logoAssetRecords)
        .select('logo_asset_id');

      if (logosError) {
        console.error('Error inserting logo assets:', logosError);
        throw new Error('Failed to insert logo assets: ' + logosError.message);
      }

      const insertedCount = insertedLogos?.length || 0;
      console.log(`✓ Inserted ${insertedCount} logo assets`);
    } else {
      console.log('No logo assets to insert');
    }

    console.log('=== EXTRACT LOGOS COMPLETE ===');

    // Return 204 No Content (success, no return value)
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error in extract-logos:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unexpected error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
