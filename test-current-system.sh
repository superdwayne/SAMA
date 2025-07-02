#!/bin/bash

echo "🧪 Testing Current Magic Link System"
echo "===================================="
echo ""

# Test the magic link JavaScript logic
echo "1. Testing magic link token creation and verification..."
node test-magic-links.js

echo ""
echo "2. Checking file structure..."
if [ -f "api/stripe/webhook.js" ]; then
    echo "✅ Webhook file exists at correct location"
else
    echo "❌ Webhook file missing"
fi

if [ -f "api/utils/magic-links.js" ]; then
    echo "✅ Magic links utility exists"
else
    echo "❌ Magic links utility missing"
fi

echo ""
echo "3. Checking environment variables..."
if [ -n "$STRIPE_SECRET_KEY" ]; then
    echo "✅ Stripe secret key configured"
else
    echo "❌ Missing STRIPE_SECRET_KEY"
fi

if [ -n "$SENDGRID_API_KEY" ]; then
    echo "✅ SendGrid API key configured"
else
    echo "❌ Missing SENDGRID_API_KEY"
fi

echo ""
echo "🎯 Ready for deployment testing!"
