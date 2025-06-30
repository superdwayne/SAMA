#!/usr/bin/env node

// Test script to verify Stripe integration
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeIntegration() {
  console.log('🧪 Testing Stripe Integration...\n');

  try {
    // Test 1: Verify Stripe connection
    console.log('1. Testing Stripe connection...');
    const account = await stripe.accounts.retrieve();
    console.log('   ✅ Connected to Stripe account:', account.email || account.id);

    // Test 2: Create a test payment intent
    console.log('\n2. Creating test payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 499, // €4.99 in cents
      currency: 'eur',
      metadata: {
        region: 'Test Region',
        email: 'test@example.com'
      }
    });
    console.log('   ✅ Payment intent created:', paymentIntent.id);

    // Test 3: Test meter event creation (if meter exists)
    console.log('\n3. Testing meter event creation...');
    try {
      await stripe.billing.meterEvents.create({
        event_name: 'api_requests',
        payload: {
          value: '1',
          stripe_customer_id: 'test_customer',
        },
        timestamp: Math.floor(Date.now() / 1000),
      });
      console.log('   ✅ Meter event created successfully');
    } catch (meterError) {
      console.log('   ⚠️  Meter event failed (expected if meter not set up):', meterError.message);
    }

    // Test 4: List recent events
    console.log('\n4. Checking recent events...');
    const events = await stripe.events.list({ limit: 3 });
    console.log(`   ✅ Found ${events.data.length} recent events`);

    console.log('\n🎉 Stripe integration test completed successfully!');
    console.log('\nNext steps:');
    console.log('- Complete the meter setup in Stripe dashboard');
    console.log('- Test the full payment flow in your application');
    console.log('- Set up webhooks for production');

  } catch (error) {
    console.error('❌ Stripe integration test failed:', error.message);
    
    if (error.message.includes('No such account')) {
      console.log('\n💡 This usually means:');
      console.log('- Your Stripe secret key is incorrect');
      console.log('- Check your .env file in the server directory');
    }
  }
}

// Run the test
testStripeIntegration();
