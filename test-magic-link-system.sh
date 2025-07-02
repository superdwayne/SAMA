#!/bin/bash

echo "🧪 Testing Magic Link Email Flow"
echo "=================================="
echo ""

# Step 1: Test webhook endpoint accessibility
echo "1. Testing webhook endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')

if [ "$response" = "400" ]; then
    echo "✅ Webhook endpoint accessible (400 expected for unsigned request)"
elif [ "$response" = "405" ]; then
    echo "✅ Webhook endpoint accessible (405 Method Not Allowed)"  
else
    echo "⚠️  Webhook returned status: $response"
fi

echo ""

# Step 2: Test magic link creation
echo "2. Testing magic link token creation..."
node -e "
const crypto = require('crypto');

function createMagicToken(email, accessToken, region) {
  const data = {
    email,
    accessToken,
    region,
    hasPurchased: true,
    timestamp: Date.now()
  };
  const payload = JSON.stringify(data);
  return Buffer.from(payload).toString('base64').replace(/[+/=]/g, '');
}

const token = createMagicToken('test@example.com', 'TEST-TOKEN-123', 'Centre');
console.log('✅ Magic token created:', token.substring(0, 20) + '...');

// Test decode
try {
  const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  console.log('✅ Token decode successful');
  console.log('   Email:', decoded.email);
  console.log('   Region:', decoded.region);
} catch (e) {
  console.log('❌ Token decode failed:', e.message);
}
"

echo ""

# Step 3: Test SendGrid setup
echo "3. Testing SendGrid configuration..."
if [ -n "$SENDGRID_API_KEY" ]; then
    echo "✅ SendGrid API key is set"
else
    echo "❌ SendGrid API key is missing"
fi

echo ""

# Step 4: Test environment variables
echo "4. Checking environment variables..."
if [ -n "$STRIPE_SECRET_KEY" ]; then
    echo "✅ Stripe secret key is set"
else
    echo "❌ Stripe secret key is missing"
fi

if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "✅ Stripe webhook secret is set"
else
    echo "❌ Stripe webhook secret is missing"
fi

echo ""
echo "🎯 NEXT STEPS:"
echo "1. Deploy to Vercel: vercel --prod"
echo "2. Update Stripe webhook URL to: https://your-domain.vercel.app/api/stripe/webhook"
echo "3. Test with a real Stripe payment"
echo "4. Check email delivery"
