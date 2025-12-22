# Create Persona Edge Function

This Supabase Edge Function generates comprehensive buyer personas using OpenAI and the Vercel AI SDK. It combines company context with a job description to create detailed, actionable personas.

## Features

- 🤖 **AI-Powered Generation**: Uses OpenAI GPT-4 to generate realistic, detailed personas
- 🔒 **Secure**: Authenticates users and enforces customer isolation
- 📊 **Structured Output**: Uses Zod schemas to ensure consistent, typed responses
- 🏢 **Context-Aware**: Incorporates company information for relevant personas
- ✅ **Type-Safe**: Full TypeScript support with proper error handling

## Prerequisites

### Environment Variables

Set these in your Supabase project (Settings → Edge Functions → Secrets):

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### Deploy the Function

```bash
supabase functions deploy create-persona --no-verify-jwt
```

Note: `--no-verify-jwt` is used if you're handling auth via the Authorization header manually. Remove this flag if you want Supabase to handle JWT verification automatically.

## Usage

### From Client (TypeScript/JavaScript)

```typescript
import { createPersonaWithAI } from '@/lib/api/create-persona-edge';

// Simple usage
const result = await createPersonaWithAI({
  name: 'Chief Marketing Officer',
  description: 'Senior executive responsible for marketing strategy, brand positioning, and growth'
});

console.log('Created persona ID:', result.persona_id);
```

### With React Query

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPersonaWithAI } from '@/lib/api/create-persona-edge';

function CreatePersonaForm() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: createPersonaWithAI,
    onSuccess: (data) => {
      toast.success('Persona created successfully!');
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
    onError: (error) => {
      toast.error(`Failed to create persona: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name: 'Chief Marketing Officer',
      description: 'Senior executive responsible for marketing strategy'
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create Persona'}
      </button>
    </form>
  );
}
```

### Direct HTTP Request

```bash
curl -i --location --request POST \
  'https://your-project.supabase.co/functions/v1/create-persona' \
  --header 'Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Chief Marketing Officer",
    "description": "Senior executive responsible for marketing strategy"
  }'
```

## Request Format

```typescript
interface CreatePersonaRequest {
  name: string;           // Persona name (e.g., "Chief Marketing Officer")
  description: string;    // Brief job description for context
}
```

## Response Format

### Success Response (200)

```typescript
interface CreatePersonaResponse {
  success: true;
  persona_id: string;     // UUID of the created persona
  persona: Persona;       // Full persona object
}
```

### Error Response (400/500)

```typescript
interface ErrorResponse {
  error: string;          // Error message
}
```

## Generated Persona Fields

The AI generates the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Persona name |
| `titles` | string | Comma-separated job titles and variations |
| `department` | string | Department name |
| `job_responsibilities` | string | Markdown list of role responsibilities |
| `is_manager` | boolean | Whether the role manages others |
| `experience_years` | string | Years of experience |
| `pain_points_html` | string | Markdown list of general job challenges |
| `goals_html` | string | Markdown list of general job goals |
| `solution_relevant_pain_points_html` | string | Markdown list of challenges your solution addresses |
| `solution_relevant_goals_html` | string | Markdown list of goals your solution helps achieve |
| `current_solutions_html` | string | Markdown list of current tools and processes |
| `switching_costs_html` | string | Markdown list of switching costs |
| `unsatisfied_with_html` | string | Markdown list of current solution problems |
| `ideal_outcome_html` | string | Markdown list of desired outcomes |
| `buying_behavior` | string | Markdown list of purchasing habits |
| `digital_savviness` | enum | Level of digital expertise |
| `is_decider` | boolean | Whether the role makes purchasing decisions |

## How It Works

1. **Authentication**: Verifies the user's JWT token
2. **Context Gathering**: 
   - Retrieves the user's customer_id
   - Fetches company information for context
3. **AI Generation**: 
   - Builds a comprehensive prompt with company and job context
   - Uses OpenAI GPT-4 with structured output (Zod schema)
   - Validates the response against the schema
4. **Database Storage**:
   - Converts AI response to database format
   - Inserts persona with proper customer_id and user associations
5. **Response**: Returns the created persona ID and full persona object

## Error Handling

The function handles various error scenarios:

- **401 Unauthorized**: Missing or invalid authorization header
- **400 Bad Request**: Missing required fields (name or description)
- **500 Internal Server Error**: 
  - Failed to get customer ID
  - Failed to generate persona with AI
  - Failed to save to database
  - Missing OPENAI_API_KEY

All errors return a JSON object with an `error` field containing a descriptive message.

## Security

- ✅ Authenticates all requests via Supabase JWT
- ✅ Enforces customer isolation (users can only create personas for their own customer)
- ✅ Uses RLS-compatible customer_id function
- ✅ Stores created_by and updated_by for audit trails
- ✅ CORS headers configured for cross-origin requests

## Local Development

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Set environment variables in `.env.local`:
   ```bash
   OPENAI_API_KEY=your_openai_api_key
   ```

3. Serve the function:
   ```bash
   supabase functions serve create-persona
   ```

4. Test the function:
   ```bash
   curl -i --location --request POST \
     'http://127.0.0.1:54321/functions/v1/create-persona' \
     --header 'Authorization: Bearer YOUR_LOCAL_JWT' \
     --header 'Content-Type: application/json' \
     --data '{
       "name": "Product Manager",
       "description": "Leads product strategy and development"
     }'
   ```

## Dependencies

- `@supabase/supabase-js` (v2): Supabase client
- `ai` (v3.4.33): Vercel AI SDK
- `@ai-sdk/openai` (v0.0.69): OpenAI provider for Vercel AI SDK
- `zod` (v3.23.8): Schema validation

These are automatically installed by Deno based on the `deno.json` import map.

## Monitoring

Check function logs in the Supabase Dashboard:
- Navigate to Edge Functions → create-persona → Logs
- Monitor for errors, performance, and invocation counts

## Cost Considerations

- Each invocation uses OpenAI API credits (GPT-4 structured output)
- Typical cost per persona generation: ~$0.02-0.05
- Consider implementing rate limiting for production use

## Troubleshooting

### "Missing authorization header"
Ensure you're passing the Authorization header with a valid Supabase JWT token.

### "Failed to get customer ID"
Check that the `customer_id()` RPC function exists in your database and the user has a valid customer association.

### "OPENAI_API_KEY environment variable not set"
Add the OpenAI API key to your Supabase project's edge function secrets.

### "Invalid response structure"
The AI occasionally returns unexpected formats. The function includes robust parsing and validation. If this persists, check the OpenAI API status.

## Version History

- **v1.0.0** (Current): Initial implementation with Vercel AI SDK and structured output

