/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestBody {
  customer_id: string;
}

interface UserRecord {
  customer_id: string | null;
  user_id: string;
}

interface Customer {
  customer_id: string;
  name: string;
  email_domain: string | null;
}

interface CustomerInfoRow {
  customer_info_id: string;
  customer_id: string;
  company_name: string | null;
  tagline: string | null;
  one_sentence_summary: string | null;
  problem_overview: string | null;
  solution_overview: string | null;
  content_authoring_prompt: string | null;
}

interface CompanyStrategyRow {
  strategy_id: string;
  customer_id: string;
}

interface StrategyItem {
  name: string;
  description: string;
}

interface StrategyGenerationResult {
  mission: string;
  mission_description: string;
  vision: string;
  vision_description: string;
  values: StrategyItem[];
  principles: StrategyItem[];
  company_name: string | null;
  tagline: string | null;
  one_sentence_summary: string | null;
  problem_overview: string | null;
  solution_overview: string | null;
  content_authoring_prompt?: string;
}

interface OptionPublicationStatus {
  option_id: string;
  programmatic_name: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are a chief strategy officer who specializes in synthesizing company strategy artifacts.
You review official company websites and distill high-quality strategic frameworks that align mission, vision, principles, and values.
You write in a professional, credible tone and always ground recommendations in observed company context.`;

function sanitizeUuid(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function buildCompanyUrl(emailDomain: string | null): string {
  if (!emailDomain) {
    throw new Error("Customer does not have an email domain configured.");
  }

  const trimmed = emailDomain.trim();
  if (!trimmed) {
    throw new Error("Customer email domain is empty.");
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  const sanitized = withoutProtocol.replace(/\/+$/, "");

  if (!sanitized) {
    throw new Error("Unable to derive company URL from email domain.");
  }

  const normalized = sanitized.toLowerCase().startsWith("www.")
    ? sanitized.toLowerCase()
    : `www.${sanitized.toLowerCase()}`;

  const finalUrl = `https://${normalized}`;
  new URL(finalUrl); // Validate format
  return finalUrl;
}

function createStrategyPrompt(args: {
  companyUrl: string;
  customerName: string;
  customerInfo: CustomerInfoRow | null;
}): string {
  const { companyUrl, customerName, customerInfo } = args;

  const contextLines: string[] = [
    `- Company Name: ${customerName}`,
    `- Website: ${companyUrl}`,
  ];

  if (customerInfo) {
    if (customerInfo.tagline) contextLines.push(`- Tagline: ${customerInfo.tagline}`);
    if (customerInfo.one_sentence_summary) contextLines.push(`- One Sentence Summary: ${customerInfo.one_sentence_summary}`);
    if (customerInfo.problem_overview) contextLines.push(`- Problem Overview: ${customerInfo.problem_overview}`);
    if (customerInfo.solution_overview) contextLines.push(`- Solution Overview: ${customerInfo.solution_overview}`);
    if (customerInfo.content_authoring_prompt) contextLines.push(`- Content Prompt: ${customerInfo.content_authoring_prompt}`);
  }

  return `# ROLE
You are generating the initial strategic foundation for a real company. You must analyze the official website and produce realistic, human-quality strategy artifacts.

# WEBSITE TO ANALYZE
${companyUrl}

# COMPANY CONTEXT
${contextLines.join("\n")}

# REQUIRED OUTPUT
Return ONLY valid JSON (no markdown, commentary, or code fences) with the following structure:

{
  "company_name": "string",
  "tagline": "string",
  "one_sentence_summary": "string",
  "problem_overview": "string",
  "solution_overview": "string",
  "content_authoring_prompt": "string (optional)",
  "mission": "string",
  "mission_description": "string",
  "vision": "string",
  "vision_description": "string",
  "values": [ { "name": "string", "description": "string" } ],
  "principles": [ { "name": "string", "description": "string" } ]
}

## Branding & Positioning Fields

- **Company Name:** Provide the public-facing brand name exactly as it should appear in strategic documents. Use Title Case and include legal suffixes only if they are consistently part of the brand.

- **Tagline:** 3-8 words that capture the company's promise or positioning. Make it punchy and memorable; avoid quotation marks or trailing punctuation.

- **One Sentence Summary:** Exactly one sentence, 15-25 words. Format: "[Company] helps [target audience] [achieve goal] by [how / differentiator]."

- **Problem Overview:** 1-2 paragraphs (75-150 words total) that describe the specific problem or pain point that the company addresses. Focus on the customer perspective - what challenges do their customers face?

- **Solution Overview:** 1-2 paragraphs (75-150 words total) that explain how the company's product/service solves the problem. Use audience-appropriate language (not overly technical unless B2B technical audience). Highlight key features, benefits, and differentiators. Also mention the competitive landscape and how this company differentiates from competitors.

- **Content Authoring Prompt:** (OPTIONAL) 2-3 paragraphs, 100-200 words. Guidelines for creating content about this company. Include: key themes to emphasize, terminology to use/avoid, tone preferences, messaging frameworks. If you cannot determine specific guidelines from the website, OMIT this field.

## Mission Statement

The mission defines the core, fundamental reason for the company's existence. It is the overarching purpose that transcends business trends and financial goals, articulating the long-term impact the company seeks to have on its customers, industry, and society. Unlike strategies that evolve over time, a company's mission remains relatively stable, serving as a guiding star for decision-making. A well-defined mission provides clarity and alignment across all teams, ensuring that product development, customer engagement, and corporate priorities stay true to the company's foundational goals. It also helps attract employees, partners, and customers who resonate with the company's purpose. A clear mission guides decision-making and motivates employees by connecting their daily work to a greater cause. The last point is the key. Employees today seek to have jobs that have meaning. In developing a broad and compelling mission we have the chance to give them that in what they do on a day-to-day basis. Deliver a single paragraph that captures this enduring purpose.

## Mission Explanation

- Provide THREE paragraphs.
- Each paragraph must contain 3-5 sentences.
- Explain how the mission shows up across products, customers, and internal culture, using detailed, specific language rather than generic statements.

## Vision Statement

Vision is about capturing a long-term, ambitious goal that the organization is shooting for. The timeframe here is over 10 years in the future when the company has had a radical impact on the world. You'll read this alternatively referred to as Long-Term Ambition, Big Hairy Audacious Goal (BHAG) or 10-Year Target—lots of different names for something that's roughly the same. This can be a business metric such as a revenue milestone, a number of customers, or a market position but only if that is inspiring to your team—and I've yet to meet a team that's ARR targets are inspiring to. Inspiring to CEOs? Sure. Inspiring to the people that will actually make the vision happen? Not so much. So think of this as the thing you're using to rally the team around—a shared vision that can motivate employees beyond day-to-day tasks. When making strategic decisions, leaders can ask "Does this move us toward our Vision?" It also communicates externally (to investors or press) the scale of the company's ambitions. Deliver a single paragraph that captures this aspirational future.

## Vision Explanation

- Provide THREE paragraphs.
- Each paragraph must contain 3-5 sentences.
- Describe the world if the vision is achieved, referencing customers, market trajectory, differentiation, and how the company's presence reshapes the category.

## Corporate Values

- Provide 4-8 values.
- Each value must include a short name and a 2-3 sentence description that is actionable, vivid, and grounded in behavior.
- If the website does not clearly articulate values, synthesize realistic entries aligned with the company's positioning and tone. Mark synthetic values by suffixing the name with " (Suggested)" only when no explicit value name was found.

## Strategic Principles

- Provide 4-8 principles.
- Each principle must include a short name and a 2-3 sentence description covering how decisions should be made across teams and situations.
- Principles are the pillars of strategy and operations that define how the company will achieve success and win in the marketplace. In Pat Lencioni's Advantage model, these are referred to as Strategic Anchors, and answer the question "How will we succeed?"
- They should be written, well-defined concepts that anyone in the company can apply to a situation to ensure different people of different backgrounds arrive at similar conclusions.
- Helpful and useful principles tend to be specific to the nature of the business, deeply aligned with the personality of the founder or CEO, and practically framed in implementation. When evaluating a major decision or project, teams will refer back to these guiding principles to ensure alignment.
- Short and pithy in framing. You can have pages of supporting information to document what they mean and how to apply them—that's fine and encouraged, actually. But we want the core idea to be something that sticks in the heads of a diverse group of people.
- If no explicit principles are discovered, derive pragmatic decision principles consistent with the mission and strategy, and mark the name with " (Suggested)" to denote a synthesized entry.

# CRITICAL INSTRUCTIONS

- Use ONLY information available on the company website and in the customer context above.
- Do NOT invent data that contradicts published information.
- Ensure explanations are original prose, not bullet lists.
- Maintain professional tone and avoid marketing hype.
- Return ONLY valid JSON (no markdown, no commentary).`;
}

function normalizeMultiline(value: string): string {
  return value.replace(/\r\n/g, "\n").trim().replace(/\n{3,}/g, "\n\n");
}

function stripMarkdownLinks(value: string): string {
  return value.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

function coerceText(value: unknown): string {
  if (typeof value === "string") {
    return stripMarkdownLinks(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((entry) =>
        typeof entry === "string"
          ? stripMarkdownLinks(entry).trim()
          : typeof entry === "object" && entry !== null && "text" in entry
            ? coerceText((entry as Record<string, unknown>).text)
            : [],
      )
      .filter((segment) => segment.length > 0)
      .join("\n\n")
      .trim();
  }

  return "";
}

function validateStrategyResponse(payload: unknown, defaultCompanyName: string): StrategyGenerationResult {
  // Default stock values
  const defaultMission = "To deliver exceptional value and innovation that empowers our customers and transforms our industry.";
  const defaultMissionDescription = `Our mission drives everything we do. It guides our product development, shapes our customer relationships, and defines our commitment to excellence.\n\nWe see our mission reflected in every interaction with our customers, where we strive to understand their needs and exceed their expectations. Our team embodies this mission through dedication, creativity, and a relentless focus on delivering results.\n\nThis mission is not just words—it's the foundation of our culture and the compass that directs our strategic decisions. It ensures that as we grow, we remain true to our core purpose and continue to make a meaningful impact.`;
  
  const defaultVision = "To become the leading force in our industry, recognized for innovation, customer success, and transformative impact on how businesses operate and grow.";
  const defaultVisionDescription = `When we achieve our vision, our customers will experience unprecedented growth and efficiency. They'll see measurable improvements in their operations, stronger competitive positioning, and new opportunities for expansion.\n\nThe market will recognize us as the standard-bearer for innovation and excellence. Our approach will reshape industry expectations, setting new benchmarks for quality, service, and customer outcomes.\n\nOur organization will be a magnet for top talent, known for empowering employees to do their best work. We'll have built a sustainable, scalable business that continues to evolve and lead the industry forward.`;
  
  const defaultTagline = "Innovation. Excellence. Results.";
  const defaultOneSentenceSummary = "We help businesses achieve their goals through innovative solutions and exceptional service.";
  const defaultProblemOverview = "Businesses today face increasing complexity, rapid change, and intense competition. They need solutions that are both powerful and easy to use, that can scale with their growth, and that deliver measurable results.";
  const defaultSolutionOverview = "We provide comprehensive solutions that address these challenges head-on. Our approach combines cutting-edge technology with deep industry expertise, delivering tools and services that help businesses operate more efficiently, make better decisions, and achieve sustainable growth.";
  
  const defaultValues: StrategyItem[] = [
    {
      name: "Integrity",
      description: "We conduct business with honesty, transparency, and ethical behavior in all our interactions. This value guides our decision-making and builds trust with customers, partners, and team members."
    },
    {
      name: "Innovation",
      description: "We continuously seek new ways to solve problems and improve our offerings. Innovation drives our product development and helps us stay ahead of industry trends."
    },
    {
      name: "Customer Focus",
      description: "Our customers' success is our success. We listen carefully, respond quickly, and go above and beyond to ensure they achieve their goals."
    },
    {
      name: "Excellence",
      description: "We strive for excellence in everything we do, from product quality to customer service. We set high standards and work diligently to meet and exceed them."
    }
  ];
  
  const defaultPrinciples: StrategyItem[] = [
    {
      name: "Customer-Centric Decision Making",
      description: "Every decision we make starts with understanding how it impacts our customers. We prioritize customer needs and outcomes above all else."
    },
    {
      name: "Data-Driven Approach",
      description: "We use data and analytics to inform our decisions, measure our progress, and continuously improve our products and services."
    },
    {
      name: "Continuous Improvement",
      description: "We believe in constantly evolving and improving. We learn from our experiences, adapt to change, and never settle for the status quo."
    },
    {
      name: "Collaboration and Transparency",
      description: "We work together openly and honestly, sharing information and insights to achieve common goals. Collaboration makes us stronger."
    }
  ];

  // Handle invalid payload
  if (!payload || typeof payload !== "object") {
    console.warn("OpenAI response was not an object. Using default values.");
    return {
      mission: defaultMission,
      mission_description: defaultMissionDescription,
      vision: defaultVision,
      vision_description: defaultVisionDescription,
      values: defaultValues,
      principles: defaultPrinciples,
      company_name: defaultCompanyName,
      tagline: defaultTagline,
      one_sentence_summary: defaultOneSentenceSummary,
      problem_overview: defaultProblemOverview,
      solution_overview: defaultSolutionOverview,
      content_authoring_prompt: undefined,
    };
  }

  const data = payload as Record<string, unknown>;

  const companyName = coerceText(
    data.company_name ?? data.companyName ?? data.brand_name ?? data.organization_name,
  ) || defaultCompanyName;

  const tagline = coerceText(data.tagline ?? data.company_tagline ?? data.brand_tagline) || defaultTagline;
  
  const oneSentenceSummary = coerceText(
    data.one_sentence_summary ?? data.summary ?? data.company_summary,
  ) || defaultOneSentenceSummary;

  const problemOverviewText = coerceText(
    data.problem_overview ?? data.problemOverview ?? data.problem_description,
  );
  const problemOverview = problemOverviewText ? normalizeMultiline(problemOverviewText) : defaultProblemOverview;

  const solutionOverviewText = coerceText(
    data.solution_overview ?? data.solutionOverview ?? data.solution_description,
  );
  const solutionOverview = solutionOverviewText ? normalizeMultiline(solutionOverviewText) : defaultSolutionOverview;

  const contentAuthoringPrompt = coerceText(data.content_authoring_prompt);

  let mission = coerceText(data.mission ?? data.mission_statement);
  if (!mission || mission.length > 400) {
    console.warn("Mission statement missing or too long. Using default.");
    mission = defaultMission;
  }

  const missionDescriptionRaw =
    data.mission_description ?? data.mission_explanation ?? data.mission_statement_details;
  let missionDescription = normalizeMultiline(coerceText(missionDescriptionRaw));
  if (!missionDescription) {
    console.warn("Mission description missing. Using default.");
    missionDescription = defaultMissionDescription;
  }

  let vision = coerceText(data.vision ?? data.vision_statement);
  if (!vision || vision.length > 800) {
    console.warn("Vision statement missing or too long. Using default.");
    vision = defaultVision;
  }

  const visionDescriptionRaw =
    data.vision_description ?? data.vision_explanation ?? data.vision_statement_details;
  let visionDescription = normalizeMultiline(coerceText(visionDescriptionRaw));
  if (!visionDescription) {
    console.warn("Vision description missing. Using default.");
    visionDescription = defaultVisionDescription;
  }

  const valuesRaw =
    (Array.isArray(data.values) && data.values.length > 0
      ? (data.values as unknown[])
      : Array.isArray((data as Record<string, unknown>).suggested_values)
        ? ((data as Record<string, unknown>).suggested_values as unknown[])
        : []) ?? [];

  const principlesRaw =
    (Array.isArray(data.principles) && data.principles.length > 0
      ? (data.principles as unknown[])
      : Array.isArray((data as Record<string, unknown>).suggested_principles)
        ? ((data as Record<string, unknown>).suggested_principles as unknown[])
        : []) ?? [];

  const values = valuesRaw.length > 0 ? valuesRaw : [];
  const principles = principlesRaw.length > 0 ? principlesRaw : [];

  const parsedValues: StrategyItem[] = values
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        console.warn(`Value #${index + 1} is not an object. Skipping.`);
        return null;
      }

      const { name, description } = item as Record<string, unknown>;

      const itemName = typeof name === "string" && name.trim() ? name.trim() : `Value ${index + 1}`;
      const itemDescription = typeof description === "string" && description.trim() 
        ? normalizeMultiline(description) 
        : "This value guides our organization's behavior and decision-making.";

      return { name: itemName, description: itemDescription };
    })
    .filter((item): item is StrategyItem => item !== null);

  // Use defaults if no valid values were parsed
  const finalValues = parsedValues.length > 0 ? parsedValues : defaultValues;

  const parsedPrinciples: StrategyItem[] = principles
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        console.warn(`Principle #${index + 1} is not an object. Skipping.`);
        return null;
      }

      const { name, description } = item as Record<string, unknown>;

      const itemName = typeof name === "string" && name.trim() ? name.trim() : `Principle ${index + 1}`;
      const itemDescription = typeof description === "string" && description.trim()
        ? normalizeMultiline(description)
        : "This principle guides how we make decisions and operate as an organization.";

      return { name: itemName, description: itemDescription };
    })
    .filter((item): item is StrategyItem => item !== null);

  // Use defaults if no valid principles were parsed
  const finalPrinciples = parsedPrinciples.length > 0 ? parsedPrinciples : defaultPrinciples;

  return {
    mission,
    mission_description: missionDescription,
    vision,
    vision_description: visionDescription,
    values: finalValues,
    principles: finalPrinciples,
    company_name: companyName || null,
    tagline: tagline || null,
    one_sentence_summary: oneSentenceSummary || null,
    problem_overview: problemOverview || null,
    solution_overview: solutionOverview || null,
    content_authoring_prompt: contentAuthoringPrompt || undefined,
  };
}

async function generateSupplementalStrategyItems(args: {
  openaiKey: string;
  kind: "values" | "principles";
  companyName: string;
  companyUrl: string;
  mission: string;
  missionDescription: string;
  vision: string;
  visionDescription: string;
}): Promise<StrategyItem[]> {
  const { openaiKey, kind, companyName, companyUrl, mission, missionDescription, vision, visionDescription } = args;

  const label = kind === "values" ? "corporate values" : "strategic principles";

  const prompt = `You are a chief strategy advisor. The organization below needs ${label} that align tightly with its mission and vision.

Company Name: ${companyName}
Company Website: ${companyUrl}

Mission:
${mission}

Mission Explanation:
${missionDescription || "Not provided"}

Vision:
${vision}

Vision Explanation:
${visionDescription || "Not provided"}

If the source material does not explicitly define ${label}, infer realistic and actionable entries that fit the company's positioning and tone.

Return ONLY a JSON array where each element has the following shape:

[
  {
    "name": "Concise name (max 8 words)",
    "description": "2-3 sentence description highlighting why it matters."
  }
]

Provide between 3 and 6 items. Do not include markdown, code fences, or any surrounding commentary.`;

  const responsePayload = {
    model: "gpt-5",
    input: prompt,
    reasoning: { effort: "low" },
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
      "OpenAI-Beta": "responses=v1",
    },
    body: JSON.stringify(responsePayload),
  });

  if (!response.ok) {
    let errorBody: unknown = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    console.error("OpenAI supplemental generation error:", errorBody);
    throw new Error(`Failed to generate supplemental ${label}: ${JSON.stringify(errorBody)}`);
  }

  const responseData = await response.json();
  const output = (responseData as { output?: Array<Record<string, unknown>> }).output ?? [];
  const messageItem = output.find((item) => item?.type === "message") as
    | { content?: Array<Record<string, unknown>> }
    | undefined;

  if (!messageItem?.content) {
    throw new Error(`OpenAI supplemental response missing message content for ${label}.`);
  }

  const textItem = messageItem.content.find((entry) => entry.type === "output_text") as
    | { text?: string }
    | undefined;

  if (!textItem?.text) {
    throw new Error(`OpenAI supplemental response missing text output for ${label}.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textItem.text);
  } catch (error) {
    console.error(`Failed to parse supplemental ${label} JSON:`, textItem.text);
    throw new Error(`OpenAI supplemental ${label} response was not valid JSON.`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`OpenAI supplemental ${label} response was not an array.`);
  }

  return parsed
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        console.warn(`Supplemental ${label} item #${index + 1} is not an object.`);
        return null;
      }

      const { name, description } = item as Record<string, unknown>;

      if (typeof name !== "string" || !name.trim()) {
        console.warn(`Supplemental ${label} item #${index + 1} missing name.`);
        return null;
      }

      if (typeof description !== "string" || !description.trim()) {
        console.warn(`Supplemental ${label} item "${name}" missing description.`);
        return null;
      }

      return {
        name: name.trim(),
        description: normalizeMultiline(description),
      };
    })
    .filter((item): item is StrategyItem => Boolean(item));
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const processId = `${Deno.pid}-${startedAt}`;
  
  console.log('=== CREATE INITIAL CUSTOMER STRATEGY FOR CUSTOMER ID STARTED ===', { 
    processId,
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] OPTIONS request, returning CORS headers', { processId });
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[DEBUG] Parsing request body', { processId });
    
    // Parse request body
    let requestBody: RequestBody;
    try {
      const bodyText = await req.text();
      console.log('[DEBUG] Raw request body:', { processId, bodyText, bodyLength: bodyText.length });
      requestBody = JSON.parse(bodyText) as RequestBody;
      console.log('[DEBUG] Parsed request body:', { processId, requestBody });
    } catch (parseError) {
      console.error('[DEBUG] Failed to parse request body:', { processId, error: parseError });
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body.', details: parseError instanceof Error ? parseError.message : String(parseError) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerIdInput = sanitizeUuid(requestBody?.customer_id);
    console.log('[DEBUG] Customer ID validation:', { 
      processId,
      rawCustomerId: requestBody?.customer_id,
      sanitizedCustomerId: customerIdInput,
      isValid: !!customerIdInput,
    });

    if (!customerIdInput) {
      console.error('[DEBUG] Missing or invalid customer_id', { processId, requestBody });
      return new Response(
        JSON.stringify({ error: 'customer_id (UUID) is required in the request body.', received: requestBody?.customer_id }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DEBUG] Target customer_id:', customerIdInput, { processId });

    // Authentication
    console.log('[DEBUG] Checking authentication', { processId });
    const authHeader = req.headers.get('Authorization');
    console.log('[DEBUG] Authorization header:', { 
      processId,
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length,
      authHeaderPrefix: authHeader?.substring(0, 20),
    });

    if (!authHeader) {
      console.error('[DEBUG] Missing authorization header', { processId });
      return new Response(
        JSON.stringify({ error: 'Missing authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    console.log('[DEBUG] Environment variables:', {
      processId,
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrlLength: supabaseUrl.length,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      supabaseAnonKeyLength: supabaseAnonKey.length,
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[DEBUG] Missing Supabase environment variables', {
        processId,
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseAnonKey: !!supabaseAnonKey,
      });
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured.');
    }

    // Create Supabase client with auth context
    // This way your row-level-security (RLS) policies are applied
    // See: https://supabase.com/docs/guides/functions/auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Extract token from Authorization header and pass to getUser()
    // This is the recommended approach per Supabase docs: https://supabase.com/docs/guides/functions/auth
    const token = authHeader.replace('Bearer ', '');
    console.log('[DEBUG] Extracted session token:', { 
      processId,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20),
    });
    
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    console.log('[DEBUG] User authentication result:', {
      processId,
      hasUserData: !!userData,
      hasUser: !!userData?.user,
      userId: userData?.user?.id,
      hasError: !!userError,
      errorMessage: userError?.message,
    });

    if (userError || !userData?.user) {
      console.error('[DEBUG] Unable to authenticate user:', { 
        processId,
        error: userError,
        errorMessage: userError?.message,
        hasUserData: !!userData,
      });
      return new Response(
        JSON.stringify({ error: 'Authentication required.', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DEBUG] Authenticated auth_user_id:', userData.user.id, { processId });

    console.log('[DEBUG] Fetching user record from users table', { processId, authUserId: userData.user.id });
    const { data: userRecord, error: userRecordError } = await supabase
      .from('users')
      .select('customer_id, user_id')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle<UserRecord>();

    console.log('[DEBUG] User record query result:', {
      processId,
      hasUserRecord: !!userRecord,
      userRecord,
      hasError: !!userRecordError,
      errorMessage: userRecordError?.message,
      errorCode: userRecordError?.code,
    });

    if (userRecordError || !userRecord) {
      console.error('[DEBUG] Unable to load users record:', {
        processId,
        error: userRecordError,
        errorMessage: userRecordError?.message,
        errorCode: userRecordError?.code,
        errorDetails: userRecordError?.details,
      });
      throw new Error(`Failed to load user record: ${userRecordError?.message ?? 'Unknown error'}`);
    }

    const actingCustomerId = userRecord.customer_id;
    const baseplateUserId = userRecord.user_id;

    console.log('[DEBUG] User record loaded:', {
      processId,
      baseplateUserId,
      actingCustomerId,
    });

    if (!actingCustomerId) {
      throw new Error('Authenticated user is not associated with a customer.');
    }

    if (actingCustomerId !== customerIdInput) {
      console.warn('customer_id mismatch', { actingCustomerId, customerIdInput });
      return new Response(
        JSON.stringify({ error: 'You are not authorized to initialize this customer\'s strategy.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch customer data, customer_info, existing strategy, and publication status
    console.log('[DEBUG] Fetching customer data, customer_info, existing strategy, and publication status', { processId });
    const [
      { data: customer, error: customerError },
      { data: customerInfo, error: customerInfoError },
      { data: existingStrategy, error: existingStrategyError },
      { data: publicationStatus, error: publicationStatusError },
    ] = await Promise.all([
      supabase
        .from('customers')
        .select('customer_id, name, email_domain')
        .eq('customer_id', customerIdInput)
        .maybeSingle<Customer>(),
      supabase
        .from('customer_info')
        .select('customer_info_id, customer_id, company_name, tagline, one_sentence_summary, problem_overview, solution_overview, content_authoring_prompt')
        .eq('customer_id', customerIdInput)
        .maybeSingle<CustomerInfoRow>(),
      supabase
        .from('company_strategies')
        .select('strategy_id, customer_id')
        .eq('customer_id', customerIdInput)
        .maybeSingle<CompanyStrategyRow>(),
      supabase
        .from('option_publication_status')
        .select('option_id, programmatic_name')
        .eq('programmatic_name', 'draft')
        .maybeSingle<OptionPublicationStatus>(),
    ]);

    console.log('[DEBUG] Data fetching results:', {
      processId,
      customer: {
        hasData: !!customer,
        hasError: !!customerError,
        errorMessage: customerError?.message,
        errorCode: customerError?.code,
        customerId: customer?.customer_id,
        customerName: customer?.name,
      },
      customerInfo: {
        hasData: !!customerInfo,
        hasError: !!customerInfoError,
        errorMessage: customerInfoError?.message,
        errorCode: customerInfoError?.code,
        customerInfoId: customerInfo?.customer_info_id,
      },
      existingStrategy: {
        hasData: !!existingStrategy,
        hasError: !!existingStrategyError,
        errorMessage: existingStrategyError?.message,
        errorCode: existingStrategyError?.code,
        strategyId: existingStrategy?.strategy_id,
      },
      publicationStatus: {
        hasData: !!publicationStatus,
        hasError: !!publicationStatusError,
        errorMessage: publicationStatusError?.message,
        errorCode: publicationStatusError?.code,
        statusId: publicationStatus?.option_id,
      },
    });

    if (customerError) {
      console.error('[DEBUG] Error loading customer:', {
        processId,
        error: customerError,
        message: customerError.message,
        code: customerError.code,
        details: customerError.details,
      });
      throw new Error(`Failed to load customer: ${customerError.message}`);
    }

    if (!customer) {
      console.error('[DEBUG] Customer record not found', { processId, customerIdInput });
      throw new Error('Customer record not found.');
    }

    if (customerInfoError) {
      console.error('[DEBUG] Error loading customer_info:', {
        processId,
        error: customerInfoError,
        message: customerInfoError.message,
        code: customerInfoError.code,
      });
      throw new Error(`Failed to load customer info: ${customerInfoError.message}`);
    }

    if (existingStrategyError && existingStrategyError.code !== 'PGRST116') {
      console.error('[DEBUG] Error checking existing strategy:', {
        processId,
        error: existingStrategyError,
        message: existingStrategyError.message,
        code: existingStrategyError.code,
      });
      throw new Error(`Failed to check existing strategy: ${existingStrategyError.message}`);
    }

    if (publicationStatusError) {
      console.error('[DEBUG] Error loading publication status:', {
        processId,
        error: publicationStatusError,
        message: publicationStatusError.message,
        code: publicationStatusError.code,
      });
      throw new Error(`Failed to load publication status: ${publicationStatusError.message}`);
    }

    if (!publicationStatus) {
      console.error('[DEBUG] Unable to locate draft publication status', { processId });
      throw new Error('Unable to locate draft publication status option.');
    }

    const companyUrl = buildCompanyUrl(customer.email_domain);
    console.log('Derived company URL:', companyUrl, { processId });

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }

    const prompt = createStrategyPrompt({
      companyUrl,
      customerName: customer.name,
      customerInfo: customerInfo ?? null,
    });

    const domain = new URL(companyUrl).hostname.replace(/^www\./i, '');
    const combinedPrompt = `${prompt}

# RESPONSE REQUIREMENTS
- Return ONLY a valid JSON object that conforms to the schema above.
- Do not include markdown, code fences, or additional commentary.`;

    const openAiStart = Date.now();
    console.log('Calling OpenAI Responses API...', {
      processId,
      allowedDomain: domain,
      promptCharacters: combinedPrompt.length,
      hasExistingStrategy: Boolean(existingStrategy),
      hasCustomerInfo: Boolean(customerInfo),
    });

    const responsePayload = {
      model: 'gpt-5',
      input: combinedPrompt,
      reasoning: { effort: 'medium' },
      tools: [
        {
          type: 'web_search',
          filters: { allowed_domains: [domain] },
        },
      ],
    };

    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
        'OpenAI-Beta': 'responses=v1',
      },
      body: JSON.stringify(responsePayload),
    });

    console.log('OpenAI response received.', {
      processId,
      status: openAiResponse.status,
      elapsedMs: Date.now() - openAiStart,
      ok: openAiResponse.ok,
    });

    if (!openAiResponse.ok) {
      let errorBody: unknown = null;
      try {
        errorBody = await openAiResponse.json();
      } catch {
        errorBody = await openAiResponse.text();
      }
      console.error('OpenAI API error:', errorBody);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorBody)}`);
    }

    const responseData = await openAiResponse.json();
    const output = (responseData as { output?: Array<Record<string, unknown>> }).output ?? [];
    const messageItem = output.find((item) => item?.type === 'message') as
      | { content?: Array<Record<string, unknown>> }
      | undefined;

    let parsedResult: unknown = {};
    
    if (messageItem?.content) {
      const textItem = messageItem.content.find((entry) => entry.type === 'output_text') as
        | { text?: string }
        | undefined;

      if (textItem?.text) {
        const responseText = textItem.text;
        console.log('OpenAI output received (first 400 chars):', responseText.slice(0, 400));
        
        try {
          parsedResult = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse OpenAI JSON:', parseError);
          console.warn('Using default values due to JSON parse error.');
          parsedResult = {}; // Use empty object to trigger default values
        }
      } else {
        console.warn('No output_text found in message content. Using default values.');
      }
    } else {
      console.warn('No message item found in OpenAI response. Using default values.');
    }

    let strategy = validateStrategyResponse(parsedResult, customer.name);

    // Generate supplemental values if missing
    let strategyValues = strategy.values;
    if (!strategyValues.length) {
      strategyValues = await generateSupplementalStrategyItems({
        openaiKey,
        kind: 'values',
        companyName: customer.name,
        companyUrl,
        mission: strategy.mission,
        missionDescription: strategy.mission_description ?? '',
        vision: strategy.vision,
        visionDescription: strategy.vision_description ?? '',
      });
      console.log(`Supplemented values with ${strategyValues.length} suggested entries.`);
    }

    // Generate supplemental principles if missing
    let strategyPrinciples = strategy.principles;
    if (!strategyPrinciples.length) {
      strategyPrinciples = await generateSupplementalStrategyItems({
        openaiKey,
        kind: 'principles',
        companyName: customer.name,
        companyUrl,
        mission: strategy.mission,
        missionDescription: strategy.mission_description ?? '',
        vision: strategy.vision,
        visionDescription: strategy.vision_description ?? '',
      });
      console.log(`Supplemented principles with ${strategyPrinciples.length} suggested entries.`);
    }

    strategy = {
      ...strategy,
      values: strategyValues,
      principles: strategyPrinciples,
    };

    console.log('Strategy content validated.', {
      processId,
      missionLength: strategy.mission.length,
      visionLength: strategy.vision.length,
      valuesCount: strategy.values.length,
      principlesCount: strategy.principles.length,
    });

    // Derive company info fields
    const derivedCompanyName =
      strategy.company_name?.trim() || customerInfo?.company_name?.trim() || customer.name.trim();

    const derivedTagline = strategy.tagline?.trim() || customerInfo?.tagline?.trim() || null;
    const derivedOneSentenceSummary =
      strategy.one_sentence_summary?.trim() || customerInfo?.one_sentence_summary?.trim() || null;
    const derivedProblemOverview =
      strategy.problem_overview?.trim() || customerInfo?.problem_overview?.trim() || null;
    const derivedSolutionOverview =
      strategy.solution_overview?.trim() || customerInfo?.solution_overview?.trim() || null;

    const safeProblemOverview =
      derivedProblemOverview && derivedProblemOverview.length > 0
        ? derivedProblemOverview
        : 'Not yet documented.';

    const safeSolutionOverview =
      derivedSolutionOverview ?? customerInfo?.solution_overview ?? 'Not yet documented.';

    // Upsert customer_info
    console.log('Upserting customer_info branding fields...', {
      processId,
      hasExistingCustomerInfo: Boolean(customerInfo),
      derivedCompanyName,
      hasTagline: Boolean(derivedTagline),
      hasOneSentenceSummary: Boolean(derivedOneSentenceSummary),
      hasSolutionOverview: Boolean(derivedSolutionOverview),
    });

    if (customerInfo) {
      const { error: updateCustomerInfoError } = await supabase
        .from('customer_info')
        .update({
          company_name: derivedCompanyName,
          tagline: derivedTagline,
          one_sentence_summary: derivedOneSentenceSummary,
          problem_overview: safeProblemOverview,
          solution_overview: safeSolutionOverview,
          content_authoring_prompt: strategy.content_authoring_prompt || customerInfo.content_authoring_prompt || null,
        })
        .eq('customer_info_id', customerInfo.customer_info_id);

      if (updateCustomerInfoError) {
        console.error('Failed to update customer_info branding fields:', updateCustomerInfoError.message);
        throw new Error(`Failed to update customer_info: ${updateCustomerInfoError.message}`);
      }

      console.log('Updated existing customer_info record with generated branding fields.');
    } else {
      const { error: insertCustomerInfoError } = await supabase.from('customer_info').insert({
        customer_id: customerIdInput,
        company_name: derivedCompanyName,
        tagline: derivedTagline,
        one_sentence_summary: derivedOneSentenceSummary,
        problem_overview: safeProblemOverview,
        solution_overview: safeSolutionOverview,
        content_authoring_prompt: strategy.content_authoring_prompt || null,
      });

      if (insertCustomerInfoError) {
        console.error('Failed to insert customer_info branding fields:', insertCustomerInfoError.message);
        throw new Error(`Failed to create customer_info: ${insertCustomerInfoError.message}`);
      }

      console.log('Inserted new customer_info record with generated branding fields.');
    }

    // Create or update company_strategies
    let strategyId: string;
    let isNewStrategy = false;

    if (existingStrategy) {
      console.log('Existing strategy found. Updating strategy_id:', existingStrategy.strategy_id);
      const { data: updated, error: updateError } = await supabase
        .from('company_strategies')
        .update({
          mission: strategy.mission,
          mission_description: strategy.mission_description,
          vision: strategy.vision,
          vision_description: strategy.vision_description,
          owner_user_id: baseplateUserId,
          updated_by_user_id: baseplateUserId,
        })
        .eq('strategy_id', existingStrategy.strategy_id)
        .select('strategy_id')
        .maybeSingle();

      if (updateError) {
        console.error('Failed to update company_strategies:', updateError.message);
        throw new Error(`Failed to update strategy: ${updateError.message}`);
      }

      if (!updated) {
        throw new Error('Unexpected: updated strategy returned no data.');
      }

      strategyId = updated.strategy_id;
    } else {
      console.log('No strategy exists yet. Creating new strategy row.');
      const { data: inserted, error: insertError } = await supabase
        .from('company_strategies')
        .insert({
          customer_id: customerIdInput,
          mission: strategy.mission,
          mission_description: strategy.mission_description,
          vision: strategy.vision,
          vision_description: strategy.vision_description,
          publication_status_id: publicationStatus.option_id,
          owner_user_id: baseplateUserId,
          created_by_user_id: baseplateUserId,
          updated_by_user_id: baseplateUserId,
          is_published: false,
        })
        .select('strategy_id')
        .single();

      if (insertError) {
        console.error('Failed to insert company_strategies:', insertError.message);
        throw new Error(`Failed to create strategy: ${insertError.message}`);
      }

      strategyId = inserted.strategy_id;
      isNewStrategy = true;
      console.log('Created new strategy_id:', strategyId);
    }

    // Clear existing strategy values/principles
    console.log('Clearing existing strategy values/principles...', {
      processId,
      strategyId,
      deleteValuesCount: strategy.values.length,
      deletePrinciplesCount: strategy.principles.length,
    });

    const [{ error: deleteValuesError }, { error: deletePrinciplesError }] = await Promise.all([
      supabase.from('strategy_values').delete().eq('strategy_id', strategyId),
      supabase.from('strategy_principles').delete().eq('strategy_id', strategyId),
    ]);

    if (deleteValuesError) {
      console.error('Failed to delete existing strategy_values:', deleteValuesError.message);
      throw new Error(`Failed to reset strategy values: ${deleteValuesError.message}`);
    }

    if (deletePrinciplesError) {
      console.error('Failed to delete existing strategy_principles:', deletePrinciplesError.message);
      throw new Error(`Failed to reset strategy principles: ${deletePrinciplesError.message}`);
    }

    // Insert new strategy values/principles
    const valueRecords = strategy.values.map((item, index) => ({
      strategy_id: strategyId,
      name: item.name,
      description: item.description,
      order_index: index,
      created_by_user_id: baseplateUserId,
    }));

    const principleRecords = strategy.principles.map((item, index) => ({
      strategy_id: strategyId,
      name: item.name,
      description: item.description,
      order_index: index,
      created_by_user_id: baseplateUserId,
    }));

    console.log('Inserting new strategy values/principles...', {
      processId,
      valuesToInsert: valueRecords.length,
      principlesToInsert: principleRecords.length,
    });

    const [{ error: insertValuesError }, { error: insertPrinciplesError }] = await Promise.all([
      supabase.from('strategy_values').insert(valueRecords),
      supabase.from('strategy_principles').insert(principleRecords),
    ]);

    if (insertValuesError) {
      console.error('Failed to insert strategy_values:', insertValuesError.message);
      throw new Error(`Failed to insert strategy values: ${insertValuesError.message}`);
    }

    if (insertPrinciplesError) {
      console.error('Failed to insert strategy_principles:', insertPrinciplesError.message);
      throw new Error(`Failed to insert strategy principles: ${insertPrinciplesError.message}`);
    }

    console.log('Strategy initialization complete.', {
      processId,
      strategyId,
      isNewStrategy,
      totalValues: valueRecords.length,
      totalPrinciples: principleRecords.length,
      openAiDurationMs: Date.now() - openAiStart,
      totalDurationMs: Date.now() - startedAt,
    });

    return new Response(
      JSON.stringify({
        success: true,
        company_strategy_id: strategyId,
        created: isNewStrategy,
        customer_id: customerIdInput,
        mission_paragraphs: strategy.mission_description.split(/\n{2,}/g).filter(p => p.trim()).length,
        vision_paragraphs: strategy.vision_description.split(/\n{2,}/g).filter(p => p.trim()).length,
        values_inserted: valueRecords.length,
        principles_inserted: principleRecords.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorDetails = {
      processId,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorString: String(error),
      durationMs: Date.now() - startedAt,
    };
    
    console.error('[DEBUG] Error in create-initial-customer-strategy-for-customer-id:', errorDetails);
    console.error('[DEBUG] Full error object:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
        errorDetails: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
