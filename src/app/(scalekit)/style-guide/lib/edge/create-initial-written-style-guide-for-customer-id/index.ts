// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

// Request body interface
interface RequestBody {
  customer_id: string;
  url?: string;
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
  content_authoring_prompt?: string;
  created_at: string;
  updated_at: string;
  company_website_url?: string;
  email_domain?: string;
}

interface OptionItem {
  id: string;
  display_name: string;
  description?: string;
  name?: string;
}

interface FramingConcept {
  name: string;
  description: string;
}

interface VocabularyEntry {
  name: string;
  vocabulary_type: 'preferred' | 'prohibited';
  suggested_replacement?: string;
  example_usage?: string;
}

interface GeneratedStyleGuide {
  brand_personality?: string;
  brand_voice?: string;
  formality_option_item_id?: string | null;
  sentence_length_option_item_id?: string | null;
  pacing_option_item_id?: string | null;
  humor_usage_option_item_id?: string | null;
  storytelling_style_option_item_id?: string | null;
  use_of_jargon_option_item_id?: string | null;
  language_level_option_item_id?: string | null;
  inclusivity_guidelines?: string;
  framing_concepts?: FramingConcept[];
  vocabulary_entries?: VocabularyEntry[];
}

// System prompt for style guide generation
const SYSTEM_PROMPT = `You are an expert head of marketing and brand strategist with deep expertise in content strategy, brand voice development, and style guide creation. Your role is to analyze company website content and extract comprehensive style guide information that will help maintain consistent brand communication across all marketing materials.

When website content is provided, carefully analyze the writing style, tone, vocabulary choices, sentence structure, pacing, and overall brand voice patterns.`;

/**
 * Generates the user prompt for style guide analysis
 */
function generateStyleGuideUserPrompt(
  companyUrl: string,
  customerInfo: CustomerInfo,
  formalityOptions: OptionItem[],
  sentenceLengthOptions: OptionItem[],
  pacingOptions: OptionItem[],
  humorOptions: OptionItem[],
  storytellingOptions: OptionItem[],
  jargonOptions: OptionItem[],
  languageLevelOptions: OptionItem[]
): string {
  return `You are analyzing the website ${companyUrl} to create a comprehensive written style guide.

ANALYSIS APPROACH:
You will be provided with content scraped from the company website. Analyze this content to understand:
- Writing style and tone patterns
- Vocabulary choices and terminology
- Sentence structure and complexity
- Pacing and rhythm
- Overall brand voice and personality
- Use of humor, storytelling, and jargon

COMPANY INFORMATION:
- Company Name: ${customerInfo.company_name}
- Tagline: ${customerInfo.tagline}
- One Sentence Summary: ${customerInfo.one_sentence_summary}
- Problem Overview: ${customerInfo.problem_overview}
- Solution Overview: ${customerInfo.solution_overview}
${customerInfo.content_authoring_prompt ? `- Content Authoring Context: ${customerInfo.content_authoring_prompt}` : ''}

Based on your analysis of the actual website content, provide recommendations for the following style guide fields:

1. Brand Personality (brand_personality)
   Provide 1-2 sentences describing the company's overall personality and tone.

2. Brand Voice (brand_voice)
   Provide a comma-separated list of 3-5 adjectives that describe the brand's voice.
   Examples: Trustworthy, Conversational, Confident, Professional, Friendly, Bold, Empathetic

3. Formality Level (formality_option_item_id)
   Select the MOST APPROPRIATE option ID from these choices:
${formalityOptions.map((opt) => `   - ID: ${opt.id} | Name: ${opt.display_name}${opt.description ? ` | ${opt.description}` : ''}`).join('\n')}

4. Sentence Length Preference (sentence_length_option_item_id)
   Select the MOST APPROPRIATE option ID from these choices:
${sentenceLengthOptions.map((opt) => `   - ID: ${opt.id} | Name: ${opt.display_name}${opt.description ? ` | ${opt.description}` : ''}`).join('\n')}

5. Pacing Preference (pacing_option_item_id)
   Select the MOST APPROPRIATE option ID from these choices:
${pacingOptions.map((opt) => `   - ID: ${opt.id} | Name: ${opt.display_name}${opt.description ? ` | ${opt.description}` : ''}`).join('\n')}

6. Humor Usage (humor_usage_option_item_id)
   Select the MOST APPROPRIATE option ID from these choices:
${humorOptions.map((opt) => `   - ID: ${opt.id} | Name: ${opt.display_name}${opt.description ? ` | ${opt.description}` : ''}`).join('\n')}

7. Storytelling Style (storytelling_style_option_item_id)
   Select the MOST APPROPRIATE option ID from these choices:
${storytellingOptions.map((opt) => `   - ID: ${opt.id} | Name: ${opt.display_name}${opt.description ? ` | ${opt.description}` : ''}`).join('\n')}

8. Use of Jargon (use_of_jargon_option_item_id)
   Select the MOST APPROPRIATE option ID from these choices:
${jargonOptions.map((opt) => `   - ID: ${opt.id} | Name: ${opt.display_name}${opt.description ? ` | ${opt.description}` : ''}`).join('\n')}

9. Language Level (language_level_option_item_id)
   Select the MOST APPROPRIATE option ID from these choices:
${languageLevelOptions.map((opt) => `   - ID: ${opt.id} | Name: ${opt.display_name}${opt.description ? ` | ${opt.description}` : ''}`).join('\n')}

10. Inclusivity Guidelines (inclusivity_guidelines)
    Provide machine-readable guidelines for inclusive language (2-4 sentences).
    Consider: gender-neutral pronouns, accessibility, avoiding jargon, cultural sensitivity.

11. Framing Concepts (framing_concepts)
    Extract commonly used analogies, metaphors, and conceptual frameworks from the website content.
    These are recurring explanatory concepts that should be used in future content production.
    Return as an array of objects, each with:
    - name: Short name for the framing concept (e.g., "Home as Security", "Journey to Success")
    - description: One paragraph (3-5 sentences) explaining how to apply this metaphor or framing in content
    
    Examples:
    - If the site often compares their product to a "safety net", extract that
    - If they use "journey" metaphors throughout, document that pattern
    - If they frame problems as "battles" or solutions as "tools", capture those
    
    Provide 3-7 framing concepts based on what you find in the content.

12. Vocabulary Entries (vocabulary_entries)
    Extract preferred and prohibited vocabulary from the website content.
    Return as an array of objects, each with:
    - name: The word or phrase
    - vocabulary_type: Either "preferred" or "prohibited"
    - suggested_replacement: (For prohibited words) What to use instead (optional)
    - example_usage: (For preferred words) An example of how it's used on the site (optional)
    
    PREFERRED VOCABULARY:
    - Industry-specific terms used consistently on the site
    - Unique branded terms or phrases
    - Technical terminology that defines the company's domain
    - 10-20 preferred terms that appear frequently and should continue to be used
    
    PROHIBITED VOCABULARY:
    - Generic buzzwords that should be avoided (e.g., "synergy", "leverage", "paradigm shift")
    - Terms that don't match the brand voice
    - Overly promotional or salesy language if the site avoids it
    - Jargon that the site explicitly avoids
    - 5-15 prohibited terms based on what the site doesn't use

IMPORTANT: 
- For all option fields (formality, sentence_length, pacing, humor_usage, storytelling_style, use_of_jargon, language_level), you MUST return the exact UUID option ID from the lists above.
- For brand_personality and brand_voice, provide descriptive text.
- For inclusivity_guidelines, provide clear, actionable guidelines.
- For framing_concepts, return an array of objects with name and description.
- For vocabulary_entries, return an array with both preferred and prohibited terms.

Return your response as a JSON object with the following structure:
{
  "brand_personality": "string (1-2 sentences)",
  "brand_voice": "string (comma-separated adjectives)",
  "formality_option_item_id": "uuid from formality options",
  "sentence_length_option_item_id": "uuid from sentence options",
  "pacing_option_item_id": "uuid from pacing options",
  "humor_usage_option_item_id": "uuid from humor options",
  "storytelling_style_option_item_id": "uuid from storytelling options",
  "use_of_jargon_option_item_id": "uuid from jargon options",
  "language_level_option_item_id": "uuid from language level options",
  "inclusivity_guidelines": "string (2-4 sentences)",
  "framing_concepts": [
    {
      "name": "string (short name)",
      "description": "string (one paragraph, 3-5 sentences)"
    }
  ],
  "vocabulary_entries": [
    {
      "name": "string (word or phrase)",
      "vocabulary_type": "preferred" | "prohibited",
      "suggested_replacement": "string (optional, for prohibited words)",
      "example_usage": "string (optional, for preferred words)"
    }
  ]
}`;
}

/**
 * Validates the generated style guide response
 */
function validateStyleGuideResponse(response: unknown): GeneratedStyleGuide {
  let data: Record<string, unknown>;
  
  // Handle array response
  if (Array.isArray(response)) {
    if (response.length === 0) {
      throw new Error('No style guide data generated');
    }
    data = response[0] as Record<string, unknown>;
  }
  // Handle object response
  else if (response && typeof response === 'object') {
    data = response as Record<string, unknown>;
  } else {
    throw new Error('Invalid response format: Expected object or array');
  }

  // Validate required fields exist (all are optional but we want at least some data)
  const hasAnyData = Object.values(data).some(value => value !== null && value !== undefined && value !== '');
  
  if (!hasAnyData) {
    throw new Error('No style guide data was generated');
  }

  // Validate framing_concepts if present
  let framingConcepts: FramingConcept[] = [];
  if (Array.isArray(data.framing_concepts)) {
    framingConcepts = (data.framing_concepts as Array<Record<string, unknown>>)
      .filter((item) => item && typeof item.name === 'string' && typeof item.description === 'string')
      .map((item) => ({
        name: item.name,
        description: item.description,
      }));
  }

  // Validate vocabulary_entries if present
  let vocabularyEntries: VocabularyEntry[] = [];
  if (Array.isArray(data.vocabulary_entries)) {
    vocabularyEntries = (data.vocabulary_entries as Array<Record<string, unknown>>)
      .filter((item) => 
        item && 
        typeof item.name === 'string' && 
        (item.vocabulary_type === 'preferred' || item.vocabulary_type === 'prohibited')
      )
      .map((item) => ({
        name: item.name,
        vocabulary_type: item.vocabulary_type,
        suggested_replacement: typeof item.suggested_replacement === 'string' ? item.suggested_replacement : undefined,
        example_usage: typeof item.example_usage === 'string' ? item.example_usage : undefined,
      }));
  }

  return {
    brand_personality: typeof data.brand_personality === 'string' ? data.brand_personality : undefined,
    brand_voice: typeof data.brand_voice === 'string' ? data.brand_voice : undefined,
    formality_option_item_id: typeof data.formality_option_item_id === 'string' ? data.formality_option_item_id : null,
    sentence_length_option_item_id: typeof data.sentence_length_option_item_id === 'string' ? data.sentence_length_option_item_id : null,
    pacing_option_item_id: typeof data.pacing_option_item_id === 'string' ? data.pacing_option_item_id : null,
    humor_usage_option_item_id: typeof data.humor_usage_option_item_id === 'string' ? data.humor_usage_option_item_id : null,
    storytelling_style_option_item_id: typeof data.storytelling_style_option_item_id === 'string' ? data.storytelling_style_option_item_id : null,
    use_of_jargon_option_item_id: typeof data.use_of_jargon_option_item_id === 'string' ? data.use_of_jargon_option_item_id : null,
    language_level_option_item_id: typeof data.language_level_option_item_id === 'string' ? data.language_level_option_item_id : null,
    inclusivity_guidelines: typeof data.inclusivity_guidelines === 'string' ? data.inclusivity_guidelines : undefined,
    framing_concepts: framingConcepts,
    vocabulary_entries: vocabularyEntries,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log('=== CREATE INITIAL WRITTEN STYLE GUIDE STARTED ===');

    // Parse request body to get URL
    let requestBody: RequestBody = {};
    try {
      const text = await req.text();
      if (text) {
        requestBody = JSON.parse(text);
      }
    } catch (parseError) {
      console.log('No request body or invalid JSON, will use default behavior');
    }

    const customerId = requestBody.customer_id?.trim();
    if (!customerId) {
      return new Response(
        JSON.stringify({
          error: 'customer_id is required',
          usage: 'Provide { "customer_id": "uuid", "url": "https://example.com" }',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let websiteUrl = requestBody.url?.trim() ?? '';

    if (!websiteUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'URL is required',
          usage: 'Please provide a URL in the request body: { "customer_id": "uuid", "url": "https://example.com" }'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authentication - Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with auth context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

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

    const baseplateUserId = userRecord.user_id;

    console.log('Customer ID:', customerId);
    console.log('Baseplate User ID:', baseplateUserId);

    // Fetch customer info
    console.log('Fetching customer info...');
    const { data: customerInfo, error: customerInfoError } = await supabase
      .from('customer_info')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerInfoError || !customerInfo) {
      throw new Error('Failed to fetch customer info: ' + (customerInfoError?.message || 'No customer info found'));
    }

    if (!websiteUrl) {
      websiteUrl = customerInfo.company_website_url?.trim() ?? '';
    }

    if (!websiteUrl && customerInfo.email_domain) {
      const normalizedDomain = customerInfo.email_domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      websiteUrl = `https://${normalizedDomain}`;
    }

    if (!websiteUrl) {
      const companyNameSlug = customerInfo.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (companyNameSlug) {
        websiteUrl = `https://www.${companyNameSlug}.com`;
      }
    }

    if (!websiteUrl) {
      throw new Error('Unable to determine a website URL for style guide generation.');
    }

    console.log('Using website URL:', websiteUrl);

    console.log('Fetching option tables...');
    // Fetch all option tables with proper PostgREST aliasing (colon notation)
    const [
      { data: formalityOptions, error: formalityError },
      { data: sentenceLengthOptions, error: sentenceLengthError },
      { data: pacingOptions, error: pacingError },
      { data: humorOptions, error: humorError },
      { data: storytellingOptions, error: storytellingError },
      { data: jargonOptions, error: jargonError },
      { data: languageLevelOptions, error: languageLevelError },
    ] = await Promise.all([
      supabase.from('formality_option_items').select('id:formality_option_item_id, display_name, description, name').eq('is_active', true),
      supabase.from('sentence_option_items_singleton').select('id:sentence_option_items_id, display_name, description, name').eq('is_active', true),
      supabase.from('pacing_option_items').select('id:pacing_option_item_id, display_name, description, name').eq('is_active', true),
      supabase.from('humor_usage_option_items').select('id:humor_usage_option_item_id, display_name, description, name').eq('is_active', true),
      supabase.from('storytelling_option_items').select('id:storytelling_option_item_id, display_name, description, name').eq('is_active', true),
      supabase.from('use_of_jargon_option_items').select('id:use_of_jargon_option_item_id, display_name, description, name').eq('is_active', true),
      supabase.from('language_level_option_items').select('id:language_level_option_item_id, display_name, description, name').eq('is_active', true),
    ]);

    if (formalityError || sentenceLengthError || pacingError || humorError || storytellingError || jargonError || languageLevelError) {
      const errors = [formalityError, sentenceLengthError, pacingError, humorError, storytellingError, jargonError, languageLevelError]
        .filter(Boolean)
        .map(e => e!.message);
      throw new Error(`Failed to fetch option tables: ${errors.join(', ')}`);
    }

    // Build the prompt with customer info and options
    const userPrompt = generateStyleGuideUserPrompt(
      websiteUrl,
      customerInfo as CustomerInfo,
      formalityOptions as OptionItem[],
      sentenceLengthOptions as OptionItem[],
      pacingOptions as OptionItem[],
      humorOptions as OptionItem[],
      storytellingOptions as OptionItem[],
      jargonOptions as OptionItem[],
      languageLevelOptions as OptionItem[]
    );

    console.log('System prompt length:', SYSTEM_PROMPT.length);
    console.log('User prompt length:', userPrompt.length);

    // Get OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    // Call GPT-5 with Responses API and web_search tool
    console.log('Calling GPT-5 with web_search via Responses API...');
    
    const openai = new OpenAI({ apiKey: openaiKey });
    
    // Extract domain from URL for filtering (remove http/https prefix)
    const urlObj = new URL(websiteUrl);
    const domain = urlObj.hostname.replace(/^www\./, ''); // Remove www. prefix if present
    console.log('Filtering web search to domain:', domain);
    
    // Combine system and user prompts into a single input string for GPT-5
    const combinedPrompt = `${SYSTEM_PROMPT}

${userPrompt}

CRITICAL: You MUST return your response as valid JSON only, with no additional text, markdown formatting, or code blocks. Return ONLY the JSON object.`;

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
            allowed_domains: [domain] // Allow-list of domains (max 20)
          }
        }
      ],
    };

    console.log('Request payload model:', responsePayload.model);
    console.log('Input prompt length:', combinedPrompt.length);

    // Call the Responses API endpoint directly
    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
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
    const output = (responseData.output || []) as Array<Record<string, unknown>>;
    
    // Find the message item in the output array
    const messageItem = output.find((item) => item.type === 'message') as { content?: Array<Record<string, unknown>> } | undefined;
    
    if (!messageItem) {
      console.error('No message item found in output:', responseData);
      throw new Error('No message content in OpenAI response');
    }

    // Extract text from the message content
    const content = (messageItem.content || []) as Array<Record<string, unknown>>;
    const textItem = content.find((item) => item.type === 'output_text') as { text?: string } | undefined;
    
    if (!textItem || !textItem.text) {
      console.error('No text content found in message:', messageItem);
      throw new Error('No text in message content');
    }

    const responseContent = textItem.text;
    console.log('Response content length:', responseContent.length);
    
    // Log web search calls
    const webSearchCalls = output.filter((item) => item.type === 'web_search_call');
    console.log(`✓ Web search performed: ${webSearchCalls.length} searches`);
    webSearchCalls.forEach((call: Record<string, unknown>, idx: number) => {
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

    // Validate and extract style guide data
    const styleGuideData = validateStyleGuideResponse(parsedResponse);
    console.log('Style guide data validated');

    // Check if a style guide already exists for this customer
    const { data: existingStyleGuide } = await supabase
      .from('style_guides')
      .select('style_guide_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (existingStyleGuide) {
      return new Response(
        JSON.stringify({ 
          error: 'Style guide already exists for this customer',
          existing_style_guide_id: existingStyleGuide.style_guide_id,
          suggestion: 'Use update endpoint to modify existing style guide'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert style guide record
    console.log('Inserting style guide into database...');
    const styleGuideRecord = {
      customer_id: customerId,
      created_by: baseplateUserId,
      guide_name: `${customerInfo.company_name} - Generated Style Guide`,
      brand_personality: styleGuideData.brand_personality || null,
      brand_voice: styleGuideData.brand_voice || null,
      formality_option_item_id: styleGuideData.formality_option_item_id,
      sentence_length_option_item_id: styleGuideData.sentence_length_option_item_id,
      pacing_option_item_id: styleGuideData.pacing_option_item_id,
      humor_usage_option_item_id: styleGuideData.humor_usage_option_item_id,
      storytelling_style_option_item_id: styleGuideData.storytelling_style_option_item_id,
      use_of_jargon_option_item_id: styleGuideData.use_of_jargon_option_item_id,
      language_level_option_item_id: styleGuideData.language_level_option_item_id,
      inclusivity_guidelines: styleGuideData.inclusivity_guidelines || null,
      llm_prompt_template: null,
      active: true,
    };

    const { data: createdStyleGuide, error: insertError } = await supabase
      .from('style_guides')
      .insert(styleGuideRecord)
      .select('style_guide_id')
      .single();

    if (insertError) {
      console.error('Error inserting style guide:', insertError);
      throw new Error('Failed to create style guide: ' + insertError.message);
    }

    console.log('=== STYLE GUIDE CREATED ===');
    console.log('Style Guide ID:', createdStyleGuide.style_guide_id);

    // Insert framing concepts if any were extracted
    let insertedFramingConcepts = 0;
    if (styleGuideData.framing_concepts && styleGuideData.framing_concepts.length > 0) {
      console.log(`Inserting ${styleGuideData.framing_concepts.length} framing concepts...`);
      
      const framingConceptRecords = styleGuideData.framing_concepts.map((concept) => ({
        style_guide_id: createdStyleGuide.style_guide_id,
        name: concept.name,
        description: concept.description,
        created_by: baseplateUserId,
      }));

      const { data: insertedConcepts, error: conceptsError } = await supabase
        .from('framing_concepts')
        .insert(framingConceptRecords)
        .select('framing_concept_id');

      if (conceptsError) {
        console.error('Error inserting framing concepts:', conceptsError);
        console.warn('Continuing despite framing concepts insertion error');
      } else {
        insertedFramingConcepts = insertedConcepts?.length || 0;
        console.log(`✓ Inserted ${insertedFramingConcepts} framing concepts`);
      }
    } else {
      console.log('No framing concepts extracted from content');
    }

    // Insert vocabulary entries if any were extracted
    let insertedVocabulary = 0;
    if (styleGuideData.vocabulary_entries && styleGuideData.vocabulary_entries.length > 0) {
      console.log(`Inserting ${styleGuideData.vocabulary_entries.length} vocabulary entries...`);
      
      const vocabularyRecords = styleGuideData.vocabulary_entries.map((entry) => ({
        style_guide_id: createdStyleGuide.style_guide_id,
        name: entry.name,
        vocabulary_type: entry.vocabulary_type,
        suggested_replacement: entry.suggested_replacement || null,
        example_usage: entry.example_usage || null,
        created_by: baseplateUserId,
      }));

      const { data: insertedEntries, error: vocabularyError } = await supabase
        .from('vocabulary_entries')
        .insert(vocabularyRecords)
        .select('vocabulary_entry_id');

      if (vocabularyError) {
        console.error('Error inserting vocabulary entries:', vocabularyError);
        console.warn('Continuing despite vocabulary entries insertion error');
      } else {
        insertedVocabulary = insertedEntries?.length || 0;
        const preferredCount = styleGuideData.vocabulary_entries.filter(e => e.vocabulary_type === 'preferred').length;
        const prohibitedCount = styleGuideData.vocabulary_entries.filter(e => e.vocabulary_type === 'prohibited').length;
        console.log(`✓ Inserted ${insertedVocabulary} vocabulary entries (${preferredCount} preferred, ${prohibitedCount} prohibited)`);
      }
    } else {
      console.log('No vocabulary entries extracted from content');
    }

    console.log('=== STYLE GUIDE GENERATION COMPLETE ===');

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        style_guide_id: createdStyleGuide.style_guide_id,
        company_name: customerInfo.company_name,
        analyzed_url: websiteUrl,
        framing_concepts_count: insertedFramingConcepts,
        vocabulary_entries_count: insertedVocabulary,
        style_guide: styleGuideData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-initial-written-style-guide:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unexpected error',
        success: false,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});

/* To invoke:

  1. Set environment variables:
     - SUPABASE_URL
     - SUPABASE_ANON_KEY
     - OPENAI_API_KEY

  2. Deploy: `supabase functions deploy create-initial-written-style-guide`

  3. Call from client with URL argument:
     
     const { data, error } = await supabase.functions.invoke('create-initial-written-style-guide', {
       body: { url: 'https://www.company.com' }
     });

     // Or without URL (will attempt to construct from company name):
     const { data, error } = await supabase.functions.invoke('create-initial-written-style-guide');

     // Response format:
     // {
     //   success: true,
     //   style_guide_id: 'uuid',
     //   company_name: 'Company Name',
     //   analyzed_url: 'https://www.company.com',
     //   framing_concepts_count: 5,
     //   vocabulary_entries_count: 25,
     //   style_guide: {
     //     brand_personality: '...',
     //     brand_voice: '...',
     //     formality_option_item_id: 'uuid',
     //     sentence_length_option_item_id: 'uuid',
     //     pacing_option_item_id: 'uuid',
     //     humor_usage_option_item_id: 'uuid',
     //     storytelling_style_option_item_id: 'uuid',
     //     use_of_jargon_option_item_id: 'uuid',
     //     language_level_option_item_id: 'uuid',
     //     inclusivity_guidelines: '...',
     //     framing_concepts: [
     //       { name: 'Concept Name', description: 'Description...' }
     //     ],
     //     vocabulary_entries: [
     //       { 
     //         name: 'synergy', 
     //         vocabulary_type: 'prohibited',
     //         suggested_replacement: 'collaboration'
     //       },
     //       {
     //         name: 'end-to-end solution',
     //         vocabulary_type: 'preferred',
     //         example_usage: 'We provide an end-to-end solution for...'
     //       }
     //     ]
     //   }
     // }

  IMPORTANT NOTES:
  
  1. URL ARGUMENT:
     This function accepts an optional "url" parameter in the request body.
     - If provided: Uses that URL to analyze the website
     - If not provided: Attempts to construct URL from company name
     - The function automatically:
       * Gets the customer_id from the authenticated user
       * Fetches customer_info from the database
       * Fetches all option tables
  
  2. OPENAI RESPONSES API WITH WEB SEARCH:
     The function uses OpenAI's Responses API (beta) with web_search tool enabled.
     - API Endpoint: POST https://api.openai.com/v1/responses
     - Requires OpenAI-Beta: responses=v1 header
     - Model: gpt-5 (GPT-5)
     - Web search tool allows the AI to browse and spider the website in real-time
     - Domain filtering ensures searches are limited to the customer's domain only
     - AI automatically performs 10-20 searches to analyze writing style across pages
  
  3. DOMAIN FILTERING:
     Web search results are filtered to the customer's domain only:
     - Extracts domain from the provided URL (e.g., example.com from https://www.example.com)
     - Passes domain to filters.allowed_domains parameter
     - Ensures AI only analyzes content from the customer's website
     - Includes all subdomains automatically
     - Can specify up to 20 domains in the allowed_domains array
  
  4. AI ANALYSIS:
     GPT-5 analyzes:
     - Actual website content fetched via web_search tool (filtered to customer domain)
     - Multiple pages from the website (homepage, about, blog, products, etc.)
     - Company information from customer_info table
     - Writing style, tone, vocabulary patterns across pages
     - Generates comprehensive style guide recommendations based on real content
  
  5. OPTION MAPPING:
     OpenAI is provided with all available options (with their UUIDs) from the database.
     It selects the MOST APPROPRIATE option ID for each enum field based on actual
     website analysis, which is then directly inserted into the database.
  
  6. DUPLICATE PREVENTION:
     Function checks if style guide already exists and returns 409 if found.
     Use an update function or delete existing before regenerating.

  7. FRAMING CONCEPTS EXTRACTION:
     GPT-5 automatically extracts framing concepts (metaphors, analogies) from website content.
     - Each concept includes a name and description
     - Typically extracts 3-7 concepts based on recurring patterns
     - Concepts are automatically inserted into framing_concepts table
     - Linked to the created style_guide via style_guide_id
     - If extraction fails, style guide is still created (concepts are optional)

  8. VOCABULARY EXTRACTION:
     GPT-5 extracts preferred and prohibited vocabulary from website content.
     - PREFERRED: 10-20 industry-specific terms, branded phrases, technical terminology
     - PROHIBITED: 5-15 buzzwords, generic terms, or language the site avoids
     - Each entry includes:
       * name: The word or phrase
       * vocabulary_type: 'preferred' or 'prohibited'
       * suggested_replacement: (For prohibited) What to use instead
       * example_usage: (For preferred) How it's used on the site
     - Entries are automatically inserted into vocabulary_entries table
     - If extraction fails, style guide is still created (vocabulary is optional)

  9. CUSTOMER INFO REQUIRED:
     The customer must have a customer_info record with at least:
     - company_name
     - tagline
     - one_sentence_summary
     - problem_overview
     - solution_overview

*/

