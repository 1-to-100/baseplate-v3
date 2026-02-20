/// <reference lib="deno.ns" />
import { corsHeaders } from '../../../../../../../supabase/functions/_shared/cors.ts';
import { authenticateRequest } from '../../../../../../../supabase/functions/_shared/auth.ts';
import {
  ApiError,
  createErrorResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import {
  providers,
  withLogging,
} from '../../../../../../../supabase/functions/_shared/llm/index.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';
import { cosineSimilarity } from './cosine-similarity.ts';
import { safeParseSmartSearchRequest, type SmartSearchResult } from './schema.ts';

interface OptionIndustry {
  industry_id: number;
  value: string;
}

const EMBEDDING_MODEL = 'text-embedding-3-small';

let industryEmbeddingsCache: Map<string, number[]> | null = null;
let cachedIndustries: OptionIndustry[] | null = null;

async function defaultGetEmbeddings(texts: string[]): Promise<number[][]> {
  const openai = providers.openai();
  const result = await withLogging('openai', 'embeddings.create', EMBEDDING_MODEL, () =>
    openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    })
  );
  return result.data.map((item: { embedding: number[] }) => item.embedding);
}

async function defaultGetIndustryEmbeddings(
  supabase: ReturnType<typeof createServiceClient>
): Promise<{ industries: OptionIndustry[]; embeddings: Map<string, number[]> }> {
  if (industryEmbeddingsCache && cachedIndustries) {
    return { industries: cachedIndustries, embeddings: industryEmbeddingsCache };
  }
  const { data: industries, error } = await supabase
    .from('option_industries')
    .select('industry_id, value')
    .order('value');

  if (error) throw new ApiError('Failed to fetch industries', 500);
  if (!industries?.length) throw new ApiError('No industries found', 500);

  const industryList = industries as OptionIndustry[];
  const industryValues = industryList.map((i) => i.value);
  const embeddings = await defaultGetEmbeddings(industryValues);

  industryEmbeddingsCache = new Map();
  industryList.forEach((industry, index) => {
    industryEmbeddingsCache!.set(industry.value, embeddings[index]);
  });
  cachedIndustries = industryList;

  return { industries: industryList, embeddings: industryEmbeddingsCache };
}

export interface HandlerDeps {
  authenticateRequest: (req: Request) => Promise<{ user_id: string }>;
  createServiceClient: () => ReturnType<typeof createServiceClient>;
  getIndustryEmbeddings: (
    supabase: ReturnType<typeof createServiceClient>
  ) => Promise<{ industries: OptionIndustry[]; embeddings: Map<string, number[]> }>;
  getEmbeddings: (texts: string[]) => Promise<number[][]>;
}

const defaultDeps: HandlerDeps = {
  authenticateRequest: async (req) => {
    const user = await authenticateRequest(req);
    return { user_id: user.user_id };
  },
  createServiceClient,
  getIndustryEmbeddings: defaultGetIndustryEmbeddings,
  getEmbeddings: defaultGetEmbeddings,
};

export function createHandler(deps: HandlerDeps = defaultDeps) {
  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      await deps.authenticateRequest(req);

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new ApiError('Invalid request body', 400);
      }

      const parseResult = safeParseSmartSearchRequest(body);
      if (!parseResult.success) {
        const first = parseResult.error.issues[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Validation failed';
        throw new ApiError(msg, 400);
      }

      const normalizedQuery = parseResult.data.query.trim().toLowerCase();
      if (normalizedQuery.length === 0) {
        throw new ApiError('Query cannot be empty', 400);
      }

      const supabase = deps.createServiceClient();
      const { industries, embeddings } = await deps.getIndustryEmbeddings(supabase);
      const [queryEmbedding] = await deps.getEmbeddings([normalizedQuery]);

      const allResults = industries.map((industry) => ({
        industry_id: industry.industry_id,
        value: industry.value,
        score: cosineSimilarity(queryEmbedding, embeddings.get(industry.value)!),
      }));

      const minScore = 0.3;
      const filtered = allResults
        .filter((r) => r.score >= minScore)
        .sort((a, b) => b.score - a.score);

      let results: SmartSearchResult[];
      if (filtered.length === 0) {
        results = allResults
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((r) => ({ ...r, score: Math.round(r.score * 100) / 100 }));
      } else {
        results = filtered.map((r) => ({ ...r, score: Math.round(r.score * 100) / 100 }));
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return createErrorResponse(error);
      }
      return createErrorResponse(
        new ApiError(error instanceof Error ? error.message : 'Internal server error', 500)
      );
    }
  };
}

Deno.serve(createHandler());
