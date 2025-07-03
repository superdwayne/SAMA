#!/bin/bash

echo "🔧 DEPLOYING DEBUG VERSION"
echo "=========================="
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
echo "3. Deploying to production with debug logging..."
vercel --prod

echo ""
echo "✅ DEBUG DEPLOYMENT COMPLETE!"
echo ""
echo "🔍 NOW TEST A PURCHASE to see debug logs"
echo "📋 Check Vercel logs to see what metadata is received"
echo ""
echo "After testing, check logs with:"
echo "vercel logs --production"
