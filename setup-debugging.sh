#!/bin/bash
chmod +x *.sh
echo "✅ All shell scripts are now executable"
echo ""
echo "Available debugging tools:"
echo "• ./debug-webhook.sh - Complete webhook diagnostics"
echo "• ./test-flow.sh - Test email and token flow"
echo "• ./fix-pending-tokens.sh - Manually activate pending tokens"
echo "• ./setup-ngrok.sh - Set up ngrok for webhooks"
echo ""
echo "🚀 Quick start:"
echo "1. Run: ./debug-webhook.sh"
echo "2. If you have pending tokens: ./fix-pending-tokens.sh"
echo "3. Set up ngrok if needed: ./setup-ngrok.sh"