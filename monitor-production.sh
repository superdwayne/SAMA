#!/bin/bash

echo "📊 PRODUCTION MONITORING"
echo "======================="
echo ""

echo "Real-time monitoring commands:"
echo ""

echo "1. Watch Vercel function logs:"
echo "   vercel logs --follow"
echo ""

echo "2. Watch specific function:"
echo "   vercel logs --follow --filter=stripe/webhook"
echo ""

echo "3. Check recent logs:"
echo "   vercel logs"
echo ""

echo "4. Debug specific deployment:"
echo "   vercel logs [deployment-url]"
echo ""

echo "🔍 WHAT TO LOOK FOR:"
echo "==================="
echo ""
echo "✅ SUCCESSFUL WEBHOOK:"
echo "   - '🔔 Webhook endpoint /api/stripe/webhook called'"
echo "   - '✅ Webhook verified: checkout.session.completed'"
echo "   - '✅ Magic link email sent to: user@example.com'"
echo "   - '🔗 Magic token generated: abcd1234...'"
echo ""

echo "❌ COMMON ERRORS:"
echo "   - 'Cannot find module' → Deployment issue"
echo "   - 'Webhook failed: No signatures found' → Stripe config issue"
echo "   - 'SendGrid error' → Email service issue"
echo "   - 'Invalid or expired magic link' → Token issue"
echo ""

echo "📧 EMAIL DELIVERY:"
echo "   - Check spam/junk folders"
echo "   - Verify SendGrid account status"
echo "   - Check sender reputation"
echo ""

echo "🔗 MAGIC LINK TESTING:"
echo "   - Links expire in 10 minutes"
echo "   - Can only be used once"
echo "   - Must match email address"
echo ""

read -p "Press Enter to start monitoring logs..."
echo ""
echo "Starting log monitoring (Ctrl+C to stop)..."
vercel logs --follow
