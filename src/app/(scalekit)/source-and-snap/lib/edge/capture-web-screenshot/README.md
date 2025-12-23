# Capture Web Screenshot Edge Function

This Supabase Edge Function captures screenshots of web pages and optionally extracts HTML/CSS source code using Browserless.io (or self-hosted Browserless).

## Overview

The function processes `web_screenshot_capture_request` records by:
1. Fetching the capture request from the database
2. Taking a screenshot using Browserless/Puppeteer
3. Extracting HTML and CSS if requested
4. Uploading the screenshot to Supabase Storage (`screenshots` bucket)
5. Creating a `web_screenshot_captures` record with all captured data

## Environment Variables

Set these in your Supabase project settings:

- `BROWSERLESS_URL` - Browserless API endpoint (default: `https://chrome.browserless.io`)
- `BROWSERLESS_TOKEN` - Browserless API token (required)
- `SUPABASE_URL` - Your Supabase project URL (automatically available)
- `SUPABASE_ANON_KEY` - Your Supabase anon key (automatically available)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for error handling (automatically available)

## API Usage

### Request

```typescript
POST /functions/v1/capture-web-screenshot
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json

{
  "web_screenshot_capture_request_id": "uuid-of-capture-request"
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "capture_id": "uuid-of-created-capture",
  "screenshot_url": "https://...supabase.co/storage/v1/object/public/screenshots/..."
}
```

**Error (400/401/500):**
```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

## How It Works

1. **Authentication**: Validates the JWT token and ensures user is authenticated
2. **Fetch Request**: Retrieves the `web_screenshot_capture_request` record
3. **Device Profile**: Loads device profile settings (viewport, user agent, etc.)
4. **Browserless Call**: Executes a Puppeteer script via Browserless to:
   - Navigate to the URL
   - Set viewport and user agent
   - Block tracking if requested
   - Wait for page to fully load
   - Capture screenshot (full page or viewport)
   - Extract HTML and CSS if requested
5. **Storage Upload**: Uploads screenshot PNG to Supabase Storage
6. **Database Record**: Creates `web_screenshot_captures` record with:
   - Screenshot storage path
   - Dimensions and file size
   - HTML/CSS content (if requested)
   - Page metadata (title, final URL, etc.)
   - Capture metadata (user agent, viewport, etc.)
7. **Status Update**: Updates request status to `completed` or `failed`

## Browserless Configuration

### Using Browserless.io (Cloud)

1. Sign up at [browserless.io](https://browserless.io)
2. Get your API token from the dashboard
3. Set `BROWSERLESS_TOKEN` environment variable

### Self-Hosted Browserless

1. Deploy Browserless using Docker:
   ```bash
   docker run -p 3000:3000 browserless/chrome
   ```
2. Set `BROWSERLESS_URL` to your self-hosted URL (e.g., `http://your-server:3000`)

## Storage Bucket Setup

Ensure you have a `screenshots` bucket in Supabase Storage:

```sql
-- Create bucket (run in Supabase SQL editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true);

-- Set up RLS policies for the bucket
-- (Adjust based on your access requirements)
```

## Error Handling

The function handles errors gracefully:
- Updates request status to `failed` on error
- Stores error message in `error_message` field
- Returns appropriate HTTP status codes
- Logs detailed error information for debugging

## Limitations

- Maximum timeout: 60 seconds per page load
- Screenshot format: PNG only
- Full page screenshots may be large for very tall pages
- CSS extraction may miss dynamically injected styles

## Deployment

```bash
# Copy function to Supabase functions directory for deployment
cp -r frontend/src/app/\(features\)/source-and-snap/lib/edge/capture-web-screenshot backend/supabase/functions/

# Deploy
cd backend/supabase
supabase functions deploy capture-web-screenshot
```

## Testing

You can test the function using the Supabase dashboard or via curl:

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/capture-web-screenshot' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"web_screenshot_capture_request_id": "your-request-id"}'
```

## Related Documentation

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Browserless Documentation](https://www.browserless.io/docs/)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

