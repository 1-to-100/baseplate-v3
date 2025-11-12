#!/bin/bash

# Edge Functions Testing Script
# This script tests Edge Functions locally

set -e  # Exit on error

echo "🧪 Testing Edge Functions..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory and navigate if needed
if [ ! -d "functions" ]; then
    # Try to find the supabase directory
    if [ -d "supabase/functions" ]; then
        echo -e "${YELLOW}📂 Navigating to supabase directory...${NC}"
        cd supabase
    elif [ -d "../functions" ]; then
        echo -e "${YELLOW}📂 Navigating to parent directory...${NC}"
        cd ..
    else
        echo -e "${RED}❌ Error: functions directory not found${NC}"
        echo "Please run this script from the supabase directory"
        echo "Or from the project root"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Found functions directory${NC}"
echo ""

# Check if supabase is running locally
if ! curl -s http://localhost:54321/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Supabase is not running locally${NC}"
    echo "Start it with: npx supabase start"
    exit 1
fi

echo -e "${GREEN}✓ Supabase is running${NC}"
echo ""

# Get the anon key from supabase status
ANON_KEY=$(npx supabase status -o json | grep -o '"anon_key":"[^"]*' | cut -d'"' -f4)

if [ -z "$ANON_KEY" ]; then
    echo -e "${RED}❌ Could not get anon key${NC}"
    echo "Run: npx supabase status"
    exit 1
fi

echo -e "${YELLOW}📋 Using local Supabase instance${NC}"
echo "   URL: http://localhost:54321"
echo ""

# Test user-management function
echo -e "${YELLOW}→ Testing user-management function...${NC}"
response=$(curl -s -w "\n%{http_code}" --location --request POST 'http://localhost:54321/functions/v1/user-management' \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "invite",
    "email": "test@example.com",
    "customerId": "test-customer-id",
    "roleId": "test-role-id"
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    echo -e "${GREEN}   ✓ user-management responded with $http_code${NC}"
else
    echo -e "${RED}   ✗ user-management failed with $http_code${NC}"
    echo "   Response: $body"
fi
echo ""

# Test auth-context function
echo -e "${YELLOW}→ Testing auth-context function...${NC}"
response=$(curl -s -w "\n%{http_code}" --location --request POST 'http://localhost:54321/functions/v1/auth-context' \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "refresh",
    "customerId": "test-customer-id"
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 401 ]; then
    echo -e "${GREEN}   ✓ auth-context responded with $http_code (401 is expected without valid user JWT)${NC}"
else
    echo -e "${RED}   ✗ auth-context failed with $http_code${NC}"
    echo "   Response: $body"
fi
echo ""

# Test admin-operations function
echo -e "${YELLOW}→ Testing admin-operations function...${NC}"
response=$(curl -s -w "\n%{http_code}" --location --request POST 'http://localhost:54321/functions/v1/admin-operations' \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "create-customer",
    "name": "Test Customer"
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ] || [ "$http_code" -eq 401 ]; then
    echo -e "${GREEN}   ✓ admin-operations responded with $http_code${NC}"
else
    echo -e "${RED}   ✗ admin-operations failed with $http_code${NC}"
    echo "   Response: $body"
fi
echo ""

echo -e "${GREEN}✅ Basic connectivity tests complete!${NC}"
echo ""
echo "📝 Note: Some functions may return 401 (Unauthorized) errors when testing"
echo "   with the anon key. This is expected - they require authenticated user tokens."
echo ""
echo "📊 To see detailed logs:"
echo "   npx supabase functions logs user-management"
echo "   npx supabase functions logs auth-context"
echo "   npx supabase functions logs admin-operations"
echo ""

