/// <reference lib="deno.ns" />
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import {
  providers,
  withLogging,
} from '../../../../../../../supabase/functions/_shared/llm/index.ts';
import { colorsJsonSchema, safeParseColorsResponse, type ColorsResponse } from './schema.ts';

// Request body interface
interface RequestBody {
  web_screenshot_capture_id: string;
  visual_style_guide_id?: string; // Optional - if provided, colors will be inserted into palette_colors
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// PaletteColorItem and ColorsResponse types are imported from schema.ts

// System prompt for color extraction (JoyUI standard: primary, neutral, danger, success, warning)
const SYSTEM_PROMPT = `You are an expert color analyst and brand designer. Your role is to analyze websites and extract accurate color palette information using JoyUI semantic categories: primary (brand/CTAs), neutral (surfaces/text), danger (errors/destructive), success (positive states), and warning (caution).`;

/**
 * Generates the user prompt for color extraction
 */
function generateColorExtractionPrompt(
  screenshotUrl: string,
  htmlContent?: string,
  cssContent?: string
): string {
  let contentAnalysis = '';

  if (htmlContent || cssContent) {
    contentAnalysis = `\n\nSOURCE CODE PROVIDED:\n`;
    contentAnalysis += `The HTML and CSS content from the captured webpage has been provided below. Use this to identify color values defined in stylesheets and inline styles.\n\n`;
    if (htmlContent) {
      contentAnalysis += `HTML Content (first 5000 chars):\n${htmlContent.substring(0, 5000)}${htmlContent.length > 5000 ? '...' : ''}\n\n`;
    }
    if (cssContent) {
      contentAnalysis += `CSS Content (first 5000 chars):\n${cssContent.substring(0, 5000)}${cssContent.length > 5000 ? '...' : ''}\n\n`;
    }
  }

  return `IMPORTANT: You are being provided with a screenshot image directly in this request (attached as an image_url). You are also being provided with the raw HTML and CSS content from the captured webpage below.

DO NOT attempt to access any external URLs or websites. Analyze ONLY the screenshot image provided in this request and the HTML/CSS content provided below.

Your task is to extract the complete color palette from the provided screenshot image and source code.${contentAnalysis}

ANALYSIS APPROACH:
Examine the provided screenshot image and the HTML/CSS content to identify all colors used across:
- Brand and CTA colors (logos, headers, primary buttons, links)
- Neutral/base colors (backgrounds, surfaces, body text, borders)
- Status colors (errors, success states, warnings)

COLOR USAGE TYPES (JoyUI standard — use ONLY these values):
You must categorize each color using exactly one of these usage_option values:

1. PRIMARY:
   - Main brand colors prominently used throughout the site, primary CTAs, key highlights, active/selected states
   - Colors in logos, headers, primary buttons, important links
   - Most recognizable brand colors
   - usage_option: "primary"

2. NEUTRAL:
   - Surfaces, backgrounds, containers, borders, dividers, body text
   - Default controls, layout hierarchy, theme-aware grays
   - usage_option: "neutral"

3. DANGER:
   - Error states, destructive actions, high-severity alerts
   - Delete buttons, validation errors, failed operations
   - usage_option: "danger"

4. SUCCESS:
   - Positive confirmation, completion states, verified/connected indicators
   - usage_option: "success"

5. WARNING:
   - Caution states, non-blocking alerts, degraded states
   - usage_option: "warning"

For each color, provide:
- hex: Hex color code WITH # prefix (REQUIRED - e.g., "#1976D2")
- name: Descriptive color name (REQUIRED - e.g., "Primary Blue", "Neutral Gray", "Danger Red")
- usage_option: One of "primary", "neutral", "danger", "success", or "warning" (REQUIRED)
- sort_order: Integer for ordering (REQUIRED - start from 1, increment for each color)

**CRITICAL INSTRUCTIONS**:
- Provide 6-10 colors total
- Include 2-4 primary colors, 2-4 neutral colors; add danger/success/warning only if visibly used
- All hex codes MUST start with # (e.g., "#FF5733" not "FF5733")
- Return PURE JSON with NO markdown formatting or code blocks

Return your response as a JSON object with this EXACT structure:
{
  "palette_colors": [
    {
      "hex": "#FFFFFF",
      "name": "Background White",
      "usage_option": "neutral",
      "sort_order": 1
    },
    {
      "hex": "#000000",
      "name": "Text Black",
      "usage_option": "neutral",
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
 * Validates the extracted colors response using Zod schema
 */
function validateColorsResponse(response: unknown): ColorsResponse {
  console.log('Validating colors response...');

  // Handle array response (some APIs wrap response in array)
  let data = response;
  if (Array.isArray(response)) {
    if (response.length === 0) throw new Error('Empty response array');
    data = response[0];
  }

  const result = safeParseColorsResponse(data);

  if (!result.success) {
    console.error('Validation errors:', result.error.issues);
    throw new Error(
      `Invalid colors response: ${result.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  const paletteColors = result.data.palette_colors;

  console.log(`✓ Validated ${paletteColors.length} palette colors`);

  if (paletteColors.length === 0) {
    throw new Error('No valid palette colors found');
  }

  if (paletteColors.length < 6) {
    console.warn(`Warning: Only ${paletteColors.length} colors provided (recommended: 6-10)`);
  }

  return result.data;
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
          usage:
            'Please provide: { "web_screenshot_capture_id": "uuid", "visual_style_guide_id": "uuid" (optional) }',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { web_screenshot_capture_id, visual_style_guide_id } = requestBody;

    if (!web_screenshot_capture_id) {
      return new Response(
        JSON.stringify({
          error: 'web_screenshot_capture_id is required',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Web Screenshot Capture ID:', web_screenshot_capture_id);
    if (visual_style_guide_id) {
      console.log('Visual Style Guide ID:', visual_style_guide_id);
    }

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

    // Fetch the capture record with related request
    console.log('Fetching capture record...');
    const { data: capture, error: captureError } = await supabase
      .from('web_screenshot_captures')
      .select(
        `
        web_screenshot_capture_id, 
        customer_id, 
        screenshot_storage_path, 
        raw_html, 
        raw_css,
        capture_request:web_screenshot_capture_request_id (
          requested_url
        )
      `
      )
      .eq('web_screenshot_capture_id', web_screenshot_capture_id)
      .maybeSingle();

    if (captureError || !capture) {
      throw new Error('Capture not found. Make sure the capture exists and you have access to it.');
    }

    const customerId = capture.customer_id;
    console.log('Customer ID:', customerId);

    // Get signed URL for the screenshot
    console.log('Generating signed URL for screenshot...');
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('screenshots')
      .createSignedUrl(capture.screenshot_storage_path, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(
        `Failed to generate signed URL: ${signedUrlError?.message || 'Unknown error'}`
      );
    }

    let screenshotUrl = signedUrlData.signedUrl;

    // If PUBLIC_SUPABASE_URL is set, swap the origin for external API access (e.g., OpenAI)
    const publicUrl = Deno.env.get('PUBLIC_SUPABASE_URL');
    if (publicUrl) {
      const url = new URL(screenshotUrl);
      const pub = new URL(publicUrl);
      url.protocol = pub.protocol;
      url.hostname = pub.hostname;
      url.port = pub.port;
      screenshotUrl = url.toString();
    }
    console.log('Screenshot URL generated');

    // Get HTML and CSS content
    const htmlContent = capture.raw_html || undefined;
    const cssContent = capture.raw_css || undefined;
    const captureRequest = Array.isArray(capture.capture_request)
      ? capture.capture_request[0]
      : capture.capture_request;
    const requestedUrl = (captureRequest as { requested_url?: string })?.requested_url || '';

    console.log('HTML content available:', !!htmlContent);
    console.log('CSS content available:', !!cssContent);

    // Get customer_id for palette color insertion (if visual_style_guide_id provided)
    let visualGuideCustomerId: string | undefined;
    if (visual_style_guide_id) {
      console.log('Fetching visual style guide...');
      const { data: visualGuide, error: guideError } = await supabase
        .from('visual_style_guides')
        .select('visual_style_guide_id, customer_id')
        .eq('visual_style_guide_id', visual_style_guide_id)
        .maybeSingle();

      if (guideError || !visualGuide) {
        throw new Error('Visual style guide not found. Create one first.');
      }

      visualGuideCustomerId = visualGuide.customer_id;

      // Verify customer matches
      if (visualGuideCustomerId !== customerId) {
        throw new Error('Visual style guide customer does not match capture customer');
      }
    }

    // Build the prompt
    const userPrompt = generateColorExtractionPrompt(screenshotUrl, htmlContent, cssContent);

    console.log('System prompt length:', SYSTEM_PROMPT.length);
    console.log('User prompt length:', userPrompt.length);

    // Get OpenAI client from provider adapters (handles credentials automatically)
    const openai = providers.openai();

    // Call GPT-4o with image analysis (wrapped with logging)
    console.log('Calling GPT-4o with image analysis...');

    const responseData = await withLogging('openai', 'chat.completions.create', 'gpt-4o', () =>
      openai.chat.completions.create({
        model: 'gpt-4o', // Using GPT-4o for vision capabilities
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: screenshotUrl,
                },
              },
            ],
          },
        ],
        response_format: {
          type: colorsJsonSchema.type,
          json_schema: {
            name: colorsJsonSchema.name,
            strict: colorsJsonSchema.strict,
            schema: colorsJsonSchema.schema,
          },
        },
      })
    );

    console.log('Response received from GPT-4o');

    const responseContent = responseData.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error('No content in OpenAI response');
    }

    console.log('Response content length:', responseContent.length);

    // Clean the response content - remove markdown code blocks if present
    let cleanedContent = responseContent.trim();

    // Remove markdown code block markers (```json ... ``` or ``` ... ```)
    // Handle cases like: ```json\n...\n``` or ```\n...\n```
    if (cleanedContent.startsWith('```')) {
      // Find the first newline after ``` (could be ```json or just ```)
      const firstNewline = cleanedContent.indexOf('\n');
      if (firstNewline !== -1) {
        // Remove opening ```json or ``` and the newline
        cleanedContent = cleanedContent.substring(firstNewline + 1);
      } else {
        // No newline found, look for closing ``` immediately after opening
        const closingIndex = cleanedContent.indexOf('```', 3);
        if (closingIndex !== -1) {
          // Remove both opening and closing ```
          cleanedContent = cleanedContent.substring(3, closingIndex);
        } else {
          // Just remove opening ```
          cleanedContent = cleanedContent.substring(3);
        }
      }

      // Remove closing ``` if it exists (handle cases where it's on same line or separate line)
      const lastBackticks = cleanedContent.lastIndexOf('```');
      if (lastBackticks !== -1 && lastBackticks > 0) {
        cleanedContent = cleanedContent.substring(0, lastBackticks);
      }

      cleanedContent = cleanedContent.trim();
    }

    console.log('Cleaned content preview:', cleanedContent.substring(0, 200));

    // Parse and validate
    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse response:', cleanedContent);
      throw new Error('Invalid JSON response from OpenAI');
    }

    const extractedData = validateColorsResponse(parsedResponse);
    console.log('Color data validated');

    // Insert palette colors if visual_style_guide_id is provided
    if (visual_style_guide_id && visualGuideCustomerId) {
      console.log(`Inserting ${extractedData.palette_colors.length} palette colors...`);

      const paletteRecords = extractedData.palette_colors.map((color) => ({
        customer_id: visualGuideCustomerId,
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
    } else {
      console.log('No visual_style_guide_id provided - colors extracted but not stored');
    }

    console.log('=== EXTRACT COLORS COMPLETE ===');

    // Return the extracted colors
    return new Response(
      JSON.stringify({
        success: true,
        palette_colors: extractedData.palette_colors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in extract-colors:', error);
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
