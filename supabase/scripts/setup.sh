#!/bin/bash

# Supabase Setup Script
# This script helps set up Supabase for the project

set -e

echo "🚀 Setting up Supabase for Baseplate v2..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Installing..."
    npm install -g @supabase/cli
    echo "✅ Supabase CLI installed successfully"
else
    echo "✅ Supabase CLI is already installed"
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

# Initialize Supabase if not already done
if [ ! -d "supabase/migrations" ]; then
    echo "📁 Initializing Supabase..."
    supabase init
    echo "✅ Supabase initialized"
else
    echo "✅ Supabase already initialized"
fi

# Check if .env file exists
if [ ! -f "supabase/.env" ]; then
    echo "📝 Creating .env file from template..."
    cp supabase/env.example supabase/.env
    echo "⚠️  Please edit supabase/.env with your actual values"
    echo "   - SUPABASE_PROJECT_REF"
    echo "   - SUPABASE_ACCESS_TOKEN"
    echo "   - SUPABASE_DB_PASSWORD"
else
    echo "✅ .env file already exists"
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Please log in to Supabase..."
    supabase login
    echo "✅ Logged in to Supabase"
else
    echo "✅ Already logged in to Supabase"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Edit supabase/.env with your project details"
echo "2. Link to your project: supabase link --project-ref YOUR_PROJECT_REF"
echo "3. Apply migrations: supabase db push"
echo "4. Generate types: supabase gen types typescript --linked > supabase/types/supabase.ts"
echo ""
echo "📚 See supabase/README.md for detailed documentation"
