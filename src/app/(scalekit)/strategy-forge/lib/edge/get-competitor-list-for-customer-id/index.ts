/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
  customer_id: string;
  limit?: number;
}

interface UserRecord {
  customer_id: string | null;
  user_id: string;
}

interface CustomerInfoRow {
  customer_info_id: string;
  customer_id: string;
  company_name: string;
  tagline: string | null;
  one_sentence_summary: string | null;
  problem_overview: string | null;
  solution_overview: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerRow {
  customer_id: string;
  name: string;
  email_domain: string | null;
}

interface CompetitorSuggestion {
  name: string;
  website_url: string;
  description: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 8;
const MIN_LIMIT = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

function sanitizeUuid(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function coerceLimit(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.round(value), MIN_LIMIT), MAX_LIMIT);
}

function buildPrompt(args: {
  companyName: string;
  problemOverview: string | null;
  solutionOverview: string | null;
  tagline: string | null;
  summary: string | null;
  limit: number;
}): string {
  const { companyName, problemOverview, solutionOverview, tagline, summary, limit } = args;

  return `# ROLE
You are a go-to-market strategist specializing in competitive landscaping for B2B SaaS companies. Your job is to propose realistic competitors that a leadership team should monitor closely.

# COMPANY PROFILE
- Name: ${companyName}
${tagline ? `- Tagline: ${tagline}` : ""}
${summary ? `- One Sentence Summary: ${summary}` : ""}

# CUSTOMER PROBLEM
${problemOverview || "Not documented."}

# SOLUTION OVERVIEW
${solutionOverview || "Not documented."}

# TASK
Identify ${limit} credible competitor organizations (real companies) that a growth-stage B2B SaaS team should benchmark against. Consider similar buyer personas, overlapping problem domains, and meaningful product differentiation.

# OUTPUT FORMAT
Return ONLY valid JSON (no markdown or commentary) with this shape:
{
  "competitors": [
    {
      "name": "Company name",
      "website_url": "https://example.com",
      "description": "2-3 sentences explaining positioning and differentiation."
    }
  ]
}
- Provide ${limit} entries (minimum ${MIN_LIMIT}, maximum ${MAX_LIMIT}).
- Use respected, real companies with direct competitive overlap.
- Ensure each website_url is a valid HTTPS URL to the official marketing site.
- Avoid duplicates, outdated companies, or made-up data.`;
}

async function callOpenAI(args: {
  openaiKey: string;
  prompt: string;
}): Promise<CompetitorSuggestion[]> {
  const { openaiKey, prompt } = args;

  const payload = {
    model: "gpt-5",
    input: prompt,
    reasoning: { effort: "medium" as const },
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
      "OpenAI-Beta": "responses=v1",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorBody: unknown = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    console.error("OpenAI API error:", errorBody);
    throw new Error("OpenAI request failed");
  }

  const data = await response.json();
  const output = (data as { output?: Array<Record<string, unknown>> }).output ?? [];
  const messageItem = output.find((item) => item?.type === "message") as
    | { content?: Array<Record<string, unknown>> }
    | undefined;

  if (!messageItem?.content) {
    throw new Error("OpenAI response missing message content");
  }

  const textItem = messageItem.content.find((entry) => entry.type === "output_text") as
    | { text?: string }
    | undefined;

  if (!textItem?.text) {
    throw new Error("OpenAI response missing text output");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textItem.text);
  } catch (error) {
    console.error("Failed to parse OpenAI JSON:", textItem.text);
    throw new Error("OpenAI response was not valid JSON");
  }

  const competitors = (parsed as { competitors?: CompetitorSuggestion[] }).competitors;
  if (!Array.isArray(competitors) || competitors.length === 0) {
    throw new Error("OpenAI response did not include competitor suggestions");
  }

  return competitors.map((entry, index) => {
    const name = entry?.name?.trim();
    const websiteUrl = entry?.website_url?.trim();
    const description = entry?.description?.trim();

    if (!name || !websiteUrl || !description) {
      throw new Error(`Competitor suggestion #${index + 1} is missing required fields`);
    }

    return {
      name,
      website_url: websiteUrl,
      description,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== get-competitor-list-for-customer-id invoked ===");

    const rawBody = await req.text();
    if (!rawBody) {
      return new Response(
        JSON.stringify({ error: "Request body is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let requestBody: RequestBody;
    try {
      requestBody = JSON.parse(rawBody) as RequestBody;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = sanitizeUuid(requestBody.customer_id);
    if (!customerId) {
      return new Response(
        JSON.stringify({ error: "customer_id must be a valid UUID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = coerceLimit(requestBody.limit);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !anonKey || !openaiKey) {
      throw new Error("Missing required environment variables");
    }

    // Create Supabase client with auth context
    // This way your row-level-security (RLS) policies are applied
    // See: https://supabase.com/docs/guides/functions/auth
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Extract token from Authorization header and pass to getUser()
    // This is the recommended approach per Supabase docs
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canAccess, error: accessError } = await supabase.rpc("can_access_customer", {
      target_customer_id: customerId,
    });

    if (accessError) {
      throw new Error(`Unable to verify customer access: ${accessError.message}`);
    }

    if (!canAccess) {
      return new Response(
        JSON.stringify({ error: "You do not have access to the requested customer." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: userRecord, error: userRecordError } = await supabase
      .from<UserRecord>("users")
      .select("customer_id, user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (userRecordError || !userRecord) {
      throw new Error("Failed to load Baseplate user record");
    }

    const { data: customerRow, error: customerError } = await supabase
      .from<CustomerRow>("customers")
      .select("customer_id, name, email_domain")
      .eq("customer_id", customerId)
      .maybeSingle();

    if (customerError || !customerRow) {
      throw new Error("Failed to load customer information");
    }

    const { data: customerInfoRow, error: customerInfoError } = await supabase
      .from<CustomerInfoRow>("customer_info")
      .select("*")
      .eq("customer_id", customerId)
      .maybeSingle();

    if (customerInfoError || !customerInfoRow) {
      throw new Error("Failed to load customer profile");
    }

    const prompt = buildPrompt({
      companyName: customerInfoRow.company_name,
      problemOverview: customerInfoRow.problem_overview,
      solutionOverview: customerInfoRow.solution_overview,
      tagline: customerInfoRow.tagline,
      summary: customerInfoRow.one_sentence_summary,
      limit,
    });

    const suggestions = await callOpenAI({ openaiKey, prompt });

    // Fetch default status and source options
    const { data: defaultStatus, error: statusError } = await supabase
      .from("option_competitor_status")
      .select("option_id")
      .eq("programmatic_name", "active_competitor")
      .eq("is_active", true)
      .maybeSingle();

    if (statusError || !defaultStatus) {
      throw new Error("Failed to load default competitor status");
    }

    const { data: llmSource, error: sourceError } = await supabase
      .from("option_data_source")
      .select("option_id")
      .eq("programmatic_name", "llm_suggestion")
      .eq("is_active", true)
      .maybeSingle();

    if (sourceError || !llmSource) {
      throw new Error("Failed to load LLM suggestion data source");
    }

    const insertPayload = suggestions.map((entry) => ({
      customer_id: customerId,
      name: entry.name,
      website_url: entry.website_url,
      summary: entry.description, // Use summary instead of description
      status_id: defaultStatus.option_id,
      source_id: llmSource.option_id,
      created_by_user_id: userRecord.user_id,
      updated_by_user_id: userRecord.user_id,
    }));

    const { error: insertError } = await supabase.from("competitors").insert(insertPayload);

    if (insertError) {
      console.error("Failed to insert competitor suggestions", insertError);
      throw new Error("Failed to store competitor suggestions");
    }

    return new Response(
      JSON.stringify({ success: true, competitors: suggestions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("get-competitor-list-for-customer-id error", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
