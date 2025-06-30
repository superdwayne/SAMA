#!/bin/bash

echo "🔍 Amsterdam Street Art Map - Webhook Debugging Guide"
echo "====================================================="

echo ""
echo "Step 1: Check if your server is running"
echo "---------------------------------------"
curl -s http://localhost:3001/api/health && echo "✅ Server is running" || echo "❌ Server is not running"

echo ""
echo "Step 2: Check webhook configuration"
echo "----------------------------------"
curl -s http://localhost:3001/api/webhook/debug | jq '.'

echo ""
echo "Step 3: Test webhook endpoint reachability"
echo "-----------------------------------------"
echo "Testing if webhook endpoint responds..."
curl -X POST http://localhost:3001/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature" \
  -d '{"test": "data"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | head -1

echo ""
echo "If you see 'Webhook Error: ...' above, that's GOOD - it means the endpoint is reachable!"

echo ""
echo "Step 4: Manual webhook test (if you have a session ID)"
echo "----------------------------------------------------"
echo "To manually test with a real Stripe session:"
echo "curl -X POST http://localhost:3001/api/webhook/test-manual \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"sessionId\": \"cs_live_YOUR_SESSION_ID_HERE\"}'"

echo ""
echo "Step 5: Check if ngrok is running (for webhook delivery)"
echo "------------------------------------------------------"
if pgrep -f ngrok > /dev/null; then
    echo "✅ ngrok is running"
    echo "Current ngrok tunnels:"
    curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | "\(.name): \(.public_url) -> \(.config.addr)"' 2>/dev/null || echo "Could not fetch tunnel info"
else
    echo "❌ ngrok is not running"
    echo "You need to:"
    echo "1. Start your server: cd server && npm run dev"
    echo "2. In another terminal: ngrok http 3001"
    echo "3. Update your Stripe webhook URL with the ngrok URL"
fi

echo ""
echo "Step 6: Stripe webhook configuration"
echo "-----------------------------------"
echo "Make sure your Stripe webhook is configured with:"
echo "• URL: https://YOUR_NGROK_URL.ngrok.io/api/stripe/webhook"
echo "• Events: checkout.session.completed"
echo "• Secret: whsec_... (should match your .env file)"

echo ""
echo "🚀 Next steps if webhook still not working:"
echo "1. Check Stripe Dashboard → Webhooks → Your webhook → Recent deliveries"
echo "2. Look for failed delivery attempts"
echo "3. Check server logs when making a test purchase"
echo "4. Use the manual webhook test endpoint above"
