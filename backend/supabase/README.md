# 🚀 Supabase Database Management

This directory contains all Supabase-related files for database schema management, migrations, and configuration.

## 📁 Directory Structure

```
backend/supabase/
├── README.md                    # This documentation
├── config.toml                  # Supabase CLI configuration
├── migrations/                  # Database migration files
│   └── 20241001000000_initial_schema.sql
├── functions/                   # Edge Functions (if any)
├── types/                       # Generated TypeScript types
│   └── supabase.ts
├── scripts/                     # Utility scripts
└── docs/                        # Additional documentation
```

## 🛠️ Prerequisites

### Required Software
- **Node.js** (v18 or higher)
- **Supabase CLI** (latest version)
- **PostgreSQL** (for local development, optional)

### Installation
```bash
# Install Supabase CLI globally
npm install -g @supabase/cli

# Or install locally in your project
npm install --save-dev supabase
```

## 🔧 Initial Setup

### 1. Get Supabase Access Token

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click on your profile icon (top right)
3. Navigate to **Account Settings** → **Access Tokens**
4. Generate a new access token or copy existing one
5. Save it securely (you'll need it for CLI authentication)

### 2. Authenticate Supabase CLI

```bash
# Login to Supabase
supabase login

# Paste your access token when prompted
```

### 3. Link to Your Cloud Project

```bash
# Navigate to backend directory
cd /Users/ruslanzhelezko/projects/huboxt/baseplate-v2/backend

# Link to your Supabase project
supabase link --project-ref your-project-ref

# You can find your project-ref in:
# - Supabase Dashboard URL: https://supabase.com/dashboard/project/{project-ref}
# - Project Settings → General → Reference ID
```

**Alternative - Interactive Linking:**
```bash
supabase link
# This will show a list of your projects to choose from
```

### 4. Verify Connection

```bash
# Check connection status
supabase db remote status

# Should show your linked project and migration status
```

## 📊 Database Migrations

### Understanding Migrations

Migrations are SQL files that define changes to your database schema. They are:
- **Version controlled** - Each migration has a unique timestamp
- **Sequential** - Applied in chronological order
- **Reversible** - Can be rolled back (with proper planning)
- **Idempotent** - Safe to run multiple times

### Migration File Naming Convention

```
YYYYMMDDHHMMSS_descriptive_name.sql

Examples:
20241001000000_initial_schema.sql
20241001120000_add_user_indexes.sql
20241001130000_enable_rls_policies.sql
```

### Creating New Migrations

```bash
# Create a new migration file
supabase migration new add_new_feature

# This creates: backend/supabase/migrations/YYYYMMDDHHMMSS_add_new_feature.sql
```

### Migration File Template

```sql
-- Migration: [Brief Description]
-- Created: YYYY-MM-DD
-- Author: [Your Name]
-- 
-- Description:
-- [Detailed description of what this migration does]
--
-- Dependencies:
-- - [List any dependencies on previous migrations]
--
-- Rollback:
-- [Instructions for manual rollback if needed]

-- ============================================================================
-- MIGRATION START
-- ============================================================================

-- [Your SQL here]

-- ============================================================================
-- MIGRATION END
-- ============================================================================
```

## 🚀 Applying Migrations

### Method 1: Apply to Cloud (Recommended)

```bash
# Dry run - see what will change without applying
supabase db push --dry-run

# Apply all pending migrations to cloud
supabase db push
```

### Method 2: Manual Application

If CLI doesn't work, you can apply migrations manually:

#### Via Supabase Dashboard
1. Go to **SQL Editor** in your Supabase Dashboard
2. Open your migration file
3. Copy the SQL content
4. Paste and execute in SQL Editor

#### Via Direct Database Connection
```bash
# Connect directly to your database
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Then run your migration file
\i backend/supabase/migrations/20241001000000_initial_schema.sql
```

### Method 3: Local Development (Optional)

```bash
# Start local Supabase instance
supabase start

# Apply migrations locally
supabase db reset

# Stop local instance
supabase stop
```

## 📋 Available Scripts

Add these scripts to your root `package.json`:

```json
{
  "scripts": {
    "supabase:login": "supabase login",
    "supabase:link": "supabase link",
    "supabase:status": "supabase db remote status",
    "supabase:push": "supabase db push",
    "supabase:push:dry-run": "supabase db push --dry-run",
    "supabase:pull": "supabase db pull",
    "supabase:diff": "supabase db diff",
    "supabase:types": "supabase gen types typescript --linked > backend/supabase/types/supabase.ts",
    "supabase:migration": "supabase migration new",
    "supabase:reset": "supabase db reset"
  }
}
```

## 🔄 Migration Workflow

### 1. Development Workflow

```bash
# 1. Create a new migration
npm run supabase:migration -- new add_user_preferences

# 2. Edit the migration file
# backend/supabase/migrations/YYYYMMDDHHMMSS_add_user_preferences.sql

# 3. Test locally (if you have local Supabase)
supabase start
supabase db reset  # This applies all migrations locally

# 4. Dry run to see what will change in cloud
npm run supabase:push:dry-run

# 5. Apply to cloud
npm run supabase:push

# 6. Verify the migration was applied
npm run supabase:status

# 7. Generate updated TypeScript types
npm run supabase:types
```

### 2. Team Collaboration Workflow

```bash
# 1. Pull latest changes from team
git pull origin main

# 2. Check if there are new migrations
supabase db remote status

# 3. Apply any new migrations
supabase db push

# 4. Generate updated types
npm run supabase:types
```

## 🛡️ Best Practices

### 1. Always Use Dry Run First
```bash
# See what will change without applying
supabase db push --dry-run
```

### 2. Backup Before Major Changes
```bash
# Create a backup in Supabase Dashboard
# Settings → Database → Database Backups → Create Backup

# Or using CLI (requires appropriate permissions)
pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" > backup.sql
```

### 3. Use Separate Environments
```bash
# Link to staging
supabase link --project-ref staging-project-ref

# Test migrations on staging
supabase db push

# Link to production
supabase link --project-ref production-project-ref

# Apply to production
supabase db push
```

### 4. Migration Guidelines

- **One logical change per migration** - Don't mix unrelated changes
- **Test locally first** - Use local Supabase for testing
- **Use descriptive names** - Make migration purpose clear
- **Include rollback instructions** - Document how to undo changes
- **Review with team** - Get approval for production migrations

## 🔐 Environment Management

### Environment Variables

Create `backend/supabase/.env` for local development:

```bash
# backend/supabase/.env
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_DB_PASSWORD=your-db-password
SUPABASE_ACCESS_TOKEN=your-access-token
```

**Important:** Add to `.gitignore`:
```
backend/supabase/.env
backend/supabase/.env.local
```

### Multiple Environments

For projects with multiple environments:

```bash
# Staging environment
supabase link --project-ref staging-project-ref

# Production environment  
supabase link --project-ref production-project-ref
```

## 🧪 Testing Migrations

### Database Tests

Create test files in `backend/supabase/tests/`:

```sql
-- backend/supabase/tests/rls-policies.test.sql
-- Test Row Level Security policies

BEGIN;

-- Test that users can only see their own data
SELECT plan(1);

-- Insert test data
INSERT INTO users (id, email, uid) VALUES (1, 'test@example.com', 'test-uid');

-- Test RLS policy
SELECT is(
  (SELECT COUNT(*) FROM users WHERE uid = 'test-uid'),
  1,
  'User should see their own data'
);

SELECT * FROM finish();
ROLLBACK;
```

### Running Tests

```bash
# Run database tests
supabase test db
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Migration Fails
```bash
# Check migration status
supabase db remote status

# View detailed error
supabase db push --debug

# Check database logs in Supabase Dashboard
```

#### 2. Connection Issues
```bash
# Re-authenticate
supabase logout
supabase login

# Re-link project
supabase unlink
supabase link --project-ref your-project-ref
```

#### 3. Type Generation Fails
```bash
# Ensure project is linked
supabase db remote status

# Generate types with explicit project
supabase gen types typescript --project-id your-project-ref > backend/supabase/types/supabase.ts
```

### Getting Help

- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **CLI Reference**: `supabase --help`
- **Community Discord**: [discord.supabase.com](https://discord.supabase.com)

## 📚 Additional Resources

### Useful Commands

```bash
# Check CLI version
supabase --version

# View all available commands
supabase --help

# Check project status
supabase status

# View migration history
supabase migration list

# Generate TypeScript types
supabase gen types typescript --linked

# Compare local vs remote schema
supabase db diff
```

### Configuration Files

- **config.toml**: Main Supabase configuration
- **.env**: Environment variables (local only)
- **migrations/**: SQL migration files
- **types/**: Generated TypeScript definitions

## 🔧 Making Table Changes

### Method 1: Using Supabase Migrations (Recommended)

This is the best practice for production applications as it provides version control and rollback capabilities.

#### Step 1: Create a New Migration
```bash
# From backend directory
cd backend/

# Create a new migration file
npm run supabase:migration -- new add_user_preferences

# This creates: supabase/migrations/YYYYMMDDHHMMSS_add_user_preferences.sql
```

#### Step 2: Edit the Migration File
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_user_preferences.sql

-- Migration: Add user preferences table
-- Created: 2024-10-01
-- Description: Adds a new user_preferences table to store user settings

-- ============================================================================
-- MIGRATION START
-- ============================================================================

-- Add a new column to existing table
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';

-- Create a new table
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION END
-- ============================================================================
```

#### Step 3: Apply the Migration
```bash
# Dry run first (see what will change)
npm run supabase:push:dry-run

# Apply the migration
npm run supabase:push

# Generate updated types
npm run supabase:types
```

### Common Table Modification Examples

#### Adding Columns
```sql
-- Add a single column
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Add multiple columns
ALTER TABLE users 
ADD COLUMN phone_verified BOOLEAN DEFAULT false,
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN last_activity_at TIMESTAMPTZ;
```

#### Modifying Existing Columns
```sql
-- Change column type
ALTER TABLE users ALTER COLUMN status TYPE VARCHAR(50);

-- Change default value
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'pending';

-- Make column nullable
ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;

-- Make column not nullable (ensure no nulls exist first)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

#### Adding Constraints
```sql
-- Add unique constraint
ALTER TABLE users ADD CONSTRAINT unique_phone UNIQUE (phone_number);

-- Add check constraint
ALTER TABLE users ADD CONSTRAINT check_age 
    CHECK (age >= 18 AND age <= 120);

-- Add foreign key constraint
ALTER TABLE articles ADD CONSTRAINT fk_articles_author 
    FOREIGN KEY (author_id) REFERENCES users(id);
```

#### Creating New Tables
```sql
-- Create a new table with relationships
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
```

#### Dropping Columns/Tables
```sql
-- Drop a column (be careful!)
ALTER TABLE users DROP COLUMN old_field;

-- Drop a table
DROP TABLE old_table_name;

-- Drop with cascade (removes dependent objects)
DROP TABLE old_table_name CASCADE;
```

### Complete Workflow Example

Let's say you want to add a `tags` system to your articles:

#### Step 1: Create Migration
```bash
cd backend/
npm run supabase:migration -- new add_article_tags_system
```

#### Step 2: Write Migration
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_article_tags_system.sql

-- Create tags table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create article_tags junction table
CREATE TABLE article_tags (
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (article_id, tag_id)
);

-- Add indexes
CREATE INDEX idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag_id ON article_tags(tag_id);
CREATE INDEX idx_tags_name ON tags(name);
```

#### Step 3: Apply Migration
```bash
# Dry run
npm run supabase:push:dry-run

# Apply
npm run supabase:push

# Update types
npm run supabase:types
```

#### Step 4: Use in Your Code
```typescript
import { Database } from '../supabase/types/supabase'

type Tag = Database['public']['Tables']['tags']['Row']
type ArticleTag = Database['public']['Tables']['article_tags']['Row']

@Injectable()
export class ArticlesService {
  async addTagToArticle(articleId: number, tagId: number) {
    // Your implementation with full type safety
  }
}
```

### Important Considerations

#### Breaking Changes
- **Column renames**: Use `ALTER TABLE ... RENAME COLUMN`
- **Type changes**: May require data conversion
- **Constraint changes**: Can fail if data violates new constraints

#### Data Migration
```sql
-- Example: Migrate data when changing column type
ALTER TABLE users ADD COLUMN new_status VARCHAR(20);
UPDATE users SET new_status = CASE 
    WHEN status = 'active' THEN 'active'
    WHEN status = 'inactive' THEN 'inactive'
    ELSE 'pending'
END;
ALTER TABLE users DROP COLUMN status;
ALTER TABLE users RENAME COLUMN new_status TO status;
```

#### Performance Considerations
- **Add indexes** for frequently queried columns
- **Consider partitioning** for large tables
- **Monitor query performance** after changes

## 🔄 Migration from Prisma

This project is migrating from Prisma to Supabase. Key differences:

| Aspect | Prisma | Supabase |
|--------|--------|----------|
| **Schema Definition** | Declarative (schema.prisma) | Imperative (SQL migrations) |
| **Field Naming** | camelCase | snake_case |
| **Migrations** | Auto-generated | Hand-written SQL |
| **Relationships** | Implicit via @relation | Explicit via FOREIGN KEY |
| **Enums** | Prisma enums | PostgreSQL enums |
| **Indexes** | @@index directive | CREATE INDEX statements |

### Migration Status

- ✅ **Initial Schema**: Created from Prisma schema
- 🔄 **Service Migration**: In progress (see `SUPABASE_MIGRATION.md`)
- ⏳ **Testing**: Pending
- ⏳ **Production Deployment**: Pending

---

## 📞 Support

For questions or issues with Supabase setup:

1. Check this documentation first
2. Review [Supabase Documentation](https://supabase.com/docs)
3. Ask in team chat or create an issue
4. Contact project maintainers

**Last Updated**: October 2024
**Version**: 1.0.0
