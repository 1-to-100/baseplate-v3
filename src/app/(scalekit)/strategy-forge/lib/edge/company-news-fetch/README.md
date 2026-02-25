# Company News Fetch Edge Function

Fetches news articles from Diffbot Knowledge Graph for companies and stores them in the `company_news` table.

## Overview

This edge function:

1. Selects companies that haven't had news fetched recently (30+ days or never)
2. Batches companies (10 per request) to minimize API calls
3. Queries Diffbot for articles with **pagination** (200 per page) so media-heavy companies get full coverage
4. Maps articles back to companies; limits to 20 articles per company per batch; dedupes by `(company_id, url)`
5. Upserts into `company_news` and counts **actual** rows affected via `.select('company_news_id')`
6. Updates `companies.news_last_fetched_at` **only when Diffbot responded successfully** (failed batches retry next run)
7. **Retry** with exponential backoff for 429 and 5xx

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Cron Job      │────▶│  Edge Function   │────▶│    Diffbot      │
│   (daily)       │     │  company-news-   │     │  Knowledge      │
└─────────────────┘     │  fetch           │     │  Graph API      │
                        └────────┬─────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │    Supabase      │
                        │  ┌────────────┐  │
                        │  │ companies  │  │
                        │  │ (update    │  │
                        │  │ timestamp) │  │
                        │  └────────────┘  │
                        │  ┌────────────┐  │
                        │  │ company_   │  │
                        │  │ news       │  │
                        │  │ (upsert)   │  │
                        │  └────────────┘  │
                        └──────────────────┘
```

## Environment Variables

| Variable                    | Required | Description               |
| --------------------------- | -------- | ------------------------- |
| `DIFFBOT_API_TOKEN`         | Yes      | Diffbot API token         |
| `SUPABASE_URL`              | Yes      | Supabase project URL      |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Supabase service role key |

## API

### Endpoint

```
POST /functions/v1/company-news-fetch
```

### Request Body (Optional)

```json
{
  "company_ids": ["uuid1", "uuid2"], // Optional: specific companies
  "limit": 50, // Optional: max companies to process (default 50)
  "days_threshold": 30, // Optional: days before news is stale (default 30)
  "batch_size": 10 // Optional: companies per Diffbot request (default 10)
}
```

### Response

```json
{
  "status": "completed", // "completed" | "partial" | "no_companies"
  "companiesProcessed": 50,
  "articlesInserted": 127,
  "errors": []
}
```

## Database Schema

### `companies` table (modified)

Added column:

- `news_last_fetched_at` - Timestamp of last news fetch

### `company_news` table (new)

| Column               | Type        | Description                     |
| -------------------- | ----------- | ------------------------------- |
| `company_news_id`    | uuid        | Primary key                     |
| `company_id`         | uuid        | FK to companies                 |
| `title`              | text        | Article title                   |
| `description`        | text        | Article summary (max 500 chars) |
| `url`                | text        | Original article URL            |
| `published_at`       | timestamptz | Publication date                |
| `diffbot_article_id` | text        | Diffbot entity ID               |
| `diffbot_uri`        | text        | Diffbot entity URI              |
| `sentiment`          | numeric     | Sentiment score (-1 to 1)       |
| `raw_json`           | jsonb       | Full article JSON (optional)    |
| `fetched_at`         | timestamptz | When fetched from Diffbot       |

Unique constraint: `(company_id, url)` - prevents duplicate articles.

## Cron Setup

Add to Supabase cron jobs (daily at 2 AM UTC):

```sql
SELECT cron.schedule(
  'fetch-company-news-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/company-news-fetch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## Load Estimation

| Companies | Days to Full Cycle | API Requests/Day |
| --------- | ------------------ | ---------------- |
| 1,000     | 20                 | 5                |
| 5,000     | 100                | 5                |
| 10,000    | 200                | 5                |

With batching (10 companies per request), **~85% reduction** in API calls vs. individual requests.

## Diffbot DQL Query

The function uses this DQL pattern:

```
type:Article (tags.uri:"diffbot.com/entity/ID1" OR tags.uri:"diffbot.com/entity/ID2" ...) date<30d get:title,text,summary,pageUrl,date,sentiment,tags sortBy:date
```

Articles are mapped back to companies using `tags.uri` field matching.

## Implementation details (audit fixes)

- **articlesInserted**: Uses upsert `.select('company_news_id')` and counts returned rows (real inserts/updates).
- **Large results**: `searchArticlesByOrganizationsAllPages()` paginates with page size 200 so Tesla/Apple-level volume is covered.
- **Timestamp on success only**: `news_last_fetched_at` is updated only inside the try block after a successful Diffbot fetch; on API/network error the batch is not marked updated and will be retried next day.
- **No per-company or per-batch caps**: All articles returned by Diffbot (after mapping to companies) are deduped by `company_id:url` and upserted.
- **Dedupe**: Global `Set` keyed by `company_id:url` so the same article is not upserted twice in one batch.
- **Retry**: Diffbot client uses `withRetry` (max 2 retries, exponential backoff) for 429 and 5xx.

## Files

- `index.ts` - Main edge function handler
- `diffbot-client.ts` - Diffbot API client for articles (with retry and pagination)
- `types.ts` - TypeScript interfaces
- `README.md` - This file

## Client API

Use functions from `lib/api/company-news.ts`:

```typescript
import { getCompanyNews, getCompanyNewsStats } from '../lib/api/company-news';

// Get paginated news for a company
const { data, meta } = await getCompanyNews({
  company_id: 'uuid-here',
  page: 1,
  limit: 10,
});

// Get news statistics
const stats = await getCompanyNewsStats('uuid-here');
// { totalArticles: 15, latestArticleDate: '2026-02-01', averageSentiment: 0.45 }
```

## Maintenance

### Cleanup Old News

Call the cleanup function periodically (e.g., weekly):

```sql
SELECT public.cleanup_old_company_news(90);  -- Keep last 90 days
```

## Troubleshooting

### "DIFFBOT_API_TOKEN environment variable is required"

Set the secret:

```bash
supabase secrets set DIFFBOT_API_TOKEN=your_token
```

### "No companies to process"

All companies have been updated within the threshold period. This is normal.

### Articles not matching companies

Check that `companies.diffbot_id` values are correct Diffbot entity IDs. The function matches articles to companies via `tags.uri` field.
