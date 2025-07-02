#!/bin/bash

echo "📊 PRODUCTION LOGS MONITORING"
echo "============================="
echo ""

echo "Getting your deployment URL..."

# Get the current deployment URL
DEPLOYMENT_URL=$(vercel ls | grep streetartmapamsterdam | head -1 | awk '{print $2}')

if [ -z "$DEPLOYMENT_URL" ]; then
    echo "❌ Could not find deployment URL automatically"
    echo ""
    echo "🔧 MANUAL STEPS:"
    echo "1. Run: vercel ls"
    echo "2. Copy your production URL"
    echo "3. Run: vercel logs [YOUR_URL]"
    echo ""
    echo "Example:"
    echo "   vercel logs https://streetartmapamsterdam-xyz.vercel.app"
else
    echo "✅ Found deployment: $DEPLOYMENT_URL"
    echo ""
    echo "📊 Getting recent logs..."
    vercel logs "https://$DEPLOYMENT_URL"
fi

echo ""
echo "🔄 TO MONITOR NEW LOGS:"
echo "======================"
echo ""
echo "Unfortunately, --follow is deprecated. Instead:"
echo ""
echo "1. Run this command every few seconds:"
echo "   vercel logs https://your-deployment-url.vercel.app"
echo ""
echo "2. Or use this script to auto-refresh:"
echo "   watch -n 2 'vercel logs https://your-deployment-url.vercel.app'"
echo ""
echo "3. Or run logs manually after each test purchase"
