# Edge Functions - Deployment Summary

## ✅ What's Ready

Your Edge Functions are fully configured and ready to deploy! Here's what we have:

### 📦 Edge Functions Created
1. **user-management** - Handles user invitations, banning, and privileged user operations
2. **auth-context** - Manages JWT context for customer switching and impersonation
3. **admin-operations** - System admin operations (customer creation, etc.)

### 🛠️ Shared Utilities
All functions share common utilities in `_shared/`:
- **cors.ts** - CORS headers and preflight handling
- **supabase.ts** - Supabase client creation (service role & authenticated)
- **auth.ts** - Authentication and authorization helpers
- **errors.ts** - Error handling and response formatting
- **types.ts** - TypeScript interfaces

### 📋 Helper Scripts
- **deploy-functions.sh** - Deploy all functions at once
- **test-functions.sh** - Test functions locally before deployment

### 📖 Documentation
- **EDGE_FUNCTIONS_DEPLOYMENT.md** - Complete deployment guide
- **DEPLOYMENT_QUICKSTART.md** - Quick reference commands

## 🚀 Deployment Steps

### Step 1: Prerequisites
```bash
# Make sure Node.js (which includes npx) is installed
node --version
npx --version

# npx comes with Node.js, so no separate installation needed
```

### Step 2: Link Your Project
```bash
cd supabase
npx supabase link --project-ref YOUR_PROJECT_REF
```

**Get your project ref from:** Supabase Dashboard → Settings → General → Project Reference ID

### Step 3: Test Locally (Recommended)
```bash
# Start local Supabase
npx supabase start

# Run tests
./scripts/test-functions.sh
```

### Step 4: Deploy to Production
```bash
# Easy way
./scripts/deploy-functions.sh

# Or manually
npx supabase functions deploy user-management auth-context admin-operations
```

### Step 5: Verify Deployment
```bash
# Check function status
npx supabase functions list

# View logs
npx supabase functions logs user-management
```

## 🔧 Configuration

### Environment Variables
These are automatically available in your Edge Functions:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (full access)

### CORS Configuration
Current setting: Allows all origins (`*`)

**For production**, update `_shared/cors.ts`:
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
}
```

## 📍 Function URLs

After deployment, update your frontend to use these URLs:

### Production
```typescript
// frontend/src/lib/supabase/edge-functions.ts
const EDGE_FUNCTION_URL = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1'
```

### Local Development
```typescript
const EDGE_FUNCTION_URL = 'http://localhost:54321/functions/v1'
```

## 🧪 Testing

### Test User Management
```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/user-management' \
  --header 'Authorization: Bearer YOUR_USER_JWT' \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "invite",
    "email": "newuser@example.com",
    "customerId": "customer-uuid",
    "roleId": "role-uuid"
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "User invited successfully",
  "userId": "uuid"
}
```

## 🔒 Security Checklist

Before going to production:

- [ ] Test all Edge Functions locally
- [ ] Verify RLS policies are active on all tables
- [ ] Update CORS to restrict to your domain only
- [ ] Test authorization checks (system admin, customer admin)
- [ ] Test multi-tenancy (users can't access other customers' data)
- [ ] Set up monitoring/alerts for function failures
- [ ] Test error scenarios (invalid tokens, missing data, etc.)
- [ ] Review and test all user roles and permissions

## 📊 Monitoring

### View Logs
```bash
# Real-time logs
npx supabase functions logs user-management --follow

# Recent logs
npx supabase functions logs user-management

# All functions
npx supabase functions logs user-management auth-context admin-operations
```

### Key Metrics to Monitor
- Function invocation count
- Error rate
- Response time
- Authorization failures

## 🐛 Common Issues & Solutions

### Issue: "Function not found"
**Solution:** Make sure function is deployed: `npx supabase functions list`

### Issue: "Missing authorization header"
**Solution:** Ensure JWT token is passed: `Authorization: Bearer YOUR_TOKEN`

### Issue: "Invalid or expired token"
**Solution:** Get a fresh token from Supabase auth

### Issue: CORS errors in browser
**Solution:** Verify `corsHeaders` includes your frontend domain

### Issue: RLS policy violations
**Solution:** Check RLS policies allow the operation for the user's role

## 🎯 Next Steps

After successful deployment:

1. **Update Frontend Config**
   - Update Edge Function URLs in `edge-functions.ts`
   - Test all frontend flows (user invite, auth context, etc.)

2. **Testing Phase**
   - Test all user flows end-to-end
   - Test with different user roles
   - Test multi-tenancy isolation
   - Performance testing

3. **Backend Deprecation**
   - Monitor for errors
   - Gradually route traffic away from old backend
   - Remove old backend code when confident

## 📚 Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Deploy](https://deno.com/deploy/docs)
- [Our Migration Plan](../../MIGRATION_PLAN.md)
- [Deployment Guide](./EDGE_FUNCTIONS_DEPLOYMENT.md)
- [Quick Reference](./DEPLOYMENT_QUICKSTART.md)

---

**Need Help?** 
- Check logs: `npx supabase functions logs FUNCTION_NAME`
- Full guide: `EDGE_FUNCTIONS_DEPLOYMENT.md`
- Supabase Discord: https://discord.supabase.com

