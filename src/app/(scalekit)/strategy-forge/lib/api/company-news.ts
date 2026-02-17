/**
 * Company News API
 * Functions for fetching news articles for companies.
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Company news item returned from the API
 */
export interface CompanyNewsItem {
  company_news_id: string;
  company_id: string;
  title: string;
  description: string | null;
  url: string;
  published_at: string | null;
  sentiment: number | null;
  fetched_at: string;
  created_at: string;
}

/**
 * Parameters for fetching company news
 */
export interface GetCompanyNewsParams {
  company_id: string;
  page?: number;
  limit?: number;
  /** Filter by minimum date (ISO string) */
  from_date?: string;
  /** Filter by maximum date (ISO string) */
  to_date?: string;
}

/**
 * Response from getCompanyNews
 */
export interface GetCompanyNewsResponse {
  data: CompanyNewsItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Get news articles for a specific company
 *
 * @param params - Query parameters
 * @returns Paginated list of news articles
 *
 * @example
 * ```ts
 * const { data, meta } = await getCompanyNews({
 *   company_id: 'uuid-here',
 *   page: 1,
 *   limit: 10,
 * });
 * ```
 */
export async function getCompanyNews(
  params: GetCompanyNewsParams
): Promise<GetCompanyNewsResponse> {
  const supabase = createClient();

  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('company_news')
    .select('*', { count: 'exact' })
    .eq('company_id', params.company_id)
    .order('published_at', { ascending: false, nullsFirst: false });

  // Date filters
  if (params.from_date) {
    query = query.gte('published_at', params.from_date);
  }
  if (params.to_date) {
    query = query.lte('published_at', params.to_date);
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching company news:', error);
    throw new Error(`Failed to fetch company news: ${error.message}`);
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: (data ?? []) as CompanyNewsItem[],
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Get latest news for multiple companies (for list view)
 * Returns the most recent article for each company
 *
 * @param companyIds - Array of company IDs
 * @param limit - Max articles per company (default 1)
 * @returns Map of company_id -> news articles
 */
export async function getLatestNewsForCompanies(
  companyIds: string[],
  limit: number = 1
): Promise<Map<string, CompanyNewsItem[]>> {
  if (companyIds.length === 0) {
    return new Map();
  }

  const supabase = createClient();

  // Fetch latest news for all companies in one query
  // Using distinct on company_id with order by published_at desc
  const { data, error } = await supabase
    .from('company_news')
    .select('*')
    .in('company_id', companyIds)
    .order('published_at', { ascending: false })
    .limit(companyIds.length * limit);

  if (error) {
    console.error('Error fetching latest news for companies:', error);
    throw new Error(`Failed to fetch latest news: ${error.message}`);
  }

  // Group by company_id, keeping only 'limit' articles per company
  const result = new Map<string, CompanyNewsItem[]>();

  for (const item of (data ?? []) as CompanyNewsItem[]) {
    const existing = result.get(item.company_id) ?? [];
    if (existing.length < limit) {
      existing.push(item);
      result.set(item.company_id, existing);
    }
  }

  return result;
}

/**
 * Get news count for a company
 *
 * @param companyId - Company ID
 * @returns Total number of news articles
 */
export async function getCompanyNewsCount(companyId: string): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('company_news')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (error) {
    console.error('Error fetching company news count:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get news statistics for a company
 *
 * @param companyId - Company ID
 * @returns Statistics about company news
 */
export async function getCompanyNewsStats(companyId: string): Promise<{
  totalArticles: number;
  latestArticleDate: string | null;
  averageSentiment: number | null;
}> {
  const supabase = createClient();

  // Get count and latest article
  const { data, error } = await supabase
    .from('company_news')
    .select('published_at, sentiment')
    .eq('company_id', companyId)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching company news stats:', error);
    return {
      totalArticles: 0,
      latestArticleDate: null,
      averageSentiment: null,
    };
  }

  const articles = data ?? [];
  const totalArticles = articles.length;
  const latestArticleDate = articles[0]?.published_at ?? null;

  // Calculate average sentiment (only for articles with sentiment)
  const sentiments = articles.map((a) => a.sentiment).filter((s): s is number => s !== null);

  const averageSentiment =
    sentiments.length > 0 ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : null;

  return {
    totalArticles,
    latestArticleDate,
    averageSentiment,
  };
}
