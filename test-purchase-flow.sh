#!/bin/bash

echo "🎯 PRODUCTION PURCHASE TEST"
echo "=========================="
echo ""

echo "✅ Webhook confirmed working at:"
echo "   https://www.streetartmapamsterdam.nl/api/webhook"
echo ""

echo "📋 TEST PURCHASE STEPS:"
echo "======================="
echo ""

echo "1. 🔗 Open your site:"
echo "   https://www.streetartmapamsterdam.nl"
echo ""

echo "2. 🛒 Make a test purchase:"
echo "   - Select a PAID region (Center or North)"
echo "   - Use Stripe test card: 4242 4242 4242 4242"
echo "   - Use any future expiry date (e.g., 12/25)"
echo "   - Use any 3-digit CVC (e.g., 123)"
echo "   - Complete the purchase"
echo ""

echo "3. 📊 Monitor webhook in real-time:"
echo "   Open another terminal and run:"
echo "   vercel logs --follow"
echo ""

echo "4. 📧 Check for email:"
echo "   - Subject: '🎨 Activate Your Amsterdam Street Art Map Access'"
echo "   - Should arrive within 1-2 minutes"
echo "   - Check spam/junk folder if not in inbox"
echo ""

echo "5. 🔗 Test magic link:"
echo "   - Click the button in the email"
echo "   - Should redirect to your site"
echo "   - Should automatically grant access"
echo "   - Should show the purchased region"
echo ""

echo "📊 WHAT TO WATCH FOR IN LOGS:"
echo "============================="
echo ""
echo "✅ SUCCESS INDICATORS:"
echo "   - '🔔 Webhook endpoint /api/webhook called'"
echo "   - '✅ Webhook verified: checkout.session.completed'"
echo "   - '📧 Email: [customer-email]'"
echo "   - '🗺️ Region: [purchased-region]'"
echo "   - '✅ Magic link email sent to: [email]'"
echo ""

echo "❌ ERROR INDICATORS:"
echo "   - 'Cannot find module' → Deployment issue"
echo "   - 'SendGrid error' → Email service issue"
echo "   - 'Webhook failed' → Stripe configuration issue"
echo ""

echo "🎉 EXPECTED FLOW:"
echo "================"
echo "Purchase → Webhook → Email → Magic Link → Map Access"
echo ""

read -p "Ready to test? Press Enter to continue, or Ctrl+C to exit..."

echo ""
echo "🚀 Starting monitoring (press Ctrl+C to stop)..."
vercel logs --follow
