#!/bin/bash

echo "🎯 COMPLETE PRODUCTION TEST"
echo "==========================="
echo ""

echo "This script will guide you through testing the complete email flow in production."
echo ""

# Get production URL
read -p "Enter your production URL: " PROD_URL
if [ -z "$PROD_URL" ]; then
    echo "❌ Production URL required"
    exit 1
fi

PROD_URL=${PROD_URL%/}

echo ""
echo "📋 PRE-TEST CHECKLIST:"
echo "======================"
echo ""

echo "1. ✅ Deployed to production"
echo "2. ✅ Updated Stripe webhook URL to: $PROD_URL/api/stripe/webhook"
echo "3. ✅ Environment variables set in Vercel"
echo "4. ✅ Webhook events include: checkout.session.completed"
echo ""

read -p "All items above complete? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please complete the checklist first"
    exit 1
fi

echo ""
echo "🧪 TESTING PROCESS:"
echo "=================="
echo ""

echo "STEP 1: Open monitoring in another terminal:"
echo "   vercel logs --follow"
echo ""
read -p "Press Enter when monitoring is ready..."

echo ""
echo "STEP 2: Make a test purchase:"
echo "   1. Go to: $PROD_URL"
echo "   2. Select a paid region (Center/North)"
echo "   3. Use Stripe test card: 4242 4242 4242 4242"
echo "   4. Complete the purchase"
echo ""
read -p "Press Enter after completing test purchase..."

echo ""
echo "STEP 3: Check the monitoring terminal for:"
echo "   ✅ Webhook received and verified"
echo "   ✅ Email sent successfully"
echo "   ✅ Magic token generated"
echo ""
read -p "Press Enter if webhook logs look good..."

echo ""
echo "STEP 4: Check your email for the magic link"
echo "   📧 Subject: '🎨 Activate Your Amsterdam Street Art Map Access'"
echo "   🔗 Contains button: '🚀 Activate [Region] District Access'"
echo ""
read -p "Press Enter after receiving the email..."

echo ""
echo "STEP 5: Click the magic link in the email"
echo "   - Should open your site"
echo "   - Should automatically verify and grant access"
echo "   - Should redirect to the map"
echo ""
read -p "Press Enter after clicking the magic link..."

echo ""
echo "STEP 6: Verify map access:"
echo "   ✅ Can see the purchased region"
echo "   ✅ Can navigate the map"
echo "   ✅ Street art locations are visible"
echo ""

echo "🎉 PRODUCTION TEST RESULTS:"
echo "=========================="
echo ""

read -p "Did the email arrive? (y/N): " email_ok
read -p "Did the magic link work? (y/N): " link_ok
read -p "Do you have map access? (y/N): " access_ok

echo ""
if [[ $email_ok =~ ^[Yy]$ ]] && [[ $link_ok =~ ^[Yy]$ ]] && [[ $access_ok =~ ^[Yy]$ ]]; then
    echo "🎉 SUCCESS! Email flow is working perfectly in production!"
    echo ""
    echo "✅ Webhook processing: Working"
    echo "✅ Email delivery: Working" 
    echo "✅ Magic link verification: Working"
    echo "✅ Map access: Working"
    echo ""
    echo "🚀 Your Amsterdam Street Art Map is ready for customers!"
else
    echo "❌ Some issues detected. Let's debug:"
    echo ""
    
    if [[ ! $email_ok =~ ^[Yy]$ ]]; then
        echo "📧 EMAIL ISSUES:"
        echo "   - Check spam/junk folder"
        echo "   - Verify SendGrid API key in Vercel"
        echo "   - Check Vercel logs for SendGrid errors"
    fi
    
    if [[ ! $link_ok =~ ^[Yy]$ ]]; then
        echo "🔗 MAGIC LINK ISSUES:"
        echo "   - Link may have expired (10 minute limit)"
        echo "   - Check browser console for errors"
        echo "   - Verify token format in email"
    fi
    
    if [[ ! $access_ok =~ ^[Yy]$ ]]; then
        echo "🗺️ MAP ACCESS ISSUES:"
        echo "   - Check localStorage for access data"
        echo "   - Verify region unlocking logic"
        echo "   - Check map component for errors"
    fi
    
    echo ""
    echo "💡 Check the monitoring terminal for detailed error logs"
fi
