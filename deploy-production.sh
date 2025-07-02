#!/bin/bash

echo "🚀 PRODUCTION DEPLOYMENT"
echo "========================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
    exit 1
fi

echo "1. Installing dependencies..."
npm install
cd api && npm install && cd ..

echo ""
echo "2. Building project..."
npm run build

echo ""
echo "3. Deploying to production..."
vercel --prod

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🔧 NEXT: Configure Stripe webhook URL"
echo "📋 Copy the URL from above and use it in the next step"
