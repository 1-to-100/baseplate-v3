#!/bin/bash

# Edge Functions Deployment Script
# This script deploys all Edge Functions to Supabase

set -e  # Exit on error

echo "🚀 Starting Edge Functions Deployment..."
echo ""

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed"
    echo "Install Node.js which includes npx: https://nodejs.org/"
    exit 1
fi

# Check if we're in the right directory and navigate if needed
if [ ! -d "functions" ]; then
    # Try to find the supabase directory
    if [ -d "supabase/functions" ]; then
        echo "📂 Navigating to supabase directory..."
        cd supabase
    elif [ -d "../functions" ]; then
        echo "📂 Navigating to parent directory..."
        cd ..
    else
        echo "❌ Error: functions directory not found"
        echo "Please run this script from the backend/supabase directory"
        echo "Or from the backend directory"
        exit 1
    fi
fi

echo "✓ Found functions directory"
echo ""

echo "📦 Deploying Edge Functions..."
echo ""

# Deploy each function
echo "→ Deploying user-management..."
npx supabase functions deploy user-management

echo ""
echo "→ Deploying auth-context..."
npx supabase functions deploy auth-context

echo ""
echo "→ Deploying admin-operations..."
npx supabase functions deploy admin-operations

echo ""
echo "✅ All Edge Functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Test your functions with the test script: ./scripts/test-functions.sh"
echo "   2. Check logs: npx supabase functions logs user-management"
echo "   3. Update frontend to use production URLs"
echo ""

