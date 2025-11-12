# Edge Functions - Quick Deployment Reference

## 🚀 Quick Start Commands

### 1. Link to Your Supabase Project (First Time Only)
```bash
cd supabase
npx supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Deploy All Functions
```bash
# Easy way - use the deployment script
./scripts/deploy-functions.sh

# Or manually
npx supabase functions deploy user-management auth-context admin-operations
```

### 3. Test Functions Locally (Before Deploying)
```bash
# Start local Supabase
npx supabase start

# Run tests
./scripts/test-functions.sh
```

### 4. View Logs
```bash
# View recent logs
npx supabase functions logs user-management

# Follow logs in real-time
npx supabase functions logs user-management --follow
```

### 5. Update After Code Changes
```bash
# Just redeploy
npx supabase functions deploy user-management

# Or redeploy all
./scripts/deploy-functions.sh
```

## 📍 Your Edge Function URLs

After deployment, your functions will be at:

```
Production:
https://YOUR_PROJECT_REF.supabase.co/functions/v1/user-management
https://YOUR_PROJECT_REF.supabase.co/functions/v1/auth-context
https://YOUR_PROJECT_REF.supabase.co/functions/v1/admin-operations

Local Development:
http://localhost:54321/functions/v1/user-management
http://localhost:54321/functions/v1/auth-context
http://localhost:54321/functions/v1/admin-operations
```

## 🔧 Common Tasks

### Check Function Status
```bash
npx supabase functions list
```

### Delete a Function
```bash
npx supabase functions delete user-management
```

### View Environment Variables
```bash
npx supabase secrets list
```

### Set Environment Variables
```bash
npx supabase secrets set MY_SECRET=value
```

## 🧪 Quick Manual Test

### Test User Management (Invite User)
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

### Test Auth Context (Switch Customer)
```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auth-context' \
  --header 'Authorization: Bearer YOUR_USER_JWT' \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "refresh",
    "customerId": "customer-uuid"
  }'
```

## ⚠️ Important Notes

1. **Authentication Required**: All Edge Functions require a valid JWT token in the `Authorization` header
2. **CORS**: Already configured, but update for production in `_shared/cors.ts`
3. **RLS**: Ensure your RLS policies are active before deploying
4. **Environment**: Supabase automatically injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`

## 🐛 Troubleshooting

**Functions not working?**
1. Check logs: `npx supabase functions logs FUNCTION_NAME`
2. Test locally first: `npx supabase start` then `./scripts/test-functions.sh`
3. Verify your JWT token is valid
4. Check RLS policies on your tables

**Deployment fails?**
1. Make sure you have npx available (comes with Node.js)
2. Verify you're linked: `npx supabase status`
3. Check for TypeScript errors in your functions

**Need help?**
- Full deployment guide: `EDGE_FUNCTIONS_DEPLOYMENT.md`
- Supabase docs: https://supabase.com/docs/guides/functions

