# Segments Search Edge Function

This Supabase Edge Function enables searching for companies via the Diffbot Knowledge Graph API based on segment filters.

## Setup

### 1. Configure Diffbot API Credentials

You need to set up your Diffbot API token as a Supabase secret:

```bash
# Set the Diffbot API token
supabase secrets set DIFFBOT_API_TOKEN=your_diffbot_api_token_here

# Set the OpenAi API key
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here

# Optional: Set custom Diffbot API URL (defaults to https://kg.diffbot.com/kg/v3/dql)
supabase secrets set DIFFBOT_API_URL=https://kg.diffbot.com/kg/v3/dql
```

### 2. Deploy the Edge Function

```bash
# Deploy all edge functions
supabase functions deploy

# Or deploy only this function
supabase functions deploy segments-search
```

### 3. Test the Function

You can test the function locally:

```bash
# Start local Supabase
supabase start

# Serve the function locally
supabase functions serve segments-search --env-file supabase/.env.local

# Make a test request
curl -i --location --request POST 'http://localhost:54321/functions/v1/segments-search' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"filters":{"country":"United States","categories":["Software"]},"page":1,"perPage":10}'
```

## API Reference

### Request

**POST** `/functions/v1/segments-search`

**Headers:**

- `Authorization: Bearer <your-jwt-token>`
- `Content-Type: application/json`

**Body:**

```json
{
  "filters": {
    "country": "United States",
    "location": "California",
    "employees": "1000-5000",
    "categories": ["Software", "Technology"],
    "technographics": ["AWS", "Docker", "Kubernetes"],
    "personas": []
  },
  "page": 1,
  "perPage": 50
}
```

### Response

**Success (200):**

```json
{
  "data": [
    {
      "id": "...",
      "diffbotId": "...",
      "name": "Company Name",
      "fullName": "Full Company Name Inc.",
      "logo": "https://...",
      "type": "Corporation",
      "location": {
        "country": { "name": "United States" },
        "city": { "name": "San Francisco" },
        "region": { "name": "California" }
      },
      "nbEmployees": 1500,
      "categories": [{ "name": "Software" }, { "name": "Technology" }],
      "homepageUri": "https://example.com"
    }
  ],
  "totalCount": 250,
  "page": 1,
  "perPage": 50,
  "diffbotQueries": ["company: type:Organization location.country.name:\"United States\" ..."]
}
```

**Error (400, 409, 503):**

```json
{
  "error": "Error message"
}
```

## Filter Format

### Country

- Example: `"United States"`, `"Canada"`, `"United Kingdom"`
- Converted to DQL: `location.country.name:"United States"`

### Location (State/City)

- Example: `"California"`, `"New York"`, `"Toronto"`
- Converted to DQL: `location.city.name:"California"`

### Employees (Company Size)

- Range format: `"1000-5000"` or `"10,000-50,000"`
- Minimum with plus: `"10001+"` or `"10,001+"`
- Converted to DQL: `nbEmployees>=1000 nbEmployees<=5000` or `nbEmployees>=10001`

### Categories (Industries)

- Array of industry names: `["Software", "Technology", "Healthcare"]`
- Converted to DQL: Multiple clauses (AND): `categories.name:"Software" categories.name:"Technology"`

### Technographics (Technologies)

- Array of technology names: `["AWS", "Docker", "Kubernetes"]`
- Converted to DQL: OR syntax: `technographics.technology.name:or("AWS", "Docker", "Kubernetes")`

## Error Codes

- **400** - Invalid request (missing filters, invalid pagination)
- **401** - Unauthorized (missing or invalid JWT token)
- **405** - Method not allowed (only POST is supported)
- **409** - No results found for the current filters
- **503** - Diffbot service temporarily unavailable

## Architecture

```
Frontend (Create Segment Form)
    ↓
Client API Wrapper (lib/api/search.ts)
    ↓
Supabase Edge Function (segments-search)
    ↓
DQL Adapter (converts filters to Diffbot Query Language)
    ↓
Diffbot Client (makes HTTP request to Diffbot API)
    ↓
Diffbot Knowledge Graph API
```

## Files

- `index.ts` - Main edge function handler
- `diffbot-client.ts` - Diffbot API client
- `dql-adapter.ts` - Converts segment filters to DQL
- `types.ts` - TypeScript type definitions

## Troubleshooting

### "DIFFBOT_API_TOKEN environment variable is required"

- Make sure you've set the Diffbot API token: `supabase secrets set DIFFBOT_API_TOKEN=your_token`

### "Service temporarily unavailable"

- Diffbot API might be down or rate-limited
- Check Diffbot service status
- Verify your API token is valid

### "No results found"

- Try broadening your filter criteria
- Check that filter values are correct (e.g., country names, industry names)
- Some combinations of filters might be too restrictive

### CORS errors

- The function uses shared CORS handlers from `_shared/cors.ts`
- Make sure your frontend origin is allowed
