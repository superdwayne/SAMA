#!/bin/bash

echo "🐍 Testing Python Email Service"
echo "==============================="

# Test the Python email script
echo "Testing Python email script..."

# Check if Python script exists
if [ ! -f "send_email.py" ]; then
    echo "❌ send_email.py not found"
    exit 1
fi

# Test with sample data
echo "Sending test email..."
python3 send_email.py "test@example.com" "SAM_NORTH_TEST123_$(date +%s)" "North"

echo ""
echo "✅ Python email test completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Check your email inbox"
echo "2. Test the full payment flow"
echo "3. For production: switch to Stripe-only emails"