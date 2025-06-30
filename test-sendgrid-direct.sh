#!/bin/bash

echo "🧪 Testing SendGrid Email Directly..."
echo "===================================="

curl -X POST https://amsterdamstreetart-cv91myy96-dpms-projects-8cd1083b.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superdwayne@gmail.com",
    "region": "Centre"
  }'

echo ""
echo "✅ Check your email!"
