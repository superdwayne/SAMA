#!/bin/bash

echo "🧪 TESTING CURRENT PRODUCTION SETUP"
echo "===================================="
echo ""

PROD_URL="https://www.streetartmapamsterdam.nl"
WEBHOOK_URL="$PROD_URL/api/webhook"

echo "Production URL: $PROD_URL"
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Test 1: Check if webhook endpoint exists
echo "1. Testing webhook endpoint accessibility..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL")

case $response in
    404)
        echo "❌ Webhook not found (404)"
        echo "   The webhook endpoint doesn't exist at this URL"
        echo "   You may need to deploy the fixes first"
        ;;
    405)
        echo "✅ Webhook accessible (405 Method Not Allowed for GET is expected)"
        ;;
    400)
        echo "✅ Webhook accessible (400 Bad Request is expected without signature)"
        ;;
    200)
        echo "✅ Webhook accessible"
        ;;
    500)
        echo "❌ Server error (500) - webhook has issues"
        ;;
    *)
        echo "⚠️  Unexpected status: $response"
        ;;
esac

echo ""

# Test 2: Test POST request (simulates Stripe)
echo "2. Testing POST request to webhook..."
post_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -H "stripe-signature: test_signature" \
    -d '{"test": "data"}')

case $post_response in
    400)
        echo "✅ POST working (400 expected without valid Stripe signature)"
        ;;
    500)
        echo "❌ Server error on POST - check function logs"
        ;;
    *)
        echo "ℹ️  POST status: $post_response"
        ;;
esac

echo ""

# Test 3: Check if our fixed files are deployed
echo "3. Checking if magic link system is deployed..."

# Test the landing page for magic link handling
magic_test_url="$PROD_URL?magic=test123"
echo "   Testing magic link handling: $magic_test_url"

landing_response=$(curl -s -o /dev/null -w "%{http_code}" "$magic_test_url")
if [ "$landing_response" = "200" ]; then
    echo "✅ Landing page accessible with magic parameter"
else
    echo "⚠️  Landing page status: $landing_response"
fi

echo ""

# Test 4: Check for the magic link verification endpoint
echo "4. Testing magic link verification endpoint..."
verify_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD_URL/api/verify-magic-link" \
    -H "Content-Type: application/json" \
    -d '{"token": "test"}')

case $verify_response in
    404)
        echo "❌ Magic link verification endpoint not found"
        ;;
    400|401|500)
        echo "✅ Magic link verification endpoint exists (error expected with test data)"
        ;;
    200)
        echo "✅ Magic link verification endpoint accessible"
        ;;
    *)
        echo "ℹ️  Verify endpoint status: $verify_response"
        ;;
esac

echo ""
echo "📊 SUMMARY:"
echo "==========="

if [ "$response" != "404" ]; then
    echo "✅ Webhook endpoint exists"
    if [ "$verify_response" != "404" ]; then
        echo "✅ Magic link system appears to be deployed"
        echo ""
        echo "🎯 READY TO TEST WITH REAL PURCHASE!"
        echo ""
        echo "1. Make sure Stripe webhook points to: $WEBHOOK_URL"
        echo "2. Make a test purchase"
        echo "3. Check email for magic link"
        echo "4. Monitor logs: vercel logs --follow"
    else
        echo "⚠️  Magic link system may not be fully deployed"
        echo ""
        echo "🔧 RECOMMENDATION: Deploy the latest fixes"
    fi
else
    echo "❌ Webhook endpoint not found"
    echo ""
    echo "🔧 SOLUTION: Deploy the code first"
fi

echo ""
echo "🔗 STRIPE WEBHOOK CONFIGURATION:"
echo "================================"
echo "Set your Stripe webhook URL to:"
echo "   $WEBHOOK_URL"
echo ""
echo "Required events:"
echo "   ✅ checkout.session.completed"
