/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Import Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CustomerInfo {
  customer_info_id: string;
  customer_id: string;
  problem_overview: string;
  solution_overview: string;
  one_sentence_summary: string;
  tagline: string;
  company_name?: string;
}

interface CreatePersonaRequest {
  name: string;
  description: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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

    // Extract token from Authorization header and pass to getUser()
    // This is the recommended approach per Supabase docs
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    // Check if we have a valid authenticated user
    if (userError || !user) {
      console.error('Authentication failed:', {
        error: userError?.message,
        hasUser: !!user,
        authHeader: authHeader ? 'present' : 'missing'
      });
      
      // Decode the JWT to see what we received
      let tokenInfo: any = null;
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          tokenInfo = {
            role: payload.role,
            iss: payload.iss,
            sub: payload.sub,
            hasSub: !!payload.sub,
            isAnonKey: payload.role === 'anon'
          };
          console.log('JWT payload info:', tokenInfo);
        }
      } catch (decodeError) {
        console.error('Could not decode JWT:', decodeError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          message: 'You must be signed in to use this function',
          details: userError?.message || 'No authenticated user found',
          tokenReceived: tokenInfo?.isAnonKey ? 'anon key (not a user token)' : 'invalid or expired token',
          howToFix: [
            '1. Sign in to your application',
            '2. Navigate to the diagnostics page while signed in',
            '3. Run the test again with your user session'
          ]
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('✅ User authenticated successfully:', {
      userId: user.id,
      email: user.email
    });

    // Parse request body
    const body = await req.json() as CreatePersonaRequest;
    const { name, description } = body;

    if (!name || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name and description' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get customer_id and user_id from users table
    const { data: userRecord, error: userRecordError } = await supabase
      .from('users')
      .select('customer_id, user_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (userRecordError || !userRecord) {
      throw new Error('Failed to get user record: ' + (userRecordError?.message ?? 'No user record found'));
    }

    const customerId = userRecord.customer_id;
    const baseplateUserId = userRecord.user_id;

    // Validate customer_id is a UUID
    if (!customerId) {
      throw new Error('customer_id is null or undefined');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof customerId !== 'string' || !uuidRegex.test(customerId)) {
      throw new Error(`Invalid customer_id format: expected UUID, got ${typeof customerId}: ${customerId}`);
    }

    console.log('=== USER & CUSTOMER IDENTIFICATION ===');
    console.log('Supabase auth_user_id:', user.id);
    console.log('Baseplate user_id:', baseplateUserId);
    console.log('User email:', user.email);
    console.log('Customer ID (UUID):', customerId);
    console.log('Customer ID type:', typeof customerId);
    console.log('Retrieved from: users table WHERE auth_user_id = auth.uid()');

    // Get customer info for context
    let customerInfo: CustomerInfo | null = null;
    const { data: customerInfoData, error: customerInfoError } = await supabase
      .from('customer_info')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerInfoError) {
      console.error('Error fetching customer info:', customerInfoError);
      // Continue without customer info - we'll use defaults
    } else {
      customerInfo = customerInfoData;
    }

    // Get company name from customers table
    let companyName = 'Unknown Company';
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('name')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    if (customerError) {
      console.warn('Could not fetch customer name from customers table:', customerError.message);
    } else if (customerData?.name) {
      companyName = customerData.name;
    }

    console.log('Company name:', companyName);

    // Build system prompt
    const systemPrompt = `You are an expert user experience researcher. Your task is to create a comprehensive buyer persona based on a job role and company context.

You will be provided with:
- Company information (name, tagline, summary, problem/solution overview)
- Persona name and job description

Your job is to create a detailed persona recommendation that includes all the required fields. 
Focus on creating a realistic, well-researched persona that would be relevant to the company's target market.

All text fields ending in "_html" should use proper Markdown formatting with **bold**, *italic*, - bullet points.
DO NOT INCLUDE HEADERS WITH THE CONTENT - JUST THE CONTENT ITSELF.`;

    // Build user prompt
    const userPrompt = `# Company Information
**Company Name:** ${companyName}
${customerInfo?.tagline ? `**Tagline:** ${customerInfo.tagline}` : ''}
${customerInfo?.one_sentence_summary ? `**Summary:** ${customerInfo.one_sentence_summary}` : ''}
${customerInfo?.problem_overview ? `**Problem Overview:** ${customerInfo.problem_overview}` : ''}
${customerInfo?.solution_overview ? `**Solution Overview:** ${customerInfo.solution_overview}` : ''}

# Persona Information
**Persona Name:** ${name}
**Job Description:** ${description}

# Task
Create a comprehensive buyer persona for this role. Be specific and realistic based on the company context.
Focus on personas that would be relevant to the company's target market.
Make the persona detailed and actionable for marketing and sales teams.

## Guidelines
- Experience Level: 0-2 (Entry), 2-5 (Early career), 5-10 (Mid-level), 10-15 (Senior), 15-20 (Executive), 20+ (Veteran)
- All text fields ending in "_html" should use proper Markdown formatting with **bold**, *italic*, - bullet points
- Example markdown formatting: Bold text with **text**, italic with *text*, and bullet points with - item
- Do not include headers with the content - just the content itself
- Be specific and realistic based on the company context`;

    console.log('Generating persona with OpenAI...');

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    // Create OpenAI client
    const openaiClient = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Generate persona using OpenAI with structured output
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'persona_recommendation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              titles: { type: 'array', items: { type: 'string' }, description: 'Array of job titles and variations' },
              experience_level: { type: 'number', description: 'Years of experience (0-2: Entry, 2-5: Early career, 5-10: Mid-level, 10-15: Senior, 15-20: Executive, 20+: Veteran)' },
              job_responsibilities: { type: 'string', description: 'Markdown formatted unordered list of responsibilities of the role in the context of the solution' },
              is_manager: { type: 'boolean', description: 'Whether this role typically manages others' },
              department: { type: 'string', description: 'Department name' },
              pain_points_html: { type: 'string', description: 'Markdown formatted unordered list of general job challenges' },
              goals_html: { type: 'string', description: 'Markdown formatted unordered list of general job goals' },
              solution_relevant_pain_points_html: { type: 'string', description: 'Markdown formatted unordered list of challenges the solution addresses' },
              solution_relevant_goals_html: { type: 'string', description: 'Markdown formatted unordered list of goals the solution helps achieve' },
              current_solutions_html: { type: 'string', description: 'Markdown formatted unordered list of current tools and processes' },
              switching_costs_html: { type: 'string', description: 'Markdown formatted unordered list of costs of switching to the solution' },
              unsatisfied_with_html: { type: 'string', description: 'Markdown formatted unordered list of current solution problems' },
              ideal_outcome_html: { type: 'string', description: 'Markdown formatted unordered list of desired outcomes' },
              buying_behavior: { type: 'string', description: 'Markdown formatted unordered list of summary of purchasing habits' },
              digital_savviness: { 
                type: 'string', 
                enum: ['Digital Novice', 'Basic User', 'Digital Citizen', 'Intermediate User', 'Tech-Savvy', 'Power User', 'Digital Specialist', 'Tech Expert', 'Innovator', 'Digital Thought Leader'],
                description: 'Level of digital expertise' 
              },
              is_decider: { type: 'boolean', description: 'Whether this role typically makes purchasing decisions' },
            },
            required: ['titles', 'experience_level', 'job_responsibilities', 'is_manager', 'department', 'pain_points_html', 'goals_html', 'solution_relevant_pain_points_html', 'solution_relevant_goals_html', 'current_solutions_html', 'switching_costs_html', 'unsatisfied_with_html', 'ideal_outcome_html', 'buying_behavior', 'digital_savviness', 'is_decider'],
            additionalProperties: false,
          },
        },
      },
    });

    const personaRecommendation = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log('Generated persona recommendation:', personaRecommendation);

    // Prepare persona data for database
    const personaData = {
      name: name,
      titles: personaRecommendation.titles.join(', '),
      department: personaRecommendation.department,
      job_responsibilities: personaRecommendation.job_responsibilities,
      is_manager: personaRecommendation.is_manager,
      experience_years: personaRecommendation.experience_level.toString(),
      education_levels: '', // Not generated by AI
      pain_points_html: personaRecommendation.pain_points_html,
      goals_html: personaRecommendation.goals_html,
      solution_relevant_pain_points_html: personaRecommendation.solution_relevant_pain_points_html,
      solution_relevant_goals_html: personaRecommendation.solution_relevant_goals_html,
      current_solutions_html: personaRecommendation.current_solutions_html,
      switching_costs_html: personaRecommendation.switching_costs_html,
      unsatisfied_with_html: personaRecommendation.unsatisfied_with_html,
      ideal_outcome_html: personaRecommendation.ideal_outcome_html,
      buying_behavior: personaRecommendation.buying_behavior,
      digital_savviness: personaRecommendation.digital_savviness,
      is_decider: personaRecommendation.is_decider,
      customer_id: customerId,
      created_by: baseplateUserId,  // Baseplate user_id (references users.user_id)
      updated_by: baseplateUserId,  // Baseplate user_id (references users.user_id)
    };

    console.log('=== DATABASE INSERT ===');
    console.log('Inserting persona into database...');
    console.log('customer_id (UUID):', personaData.customer_id);
    console.log('created_by (Baseplate user_id):', personaData.created_by);
    console.log('updated_by (Baseplate user_id):', personaData.updated_by);

    // Insert persona into database
    const { data: createdPersona, error: insertError } = await supabase
      .from('personas')
      .insert(personaData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting persona:', insertError);
      throw new Error('Failed to create persona: ' + insertError.message);
    }

    console.log('=== PERSONA CREATED SUCCESSFULLY ===');
    console.log('Persona ID:', createdPersona.persona_id);
    console.log('Customer ID (UUID):', createdPersona.customer_id);
    console.log('Created by (UUID):', createdPersona.created_by);
    console.log('Name:', createdPersona.name);
    console.log('Department:', createdPersona.department);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        persona_id: createdPersona.persona_id,
        persona: createdPersona,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-persona function:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
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

  2. Deploy: `supabase functions deploy create-persona`

  3. Call from client:
     
     const { data, error } = await supabase.functions.invoke('create-persona', {
       body: { 
         name: 'Chief Marketing Officer',
         description: 'Senior executive responsible for marketing strategy'
      },
      timeout: 600000,
     });

*/
