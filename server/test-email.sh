#!/bin/bash

# Test Email Script for Amsterdam Street Art Map
# Usage: ./test-email.sh <email> <token> <region>

# Check if environment variables are set
if [ -z "$GMAIL_EMAIL" ] || [ -z "$GMAIL_APP_PASSWORD" ]; then
    echo "❌ Error: Environment variables not set!"
    echo ""
    echo "Please set the following environment variables:"
    echo "export GMAIL_EMAIL=\"your-email@gmail.com\""
    echo "export GMAIL_APP_PASSWORD=\"your-app-password\""
    echo ""
    echo "To get an app password:"
    echo "1. Go to https://myaccount.google.com/security"
    echo "2. Enable 2-Step Verification if not already enabled"
    echo "3. Go to 'App passwords'"
    echo "4. Generate a new app password for 'Mail'"
    echo ""
    exit 1
fi

# Check if all arguments are provided
if [ $# -ne 3 ]; then
    echo "❌ Error: Missing arguments!"
    echo "Usage: ./test-email.sh <email> <token> <region>"
    echo ""
    echo "Example:"
    echo "./test-email.sh \"test@example.com\" \"SAM_NORTH_TEST123\" \"North\""
    exit 1
fi

EMAIL=$1
TOKEN=$2
REGION=$3

echo "📧 Testing email system..."
echo "To: $EMAIL"
echo "Token: $TOKEN"
echo "Region: $REGION"
echo ""

# Run the Python email script
python3 send_email.py "$EMAIL" "$TOKEN" "$REGION" 