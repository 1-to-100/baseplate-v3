# Capture Web Screenshot - Deployment Guide

## Quick Deploy

```bash
# Copy function to Supabase functions directory
cp -r frontend/src/app/\(features\)/source-and-snap/lib/edge/capture-web-screenshot backend/supabase/functions/

# Deploy
cd backend/supabase
supabase functions deploy capture-web-screenshot
```

## Environment Variables

Set these in your Supabase project dashboard under Settings > Edge Functions:

1. **BROWSERLESS_URL** (optional)
   - Default: `https://chrome.browserless.io`
   - Your Browserless endpoint URL

2. **BROWSERLESS_TOKEN** (required)
   - Your Browserless API token
   - Get one at [browserless.io](https://browserless.io) or use your self-hosted token

## Storage Bucket Setup

Create the `screenshots` bucket in Supabase Storage:

1. Go to Storage in Supabase dashboard
2. Create a new bucket named `screenshots`
3. Set it as public (or configure RLS policies as needed)

Or via SQL:

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;
```

## Testing

After deployment, test the function:

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/capture-web-screenshot' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"web_screenshot_capture_request_id": "your-request-id"}'
```

## Integration

This function should be called when a capture request is created. You can:

1. **Trigger via Database Webhook**: Set up a database webhook on `web_screenshot_capture_requests` INSERT
2. **Call from Application**: Call the function after creating a capture request
3. **Use Supabase Queue**: If you have a queue system, enqueue jobs that call this function

## Monitoring

Check function logs in Supabase dashboard:
- Go to Edge Functions > capture-web-screenshot > Logs
- Monitor for errors and performance issues

## Troubleshooting

### "Screenshot failed" errors
- Check Browserless token is valid
- Verify Browserless URL is correct
- Check target URL is accessible
- Review Browserless logs

### Storage upload errors
- Verify `screenshots` bucket exists
- Check RLS policies allow uploads
- Ensure service role key has storage access

### Timeout errors
- Increase timeout in Puppeteer script (currently 60s)
- Check if target URL loads slowly
- Consider using `waitUntil: 'load'` instead of `networkidle0`

