#!/bin/bash

# Test Welcome Email Script
echo "🎨 Testing Welcome Email for Amsterdam Street Art Map"
echo "=================================================="

# Test email address and region - CHANGE THESE FOR TESTING
EMAIL="admin@creativetechnologists.nl"  # Use your actual email
REGION="East"

echo "📧 Sending welcome email to: $EMAIL"
echo "🗺️ Region: $REGION"
echo ""

# Send the request
curl -X POST http://localhost:3001/api/email/send-welcome \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"region\":\"$REGION\"}" \
  -w "\n\nResponse Time: %{time_total}s\n" \
  -s | jq '.'

echo ""
echo "✅ Test completed! Check your SendGrid logs or email inbox."
echo "💡 To test with your own email, edit this script and change the EMAIL variable."
