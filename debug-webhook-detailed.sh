#!/bin/bash

echo "🔍 WEBHOOK DEBUGGING - Amsterdam Street Art Map"
echo "=============================================="
echo ""

# Check if we're in production or development
if [[ "$1" == "prod" ]]; then
    echo "🌐 Testing PRODUCTION webhook..."
    BASE_URL="https://www.streetartmapamsterdam.nl"
    echo "Using production URL: $BASE_URL"
else
    echo "🏠 Testing LOCAL webhook..."
    BASE_URL="http://localhost:3001"
    echo "Using local URL: $BASE_URL"
    
    # Check if local server is running
    curl -s "$BASE_URL/api/health" > /dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Local server is responding"
    else
        echo "❌ Local server is NOT responding"
        echo "Please start your server first: cd server && npm run dev"
        exit 1
    fi
fi

echo ""
echo "1️⃣ Testing webhook test endpoint..."
echo "-----------------------------------"
curl -X POST "$BASE_URL/api/stripe/webhook-test" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "2️⃣ Testing main webhook endpoint..."
echo "----------------------------------"
curl -X POST "$BASE_URL/api/stripe/webhook" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature" \
  -d '{"test": "webhook"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "3️⃣ Checking recent logs..."
echo "-------------------------"
if [[ "$1" == "prod" ]]; then
    echo "For production logs, run:"
    echo "vercel logs https://www.streetartmapamsterdam.nl"
else
    echo "Check your local terminal for console.log output"
fi

echo ""
echo "4️⃣ Next steps:"
echo "-------------"
echo "• If you see 'Webhook Error:' above, that's normal - it means the endpoint is reachable"
echo "• Check your Stripe Dashboard → Webhooks for actual delivery attempts"
echo "• Make sure your webhook URL is correct in Stripe"
echo "• Check that the webhook secret matches your .env file"
