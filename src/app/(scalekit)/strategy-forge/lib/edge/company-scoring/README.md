# company-scoring Edge Function

Scores one company for one customer using OpenAI and Diffbot data stored in `company_metadata`. Updates `customer_companies.last_scoring_results` and `scoring_results_updated_at`.

## Secrets

**OPENAI_API_KEY** must be set in Supabase Edge Function secrets for this function to work. Set it in the Supabase Dashboard under Project Settings → Edge Functions → Secrets, or via CLI:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

## Request

- **Method:** POST
- **Body:** `{ "company_id": "<uuid>", "customer_id": "<uuid>" }`
- **Auth:** Use service role or anon key as needed when invoking from other Edge Functions or the app.

## Behavior

- Returns 404 if company, customer, or `customer_companies` row does not exist.
- Skips scoring (200, `{ status: "skipped", reason: "recently_scored" }`) if scored within the last 30 days.
- Returns 400 if `company_metadata.diffbot_json` is missing (run segment processing first).
- On success: 200, `{ status: "completed", score, short_description, full_description }`.
