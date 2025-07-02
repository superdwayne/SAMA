#!/bin/bash

echo "🎯 IMMEDIATE PRODUCTION TEST"
echo "============================"
echo ""
echo "Testing: https://www.streetartmapamsterdam.nl/api/webhook"
echo ""

# Quick test of your current webhook
echo "1. Testing webhook endpoint..."
response=$(curl -s -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
    -o /dev/null \
    "https://www.streetartmapamsterdam.nl/api/webhook")

echo "$response"

echo ""
echo "2. Testing with POST request (simulates Stripe)..."
post_response=$(curl -s -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "stripe-signature: test_signature" \
    -d '{"type": "checkout.session.completed", "data": {"object": {"customer_details": {"email": "test@example.com"}, "metadata": {"region": "Centre"}}}}' \
    -o /dev/null \
    "https://www.streetartmapamsterdam.nl/api/webhook")

echo "$post_response"

echo ""
echo "📋 INTERPRETATION:"
echo "=================="
echo ""
echo "✅ Status 200: Webhook working"
echo "✅ Status 400: Normal (bad signature expected)"
echo "✅ Status 405: Normal (GET not allowed)"
echo "❌ Status 404: Webhook not deployed"
echo "❌ Status 500: Server error in webhook"
echo ""

echo "🔗 STRIPE CONFIGURATION:"
echo "========================"
echo ""
echo "If webhook is working (not 404), configure Stripe:"
echo "1. Go to: https://dashboard.stripe.com/webhooks"
echo "2. Edit your webhook"
echo "3. Set URL to: https://www.streetartmapamsterdam.nl/api/webhook"
echo "4. Ensure events include: checkout.session.completed"
echo "5. Save changes"
echo ""

echo "🧪 MANUAL TEST PURCHASE:"
echo "========================"
echo ""
echo "1. Go to: https://www.streetartmapamsterdam.nl"
echo "2. Select a paid region (Center/North)"
echo "3. Use test card: 4242 4242 4242 4242"
echo "4. Complete purchase"
echo "5. Check email for magic link"
echo "6. Click magic link to verify access"
echo ""

echo "📊 MONITORING:"
echo "=============="
echo ""
echo "Monitor in real-time:"
echo "   vercel logs --follow"
echo ""
echo "Look for:"
echo "   ✅ 'Webhook verified: checkout.session.completed'"
echo "   ✅ 'Magic link email sent to: [email]'"
echo "   ❌ Any error messages"
