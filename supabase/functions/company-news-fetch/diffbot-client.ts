import type { DiffbotArticleResponse, DiffbotArticle } from './types.ts';

/** Default page size when fetching all pages (100 per strategy: cost/performance balance) */
const DEFAULT_PAGE_SIZE = 100;

/** Retry config for transient errors */
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Retry a function with exponential backoff on retryable errors (429, 5xx, DIFFBOT_SERVICE_UNAVAILABLE).
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelayMs: number = RETRY_BASE_DELAY_MS
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isRetryable =
        message.includes('DIFFBOT_SERVICE_UNAVAILABLE') ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('500');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt);
      console.log(`[Diffbot Article] Retry ${attempt + 1}/${maxRetries} in ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

/**
 * Diffbot API client for article/news search
 */
export class DiffbotArticleClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl || Deno.env.get('DIFFBOT_API_URL') || 'https://kg.diffbot.com/kg/v3/dql';
    this.token = token || Deno.env.get('DIFFBOT_API_TOKEN') || '';

    if (!this.token) {
      throw new Error('DIFFBOT_API_TOKEN environment variable is required');
    }
  }

  /**
   * Search for articles mentioning specific organizations by their Diffbot entity IDs.
   * Single request; use searchArticlesByOrganizationsAllPages for full result set.
   */
  async searchArticlesByOrganizations(
    diffbotIds: string[],
    options?: {
      daysBack?: number;
      size?: number;
      from?: number;
      language?: string;
    }
  ): Promise<{
    data: DiffbotArticle[];
    totalCount: number;
  }> {
    if (diffbotIds.length === 0) {
      return { data: [], totalCount: 0 };
    }

    const daysBack = options?.daysBack ?? 30;
    const size = options?.size ?? 50;
    const from = options?.from ?? 0;

    const tagsClause = diffbotIds
      .map((id) => {
        // Normalize: extract only the entity ID part
        let cleanId = id;
        if (id.includes('diffbot.com/entity/')) {
          cleanId = id.split('diffbot.com/entity/').pop()?.trim() ?? id;
        } else if (id.includes('/entity/')) {
          cleanId = id.split('/entity/').pop()?.trim() ?? id;
        }
        return `tags.uri:"http://diffbot.com/entity/${cleanId}"`;
      })
      .join(' OR ');

    // Build query: parentheses for OR precedence; Diffbot DQL rejects explicit "AND"
    let queryString = `type:Article (${tagsClause}) lastCrawlTime<${daysBack}d`;

    if (options?.language) {
      queryString += ` language:"${options.language}"`;
    }

    // Log the raw query for debugging
    console.log('[Diffbot] Raw DQL query:', queryString);

    const encodedQuery = encodeURIComponent(queryString);
    const url = `${this.baseUrl}?type=query&token=${this.token}&query=${encodedQuery}&size=${size}&from=${from}`;

    // Log the full URL (with token masked)
    console.log('[Diffbot] Request URL (token masked):', url.replace(this.token, '***'));

    return withRetry(async () => {
      console.log(
        `[Diffbot Article] Fetching articles for ${diffbotIds.length} organizations, last ${daysBack} days (from=${from}, size=${size})`
      );

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Diffbot Article API] Error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        if (response.status >= 500) {
          throw new Error('DIFFBOT_SERVICE_UNAVAILABLE');
        }
        if (response.status === 429) {
          throw new Error('Diffbot API rate limit (429)');
        }

        throw new Error(`Diffbot API error: ${response.status} ${response.statusText}`);
      }

      const data: DiffbotArticleResponse = await response.json();
      const totalCount =
        typeof data.hits === 'number' ? data.hits : data.searchInfo?.totalHits || 0;
      const articles = (data.data || []).map((item) => item.entity);

      console.log(`[Diffbot Article] Found ${articles.length} articles (total: ${totalCount})`);

      return { data: articles, totalCount };
    });
  }

  /**
   * Fetch all articles for the given organizations with pagination.
   */
  async searchArticlesByOrganizationsAllPages(
    diffbotIds: string[],
    options?: {
      daysBack?: number;
      language?: string;
      pageSize?: number;
    }
  ): Promise<{
    data: DiffbotArticle[];
    totalCount: number;
  }> {
    if (diffbotIds.length === 0) {
      return { data: [], totalCount: 0 };
    }

    const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
    const allArticles: DiffbotArticle[] = [];
    let from = 0;
    let totalCount = 0;

    while (true) {
      const { data, totalCount: count } = await this.searchArticlesByOrganizations(diffbotIds, {
        daysBack: options?.daysBack ?? 30,
        size: pageSize,
        from,
        language: options?.language,
      });

      totalCount = count;
      allArticles.push(...data);

      if (data.length < pageSize || data.length === 0) {
        break;
      }
      from += pageSize;
      if (from >= totalCount) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log(`[Diffbot Article] Paginated fetch: ${allArticles.length} articles total`);
    return { data: allArticles, totalCount };
  }

  static extractEntityIdFromUri(uri: string | undefined): string | null {
    if (!uri) return null;
    const match = uri.match(/diffbot\.com\/entity\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }

  static mapArticlesToCompanies(
    articles: DiffbotArticle[],
    diffbotIdToCompanyId: Map<string, string>
  ): Map<string, DiffbotArticle[]> {
    const result = new Map<string, DiffbotArticle[]>();

    for (const article of articles) {
      if (!article.tags) continue;

      for (const tag of article.tags) {
        const entityId = DiffbotArticleClient.extractEntityIdFromUri(tag.uri);
        if (!entityId) continue;

        const companyId = diffbotIdToCompanyId.get(entityId);
        if (!companyId) continue;

        const existing = result.get(companyId) || [];
        if (!existing.some((a) => a.pageUrl === article.pageUrl)) {
          existing.push(article);
          result.set(companyId, existing);
        }
      }
    }

    return result;
  }
}
