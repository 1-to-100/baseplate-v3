/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import 'jsr:@supabase/functions-js@2.93.3/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import OpenAI from 'npm:openai@6.16.0';
import {
  companyInfoJsonSchema,
  parseGeneratedCompanyInfo,
  type GeneratedCompanyInfo,
} from './schema.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Type definitions
interface Customer {
  customer_id: string;
  name: string;
  email_domain?: string;
}

// System prompt
const SYSTEM_PROMPT = `You are an expert marketing strategist and business analyst specializing in company positioning, value proposition development, and competitive analysis. Your role is to analyze company websites and extract or create comprehensive company information that captures their market position, value proposition, and messaging.`;

/**
 * Generates the combined prompt for company information creation
 */
function generateCompanyInfoPrompt(companyName: string, websiteUrl: string): string {
  return `Analyze the website ${websiteUrl} for ${companyName} and generate comprehensive company information.

# ANALYSIS APPROACH
You will search and analyze content from the company website to understand:
- Their value proposition and unique selling points
- The problems they solve for customers
- Their solution and how it works
- Their competitive positioning
- Their brand voice and messaging style

# COMPANY CONTEXT
- Company Name: ${companyName}
- Website: ${websiteUrl}

# TASK
Generate the following company information fields based on your analysis of the website:

1. **tagline** (3-7 words)
   A punchy, memorable tagline that captures the company's essence.
   Examples: "Move Fast and Break Things", "Think Different", "Just Do It"

2. **one_sentence_summary** (1 sentence, 15-25 words)
   A clear, concise summary of what the company does and who they serve.
   Format: "[Company] helps [target audience] [achieve goal] by [how/method]"

3. **problem_overview** (1-2 paragraphs, 75-150 words)
   Describe the specific problem or pain point that the company addresses.
   Focus on the customer perspective - what challenges do their customers face?

4. **solution_overview** (1-2 paragraphs, 75-150 words)
   Explain how the company's product/service solves the problem.
   Use audience-appropriate language (not overly technical unless B2B technical audience).
   Highlight key features, benefits, and differentiators.

5. **competitive_overview** (1 paragraph, 50-120 words)
   Describe the competitive landscape and how the company differentiates from alternatives.
   Focus on positioning, unique strengths, and reasons buyers choose this company over competitors.

6. **content_authoring_prompt** (2-3 paragraphs, 100-200 words)
   Guidelines for creating content about this company.
   Include: key themes to emphasize, terminology to use/avoid, tone preferences, messaging frameworks.
   If you cannot determine specific guidelines from the website, return null for this field.

# OUTPUT RULES
- Return JSON matching the required schema exactly.
- For text fields, do not include links or citations.
- Base all information on actual website content.
- Use clear, professional language that matches the company's industry and audience.`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== CREATE COMPANY INFORMATION STARTED ===');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with auth context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Extract token and authenticate user
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Authentication failed:', userError?.message);
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'You must be signed in to use this function',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Get customer_id from users table
    const { data: userRecord, error: userRecordError } = await supabase
      .from('users')
      .select('customer_id, user_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (userRecordError || !userRecord) {
      console.error('❌ Failed to get user record:', userRecordError?.message);
      throw new Error(
        'Failed to get user record: ' + (userRecordError?.message ?? 'No user record found')
      );
    }

    const customerId = userRecord.customer_id;
    const userId = userRecord.user_id;

    console.log('✅ Customer ID:', customerId);
    console.log('✅ User ID:', userId);

    // Fetch customer data for company name and website
    console.log('📊 Fetching customer data...');
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name, email_domain')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerError) {
      console.error('❌ Failed to fetch customer:', customerError.message);
      throw new Error('Failed to fetch customer: ' + customerError.message);
    }

    if (!customer) {
      console.error('❌ No customer found');
      throw new Error('No customer found for this user');
    }

    console.log('✅ Customer retrieved:', customer.name);

    // Format website URL
    let websiteUrl = '';
    if (customer.email_domain) {
      // Try HTTPS first
      const httpsUrl = `https://www.${customer.email_domain}`;
      const httpUrl = `http://www.${customer.email_domain}`;

      try {
        const checkResponse = await fetch(httpsUrl, { method: 'HEAD', redirect: 'follow' });
        websiteUrl = checkResponse.ok ? httpsUrl : httpUrl;
      } catch {
        websiteUrl = httpUrl;
      }

      console.log('✅ Website URL determined:', websiteUrl);
    } else {
      throw new Error(
        'No email domain configured for this customer. Please set the email domain first.'
      );
    }

    // Generate company information using OpenAI SDK + structured output
    console.log('🤖 Calling OpenAI GPT-5 with web search to analyze website...');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY not set');
      throw new Error('OPENAI_API_KEY not set');
    }

    const combinedPrompt = generateCompanyInfoPrompt(customer.name, websiteUrl);

    // Extract domain from URL for filtering
    const urlObj = new URL(websiteUrl);
    const domain = urlObj.hostname.replace(/^www\./, '');
    console.log('✅ Filtering web search to domain:', domain);

    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    console.log('📤 Calling Responses API...');

    const openaiResponse = await openaiClient.responses.create({
      model: 'gpt-5',
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: combinedPrompt },
      ],
      tools: [
        {
          type: 'web_search',
          filters: {
            allowed_domains: [domain],
          },
        },
      ],
      text: {
        format: companyInfoJsonSchema,
      },
    });
    console.log('✅ Responses API response received');
    console.log('Response status:', openaiResponse.status);

    // Log web search calls
    const output = openaiResponse.output || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webSearchCalls = output.filter((item: any) => item.type === 'web_search_call');
    console.log(`✅ Web search performed: ${webSearchCalls.length} searches`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webSearchCalls.forEach((call: any, idx: number) => {
      console.log(`  Search ${idx + 1}: ${call.action?.query || 'unknown'}`);
    });

    const responseContent =
      typeof openaiResponse.output_text === 'string' ? openaiResponse.output_text.trim() : '';
    if (!responseContent) {
      console.error('❌ No text content found in response output');
      throw new Error('No text in OpenAI response');
    }
    console.log('✅ Response content received, length:', responseContent.length);

    // Parse the JSON response
    let aiResponse: GeneratedCompanyInfo;
    try {
      aiResponse = parseGeneratedCompanyInfo(JSON.parse(responseContent));
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', responseContent);
      throw new Error('Invalid structured response from OpenAI');
    }

    console.log('✅ AI response parsed');
    console.log('Generated fields:', Object.keys(aiResponse));
    console.log('Full AI response:', JSON.stringify(aiResponse, null, 2));

    // Validate required fields and provide defaults if missing
    if (!aiResponse.tagline || aiResponse.tagline.trim() === '') {
      console.warn('⚠️ Missing tagline, using default');
      aiResponse.tagline = `${customer.name} - Innovation and Excellence`;
    }

    if (!aiResponse.one_sentence_summary || aiResponse.one_sentence_summary.trim() === '') {
      console.warn('⚠️ Missing one_sentence_summary, using default');
      aiResponse.one_sentence_summary = `${customer.name} provides innovative solutions to help businesses succeed.`;
    }

    if (!aiResponse.problem_overview || aiResponse.problem_overview.trim() === '') {
      console.warn('⚠️ Missing problem_overview, using default');
      aiResponse.problem_overview =
        'Businesses today face challenges in staying competitive and meeting customer expectations in a rapidly evolving market.';
    }

    if (!aiResponse.solution_overview || aiResponse.solution_overview.trim() === '') {
      console.warn('⚠️ Missing solution_overview, using default');
      aiResponse.solution_overview = `${customer.name} addresses these challenges through innovative technology and customer-focused solutions that drive measurable results.`;
    }

    if (!aiResponse.competitive_overview || aiResponse.competitive_overview.trim() === '') {
      console.warn('⚠️ Missing competitive_overview, using default');
      aiResponse.competitive_overview = `${customer.name} differentiates itself through unique value propositions and a commitment to customer success.`;
    }

    console.log('✅ All required fields validated');

    // Insert or update customer_info
    console.log('💾 Saving to database...');

    // Check if customer_info already exists
    const { data: existingInfo, error: checkError } = await supabase
      .from('customer_info')
      .select('customer_info_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing info:', checkError.message);
    }

    let customerInfoId: string;

    if (existingInfo) {
      // Update existing record
      console.log('📝 Updating existing customer_info...');
      const { data: updated, error: updateError } = await supabase
        .from('customer_info')
        .update({
          company_name: customer.name,
          tagline: aiResponse.tagline,
          one_sentence_summary: aiResponse.one_sentence_summary,
          problem_overview: aiResponse.problem_overview,
          solution_overview: aiResponse.solution_overview,
          competitive_overview: aiResponse.competitive_overview,
          content_authoring_prompt: aiResponse.content_authoring_prompt || null,
        })
        .eq('customer_id', customerId)
        .select('customer_info_id')
        .single();

      if (updateError) {
        console.error('❌ Failed to update customer_info:', updateError.message);
        throw new Error('Failed to update customer information: ' + updateError.message);
      }

      customerInfoId = updated.customer_info_id;
      console.log('✅ Updated customer_info:', customerInfoId);
    } else {
      // Create new record
      console.log('📝 Creating new customer_info...');
      const { data: created, error: insertError } = await supabase
        .from('customer_info')
        .insert({
          customer_id: customerId,
          company_name: customer.name,
          tagline: aiResponse.tagline,
          one_sentence_summary: aiResponse.one_sentence_summary,
          problem_overview: aiResponse.problem_overview,
          solution_overview: aiResponse.solution_overview,
          competitive_overview: aiResponse.competitive_overview,
          content_authoring_prompt: aiResponse.content_authoring_prompt || null,
        })
        .select('customer_info_id')
        .single();

      if (insertError) {
        console.error('❌ Failed to insert customer_info:', insertError.message);
        throw new Error('Failed to create customer information: ' + insertError.message);
      }

      customerInfoId = created.customer_info_id;
      console.log('✅ Created customer_info:', customerInfoId);
    }

    console.log('=== COMPLETE: Company information saved ===');

    return new Response(
      JSON.stringify({
        success: true,
        customer_info_id: customerInfoId,
        message: existingInfo
          ? 'Company information updated successfully'
          : 'Company information created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in create-company-information:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
