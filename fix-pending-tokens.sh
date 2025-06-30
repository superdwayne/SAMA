#!/bin/bash

echo "🔧 Quick Fix: Manually Activate Pending Tokens"
echo "=============================================="

# Get the most recent pending token
echo "Looking for pending tokens..."

if [ ! -f "./server/tokens.json" ]; then
    echo "❌ No tokens.json file found"
    exit 1
fi

PENDING_TOKENS=$(cat ./server/tokens.json | jq -r 'to_entries | map(select(.value.status == "pending")) | .[] | "\(.key) \(.value.stripeSessionId)"')

if [ -z "$PENDING_TOKENS" ]; then
    echo "✅ No pending tokens found"
    exit 0
fi

echo "Found pending tokens:"
echo "$PENDING_TOKENS"
echo ""

echo "Select a token to manually activate:"
echo "$PENDING_TOKENS" | nl

read -p "Enter the number of the token to activate (or 0 to cancel): " selection

if [ "$selection" -eq 0 ]; then
    echo "Cancelled"
    exit 0
fi

SESSION_ID=$(echo "$PENDING_TOKENS" | sed -n "${selection}p" | awk '{print $2}')

if [ -z "$SESSION_ID" ]; then
    echo "❌ Invalid selection"
    exit 1
fi

echo ""
echo "🧪 Manually activating token with session ID: $SESSION_ID"
echo ""

curl -X POST http://localhost:3001/api/webhook/test-manual \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\"}" \
  | jq '.'

echo ""
echo "✅ Done! Check your email for the access token."
