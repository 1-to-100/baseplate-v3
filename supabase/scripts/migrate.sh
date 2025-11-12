#!/bin/bash

# Supabase Migration Script
# This script helps apply migrations to different environments

set -e

ENVIRONMENT=${1:-staging}
DRY_RUN=${2:-false}

echo "🚀 Applying Supabase migrations to $ENVIRONMENT..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f "supabase/.env" ]; then
    echo "❌ supabase/.env file not found. Please run setup.sh first."
    exit 1
fi

# Source environment variables
source supabase/.env

# Set project ref based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    PROJECT_REF=$SUPABASE_PROD_PROJECT_REF
    echo "🏭 Targeting PRODUCTION environment"
elif [ "$ENVIRONMENT" = "staging" ]; then
    PROJECT_REF=$SUPABASE_STAGING_PROJECT_REF
    echo "🧪 Targeting STAGING environment"
else
    PROJECT_REF=$SUPABASE_PROJECT_REF
    echo "🔧 Targeting DEFAULT environment"
fi

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference not found for environment: $ENVIRONMENT"
    echo "   Please set SUPABASE_PROJECT_REF in supabase/.env"
    exit 1
fi

echo "📋 Project Reference: $PROJECT_REF"

# Link to the appropriate project
echo "🔗 Linking to project..."
supabase link --project-ref $PROJECT_REF

# Check migration status
echo "📊 Checking migration status..."
supabase db remote status

# Dry run first
if [ "$DRY_RUN" = "true" ]; then
    echo "🔍 Running dry run..."
    supabase db push --dry-run
    echo "✅ Dry run completed. No changes were applied."
    exit 0
fi

# Ask for confirmation
echo ""
echo "⚠️  You are about to apply migrations to: $ENVIRONMENT"
echo "   Project: $PROJECT_REF"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

# Apply migrations
echo "🔄 Applying migrations..."
supabase db push

# Check status after migration
echo "📊 Final migration status..."
supabase db remote status

# Generate types
echo "📝 Generating TypeScript types..."
supabase gen types typescript --linked > supabase/types/supabase.ts

echo ""
echo "🎉 Migrations applied successfully to $ENVIRONMENT!"
echo "📝 TypeScript types updated in supabase/types/supabase.ts"
