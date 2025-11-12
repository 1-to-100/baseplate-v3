# Edge Functions Deployment Guide

This guide will help you deploy and test your Supabase Edge Functions.

## Prerequisites

1. **Node.js and npx** installed:
   - npx comes with Node.js, so just install Node.js from https://nodejs.org/
   - Verify: `npx --version`

2. **Supabase Project** set up:
   - Make sure you have a Supabase project
   - Get your project reference ID from the Supabase dashboard

## 🔐 Step 1: Link to Your Supabase Project

Link your local project to your remote Supabase project:

```bash
cd supabase
npx supabase link --project-ref YOUR_PROJECT_REF
```

You'll be prompted to enter your database password.

## 📦 Step 2: Deploy All Edge Functions

Deploy all three Edge Functions at once:

```bash
# From supabase directory
npx supabase functions deploy user-management
npx supabase functions deploy auth-context
npx supabase functions deploy admin-operations
```

Or deploy them all in one command:

```bash
npx supabase functions deploy user-management auth-context admin-operations
```

Or use our helper script:

```bash
./scripts/deploy-functions.sh
```

## 🔑 Step 3: Set Environment Secrets

Your Edge Functions need access to environment variables. Set them using:

```bash
# These are automatically available in Edge Functions:
# - SUPABASE_URL (automatically set)
# - SUPABASE_ANON_KEY (automatically set)
# - SUPABASE_SERVICE_ROLE_KEY (automatically set)

# If you need additional secrets, set them like this:
npx supabase secrets set MY_SECRET=value
```

**Note:** The Supabase URL, Anon Key, and Service Role Key are automatically injected into Edge Functions, so you don't need to set them manually.

## 🧪 Step 4: Test Your Edge Functions

### Test Locally (Recommended First)

Start the local Supabase services:

```bash
npx supabase start
```

Then test your functions locally:

```bash
# Test user-management function
curl -i --location --request POST 'http://localhost:54321/functions/v1/user-management' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"action":"invite","email":"test@example.com","customerId":"customer-id","roleId":"role-id"}'

# Test auth-context function
curl -i --location --request POST 'http://localhost:54321/functions/v1/auth-context' \
  --header 'Authorization: Bearer YOUR_USER_JWT' \
  --header 'Content-Type: application/json' \
  --data '{"action":"refresh","customerId":"customer-id"}'
```

### Test in Production

After deployment, test your functions:

```bash
# Replace YOUR_PROJECT_REF with your actual project reference
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/user-management' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"action":"invite","email":"test@example.com","customerId":"customer-id","roleId":"role-id"}'
```

## 📊 Step 5: View Logs

Check your Edge Function logs:

```bash
# View logs for a specific function
npx supabase functions logs user-management
npx supabase functions logs auth-context
npx supabase functions logs admin-operations

# Follow logs in real-time
npx supabase functions logs user-management --follow
```

## 🔄 Update Functions

When you make changes to your Edge Functions:

```bash
# Deploy the updated function
npx supabase functions deploy user-management

# Or deploy all functions
npx supabase functions deploy user-management auth-context admin-operations

# Or use the helper script
./scripts/deploy-functions.sh
```

## 🌐 CORS Configuration

Your Edge Functions already have CORS configured in `_shared/cors.ts`. The current configuration allows all origins (`*`). 

For production, you should restrict this to your actual frontend domains:

```typescript
// In _shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## 🔒 Security Checklist

Before going to production:

- [ ] Verify RLS policies are active on all tables
- [ ] Test authorization checks in Edge Functions
- [ ] Update CORS to restrict to your domain
- [ ] Test with non-admin users
- [ ] Test with users from different customers (multi-tenancy)
- [ ] Monitor Edge Function logs for errors
- [ ] Set up alerts for function failures

## 📝 Function URLs

After deployment, your functions will be available at:

- **User Management**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/user-management`
- **Auth Context**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/auth-context`
- **Admin Operations**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/admin-operations`

## 🐛 Troubleshooting

### Function not deploying
- Check that you're in the correct directory (`supabase`)
- Verify npx is available: `npx --version`
- Check for syntax errors in your TypeScript files

### Function returns 500 error
- Check the function logs: `npx supabase functions logs user-management`
- Verify environment variables are set correctly
- Test locally first with `npx supabase start`

### CORS errors
- Verify `corsHeaders` in `_shared/cors.ts`
- Make sure `handleCors` is called at the beginning of each function
- Check browser console for specific CORS error messages

### Authorization errors
- Verify the JWT token is being sent in the `Authorization` header
- Check that the token format is: `Bearer YOUR_TOKEN`
- Verify the user exists in the `auth.users` table

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Deploy Docs](https://deno.com/deploy/docs)
- [Edge Functions Examples](https://github.com/supabase/supabase/tree/master/examples/edge-functions)

