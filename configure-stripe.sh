#!/bin/bash

echo "🔗 STRIPE WEBHOOK CONFIGURATION"
echo "==============================="
echo ""

echo "1. Go to your Stripe Dashboard:"
echo "   https://dashboard.stripe.com/webhooks"
echo ""

echo "2. Find your existing webhook and click 'Edit'"
echo ""

echo "3. Update the Endpoint URL to:"
echo "   https://YOUR-VERCEL-DOMAIN.vercel.app/api/stripe/webhook"
echo ""

echo "4. Ensure these events are selected:"
echo "   ✅ checkout.session.completed"
echo ""

echo "5. Save the webhook"
echo ""

echo "6. Copy the webhook secret (starts with whsec_...)"
echo ""

echo "7. Add/update environment variables in Vercel:"
echo "   - Go to: https://vercel.com/dashboard"
echo "   - Select your project"
echo "   - Settings > Environment Variables"
echo "   - Update: STRIPE_WEBHOOK_SECRET"
echo ""

read -p "Press Enter when you've completed the Stripe webhook setup..."

echo ""
echo "✅ Webhook configuration complete!"
echo "🧪 Ready for production testing"
