#!/bin/bash

echo "🚀 Deploying Magic Link Fixes"
echo "============================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the project root."
    exit 1
fi

echo "1. Installing dependencies..."
npm install

echo ""
echo "2. Installing API dependencies..."
cd api && npm install && cd ..

echo ""
echo "3. Building the project..."
npm run build

echo ""
echo "4. Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🔧 POST-DEPLOYMENT CHECKLIST:"
echo "================================"
echo ""
echo "1. UPDATE STRIPE WEBHOOK URL:"
echo "   - Go to https://dashboard.stripe.com/webhooks"
echo "   - Update your webhook endpoint URL to:"
echo "     https://YOUR-DOMAIN.vercel.app/api/stripe/webhook"
echo ""
echo "2. VERIFY ENVIRONMENT VARIABLES IN VERCEL:"
echo "   - Go to https://vercel.com/dashboard"
echo "   - Select your project > Settings > Environment Variables"
echo "   - Ensure these are set:"
echo "     * STRIPE_SECRET_KEY"
echo "     * STRIPE_WEBHOOK_SECRET"
echo "     * SENDGRID_API_KEY"
echo "     * SENDER_EMAIL"
echo ""
echo "3. TEST THE FLOW:"
echo "   - Make a test purchase"
echo "   - Check email delivery"
echo "   - Verify magic link works"
echo ""
echo "4. MONITOR LOGS:"
echo "   - Check Vercel function logs for any errors"
echo "   - Test magic link activation"
