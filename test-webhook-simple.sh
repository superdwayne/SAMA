#!/bin/bash

echo "🧪 Testing if webhook receives payment..."
echo "========================================"

# Test a payment simulation
curl -X POST http://localhost:3001/api/test/simulate-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superdwayne@gmail.com",
    "region": "Centre"
  }'

echo ""
echo "✅ Check your email and server console!"
