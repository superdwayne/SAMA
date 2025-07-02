#!/bin/bash

echo "🚀 Production Deployment & Testing"
echo "=================================="
echo ""

# Check if we're ready to deploy
echo "1. Pre-deployment checks..."

# Check required files exist
required_files=(
    "api/stripe/webhook.js"
    "api/utils/magic-links.js" 
    "api/send-magic-link.js"
    "api/verify-magic-link.js"
    "src/components/Landing.jsx"
)

all_files_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (missing)"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    echo ""
    echo "❌ Some required files are missing. Please fix before deploying."
    exit 1
fi

echo ""
echo "2. Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "   ✅ Build successful"
else
    echo "   ❌ Build failed"
    exit 1
fi

echo ""
echo "3. Deploying to Vercel..."
vercel --prod

echo ""
echo "4. Post-deployment checklist:"
echo ""
echo "   📋 MANUAL STEPS REQUIRED:"
echo "   ========================"
echo ""
echo "   1. UPDATE STRIPE WEBHOOK:"
echo "      - Go to: https://dashboard.stripe.com/webhooks"
echo "      - Edit your webhook endpoint"
echo "      - Change URL to: https://YOUR-DOMAIN.vercel.app/api/stripe/webhook"
echo "      - Events needed: checkout.session.completed"
echo ""
echo "   2. VERIFY ENVIRONMENT VARIABLES:"
echo "      - Go to: https://vercel.com/dashboard"
echo "      - Project Settings > Environment Variables"
echo "      - Required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SENDGRID_API_KEY"
echo ""
echo "   3. TEST WITH REAL PURCHASE:"
echo "      - Make a small test purchase"
echo "      - Check email delivery"
echo "      - Verify magic link works"
echo ""
echo "   4. MONITOR LOGS:"
echo "      - Check Vercel function logs for any errors"
echo "      - Use: vercel logs --follow"

echo ""
echo "🧪 QUICK PRODUCTION TEST:"
echo "========================"
echo ""

# Get the deployed URL from vercel
if command -v vercel &> /dev/null; then
    echo "Getting deployment URL..."
    DEPLOY_URL=$(vercel ls --scope=$(vercel whoami 2>/dev/null) | grep amsterdam | head -1 | awk '{print $2}')
    
    if [ -n "$DEPLOY_URL" ]; then
        echo "Testing webhook endpoint accessibility..."
        response=$(curl -s -o /dev/null -w "%{http_code}" "https://$DEPLOY_URL/api/stripe/webhook")
        
        if [ "$response" = "405" ] || [ "$response" = "400" ]; then
            echo "✅ Webhook endpoint is accessible"
            echo "   Production webhook URL: https://$DEPLOY_URL/api/stripe/webhook"
        else
            echo "⚠️  Webhook returned status: $response"
        fi
    fi
fi
