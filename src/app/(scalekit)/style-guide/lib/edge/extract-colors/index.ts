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
interface PaletteColorData {
  hex: string;
  name: string;
  usage_option: 'primary' | 'secondary' | 'foreground' | 'background' | 'accent';
  sort_order: number;
}

interface ExtractedColors {
  palette_colors: PaletteColorData[];
}

// System prompt for color extraction
const SYSTEM_PROMPT = `You are an expert color analyst and brand designer. Your role is to analyze websites and extract accurate color palette information including primary brand colors, secondary/accent colors, foreground text colors, and background colors.`;

/**
 * Generates the user prompt for color extraction
 */
function generateColorExtractionPrompt(websiteUrl: string): string {
  return `Analyze the website ${websiteUrl} to extract the complete color palette.

ANALYSIS APPROACH:
Browse the website, take a screenshot of two or more pages, and identify all colors used across:
- Brand colors (logos, headers, primary UI elements)
- Text colors (headings, body text, links)
- Background colors (page backgrounds, sections)
- Accent colors (buttons, highlights, call-to-action elements)
- Secondary colors (supporting elements)

COLOR USAGE TYPES:
You must identify colors for each of these usage categories:

1. FOREGROUND (1 entry required):
   - Main text color used for body copy and content
   - Usually a dark color (black, dark gray) on light backgrounds
   - usage_option: "foreground"

2. BACKGROUND (1 entry required):
   - Primary page background color
   - Usually white or light gray
   - usage_option: "background"

3. PRIMARY (2-4 entries required):
   - Main brand colors prominently used throughout the site
   - Colors in logos, headers, primary buttons
   - Most recognizable brand colors
   - usage_option: "primary"

4. SECONDARY or ACCENT (2-4 entries required):
   - Supporting colors or accent colors
   - Used sparingly for highlights, special elements
   - May include secondary brand colors
   - usage_option: "secondary" or "accent"

For each color, provide:
- hex: Hex color code WITH # prefix (REQUIRED - e.g., "#1976D2")
- name: Descriptive color name (REQUIRED - e.g., "Primary Blue", "Dark Text Gray", "Accent Orange")
- usage_option: One of "primary", "secondary", "foreground", "background", or "accent" (REQUIRED)
- sort_order: Integer for ordering (REQUIRED - start from 1, increment for each color)

**CRITICAL INSTRUCTIONS**:
- Provide 6-10 colors total
- MUST include at least 1 foreground color
- MUST include at least 1 background color  
- MUST include 2-4 primary colors
- MUST include 2-4 secondary/accent colors
- All hex codes MUST start with # (e.g., "#FF5733" not "FF5733")
- Return PURE JSON with NO markdown formatting or code blocks

Return your response as a JSON object with this EXACT structure:
{
  "palette_colors": [
    {
      "hex": "#FFFFFF",
      "name": "Background White",
      "usage_option": "background",
      "sort_order": 1
    },
    {
      "hex": "#000000",
      "name": "Text Black",
      "usage_option": "foreground",
      "sort_order": 2
    },
    {
      "hex": "#1976D2",
      "name": "Primary Blue",
      "usage_option": "primary",
      "sort_order": 3
    }
  ]
}`;
}

/**
 * Validates the extracted colors response
 */
function validateColorsResponse(response: unknown): ExtractedColors {
  console.log('Validating colors response...');
  
  let data: Record<string, unknown>;
  
  if (Array.isArray(response)) {
    if (response.length === 0) throw new Error('Empty response array');
    data = response[0] as Record<string, unknown>;
  } else if (response && typeof response === 'object') {
    data = response as Record<string, unknown>;
  } else {
    throw new Error('Invalid response format');
  }

  if (!Array.isArray(data.palette_colors)) {
    throw new Error('palette_colors must be an array');
  }

  const paletteColors = (data.palette_colors as Array<Record<string, unknown>>)
    .filter((item) => 
      item && 
      typeof item.hex === 'string' &&
      item.hex.startsWith('#') &&
      typeof item.name === 'string' &&
      typeof item.usage_option === 'string' &&
      ['primary', 'secondary', 'foreground', 'background', 'accent'].includes(item.usage_option) &&
      typeof item.sort_order === 'number'
    )
    .map((item) => ({
      hex: item.hex,
      name: item.name,
      usage_option: item.usage_option,
      sort_order: item.sort_order,
    }));

  console.log(`✓ Validated ${paletteColors.length} palette colors`);

  if (paletteColors.length === 0) {
    throw new Error('No valid palette colors found');
  }

  if (paletteColors.length < 6) {
    console.warn(`Warning: Only ${paletteColors.length} colors provided (recommended: 6-10)`);
  }

  // Verify we have required usage types
  const usageTypes = paletteColors.map((c: PaletteColorData) => c.usage_option);
  if (!usageTypes.includes('foreground')) {
    console.warn('Warning: No foreground color provided');
  }
  if (!usageTypes.includes('background')) {
    console.warn('Warning: No background color provided');
  }

  return { palette_colors: paletteColors };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== EXTRACT COLORS STARTED ===');

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

    // Build the prompt
    const userPrompt = generateColorExtractionPrompt(starting_url);

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

    const extractedData = validateColorsResponse(parsedResponse);
    console.log('Color data validated');

    // Insert palette colors
    console.log(`Inserting ${extractedData.palette_colors.length} palette colors...`);
    
    const paletteRecords = extractedData.palette_colors.map((color) => ({
      customer_id: customerId,
      style_guide_id: visual_style_guide_id,
      hex: color.hex,
      name: color.name,
      usage_option: color.usage_option,
      sort_order: color.sort_order,
      contrast_ratio_against_background: null,
    }));

    const { data: insertedColors, error: colorsError } = await supabase
      .from('palette_colors')
      .insert(paletteRecords)
      .select('palette_color_id');

    if (colorsError) {
      console.error('Error inserting palette colors:', colorsError);
      throw new Error('Failed to insert palette colors: ' + colorsError.message);
    }

    const insertedCount = insertedColors?.length || 0;
    console.log(`✓ Inserted ${insertedCount} palette colors`);
    console.log('=== EXTRACT COLORS COMPLETE ===');

    // Return 204 No Content (success, no return value)
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Error in extract-colors:', error);
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

