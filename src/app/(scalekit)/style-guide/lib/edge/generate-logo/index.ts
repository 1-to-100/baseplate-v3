/// <reference lib="deno.ns" />
import { authenticateRequest } from '../../../../../../../supabase/functions/_shared/auth.ts';
import { handleCors } from '../../../../../../../supabase/functions/_shared/cors.ts';
import {
  ApiError,
  createErrorResponse,
  createSuccessResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import {
  providers,
  withLogging,
} from '../../../../../../../supabase/functions/_shared/llm/index.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';
import {
  parseOpenAIImagesResponse,
  type GeneratedLogo,
  type GenerateLogoResponse,
} from './schema.ts';

// Configuration
const OPENAI_IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1.5';

// Customer info interface
interface CustomerInfo {
  company_name: string;
  tagline?: string;
  one_sentence_summary?: string;
  problem_overview?: string;
  solution_overview?: string;
}

// Palette color interface
interface PaletteColor {
  hex: string;
  name?: string;
  usage_option: string;
}

/**
 * Builds an enhanced prompt for OpenAI image model logo generation
 * Combines user input with company context and brand colors
 */
function buildEnhancedPrompt(
  userPrompt: string,
  customerInfo: CustomerInfo | null,
  brandColors: PaletteColor[]
): string {
  const parts: string[] = [];

  // Add user's specific request
  parts.push(`Design concept: ${userPrompt}`);

  // Add brand colors if available
  if (brandColors.length > 0) {
    const colorDescriptions = brandColors
      .slice(0, 5) // Limit to 5 colors
      .map((c) => {
        const name = c.name ? `${c.name} (${c.hex})` : c.hex;
        return `${c.usage_option}: ${name}`;
      })
      .join(', ');
    parts.push(`Brand colors to consider: ${colorDescriptions}`);
  }

  return parts.join('\n');
}

/**
 * Generates a single logo using OpenAI image model
 */
async function generateSingleLogo(prompt: string, index: number): Promise<GeneratedLogo> {
  // Get OpenAI client from provider adapters (handles credentials automatically)
  const openai = providers.openai();

  // Use Images API with logging wrapper
  const response = await withLogging('openai', 'images.generate', OPENAI_IMAGE_MODEL, () =>
    openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
    })
  );

  // Validate OpenAI response with Zod schema
  const validatedResponse = parseOpenAIImagesResponse(response);
  const imageData = validatedResponse.data?.[0];

  // Handle both URL and base64 response formats
  let imageUrl: string;
  if (imageData?.url) {
    imageUrl = imageData.url;
  } else if (imageData?.b64_json) {
    // Convert base64 to data URL
    imageUrl = `data:image/png;base64,${imageData.b64_json}`;
  } else {
    console.error('Unexpected OpenAI response format:', JSON.stringify(response));
    throw new ApiError(
      'No image URL or base64 data in OpenAI response' + JSON.stringify(response),
      500
    );
  }

  return {
    id: `generated-logo-${index}-${Date.now()}`,
    url: imageUrl,
    revised_prompt: imageData.revised_prompt,
  };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('=== GENERATE LOGO STARTED ===');

    // Authenticate user
    const user = await authenticateRequest(req);
    console.log('Authenticated user:', user.id);

    // Parse request body
    const body = await req.json();
    const { visual_style_guide_id, prompt } = body;

    if (!visual_style_guide_id || !prompt) {
      throw new ApiError('Both visual_style_guide_id and prompt are required', 400);
    }

    console.log('Visual Style Guide ID:', visual_style_guide_id);
    console.log('User prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));

    const supabase = createServiceClient();

    // Verify visual style guide exists and get customer_id
    console.log('Fetching visual style guide...');
    const { data: visualGuide, error: guideError } = await supabase
      .from('visual_style_guides')
      .select('visual_style_guide_id, customer_id')
      .eq('visual_style_guide_id', visual_style_guide_id)
      .maybeSingle();

    if (guideError || !visualGuide) {
      throw new ApiError('Visual style guide not found. Create one first.', 404);
    }

    const customerId = visualGuide.customer_id;
    console.log('Customer ID:', customerId);

    // Verify user has access to this customer
    if (user.customer_id !== customerId) {
      throw new ApiError('You do not have access to this visual style guide', 403);
    }

    // Fetch customer info for context
    console.log('Fetching customer info...');
    const { data: customerInfo, error: customerInfoError } = await supabase
      .from('customer_info')
      .select('company_name, tagline, one_sentence_summary, problem_overview, solution_overview')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerInfoError) {
      console.warn('Failed to fetch customer info:', customerInfoError.message);
    }

    console.log('Customer info:', customerInfo?.company_name || 'Not found');

    // Fetch brand colors for context
    console.log('Fetching palette colors...');
    const { data: paletteColors, error: colorsError } = await supabase
      .from('palette_colors')
      .select('hex, name, usage_option')
      .eq('customer_id', customerId)
      .order('sort_order', { ascending: true });

    if (colorsError) {
      console.warn('Failed to fetch palette colors:', colorsError.message);
    }

    console.log(`Found ${paletteColors?.length || 0} palette colors`);

    // Build enhanced prompt with company context
    const enhancedPrompt = buildEnhancedPrompt(
      prompt,
      customerInfo as CustomerInfo | null,
      (paletteColors || []) as PaletteColor[]
    );

    console.log('Enhanced prompt length:', enhancedPrompt.length);

    // Generate 3 logos in parallel using OpenAI image model
    console.log(`Generating 3 logo variations with ${OPENAI_IMAGE_MODEL}...`);

    const logoPromises = [0, 1, 2].map((index) => generateSingleLogo(enhancedPrompt, index));

    const logos = await Promise.all(logoPromises);

    console.log(`✓ Generated ${logos.length} logo variations`);
    console.log('=== GENERATE LOGO COMPLETE ===');

    // Return generated logos
    const response: GenerateLogoResponse = { logos };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Error in generate-logo:', error);
    return createErrorResponse(error);
  }
});
