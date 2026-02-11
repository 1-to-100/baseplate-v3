# Baseplate V3

This guide walks through setting up and running the **Baseplate**, a Next.js application with:

- **Next.js** frontend (App Router)
- **Supabase** for authentication, database, and Edge Functions
- Docker-based deployment

## :file_folder: Project Structure

```
.
├── src/               # Next.js application source
│   ├── app/           # App Router pages and routes
│   ├── components/    # React components
│   ├── lib/           # Utilities and helpers
│   ├── hooks/         # React hooks
│   ├── contexts/      # React contexts
│   ├── styles/        # Global styles and theme
│   ├── types/         # TypeScript type definitions
│   ├── stories/       # Storybook stories
│   ├── config.ts      # Application configuration
│   ├── middleware.ts  # Next.js middleware
│   └── paths.ts       # Path constants
├── supabase/          # Supabase configuration
│   ├── functions/     # Edge Functions
│   ├── migrations/    # Database migrations
│   ├── scripts/       # Deployment and setup scripts
│   ├── types/         # Generated Supabase types
│   └── config.toml    # Supabase configuration
├── testing/           # E2E tests (Playwright)
│   ├── src/           # Test source files
│   └── playwright.config.ts
├── public/            # Static assets
├── Dockerfile         # Docker configuration
├── docker-compose.yml # Docker Compose config
├── next.config.ts     # Next.js configuration
├── tsconfig.json      # TypeScript configuration
├── eslint.config.mjs  # ESLint configuration
├── commitlint.config.ts

```

## :rocket: Getting Started

### Prerequisites

Ensure you have the following installed:

- Docker + Docker Compose
- Git
- Node.js (v22)
- pnpm
- Supabase CLI (2.67.1 or higher)
- NVM (optional, for managing Node versions)

### Clone repository

```bash
git clone https://github.com/1-to-100/baseplate-v3.git
cd baseplate-v3
```

### :gear: Configure Supabase

This README assumes you have a Supabase project created. If not, create one first.

Open Supabase and copy the following values from your project for setting the following environment variables:

1. Go to **Project Settings**
2. Copy the **Project ID** key and set `NEXT_PUBLIC_SUPABASE_URL` in your `.env` file
3. Go to **Project Settings > API Keys > Legacy anon, service_role API keys**
4. Copy the **anon public** and set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your `.env` file

**Note**: If you're running Supabase locally, you can get these values from the Supabase CLI:

```bash
supabase start
supabase status
```

### Set environment variables

Next.js uses dotenv to load environment variables. You can use multiple .env files to load variables for different environments as detailed in the [NextJS load order docs](https://nextjs.org/docs/pages/guides/environment-variables#environment-variable-load-order).

It's recommended to use multiple `.env` files if you want to switch between running the app against a local Supabase project and a remote Supabase project for production:

- `.env.development` should be used for local development and will be automatically loaded when running locally based on `NODE_ENV` defaulting to `development`
- `.env.production` should be used for connecting to a remote Supabase project and can be loaded by setting `NODE_ENV=production` when running the app

Copy `.env.template` to create env files in the root directory with the variables you need.

### Platform vs Application Repos

Baseplate follows a **platform/application repo** model. The platform repo contains core functionality and feature source code. Application repos are created from the platform and include the generated artifacts needed to run a specific set of features.

Feature-specific files (migration symlinks, edge function wrappers) are **generated** by scripts and use a **double-underscore naming convention** (`__feature-slug__`) to distinguish them from core files:

| Artifact           | Core                           | Feature (generated)                            |
| ------------------ | ------------------------------ | ---------------------------------------------- |
| Migrations         | `20260115182857_add_users.sql` | `20260206135642__style-guide__0001_create.sql` |
| Edge Functions     | `user-management/index.ts`     | `extract-logos/index.ts` (2-line wrapper)      |
| Processor Registry | —                              | `_shared/response-processors/registry.ts`      |

**In the platform repo (baseplate)**, these generated files must not be committed — the source of truth lives in `src/app/(scalekit)/<feature>/lib/sql/` and `src/app/(scalekit)/<feature>/lib/edge/`. A CI check (`check-feature-artifacts`) enforces this on pull requests.

**In application repos**, these files **should** be committed because they are required for Supabase to discover and deploy migrations and edge functions. Application repos set the GitHub repository variable `APPLICATION_REPO=true`, which skips the CI check.

### 🗄️ Database Migrations

Database schema and Row Level Security (RLS) policies are managed via Supabase migrations in `supabase/migrations/`. Scalekit features and application features have their own migrations under `src/app/(scalekit)/<feature-name>/lib/sql/` and `src/app/<feature-name>/lib/sql/`, respectively.

Running the migrations is handled by the Supabase CLI, and it's only neccessary to run them against your remote production Supabase database when you have added new migrations. Migrations are automatically applied to local Supabase instances when you start Supabase locally with `supabase start`.

**Prerequisites:**

```bash
# Either install the Supabase CLI and use the CLI directly (recommended)
brew install supabase/tap/supabase
supabase ...

# or use npx to run all Supabase CLI commands, for example
npx supabase ...
```

Login to Supabase and link to your project:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase projects list
supabase link --project-ref project-reference-id
```

#### Linking and applying migrations

There are core database migrations that come from the Baseplate application that exist under `supabase/migrations/`. There are also feature-specific migrations that can live in either `src/app/(scalekit)/<name>/lib/sql/migrations/` or `src/app/(features)/<name>/lib/sql/migrations/`.

Each feature will have an initial `0001_create.sql` migration for initial table creation, and a `0002_rls.sql` migration for RLS policies. Changes to tables or new migrations should follow the same pattern, e.g. `0003_add_x_column.sql`.

There is a script to link all the feature migrations into the `supabase/migrations/` directory so Supabase can see them and apply them, and a lockfile is maintained to track already linked migrations. Feature migration symlinks use the double-underscore naming convention (e.g. `20260206135642__style-guide__0001_create.sql`). In the platform repo (baseplate) these symlinks should not be committed — they are for local development only. In application repos they should be committed as they are required for Supabase to discover and apply them. See [Platform vs Application Repos](#platform-vs-application-repos) for details.

If you need to re-run the script for new migrations, you can do so with:

```bash
# Dry run to see any changes that would be made
pnpm supabase:link-migrations --dry-run

# Link the migrations
pnpm supabase:link-migrations
```

Applying migrations:

```bash
# Apply migrations to a local Supabase instance (migrations are auto applied locally on start)
supabase migrations up

# Apply new migrations to a remote Supabase instance
# Run with caution, as this applies migrations to the linked Production database
supabase db push --dry-run
supabase db push
```

### Supabase Edge Functions

Core Supabase Edge Functions for the Baseplate application exist by default under `supabase/functions/`.
Scalekit features have their own edge functions under the app src tree at `src/app/(scalekit)/<name>/lib/edge/`.
Application features have their own edge functions under the app src tree at `src/app/(features)/<name>/lib/edge/`.

There is a script to wrap all feature Edge Functions into the `supabase/functions/` directory. This allows the Supabase CLI to deploy remotely and serve them locally, and also allows feature specific functions to use shared libraries. The same script also auto-generates the **response processor registry** (`supabase/functions/_shared/response-processors/registry.ts`) by discovering `response-processor.ts` files alongside edge functions. In the platform repo (baseplate) these generated files should not be committed — they are for local development only. In application repos they should be committed. See [Platform vs Application Repos](#platform-vs-application-repos) for details.

```bash
# Dry run to see any changes that would be made
pnpm supabase:wrap-functions --dry-run

# Wrap the edge functions and generate the processor registry
pnpm supabase:wrap-functions
```

#### Response Processors

Edge functions that need post-processing of LLM output can provide a response processor. Place a `response-processor.ts` file with a **default export** next to the edge function's `index.ts`:

```
src/app/(scalekit)/<feature>/lib/edge/<function-name>/
  index.ts                 # Edge function (Deno.serve)
  response-processor.ts    # Default-exported ResponseProcessor function
  schema.ts                # Validation schema
```

When `pnpm supabase:wrap-functions` runs, any `response-processor.ts` found in a `lib/edge/` path is automatically registered in the generated registry under the parent directory name as the slug (e.g. `extract-colors`). The LLM worker uses this registry to run the appropriate processor after a job completes.

#### Deploying Edge Functions

Due to edge functions existing in the app src tree, these commands need run from the _root_ of the project, and _not_ the Supabase directory.

```bash
# Serve edge functions locally
supabase functions serve --workdir . --env-file .env.development

# Deploy all edge functions to a remote Supabase instance
supabase functions deploy --workdir .

# Deploy a single edge function
supabase functions deploy <function-name> --workdir .
```

## :computer: Running the Application

With Docker:

```bash
docker compose up
```

Without Docker:

```bash
npm install -g pnpm
pnpm install
pnpm dev
```

The application will be available at: http://localhost:3000/

## :test_tube: Testing

E2E tests are located in the `testing/` directory using Playwright.

```bash
cd testing
npm install
npm test
```

## :lock: Configuring OAuth Providers in Supabase

Supabase provides easy OAuth integration under **Authentication > Providers**.

### :globe_with_meridians: Configure URL Settings

Before setting up OAuth providers, you need to configure your site URL and redirect URLs:

1. Go to **Authentication > URL Configuration**
2. Set your **Site URL**:
   - For local development: `http://localhost:3000`
   - For production: `https://yourdomain.com`
3. Add **Redirect URLs**:
   - For local development: `http://localhost:3000/**`
   - For production: `https://yourdomain.com/**`
4. Click **Save changes**

> **Important**: These URLs must match your application's domain and the redirect URLs you'll configure in your OAuth providers.

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to Projects -> Create a new project
   1. Go to project finder - as of this writing in the top navigation under organization name
   2. Create a new project using the “New Project” link
   3. Navigate to the project
3. Search for "Google Auth Platform"
4. Complete the wizard to setup the OAUth basics
5. Activate the “Create OAUth Client"
   1. Select Web Application for application type
   2. Hit Add URI for your authorized redirect URIs - you can get this from Supabase under Project Settings -> Authentication -> Google -> Callback URL (for OAuth)
   3. Note that if you’re running this in testing mode, please do, you’ll need to go to “Audience” in your application and add a Test User for the application
      4.IN Google Cloud Console navigate to **APIs & Services > Credentials -> OAuth 2.0 Client ID**:
   - Validate your app is present
     - App Type: **Web**
     - Authorized Redirect URI:
       ```
       https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
       ```
6. Copy **Client ID**
7. Copy your **Client Secret**. Note this will be provided under the general application configuration screen in the upper right hand corner in an "i" surrounded by a blue circle. Click on that and copy it
8. In Supabase:
   - Go to **Authentication > Providers > Google**
   - Paste Client ID and Secret, and enable the provider

[Supabase Doc](https://supabase.com/docs/guides/auth/social-login/auth-google)

### LinkedIn OAuth

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create an app
3. Under **Auth > Redirect URLs**, add:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
4. Copy **Client ID** and **Client Secret**
5. In Supabase:
   - Go to **Authentication > Providers > LinkedIn**
   - Paste credentials and enable the provider. Note that Supabase refers to your LinkedIn ClientID as the API Key

[Supabase Doc](https://supabase.com/docs/guides/auth/social-login/auth-linkedin)

### Microsoft OAuth

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory > App Registrations**
3. Register a new app:
   - Redirect URI:
     ```
     https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
     ```
4. After registration, go to **Certificates & Secrets** to create a new secret
5. Copy **Application (client) ID** and secret
6. In Supabase:
   - Go to **Authentication > Providers > Microsoft**
   - Paste credentials and enable the provider

[Supabase Doc](https://supabase.com/docs/guides/auth/social-login/auth-azure)

## :email: Configuring Custom SMTP for Supabase Emails

By default, Supabase sends transactional emails (e.g., sign-up confirmation, user invitations, password resets) using its built-in email service. If you prefer to use your own SMTP server (e.g., Gmail or a custom provider), you can enable and configure custom SMTP settings in your Supabase project.

1. Log in to your Supabase organization and open your project

1. From the left sidebar, go to:  
   **Authentication → Emails**  
   Or directly to: **SMTP Settings**

1. In the SMTP Settings section, toggle **Enable custom SMTP**

Example configuration for Gmail:

- **Sender Email**: The email address that will appear in the “From” field
- **Sender Name**: The display name shown as the sender
- **Host**: `smtp.gmail.com`
- **Port**: `587`
- **Minimum Interval Between Emails**: (optional, based on your rate limits)
- **Username**: Your Gmail address or admin username
- **Password**: An App Password (generated in the next step)

#### Generating a Gmail App Password

To authenticate with Gmail’s SMTP, you need to create an App Password:

1. Go to your Google Account Security Settings:  
   [https://myaccount.google.com/security](https://myaccount.google.com/security)

2. Open the **App Passwords** section
3. Generate a new App Password:
   - Select the app (or choose "Other" and enter a custom name)
   - Click **Create**
   - Copy the 16-character password provided
   - Paste this password into the **Password** field in your Supabase SMTP settings

Once saved, all transactional emails from Supabase will be sent using your configured SMTP server and custom domain.
