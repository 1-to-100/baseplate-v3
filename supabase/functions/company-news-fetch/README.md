# company-news-fetch

Fetches news articles from Diffbot for companies and stores them in `company_news`. Can be run as a daily cron or triggered manually with specific company IDs.

## Deploy

```bash
supabase functions deploy company-news-fetch
```

## Secrets

Set before deploy or in dashboard:

- `DIFFBOT_API_TOKEN` (required)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (usually set by Supabase)

## Invoke

**Manual trigger for one or more companies:**

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/company-news-fetch" \
  -H "Authorization: Bearer <anon-or-service-key>" \
  -H "Content-Type: application/json" \
  -d '{"company_ids": ["<company-uuid>"]}'
```

**Cron (no body):** processes up to 50 companies that haven’t had news fetched in 30+ days.

## Response

```json
{
  "status": "completed",
  "companiesProcessed": 1,
  "articlesInserted": 15,
  "errors": []
}
```

See also: `src/app/(scalekit)/strategy-forge/lib/edge/company-news-fetch/README.md` for full logic and DB schema.
