
# 📘 Baseplate Documentation

This guide walks through setting up and running the **Baseplate**, which consists of:

- A **Next.js frontend** (`frontend`)
- A **NestJS backend** (`backend`)
- **Supabase** for authentication, database, and storage
- Docker-based deployment

---

## ⚙️ Prerequisites

Ensure you have the following installed:

- Docker + Docker Compose
- Git
- Node.js (v22)
- pnpm (for frontend)
- Supabase CLI (for database migrations)
- NVM (optional, for managing Node versions)

---

## 🗂️ Project Structure

```
.
├── frontend/          # Next.js frontend
├── backend/      # NestJS backend
├── Dockerfile.app      # Dockerfile for frontend
├── Dockerfile.api      # Dockerfile for backend
├── docker-compose.yml  # Compose config
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone repository and set env variables

```bash
git clone https://github.com/1-to-100/baseplate-v2.git

mv basplate-v2 [your_project_name]

cd baseplate/frontend

cp .env.template .env

cd ../backend

cp .env.template .env
```

### 2. Configure Supabase

This README assumes that you have setup a Supabase tenant and have a Supabase project created.
If you haven't go do that first.  Then:


#### 🌐 Connect App Frameworks

1. Go to **Settings > Data API**
2. Copy the **Project URL**:
   - Replace the value of the `SUPABASE_URL` key in `.env` for backend
   - Replace the value of the `NEXT_PUBLIC_SUPABASE_URL` key in `.env` for frontend
3. Go to **Settings > API Keys**
4. Copy the **Legacy API Keys**:
   - **anon/public**: Replace the value of the `NEXT_PUBLIC_SUPABASE_ANON_KEY` key in `.env` for frontend
   - **service_role/secret**: Replace the value of the `SUPABASE_SERVICE_ROLE_KEY` key in `.env` for backend

#### 🔑 JWT Secret

1. Go to **Settings > JWT Keys**
2. In the **Legacy JWT Secret** tab, click **Reveal** to show the JWT secret
3. Copy the revealed JWT secret and replace the value of your `SUPABASE_JWT_SECRET` key in `.env` for backend

#### 👤 Default System Administrator

On first startup, the application automatically creates a default System Administrator account:

**Email:** `admin@system.local`  
**Password:** `Admin@123456`

**⚠️ CRITICAL:** Change this password immediately after first login.

To disable auto-creation in production:
```bash
DISABLE_BOOTSTRAP_ADMIN=true
```

#### 🗄️ Database Migrations

Database schema and Row Level Security (RLS) policies are managed via Supabase migrations in `backend/supabase/migrations/`.

**Prerequisites:**
```bash
# Install Supabase CLI
npm install -g supabase
# Note: Mac may require you to install this with Homebrew: brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your project (from backend directory)
cd backend
supabase link --project-ref your-project-ref
```

To apply migrations manually:
```bash
cd backend
npm run supabase:push
```

For detailed migration management, see `backend/supabase/README.md`.

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
2. Create a new project
   1. Go to project finder - as of this writing in the top navigation under organization name
   2. Create a new project using the “New Project” link
   3. Navigate to the project
4. Complete the wizard to setup the OAUth basics
5. Activate the “Create OAUth Client"
   1. Select Web Application for application type
   2. Hit Add URI for your authorized redirect URIs - you can get this from Supabase under Project Settings -> Authentication -> Google -> Callback URL (for OAuth)
   3. Note that if you’re running this in testing mode, please do, you’ll need to go to “Audience” in your application and add a Test User for the application
4. Navigate to **APIs & Services > Credentials**
5. Create **OAuth 2.0 Client ID**:
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

Services will be available at:

- Frontend: http://localhost:3000  
- Backend API: http://localhost:3001

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

### 3. Start Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

### 4. Start Backend

```bash
cd backend
npm install
npm run start:dev // npm run start:dev:env - alternative start command (as start:dev doesn't work on some devices)
```

**Note:** Database migrations are managed via Supabase. See `backend/supabase/README.md` for migration management.

---

## 🌱 Data Seeding & Cleanup

### Docker
```bash
# Seed test data
docker compose exec backend npm run docker:seed

# Cleanup test data
docker compose exec backend npm run docker:cleanup
```

### Non-Docker
```bash
# Seed test data
cd backend
npm run cli:seed

# Cleanup test data
cd backend
npm run cli:cleanup
```

---

## 📘 API Documentation

The backend provides Swagger documentation.

After running the backend:

- Access Swagger UI at: http://localhost:3001/api

To rebuild the docs:

```bash
cd backend
npm run build
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

## Setup a super user account for yourself

### Option 1: Automatic Bootstrap
On first startup, the application automatically creates a default System Administrator account:
- Email: `admin@system.local`
- Password: `Admin@123456`
- **⚠️ IMPORTANT:** Change this password immediately after first login

### Option 2: Manual Setup
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
