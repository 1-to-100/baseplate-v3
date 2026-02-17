-- =============================================================================
-- ADD: Company news table for storing articles from Diffbot
-- =============================================================================

-- Add news_last_fetched_at column to companies table
-- This tracks when news was last fetched for each company (for daily cron job)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS news_last_fetched_at timestamptz(6) DEFAULT NULL;

COMMENT ON COLUMN public.companies.news_last_fetched_at IS 
  'Timestamp when news was last fetched from Diffbot for this company';

-- Create index for efficient querying of companies needing news refresh
CREATE INDEX IF NOT EXISTS idx_companies_news_last_fetched_at 
ON public.companies (news_last_fetched_at ASC NULLS FIRST)
WHERE diffbot_id IS NOT NULL;

-- =============================================================================
-- Table: company_news
-- Stores news articles fetched from Diffbot per company
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.company_news (
  company_news_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  
  -- Article data
  title text NOT NULL,
  description text,
  url text NOT NULL,
  published_at timestamptz(6),
  
  -- Diffbot metadata for deduplication
  diffbot_article_id text,
  diffbot_uri text,
  
  -- Sentiment (optional, from Diffbot)
  sentiment numeric(4, 3),
  
  -- Raw JSON for future use (optional)
  raw_json jsonb,
  
  -- Timestamps
  fetched_at timestamptz(6) NOT NULL DEFAULT current_timestamp,
  created_at timestamptz(6) NOT NULL DEFAULT current_timestamp,
  updated_at timestamptz(6) NOT NULL DEFAULT current_timestamp,
  
  -- Foreign key
  CONSTRAINT company_news_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(company_id)
    ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate articles per company
  CONSTRAINT company_news_company_url_unique
    UNIQUE (company_id, url)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_company_news_company_id 
ON public.company_news (company_id);

CREATE INDEX IF NOT EXISTS idx_company_news_published_at 
ON public.company_news (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_news_company_published 
ON public.company_news (company_id, published_at DESC);

-- Comments
COMMENT ON TABLE public.company_news IS 
  'Stores news articles fetched from Diffbot per company';

COMMENT ON COLUMN public.company_news.company_news_id IS 
  'Primary key identifier';

COMMENT ON COLUMN public.company_news.company_id IS 
  'Foreign key to companies table';

COMMENT ON COLUMN public.company_news.title IS 
  'Article title';

COMMENT ON COLUMN public.company_news.description IS 
  'Article description/summary (truncated text)';

COMMENT ON COLUMN public.company_news.url IS 
  'Original article URL for user to open';

COMMENT ON COLUMN public.company_news.published_at IS 
  'Article publication date from Diffbot';

COMMENT ON COLUMN public.company_news.diffbot_article_id IS 
  'Diffbot article entity ID for deduplication';

COMMENT ON COLUMN public.company_news.diffbot_uri IS 
  'Diffbot article entity URI';

COMMENT ON COLUMN public.company_news.sentiment IS 
  'Article sentiment score from Diffbot (-1 to 1)';

COMMENT ON COLUMN public.company_news.raw_json IS 
  'Full Diffbot article JSON (optional, for debugging)';

COMMENT ON COLUMN public.company_news.fetched_at IS 
  'Timestamp when article was fetched from Diffbot';

-- =============================================================================
-- RLS Policies for company_news
-- =============================================================================

ALTER TABLE public.company_news ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read company news
CREATE POLICY company_news_select_authenticated ON public.company_news
  FOR SELECT
  TO authenticated
  USING (true);

-- Only system admin can insert/update/delete (via service role)
CREATE POLICY company_news_insert_service ON public.company_news
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY company_news_update_service ON public.company_news
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY company_news_delete_service ON public.company_news
  FOR DELETE
  TO service_role
  USING (true);

-- =============================================================================
-- Function to clean up old news (older than 90 days)
-- Can be called periodically to keep table size manageable
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_company_news(days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.company_news
  WHERE published_at < NOW() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_company_news IS 
  'Deletes company news older than specified days (default 90). Returns count of deleted rows.';
