import { corsHeaders } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';
import { ApiError, createErrorResponse } from '../_shared/errors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

interface OptionIndustry {
  industry_id: number;
  value: string;
}

interface SmartSearchRequest {
  query: string;
}

interface SmartSearchResult {
  industry_id: number;
  value: string;
  score: number;
}

// Cache for industry embeddings (persists across requests in same instance)
let industryEmbeddingsCache: Map<string, number[]> | null = null;
let cachedIndustries: OptionIndustry[] | null = null;

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get embeddings from OpenAI
 */
async function getEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI embeddings error:', response.status, errorText);
    throw new ApiError('AI service error', 500);
  }

  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

/**
 * Initialize or get cached industry embeddings
 */
async function getIndustryEmbeddings(
  supabase: ReturnType<typeof createServiceClient>,
  apiKey: string
): Promise<{ industries: OptionIndustry[]; embeddings: Map<string, number[]> }> {
  // If already cached, return from cache
  if (industryEmbeddingsCache && cachedIndustries) {
    console.log('Using cached industry embeddings');
    return { industries: cachedIndustries, embeddings: industryEmbeddingsCache };
  }

  console.log('Computing industry embeddings (first time only)...');

  // Fetch industries from database
  const { data: industries, error } = await supabase
    .from('option_industries')
    .select('industry_id, value')
    .order('value');

  if (error) {
    console.error('Failed to fetch industries:', error);
    throw new ApiError('Failed to fetch industries', 500);
  }

  if (!industries || industries.length === 0) {
    throw new ApiError('No industries found', 500);
  }

  const industryList = industries as OptionIndustry[];

  // Get embeddings for all industry values
  const industryValues = industryList.map((i) => i.value);
  const embeddings = await getEmbeddings(industryValues, apiKey);

  // Create cache map
  industryEmbeddingsCache = new Map();
  industryList.forEach((industry, index) => {
    industryEmbeddingsCache!.set(industry.value, embeddings[index]);
  });

  cachedIndustries = industryList;

  console.log(`Cached embeddings for ${industryList.length} industries`);

  return { industries: industryList, embeddings: industryEmbeddingsCache };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    console.log('User authenticated:', { user_id: user.user_id });

    // Parse request body
    let body: SmartSearchRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new ApiError('Invalid request body', 400);
    }

    // Validate input
    if (!body.query || typeof body.query !== 'string') {
      throw new ApiError('Query is required', 400);
    }

    const normalizedQuery = body.query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      throw new ApiError('Query cannot be empty', 400);
    }

    if (normalizedQuery.length > 500) {
      throw new ApiError('Query must be less than 500 characters', 400);
    }

    console.log('Smart search query:', normalizedQuery);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      throw new ApiError('AI service not configured', 500);
    }

    const supabase = createServiceClient();

    // Get cached industry embeddings (or compute if first request)
    const { industries, embeddings } = await getIndustryEmbeddings(supabase, openaiApiKey);

    // Get embedding for the query (1 API call per search)
    const [queryEmbedding] = await getEmbeddings([normalizedQuery], openaiApiKey);

    // Calculate similarity scores for all industries
    const allResults = industries.map((industry) => ({
      industry_id: industry.industry_id,
      value: industry.value,
      score: cosineSimilarity(queryEmbedding, embeddings.get(industry.value)!),
    }));

    // Minimum score threshold
    const minScore = 0.3;

    // Filter by minimum score and sort by score descending
    const filtered = allResults
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score);

    let results: SmartSearchResult[];

    if (filtered.length === 0) {
      // Fallback: if no results meet threshold, return top 3 anyway
      console.warn(`No industries found with score >= ${minScore}, returning top 3 results`);
      results = allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((r) => ({
          ...r,
          score: Math.round(r.score * 100) / 100,
        }));
    } else {
      // Return filtered and sorted results with rounded scores
      results = filtered.map((r) => ({
        ...r,
        score: Math.round(r.score * 100) / 100,
      }));
    }

    console.log(`Returning ${results.length} matching industries`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in industries-smart-search:', error);

    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }

    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
    return createErrorResponse(apiError);
  }
});
