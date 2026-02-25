/**
 * Types for company news fetching from Diffbot
 */

/**
 * Diffbot Article entity from Knowledge Graph
 */
export interface DiffbotArticle {
  /** Diffbot entity ID */
  id?: string;
  /** Diffbot entity URI */
  diffbotUri?: string;
  /** Article title */
  title?: string;
  /** Article text/content */
  text?: string;
  /** Article summary (if available) */
  summary?: string;
  /** Original article URL */
  pageUrl?: string;
  /** Publication date - can be string or object { str, precision, timestamp } */
  date?: string | { str?: string; precision?: number; timestamp?: number };
  /** Sentiment score (-1 to 1) */
  sentiment?: number;
  /** Language code */
  language?: string;
  /** Author name */
  author?: string;
  /** Publisher/site name */
  siteName?: string;
  /** Tags with entity references */
  tags?: DiffbotArticleTag[];
}

/**
 * Tag on a Diffbot Article linking to an entity
 */
export interface DiffbotArticleTag {
  /** Entity URI (e.g., "diffbot.com/entity/Exxxx") */
  uri?: string;
  /** Entity label/name */
  label?: string;
  /** Entity type */
  type?: string;
  /** Relevance score */
  score?: number;
  /** Sentiment for this entity in the article */
  sentiment?: number;
}

/**
 * Diffbot API response structure for Article search
 */
export interface DiffbotArticleResponse {
  /** Array of article results */
  data?: Array<{
    entity: DiffbotArticle;
  }>;
  /** Total hits count */
  hits?: number;
  /** Search info with total hits */
  searchInfo?: {
    totalHits?: number;
  };
}

/**
 * Company data needed for news fetching
 */
export interface CompanyForNewsFetch {
  company_id: string;
  diffbot_id: string;
  display_name?: string | null;
}

/**
 * Processed article ready for database insertion
 */
export interface ProcessedArticle {
  company_id: string;
  title: string;
  description: string | null;
  url: string;
  published_at: string | null;
  diffbot_article_id: string | null;
  diffbot_uri: string | null;
  sentiment: number | null;
  raw_json: Record<string, unknown> | null;
}

/**
 * Result of news fetch operation for a batch
 */
export interface NewsFetchBatchResult {
  /** Companies that were processed */
  processedCompanyIds: string[];
  /** Articles fetched and saved */
  articlesCount: number;
  /** Errors encountered (non-fatal) */
  errors: string[];
}

/**
 * Request body for manual trigger of news fetch
 */
export interface CompanyNewsFetchBody {
  /** Optional: specific company IDs to fetch news for */
  company_ids?: string[];
  /** Optional: limit number of companies to process (no limit by default) */
  limit?: number;
  /** Optional: days threshold for stale news (default 30) */
  days_threshold?: number;
  /** Optional: batch size for Diffbot requests (default 10) */
  batch_size?: number;
}

/**
 * Response from news fetch operation
 */
export interface CompanyNewsFetchResponse {
  status: 'completed' | 'partial' | 'no_companies';
  companiesProcessed: number;
  articlesInserted: number;
  errors: string[];
}
