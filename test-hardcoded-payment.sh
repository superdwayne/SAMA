#!/bin/bash

echo "🧪 Testing Hardcoded Link Payment Flow..."
echo "========================================"

# Test the webhook with hardcoded link simulation
curl -X POST http://localhost:3001/api/test/simulate-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superdwayne@gmail.com",
    "region": "East"
  }' | jq '.'

echo ""
echo "✅ Test completed. Check your email and server logs!"
