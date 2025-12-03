
# 📘 Baseplate Documentation

This guide walks through setting up and running the **Baseplate**, a Next.js application with:

- **Next.js** frontend (App Router)
- **Supabase** for authentication, database, and Edge Functions
- Docker-based deployment

---

## ⚙️ Prerequisites

Ensure you have the following installed:

- Docker + Docker Compose
- Git
- Node.js (v22)
- pnpm
- Supabase CLI (for database migrations)
- NVM (optional, for managing Node versions)

---

## 🗂️ Project Structure

```
.
├── src/                # Next.js application source
│   ├── app/           # App Router pages and routes
│   ├── components/    # React components
│   ├── lib/           # Utilities and helpers
│   ├── hooks/         # React hooks
│   └── contexts/      # React contexts
├── supabase/          # Supabase configuration
│   ├── functions/     # Edge Functions
│   ├── migrations/    # Database migrations
│   └── scripts/       # Deployment scripts
├── testing/           # E2E tests (Playwright)
├── public/            # Static assets
├── Dockerfile         # Docker configuration
├── docker-compose.yml # Docker Compose config
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone repository and set environment variables

```bash
git clone https://github.com/1-to-100/baseplate-v3.git
cd baseplate-v3
```

Create a `.env` file in the root directory with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional: Auth providers
NEXT_PUBLIC_AUTH_STRATEGY=custom
AUTH0_SECRET=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...

# Optional: Other services
NEXT_PUBLIC_MAPBOX_API_KEY=...
NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID=...
```

### 2. Configure Supabase

This README assumes you have a Supabase project created. If not, create one first.

#### 🌐 Connect App Frameworks

1. Go to **Settings > Data API**
2. Copy the **Project URL** and set `NEXT_PUBLIC_SUPABASE_URL` in your `.env` file
3. Go to **Settings > API Keys**
4. Copy the **anon/public** key and set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your `.env` file

#### 🗄️ Database Migrations

Database schema and Row Level Security (RLS) policies are managed via Supabase migrations in `supabase/migrations/`.

**Prerequisites:**
```bash
# Install Supabase CLI
npm install -g supabase
# Note: Mac may require you to install this with Homebrew: brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

To apply migrations:
```bash
npx supabase db push
```

### 📦 Supabase Package Management

The `supabase/` directory contains scripts for managing migrations, Edge Functions, and admin setup:

```bash
cd supabase

# Push database migrations
npx supabase db push

# Deploy Edge Functions
./scripts/deploy-functions.sh

# Create default system administrator
npm install && npm run bootstrap
```

For detailed migration management, see `supabase/README.md`.

---

## 🔐 Setting up OAuth in Supabase

Supabase provides easy OAuth integration under **Authentication > Providers**.

### 🌐 Configure URL Settings

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

### ✅ Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to Projects -> Create a new project
   1. Go to project finder - as of this writing in the top navigation under organization name
   2. Create a new project using the “New Project” link
   3. Navigate to the project
4. Search for "Google Auth Platform"
5. Complete the wizard to setup the OAUth basics
6. Activate the “Create OAUth Client"
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
7. Copy your **Client Secret**.  Note this will be provided under the general application configuration screen in the upper right hand corner in an "i" surrounded by a blue circle.  Click on that and copy it
8. In Supabase:
   - Go to **Authentication > Providers > Google**
   - Paste Client ID and Secret, and enable the provider

[Supabase Doc](https://supabase.com/docs/guides/auth/social-login/auth-google)

### ✅ LinkedIn OAuth

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create an app
3. Under **Auth > Redirect URLs**, add:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
4. Copy **Client ID** and **Client Secret**
5. In Supabase:
   - Go to **Authentication > Providers > LinkedIn**
   - Paste credentials and enable the provider.  Note that Supabase refers to your LinkedIn ClientID as the API Key

[Supabase Doc](https://supabase.com/docs/guides/auth/social-login/auth-linkedin)

### ✅ Microsoft OAuth

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

---

## 🐳 Running with Docker

```bash
docker compose up
```

The application will be available at: http://localhost:3000

---

## 🧪 Running Without Docker

### 1. Install Node.js 22 using NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc  # or ~/.zshrc
nvm install 22
nvm use 22
```

### 2. Install pnpm

```bash
npm install -g pnpm
```

### 3. Install dependencies and start

```bash
pnpm install
pnpm dev
```

The application will be available at: http://localhost:3000

**Note:** Database migrations are managed via Supabase. See `supabase/README.md` for migration management.

---

## 🧪 Testing

E2E tests are located in the `testing/` directory using Playwright.

```bash
cd testing
npm install
npm test
```

---

## 📤 Custom SMTP for Supabase Emails

By default, Supabase sends transactional emails (e.g., sign-up confirmation, user invitations, password resets) using its built-in email service. If you prefer to use your own SMTP server (e.g., Gmail or a custom provider), you can enable and configure custom SMTP settings in your Supabase project.

### 🛠️ Steps to Enable Custom SMTP

#### 1. Log in to your Supabase organization  
- Open your project  

#### 2. Access SMTP Settings  
- From the left sidebar, go to:  
  **Authentication → Emails**  
  Or directly to: **SMTP Settings**

#### 3. Enable Custom SMTP  
- In the SMTP Settings section, toggle **Enable custom SMTP**

#### 4. Fill in the SMTP Configuration Fields

Example configuration for Gmail:

- **Sender Email**: The email address that will appear in the “From” field  
- **Sender Name**: The display name shown as the sender  
- **Host**: `smtp.gmail.com`  
- **Port**: `587`  
- **Minimum Interval Between Emails**: (optional, based on your rate limits)  
- **Username**: Your Gmail address or admin username  
- **Password**: An App Password (generated in the next step)  

---

### 🔑 Generating a Gmail App Password

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

---

## 👤 Setting Up a Super User Account

### Option 1: Manual Setup
1. Login to the app (with user/pass or federated login)
2. Logout - you should now have a record in the users table
3. Go to Supabase Dashboard
4. Navigate to: Database → Tables → Users → View In Table Editor
5. Find your user and set `role_id = 1` (System Administrator role)
6. Log back in to see full system management options

### System Roles
The application uses three system roles:
- **System Administrator** (role_id: 1) - Full system access
- **Customer Success** (role_id: 2) - Customer management access
- **Customer Administrator** (role_id: 3) - Customer-specific admin access
