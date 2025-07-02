#!/bin/bash

echo "🧪 PRODUCTION WEBHOOK TEST"
echo "=========================="
echo ""

# Get production URL
read -p "Enter your production URL (e.g., https://my-app.vercel.app): " PROD_URL

if [ -z "$PROD_URL" ]; then
    echo "❌ Production URL is required"
    exit 1
fi

# Remove trailing slash
PROD_URL=${PROD_URL%/}

echo ""
echo "Testing webhook endpoint: $PROD_URL/api/stripe/webhook"

# Test 1: Basic endpoint accessibility
echo ""
echo "1. Testing endpoint accessibility..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/stripe/webhook")

case $response in
    405)
        echo "✅ Endpoint accessible (405 Method Not Allowed for GET is expected)"
        ;;
    200)
        echo "✅ Endpoint accessible"
        ;;
    404)
        echo "❌ Endpoint not found (404) - check deployment"
        exit 1
        ;;
    *)
        echo "⚠️  Endpoint returned status: $response"
        ;;
esac

# Test 2: POST request (will fail signature verification, but that's expected)
echo ""
echo "2. Testing POST request..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD_URL/api/stripe/webhook" \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}')

case $response in
    400)
        echo "✅ POST endpoint working (400 Bad Request expected without valid Stripe signature)"
        ;;
    500)
        echo "❌ Server error (500) - check function logs"
        ;;
    *)
        echo "ℹ️  POST returned status: $response"
        ;;
esac

echo ""
echo "3. Check Vercel function logs:"
echo "   vercel logs --follow"
echo ""

echo "4. Test with Stripe CLI (if you have it installed):"
echo "   stripe listen --forward-to $PROD_URL/api/stripe/webhook"
echo "   stripe trigger checkout.session.completed"
echo ""

echo "✅ Production webhook test complete!"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Make a real test purchase"
echo "2. Check email delivery"
echo "3. Test magic link functionality"
