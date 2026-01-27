/// <reference lib="deno.ns" />
import { createClient } from '@supabase/supabase-js';
import {
  typographyJsonSchema,
  safeParseTypographyResponse,
  type TypographyResponse,
} from './schema.ts';

// Request body interface
interface RequestBody {
  web_screenshot_capture_id: string;
  visual_style_guide_id?: string; // Optional - if provided, typography styles will be inserted into typography_styles
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

// TypographyStyleItem and TypographyResponse types are imported from schema.ts

// System prompt for typography extraction
const SYSTEM_PROMPT = `You are an expert typography analyst and web design specialist. Your role is to analyze websites and extract accurate typography information including font families, sizes, weights, and usage patterns for different text elements.`;

/**
 * Generates the user prompt for typography extraction
 */
function generateTypographyExtractionPrompt(
  screenshotUrl: string,
  htmlContent: string | undefined,
  cssContent: string | undefined,
  typographyOptions: TypographyStyleOption[],
  fontOptions: FontOption[]
): string {
  let contentAnalysis = '';

  if (htmlContent || cssContent) {
    contentAnalysis = `\n\nSOURCE CODE PROVIDED:\n`;
    contentAnalysis += `The HTML and CSS content from the captured webpage has been provided below. Use this to identify font families, sizes, weights, and other typography properties defined in stylesheets and inline styles.\n\n`;
    if (htmlContent) {
      contentAnalysis += `HTML Content (first 5000 chars):\n${htmlContent.substring(0, 5000)}${htmlContent.length > 5000 ? '...' : ''}\n\n`;
    }
    if (cssContent) {
      contentAnalysis += `CSS Content (first 5000 chars):\n${cssContent.substring(0, 5000)}${cssContent.length > 5000 ? '...' : ''}\n\n`;
    }
  }

  return `IMPORTANT: You are being provided with a screenshot image directly in this request (attached as an image_url). You are also being provided with the raw HTML and CSS content from the captured webpage below. 

DO NOT attempt to access any external URLs or websites. Analyze ONLY the screenshot image provided in this request and the HTML/CSS content provided below.

Your task is to extract typography information from the provided screenshot image and source code.${contentAnalysis}

ANALYSIS APPROACH:
Examine the provided screenshot image and the HTML/CSS content to identify the fonts used for each text element type. Look at:
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

For EACH typography_style_option above, analyze the provided screenshot image and HTML/CSS content to determine and provide:
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
 * Validates the extracted typography response using Zod schema
 */
function validateTypographyResponse(response: unknown, expectedCount: number): TypographyResponse {
  console.log('Validating typography response...');

  // Handle array response (some APIs wrap response in array)
  let data = response;
  if (Array.isArray(response)) {
    if (response.length === 0) throw new Error('Empty response array');
    data = response[0];
  }

  const result = safeParseTypographyResponse(data);

  if (!result.success) {
    console.error('Validation errors:', result.error.issues);
    throw new Error(
      `Invalid typography response: ${result.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  const typographyStyles = result.data.typography_styles;

  console.log(
    `✓ Validated ${typographyStyles.length} typography styles (expected: ${expectedCount})`
  );

  if (typographyStyles.length === 0) {
    throw new Error('No valid typography styles found');
  }

  if (typographyStyles.length < expectedCount) {
    console.warn(
      `Warning: Only ${typographyStyles.length} of ${expectedCount} typography styles were provided`
    );
  }

  return result.data;
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

    // Get customer_id for typography style insertion (if visual_style_guide_id provided)
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

    // Fetch option tables
    console.log('Fetching typography and font options...');
    const [
      { data: typographyOptions, error: typographyError },
      { data: fontOptions, error: fontError },
    ] = await Promise.all([
      supabase
        .from('typography_style_options')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      supabase.from('font_options').select('*').order('display_name').limit(50),
    ]);

    if (typographyError || fontError) {
      const errors = [typographyError, fontError].filter(Boolean).map((e) => e!.message);
      throw new Error(`Failed to fetch option tables: ${errors.join(', ')}`);
    }

    console.log(`✓ Loaded ${typographyOptions?.length || 0} typography options`);
    console.log(`✓ Loaded ${fontOptions?.length || 0} font options`);

    // Build the prompt
    const userPrompt = generateTypographyExtractionPrompt(
      screenshotUrl,
      htmlContent,
      cssContent,
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

    // Call GPT-4o with image analysis
    console.log('Calling GPT-4o with image analysis...');

    const combinedPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nCRITICAL: Return ONLY valid JSON, no markdown or code blocks.`;

    // Use GPT-4 Vision or GPT-4o with image input
    const responsePayload = {
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
        type: typographyJsonSchema.type,
        json_schema: {
          name: typographyJsonSchema.name,
          strict: typographyJsonSchema.strict,
          schema: typographyJsonSchema.schema,
        },
      },
    };

    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(responsePayload),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await apiResponse.json();
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

    const extractedData = validateTypographyResponse(
      parsedResponse,
      typographyOptions?.length || 0
    );
    console.log('Typography data validated');

    // Insert typography styles if visual_style_guide_id is provided
    if (visual_style_guide_id && visualGuideCustomerId) {
      console.log(`Inserting ${extractedData.typography_styles.length} typography styles...`);

      const typographyRecords = extractedData.typography_styles.map((typo) => ({
        customer_id: visualGuideCustomerId,
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
    } else {
      console.log('No visual_style_guide_id provided - typography styles extracted but not stored');
    }

    console.log('=== EXTRACT FONTS COMPLETE ===');

    // Return the extracted typography styles
    return new Response(
      JSON.stringify({
        success: true,
        typography_styles: extractedData.typography_styles,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in extract-fonts:', error);
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
