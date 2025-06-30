#!/bin/bash

echo "🧪 Testing Email + Token Flow"
echo "=============================="

# Test 1: Manual email sending
echo ""
echo "Test 1: Manual email sending (should work)"
echo "-----------------------------------------"
curl -X POST http://localhost:3001/api/email/send-token \
  -H "Content-Type: application/json" \
  -d '{"email":"superdwayne@gmail.com","region":"Centre"}' \
  | jq '.'

# Test 2: Check webhook debug info
echo ""
echo "Test 2: Webhook debug information"
echo "--------------------------------"
curl -s http://localhost:3001/api/webhook/debug | jq '.'

# Test 3: List pending tokens
echo ""
echo "Test 3: Current token status"
echo "---------------------------"
echo "Checking tokens.json for pending tokens..."
if [ -f "./server/tokens.json" ]; then
    echo "Recent tokens:"
    cat ./server/tokens.json | jq 'to_entries | map(select(.value.status == "pending")) | .[-3:]'
else
    echo "No tokens.json file found"
fi

echo ""
echo "🔍 If you have pending tokens, the issue is likely:"
echo "1. Webhook URL not configured correctly in Stripe"
echo "2. ngrok not running (for local development)"
echo "3. Webhook secret mismatch"
echo ""
echo "💡 Quick fix: Use manual webhook test with a session ID:"
echo "Find a session ID from tokens.json above, then run:"
echo "curl -X POST http://localhost:3001/api/webhook/test-manual \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"sessionId\": \"cs_live_YOUR_SESSION_ID\"}'"
