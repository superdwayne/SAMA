#!/bin/bash

# Make this file executable
chmod +x "$0"

echo "🧪 Testing webhook endpoint..."
echo ""

# Test if the endpoint is accessible
echo "1. Testing endpoint accessibility..."
response=$(curl -s -o /dev/null -w "%{http_code}" https://www.streetartmapamsterdam.nl/api/stripe/webhook)

if [ "$response" = "405" ]; then
    echo "✅ Webhook endpoint is accessible (405 Method Not Allowed is expected for GET requests)"
elif [ "$response" = "200" ]; then
    echo "✅ Webhook endpoint is accessible"
else
    echo "❌ Webhook endpoint returned status code: $response"
fi

echo ""
echo "2. Webhook URL for Stripe Dashboard:"
echo "https://www.streetartmapamsterdam.nl/api/stripe/webhook"
echo ""
echo "3. Next steps:"
echo "   - Update this URL in your Stripe webhook settings"
echo "   - Test with a real Stripe event"
echo "   - Check Vercel function logs for any errors"
