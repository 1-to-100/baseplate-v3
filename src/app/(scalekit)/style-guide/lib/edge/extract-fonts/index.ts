/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
interface TypographyStyleOption {
  typography_style_option_id: string;
  display_name: string;
  programmatic_name: string;
  description: string;
}

interface FontOption {
  font_option_id: string;
  display_name: string;
  programmatic_name: string;
  source: string;
}

interface TypographyStyleData {
  typography_style_option_id: string;
  font_option_id?: string;
  font_family: string;
  font_size_px: number;
  line_height?: number;
  font_weight?: string;
  color?: string;
}

interface ExtractedFonts {
  typography_styles: TypographyStyleData[];
}

// System prompt for typography extraction
const SYSTEM_PROMPT = `You are an expert typography analyst and web design specialist. Your role is to analyze websites and extract accurate typography information including font families, sizes, weights, and usage patterns for different text elements.`;

/**
 * Generates the user prompt for typography extraction
 */
function generateTypographyExtractionPrompt(
  websiteUrl: string,
  typographyOptions: TypographyStyleOption[],
  fontOptions: FontOption[]
): string {
  return `Analyze the website ${websiteUrl}, take a screenshot of two or more pages, and extract all typography information.

ANALYSIS APPROACH:
Browse the website, take a screenshot of two or more pages, and identify the fonts used for each text element type. Look at:
- Headings (H1-H6)
- Body text
- Buttons and labels
- Captions and small text
- Links and other UI text

TYPOGRAPHY STYLE OPTIONS:
You MUST provide an entry for EACH of the following ${typographyOptions.length} typography style options:

${typographyOptions.map((opt) => `- UUID: ${opt.typography_style_option_id} | Name: ${opt.display_name} | Element: ${opt.programmatic_name} | Description: ${opt.description}`).join('\n')}

AVAILABLE FONT OPTIONS (try to match fonts to these if possible):
${fontOptions.map((opt) => `- UUID: ${opt.font_option_id} | Font: ${opt.display_name} | Source: ${opt.source}`).join('\n')}

For EACH typography_style_option above, analyze the website and provide:
- typography_style_option_id: UUID from the list above (REQUIRED)
- font_option_id: UUID from font options if you can match it, otherwise null (OPTIONAL)
- font_family: The actual font name used (REQUIRED - e.g., "Inter", "Roboto", "Arial")
- font_size_px: Font size in pixels as integer (REQUIRED)
- line_height: Line height as decimal number (OPTIONAL - e.g., 1.5)
- font_weight: Font weight as string (OPTIONAL - e.g., "400", "700", "bold")
- color: Hex color code WITH # prefix (OPTIONAL - e.g., "#000000")

**CRITICAL INSTRUCTIONS**:
- Use EXACT UUID strings from the typography_style_option list above
- DO NOT make up or generate UUIDs
- You MUST provide ALL ${typographyOptions.length} entries - one for each typography_style_option
- If a specific element isn't prominently used on the site, make your best estimate based on similar elements
- Return PURE JSON with NO markdown formatting or code blocks

Return your response as a JSON object with this EXACT structure:
{
  "typography_styles": [
    {
      "typography_style_option_id": "uuid-from-options",
      "font_option_id": "uuid-from-fonts-or-null",
      "font_family": "Font Name",
      "font_size_px": 16,
      "line_height": 1.5,
      "font_weight": "400",
      "color": "#000000"
    }
  ]
}`;
}

/**
 * Validates the extracted typography response
 */
function validateTypographyResponse(response: unknown, expectedCount: number): ExtractedFonts {
  console.log('Validating typography response...');
  
  let data: Record<string, unknown>;
  
  if (Array.isArray(response)) {
    if (response.length === 0) throw new Error('Empty response array');
    data = response[0] as Record<string, unknown>;
  } else if (response && typeof response === 'object') {
    data = response as Record<string, unknown>;
  } else {
    throw new Error('Invalid response format');
  }

  if (!Array.isArray(data.typography_styles)) {
    throw new Error('typography_styles must be an array');
  }

  const typographyStyles = (data.typography_styles as Array<Record<string, unknown>>)
    .filter((item) => 
      item && 
      typeof item.typography_style_option_id === 'string' &&
      typeof item.font_family === 'string' &&
      typeof item.font_size_px === 'number'
    )
    .map((item) => ({
      typography_style_option_id: item.typography_style_option_id,
      font_option_id: typeof item.font_option_id === 'string' ? item.font_option_id : undefined,
      font_family: item.font_family,
      font_size_px: item.font_size_px,
      line_height: typeof item.line_height === 'number' ? item.line_height : undefined,
      font_weight: typeof item.font_weight === 'string' ? item.font_weight : undefined,
      color: typeof item.color === 'string' ? item.color : undefined,
    }));

  console.log(`✓ Validated ${typographyStyles.length} typography styles (expected: ${expectedCount})`);

  if (typographyStyles.length === 0) {
    throw new Error('No valid typography styles found');
  }

  if (typographyStyles.length < expectedCount) {
    console.warn(`Warning: Only ${typographyStyles.length} of ${expectedCount} typography styles were provided`);
  }

  return { typography_styles: typographyStyles };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== EXTRACT FONTS STARTED ===');

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
          usage: 'Please provide: { "visual_style_guide_id": "uuid", "starting_url": "https://..." }'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { visual_style_guide_id, starting_url } = requestBody;
    
    if (!visual_style_guide_id || !starting_url) {
      return new Response(
        JSON.stringify({ 
          error: 'Both visual_style_guide_id and starting_url are required'
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

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

    // Fetch option tables
    console.log('Fetching typography and font options...');
    const [
      { data: typographyOptions, error: typographyError },
      { data: fontOptions, error: fontError },
    ] = await Promise.all([
      supabase.from('typography_style_options').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('font_options').select('*').order('display_name').limit(50),
    ]);

    if (typographyError || fontError) {
      const errors = [typographyError, fontError].filter(Boolean).map(e => e!.message);
      throw new Error(`Failed to fetch option tables: ${errors.join(', ')}`);
    }

    console.log(`✓ Loaded ${typographyOptions?.length || 0} typography options`);
    console.log(`✓ Loaded ${fontOptions?.length || 0} font options`);

    // Build the prompt
    const userPrompt = generateTypographyExtractionPrompt(
      starting_url,
      typographyOptions as TypographyStyleOption[],
      fontOptions as FontOption[]
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
      tools: [{
        type: 'web_search',
        filters: { allowed_domains: [domain] }
      }],
    };

    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
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
    const messageItem = output.find((item) => item.type === 'message') as { content?: Array<Record<string, unknown>> } | undefined;
    
    if (!messageItem) {
      throw new Error('No message in OpenAI response');
    }

    const content = (messageItem.content || []) as Array<Record<string, unknown>>;
    const textItem = content.find((item) => item.type === 'output_text') as { text?: string } | undefined;
    
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

    const extractedData = validateTypographyResponse(parsedResponse, typographyOptions?.length || 0);
    console.log('Typography data validated');

    // Insert typography styles
    console.log(`Inserting ${extractedData.typography_styles.length} typography styles...`);
    
    const typographyRecords = extractedData.typography_styles.map((typo) => ({
      customer_id: customerId,
      visual_style_guide_id: visual_style_guide_id,
      typography_style_option_id: typo.typography_style_option_id,
      font_option_id: typo.font_option_id || null,
      font_family: typo.font_family,
      font_fallbacks: null,
      font_size_px: typo.font_size_px,
      line_height: typo.line_height || null,
      font_weight: typo.font_weight || null,
      color: typo.color || null,
      css_snippet: null,
      licensing_notes: null,
      created_by_user_id: null,
    }));

    const { data: insertedTypos, error: typosError } = await supabase
      .from('typography_styles')
      .insert(typographyRecords)
      .select('typography_style_id');

    if (typosError) {
      console.error('Error inserting typography styles:', typosError);
      throw new Error('Failed to insert typography styles: ' + typosError.message);
    }

    const insertedCount = insertedTypos?.length || 0;
    console.log(`✓ Inserted ${insertedCount} typography styles`);
    console.log('=== EXTRACT FONTS COMPLETE ===');

    // Return 204 No Content (success, no return value)
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Error in extract-fonts:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unexpected error',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});

