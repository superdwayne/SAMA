#!/bin/bash

# Test the updated webhook with a simulated Stripe checkout.session.completed event

echo "🧪 Testing updated webhook with embedded magic link tokens..."

WEBHOOK_URL="http://localhost:3001/api/stripe/webhook"

# Test payload simulating a Stripe checkout.session.completed event
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: whsec_test" \
  -d '{
    "id": "evt_test_webhook",
    "object": "event",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_payment",
        "object": "checkout.session",
        "customer_details": {
          "email": "test@example.com"
        },
        "metadata": {
          "region": "Centre"
        }
      }
    }
  }'

echo ""
echo "✅ Webhook test completed"
echo "💡 Check your email for the magic link!"
