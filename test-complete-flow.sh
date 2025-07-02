#!/bin/bash

echo "🔄 Complete Email Flow Test"
echo "==========================="
echo ""

# Step 1: Test local development server
echo "1. Starting development server test..."
echo "   Make sure your dev server is running on localhost:5173"
echo ""

# Step 2: Test magic link generation
echo "2. Testing magic link generation..."
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

const testEmail = 'test@example.com';
const testRegion = 'Centre';
const testToken = 'CEN-' + Date.now().toString(36).toUpperCase() + '-TEST123';

const magicToken = createMagicToken(testEmail, testToken, testRegion);
const magicUrl = 'http://localhost:5173?magic=' + magicToken;

console.log('Magic URL generated:');
console.log(magicUrl);
console.log('');
console.log('🧪 Test this URL in your browser:');
console.log('1. Copy the URL above');
console.log('2. Paste it in your browser');
console.log('3. Check console for verification logs');
console.log('4. Should redirect to map with access granted');
"

echo ""
echo "3. Testing webhook endpoint (if running locally)..."

# Test webhook endpoint if server is running
if curl -s http://localhost:3001/api/stripe/webhook > /dev/null 2>&1; then
    echo "✅ Local server detected"
    
    # Test with a sample payload
    echo "   Sending test webhook..."
    curl -X POST http://localhost:3001/api/stripe/webhook \
      -H "Content-Type: application/json" \
      -H "stripe-signature: test_signature" \
      -d '{
        "type": "checkout.session.completed",
        "data": {
          "object": {
            "customer_details": {
              "email": "test@example.com"
            },
            "metadata": {
              "region": "Centre"
            }
          }
        }
      }' \
      --silent --show-error || echo "   (Expected to fail signature verification)"
else
    echo "ℹ️  Local server not running - that's okay for frontend testing"
fi

echo ""
echo "4. Next steps for production testing:"
echo "   a) Deploy to Vercel: vercel --prod"
echo "   b) Update Stripe webhook URL"
echo "   c) Make a real test purchase"
echo "   d) Check email delivery"
