# Segment Save with Background Processing - Testing Guide

## Implementation Complete ✅

All components have been implemented for the segment save functionality with background processing.

## What Was Implemented

### 1. Edge Functions

- **`segments-create`**: Immediately saves segment to database with status 'new'
  - Location: `supabase/functions/segments-create/`
  - Validates segment name uniqueness
  - Creates in-app notification
  - Returns created segment

- **`segments-process`**: Background processing of segments
  - Location: `supabase/functions/segments-process/`
  - Searches Diffbot API (max 100 companies)
  - Bulk upserts companies to database
  - Creates list_companies and customer_companies associations
  - Updates segment status and creates notifications

### 2. Database Migration

- **`20260121120957_add_segment_processing_cron.sql`**
  - Sets up pg_cron job to run every 1 minute
  - Creates `process_pending_segments()` function
  - Polls for segments with status 'new' and triggers processing

### 3. Frontend Components

- **Updated `segments.ts` API wrapper** to call `segments-create` edge function
- **Updated `create-segment-form.tsx`** with:
  - "Save Segment" button in the preview panel header
  - Validation logic for save button (name + companies found)
  - Save handler that calls the API and navigates to segments list
- **Added `SegmentFilterDto` type** to `list.ts`

## Deployment Steps

### 1. Deploy Edge Functions

```bash
# From project root
npx supabase functions deploy segments-create
npx supabase functions deploy segments-process
```

### 2. Run Database Migration

```bash
# Apply the pg_cron migration
npx supabase db push
```

### 3. Configure Environment Variables

The pg_cron job requires two configuration settings to be set in your Supabase database:

**For Local Development:**

```sql
ALTER DATABASE postgres SET app.supabase_functions_url = 'http://host.docker.internal:54321/functions/v1';
ALTER DATABASE postgres SET app.service_role_key = 'your-local-service-role-key';
```

**For Production (via Supabase Dashboard):**

1. Go to Supabase Dashboard → SQL Editor
2. Run:

```sql
ALTER DATABASE postgres SET app.supabase_functions_url = 'https://[your-project-ref].supabase.co/functions/v1';
ALTER DATABASE postgres SET app.service_role_key = 'your-production-service-role-key';
```

You can find your service role key in: Settings → API → service_role

### 4. Verify Diffbot Token

Make sure the `DIFFBOT_API_TOKEN` secret is set:

```bash
npx supabase secrets list

# If not set:
npx supabase secrets set DIFFBOT_API_TOKEN=your_token_here
```

## Testing Plan

### Manual Testing Flow

#### 1. Test Segment Creation (Frontend → Edge Function)

1. Navigate to segments page: `/dashboard/segments`
2. Click "Create Segment" button
3. Enter a segment name (e.g., "Test Segment - Albania Airlines")
4. Select filters:
   - Country: Albania
   - Industry: Airlines
   - Company Size: 501-1000 employees
5. Click "Apply Filters"
6. Verify companies appear in the preview table
7. Click "Save Segment" button
8. Verify:
   - Success toast appears: "Segment created! Processing companies in background..."
   - Navigation to segments list occurs

**Expected Database State After Save:**

- Check `lists` table:

  ```sql
  SELECT list_id, name, status, created_at
  FROM lists
  WHERE name = 'Test Segment - Albania Airlines'
  ORDER BY created_at DESC
  LIMIT 1;
  ```

  - Status should be `'new'`
  - `filters` column should contain JSONB with your selections

- Check `notifications` table:

  ```sql
  SELECT title, message, created_at
  FROM notifications
  ORDER BY created_at DESC
  LIMIT 1;
  ```

  - Should show "Segment Created" notification

#### 2. Test Background Processing (pg_cron → Edge Function)

**Wait ~1 minute for pg_cron to trigger...**

1. Monitor segment status:

   ```sql
   SELECT list_id, name, status, updated_at
   FROM lists
   WHERE name = 'Test Segment - Albania Airlines';
   ```

   - Status should change: `'new'` → `'processing'` → `'completed'`

2. Check notifications:

   ```sql
   SELECT title, message, metadata, created_at
   FROM notifications
   WHERE metadata->>'name' = 'Test Segment - Albania Airlines'
   ORDER BY created_at DESC;
   ```

   - Should see 3 notifications:
     1. "Segment Created"
     2. "Segment Processing Started"
     3. "Segment Processed Successfully" (with company count)

3. Verify companies were saved:

   ```sql
   -- Check list_companies junction table
   SELECT COUNT(*) as company_count
   FROM list_companies lc
   JOIN lists l ON l.list_id = lc.list_id
   WHERE l.name = 'Test Segment - Albania Airlines';
   ```

   - Should show number of companies found (up to 100)

4. Check companies table:

   ```sql
   SELECT c.display_name, c.country, c.employees, c.categories
   FROM companies c
   JOIN list_companies lc ON lc.company_id = c.company_id
   JOIN lists l ON l.list_id = lc.list_id
   WHERE l.name = 'Test Segment - Albania Airlines'
   LIMIT 10;
   ```

   - Should show company details

5. Check customer_companies table:

   ```sql
   SELECT cc.name, cc.employees, cc.country
   FROM customer_companies cc
   JOIN list_companies lc ON lc.company_id = cc.company_id
   JOIN lists l ON l.list_id = lc.list_id
   WHERE l.name = 'Test Segment - Albania Airlines'
   LIMIT 10;
   ```

   - Should show denormalized company data

#### 3. Test Edge Cases

**Test: Duplicate Segment Name**

1. Try to create another segment with the same name
2. Expected: Error toast with "A segment with this title already exists"

**Test: No Companies Found**

1. Create segment with very restrictive filters (e.g., Antarctica + specific industry)
2. Expected:
   - Segment created successfully
   - After processing, status = `'completed'` with 0 companies
   - Notification shows "0 companies added"

**Test: Invalid Segment Name**

1. Try to save with name less than 3 characters
2. Expected: Save button disabled, error toast if clicked

**Test: Save Without Applying Filters**

1. Enter name but don't apply filters
2. Expected: Save button disabled

### Debugging

**Check pg_cron is running:**

```sql
SELECT * FROM cron.job WHERE jobname = 'process-pending-segments';
```

**Check pg_cron job history:**

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-pending-segments')
ORDER BY start_time DESC
LIMIT 10;
```

**Check edge function logs:**

- Supabase Dashboard → Edge Functions → segments-process → Logs

**Monitor segment processing in real-time:**

```sql
-- Run this query every 10 seconds
SELECT
  list_id,
  name,
  status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_time_seconds
FROM lists
WHERE list_type = 'segment'
ORDER BY created_at DESC
LIMIT 5;
```

## Known Limitations

1. **Maximum 100 companies per segment** (configurable in `segments-process/index.ts`)
2. **Processing interval: 1 minute** (can be adjusted in migration)
3. **No retry logic** for failed segments (manual reprocessing required)
4. **No real-time status updates** in UI (requires page refresh to see status)

## Future Enhancements

- Real-time status updates via Supabase Realtime subscriptions
- Progress tracking during processing
- Retry logic for failed segments
- Ability to manually trigger reprocessing
- Company scoring integration
- People extraction from company data

## Troubleshooting

### Segment stuck in 'new' status

- Check pg_cron is running: `SELECT cron.schedule_in_database('postgres');`
- Verify configuration: `SHOW app.supabase_functions_url;`
- Check edge function is deployed: `supabase functions list`

### Segment status = 'failed'

- Check edge function logs for error details
- Check Diffbot API token is valid
- Check network connectivity to Diffbot API

### No notifications appearing

- Check `notifications` table directly
- Verify user_id is set correctly on the segment
- Check notification creation didn't error (check edge function logs)

## Success Criteria

✅ Segment creation returns immediately with status 'new'  
✅ Background processing starts within 1 minute  
✅ Status transitions: new → processing → completed  
✅ Companies are saved to database  
✅ Notifications are created for all status changes  
✅ Duplicate names are rejected  
✅ No companies found scenario handled gracefully

---

**Implementation Date:** January 21, 2026  
**Implementation Status:** Complete - Ready for Testing
