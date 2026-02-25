/**
 * Company News Fetch Edge Function
 *
 * Fetches news articles from Diffbot for companies that haven't been updated recently.
 * Designed to run as a daily cron job or be triggered manually.
 *
 * Logic:
 * 1. Select companies where news_last_fetched_at IS NULL OR > 30 days ago (LIMIT 50)
 * 2. Batch companies by 10 and query Diffbot for articles
 * 3. Map articles back to companies by tags.uri
 * 4. Upsert articles into company_news table
 * 5. Update companies.news_last_fetched_at
 *
 * Env vars required:
 * - DIFFBOT_API_TOKEN
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { corsHeaders } from '../../../../../../../supabase/functions/_shared/cors.ts';
import {
  ApiError,
  createErrorResponse,
  createSuccessResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';
import { DiffbotArticleClient } from './diffbot-client.ts';
import type {
  CompanyForNewsFetch,
  CompanyNewsFetchBody,
  CompanyNewsFetchResponse,
  ProcessedArticle,
  DiffbotArticle,
} from './types.ts';

/** Default number of companies per Diffbot API request */
const DEFAULT_BATCH_SIZE = 10;

/** Default days threshold for considering news stale */
const DEFAULT_DAYS_THRESHOLD = 30;

/** Max characters for article description */
const MAX_DESCRIPTION_LENGTH = 500;

/** Default page size for Diffbot API requests */
const DEFAULT_PAGE_SIZE = 100;

/**
 * Truncate text to max length, adding ellipsis if needed
 */
function truncateText(text: string | undefined | null, maxLength: number): string | null {
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Parse Diffbot date which can be a string or object { str, precision, timestamp }
 */
function parseDiffbotDate(date: unknown): string | null {
  if (!date) return null;

  // Handle object format: { str: "d2026-02-19T05:00", precision: 4, timestamp: 1771477200000 }
  if (typeof date === 'object' && date !== null) {
    const dateObj = date as { str?: string; timestamp?: number };

    // Prefer timestamp (milliseconds since epoch)
    if (typeof dateObj.timestamp === 'number') {
      return new Date(dateObj.timestamp).toISOString();
    }

    // Fallback to str field (remove leading 'd' if present)
    if (typeof dateObj.str === 'string') {
      const str = dateObj.str.startsWith('d') ? dateObj.str.slice(1) : dateObj.str;
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }

  // Handle string format
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

/**
 * Convert Diffbot article to ProcessedArticle for DB insertion
 */
function toProcessedArticle(
  article: DiffbotArticle,
  companyId: string,
  storeRawJson: boolean = false
): ProcessedArticle | null {
  // Must have URL and title
  if (!article.pageUrl || !article.title) {
    return null;
  }

  // Use summary if available, otherwise truncate text
  const description = truncateText(article.summary || article.text, MAX_DESCRIPTION_LENGTH);

  return {
    company_id: companyId,
    title: article.title,
    description,
    url: article.pageUrl,
    published_at: parseDiffbotDate(article.date),
    diffbot_article_id: article.id || null,
    diffbot_uri: article.diffbotUri || null,
    sentiment: typeof article.sentiment === 'number' ? article.sentiment : null,
    raw_json: storeRawJson ? (article as Record<string, unknown>) : null,
  };
}

/**
 * Process a batch of companies: fetch articles and save to DB.
 * Updates news_last_fetched_at only when Diffbot responds successfully.
 */
async function processBatch(
  supabase: ReturnType<typeof createServiceClient>,
  diffbotClient: DiffbotArticleClient,
  companies: CompanyForNewsFetch[],
  daysBack: number
): Promise<{
  articlesInserted: number;
  successfulCompanyIds: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  let articlesInserted = 0;
  const successfulCompanyIds: string[] = [];

  // Build map of diffbot_id -> company_id
  const diffbotIdToCompanyId = new Map<string, string>();
  const diffbotIds: string[] = [];

  for (const company of companies) {
    if (company.diffbot_id) {
      diffbotIdToCompanyId.set(company.diffbot_id, company.company_id);
      diffbotIds.push(company.diffbot_id);
    }
  }

  if (diffbotIds.length === 0) {
    return {
      articlesInserted: 0,
      successfulCompanyIds: [],
      errors: ['No valid diffbot_ids in batch'],
    };
  }

  try {
    // Fetch all articles with pagination (handles media-heavy companies)
    const { data: articles } = await diffbotClient.searchArticlesByOrganizationsAllPages(
      diffbotIds,
      { daysBack, pageSize: DEFAULT_PAGE_SIZE, language: 'en' }
    );

    // Map articles to companies
    const articlesByCompany = DiffbotArticleClient.mapArticlesToCompanies(
      articles,
      diffbotIdToCompanyId
    );

    // Prepare articles: global dedupe by company_id:url
    const seenKey = new Set<string>();
    const allArticles: ProcessedArticle[] = [];

    for (const [companyId, companyArticles] of articlesByCompany) {
      for (const article of companyArticles) {
        const processed = toProcessedArticle(article, companyId);
        if (!processed) continue;

        const key = `${processed.company_id}:${processed.url}`;
        if (seenKey.has(key)) continue;
        seenKey.add(key);
        allArticles.push(processed);
      }
    }

    let batchSucceeded = true;
    if (allArticles.length > 0) {
      const now = new Date().toISOString();
      const { data: upsertedRows, error: upsertError } = await supabase
        .from('company_news')
        .upsert(
          allArticles.map((a) => ({
            company_id: a.company_id,
            title: a.title,
            description: a.description,
            url: a.url,
            published_at: a.published_at,
            diffbot_article_id: a.diffbot_article_id,
            diffbot_uri: a.diffbot_uri,
            sentiment: a.sentiment,
            raw_json: a.raw_json,
            fetched_at: now,
            updated_at: now,
          })),
          {
            onConflict: 'company_id,url',
            ignoreDuplicates: false,
          }
        )
        .select('company_news_id');

      if (upsertError) {
        errors.push(`Failed to upsert articles: ${upsertError.message}`);
        batchSucceeded = false;
      } else {
        articlesInserted = upsertedRows?.length ?? 0;
      }
    }

    // Only update news_last_fetched_at when batch completed successfully (Diffbot + upsert ok)
    if (batchSucceeded) {
      successfulCompanyIds.push(...companies.map((c) => c.company_id));
      const { error: updateError } = await supabase
        .from('companies')
        .update({ news_last_fetched_at: new Date().toISOString() })
        .in('company_id', successfulCompanyIds);

      if (updateError) {
        errors.push(`Failed to update news_last_fetched_at: ${updateError.message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Diffbot API error: ${message}`);
    // Do not add to successfulCompanyIds — timestamp not updated, companies retry next run
  }

  return { articlesInserted, successfulCompanyIds, errors };
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse optional body for manual triggers
    let body: CompanyNewsFetchBody = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        // Empty body is fine for cron triggers
      }
    }

    const daysThreshold = body.days_threshold ?? DEFAULT_DAYS_THRESHOLD;
    const batchSize = body.batch_size ?? DEFAULT_BATCH_SIZE;

    const supabase = createServiceClient();
    const diffbotClient = new DiffbotArticleClient();

    // Step 1: Select companies needing news refresh
    let query = supabase
      .from('companies')
      .select('company_id, diffbot_id, display_name')
      .not('diffbot_id', 'is', null);

    if (body.company_ids && body.company_ids.length > 0) {
      // Manual trigger for specific companies
      query = query.in('company_id', body.company_ids);
    } else {
      // Default: all companies with stale or no news
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

      query = query
        .or(`news_last_fetched_at.is.null,news_last_fetched_at.lt.${cutoffDate.toISOString()}`)
        .order('news_last_fetched_at', { ascending: true, nullsFirst: true });

      // Optional limit if provided in body (for testing)
      if (body.limit && body.limit > 0) {
        query = query.limit(body.limit);
      }
    }

    const { data: companies, error: selectError } = await query;

    if (selectError) {
      throw new ApiError(`Failed to select companies: ${selectError.message}`, 500);
    }

    if (!companies || companies.length === 0) {
      return createSuccessResponse({
        status: 'no_companies',
        companiesProcessed: 0,
        articlesInserted: 0,
        errors: [],
      } satisfies CompanyNewsFetchResponse);
    }

    console.log(`[Company News Fetch] Processing ${companies.length} companies`);

    // Step 2: Process in batches
    const allErrors: string[] = [];
    let totalArticles = 0;
    const processedCompanyIds: string[] = []; // Only companies whose timestamp was updated (Diffbot succeeded)

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize) as CompanyForNewsFetch[];
      console.log(
        `[Company News Fetch] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companies.length / batchSize)}`
      );

      const { articlesInserted, successfulCompanyIds, errors } = await processBatch(
        supabase,
        diffbotClient,
        batch,
        daysThreshold
      );

      totalArticles += articlesInserted;
      allErrors.push(...errors);
      processedCompanyIds.push(...successfulCompanyIds);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < companies.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const response: CompanyNewsFetchResponse = {
      status: allErrors.length > 0 ? 'partial' : 'completed',
      companiesProcessed: processedCompanyIds.length,
      articlesInserted: totalArticles,
      errors: allErrors,
    };

    console.log(
      `[Company News Fetch] Completed: ${response.companiesProcessed} companies, ${response.articlesInserted} articles`
    );

    return createSuccessResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    console.error('[Company News Fetch] Error:', error);
    return createErrorResponse(
      new ApiError(error instanceof Error ? error.message : 'Internal server error', 500)
    );
  }
});
