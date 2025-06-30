#!/bin/bash

echo "Testing webhook endpoint..."

# Test if webhook endpoint is reachable
curl -X POST http://localhost:3001/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"test": "data"}' \
  -v

echo -e "\n\nIf you see a 400 error above, that's GOOD - it means the endpoint is reachable"
echo "but Stripe signature verification failed (which is expected for a test call)"
