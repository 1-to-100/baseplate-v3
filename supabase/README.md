# Supabase

Database, authentication, and Edge Functions for the application.

## Structure

```
supabase/
├── functions/       # Edge Functions (user management, auth context, admin ops)
├── migrations/      # Database schema
├── scripts/         # Deployment & setup scripts
├── types/           # Generated TypeScript types
└── config.toml      # Supabase configuration
```

## Setup

```bash
# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply database schema
npx supabase db push

# Create admin user
npm install && npm run bootstrap

# Deploy Edge Functions
./scripts/deploy-functions.sh
```

## Environment Variables

Create `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# For segments-ai edge function (AI-powered segment generation)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL_SEGMENT=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
```

Get `SUPABASE_URL` from: **Supabase -> Project Settings**
Get `SUPABASE_SERVICE_ROLE_KEY` from: **Supabase -> Project Settings → API Keys -> Legacy anon, service_role API keys**
Get `OPENAI_API_KEY` from: **[OpenAI Platform](https://platform.openai.com/api-keys) -> API Keys**

### Setting Edge Function Secrets

For deployed Edge Functions, set secrets using the Supabase CLI:

```bash
# Set OpenAI API key for segments-ai function
npx supabase secrets set OPENAI_API_KEY=your_openai_api_key

# Optionally set the model (defaults to gpt-4o-mini)
npx supabase secrets set OPENAI_MODEL_SEGMENT=gpt-4o-mini
```

## Common Commands

```bash
# Deploy functions
./scripts/deploy-functions.sh

# View logs
npx supabase functions logs user-management

# Generate types
npx supabase gen types typescript --linked > types/supabase.ts

# Test locally
npx supabase start
./scripts/test-functions.sh
```

## Edge Functions

- **user-management** - User invitations, banning, privileged operations
- **auth-context** - JWT context for customer switching & impersonation
- **admin-operations** - System admin operations
- **segments-ai** - AI-powered segment generation from natural language descriptions (requires `OPENAI_API_KEY`)
- **segments-create** - Create new segments with filters
- **segments-process** - Background processing for segment company search
- **segments-search** - Search companies by segment filters

## Security

- All tables have Row Level Security (RLS) enabled
- Users can only access their own customer's data
- Edge Functions use JWT validation & role-based authorization
- Service role key only used server-side (Edge Functions)
- Anon key used client-side (frontend)

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
