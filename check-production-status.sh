#!/bin/bash

echo "🔍 CHECKING PRODUCTION STATUS"
echo "============================="
echo ""

PROD_URL="https://www.streetartmapamsterdam.nl"

echo "Testing your current webhook endpoints..."
echo ""

# Test the current webhook path you mentioned
echo "1. Testing /api/webhook (your current URL):"
response1=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/webhook")
echo "   Status: $response1"

if [ "$response1" = "404" ]; then
    echo "   ❌ Not found - this endpoint doesn't exist"
elif [ "$response1" = "405" ] || [ "$response1" = "400" ]; then
    echo "   ✅ Endpoint exists and working"
else
    echo "   ⚠️  Unexpected status"
fi

echo ""

# Test the correct webhook path from our fixes
echo "2. Testing /api/stripe/webhook (correct path from our fixes):"
response2=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/stripe/webhook")
echo "   Status: $response2"

if [ "$response2" = "404" ]; then
    echo "   ❌ Not found - needs deployment"
elif [ "$response2" = "405" ] || [ "$response2" = "400" ]; then
    echo "   ✅ Endpoint exists and working"
else
    echo "   ⚠️  Unexpected status"
fi

echo ""
echo "📋 DIAGNOSIS:"
echo "============="

if [ "$response1" != "404" ] && [ "$response2" = "404" ]; then
    echo "✅ Old webhook still deployed at /api/webhook"
    echo "❌ New webhook missing at /api/stripe/webhook"
    echo ""
    echo "🔧 SOLUTION: You have two options:"
    echo ""
    echo "OPTION 1 - Use existing webhook (if it has our fixes):"
    echo "   Update Stripe to: $PROD_URL/api/webhook"
    echo ""
    echo "OPTION 2 - Deploy new webhook structure:"
    echo "   1. Deploy the updated code"
    echo "   2. Update Stripe to: $PROD_URL/api/stripe/webhook"
    
elif [ "$response2" != "404" ]; then
    echo "✅ New webhook deployed at /api/stripe/webhook"
    echo ""
    echo "🔧 RECOMMENDED STRIPE URL:"
    echo "   $PROD_URL/api/stripe/webhook"
    
elif [ "$response1" != "404" ]; then
    echo "✅ Webhook exists at /api/webhook"
    echo ""
    echo "🔧 CURRENT STRIPE URL SHOULD BE:"
    echo "   $PROD_URL/api/webhook"
else
    echo "❌ No webhook endpoints found"
    echo "🔧 SOLUTION: Deploy the code first"
fi

echo ""
echo "🧪 NEXT: Test your current setup"
