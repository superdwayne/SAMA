#!/bin/bash

echo "🧪 SIMPLE PRODUCTION TEST"
echo "========================="
echo ""

echo "✅ Your webhook is confirmed working!"
echo "✅ URL: https://www.streetartmapamsterdam.nl/api/webhook"
echo ""

echo "📋 STEP-BY-STEP TEST:"
echo "===================="
echo ""

echo "STEP 1: Configure Stripe Webhook"
echo "   1. Go to: https://dashboard.stripe.com/webhooks"
echo "   2. Edit your webhook"
echo "   3. Set URL: https://www.streetartmapamsterdam.nl/api/webhook"
echo "   4. Events: checkout.session.completed"
echo "   5. Save"
echo ""

read -p "✅ Stripe webhook configured? Press Enter to continue..."

echo ""
echo "STEP 2: Make Test Purchase"
echo "   1. Go to: https://www.streetartmapamsterdam.nl"
echo "   2. Select Center or North region"
echo "   3. Use card: 4242 4242 4242 4242"
echo "   4. Expiry: 12/25, CVC: 123"
echo "   5. Complete purchase"
echo ""

read -p "✅ Test purchase completed? Press Enter to continue..."

echo ""
echo "STEP 3: Check Email"
echo "   📧 Check your email inbox (and spam folder)"
echo "   📧 Subject: '🎨 Activate Your Amsterdam Street Art Map Access'"
echo "   📧 Should arrive within 1-2 minutes"
echo ""

read -p "📧 Email received? (y/n): " email_received

if [[ $email_received =~ ^[Yy]$ ]]; then
    echo ""
    echo "STEP 4: Test Magic Link"
    echo "   🔗 Click the blue button in the email"
    echo "   🔗 Should redirect to your site"
    echo "   🔗 Should automatically grant access"
    echo ""
    
    read -p "🔗 Magic link worked? (y/n): " magic_worked
    
    if [[ $magic_worked =~ ^[Yy]$ ]]; then
        echo ""
        echo "🎉 SUCCESS! EMAIL FLOW IS WORKING PERFECTLY!"
        echo "=========================================="
        echo ""
        echo "✅ Webhook: Working"
        echo "✅ Email delivery: Working"
        echo "✅ Magic link: Working"
        echo "✅ Map access: Working"
        echo ""
        echo "🚀 Your Amsterdam Street Art Map is ready for customers!"
        echo ""
        echo "📊 To check logs later:"
        echo "   vercel logs https://www.streetartmapamsterdam.nl"
    else
        echo ""
        echo "❌ Magic link issue detected"
        echo ""
        echo "🔍 DEBUG STEPS:"
        echo "1. Check browser console for errors"
        echo "2. Verify the magic link URL format"
        echo "3. Try copying the URL manually"
        echo "4. Check logs: vercel logs https://www.streetartmapamsterdam.nl"
    fi
else
    echo ""
    echo "❌ Email not received"
    echo ""
    echo "🔍 DEBUG STEPS:"
    echo "1. Check spam/junk folder thoroughly"
    echo "2. Wait 5 more minutes (sometimes delayed)"
    echo "3. Check Stripe webhook was triggered:"
    echo "   - Go to Stripe Dashboard > Webhooks"
    echo "   - Check recent webhook attempts"
    echo "4. Check logs: vercel logs https://www.streetartmapamsterdam.nl"
    echo "5. Verify SendGrid API key in Vercel settings"
fi

echo ""
echo "📊 CHECK LOGS ANYTIME:"
echo "====================="
echo "   vercel logs https://www.streetartmapamsterdam.nl"
