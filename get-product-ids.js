#!/usr/bin/env node

/**
 * Get Product IDs from Stripe Prices
 * 
 * This script helps you get the product IDs for your existing Stripe prices.
 * Run it with: node get-product-ids.js
 * 
 * Make sure to set your STRIPE_SECRET_KEY environment variable first.
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Current price IDs from your pricing.js file
const currentPriceIds = {
  'centre': 'price_1RlrHzJ3urOr8HD7UDo4U0vY',
  'center': 'price_1RlrHzJ3urOr8HD7UDo4U0vY',
  'noord': 'price_1RlrKYJ3urOr8HD7HzOpJ8bJ',
  'north': 'price_1RlrKYJ3urOr8HD7HzOpJ8bJ',
  'east': 'price_1RbeqUJ3urOr8HD7ElBhh5rB',
  'nieuw-west': 'price_1Rbf2kJ3urOr8HD7QTcbJLSo',
  'new-west': 'price_1Rbf2kJ3urOr8HD7QTcbJLSo',
  'south': 'price_1RbeqwJ3urOr8HD7Rf6mUldT',
  'zuid': 'price_1RbeqwJ3urOr8HD7Rf6mUldT',
  'south-east': 'price_1Rbf8wJ3urOr8HD7gvLlK0aa',
  'west': 'price_1Rbf23J3urOr8HD7gxyHwFW0'
};

async function getProductIds() {
  console.log('🔍 Fetching product IDs from Stripe prices...\n');
  
  const results = {};
  
  for (const [region, priceId] of Object.entries(currentPriceIds)) {
    try {
      console.log(`📦 Fetching price ${priceId} for region ${region}...`);
      
      const price = await stripe.prices.retrieve(priceId);
      
      if (price.product) {
        results[region] = {
          priceId: priceId,
          productId: typeof price.product === 'string' ? price.product : price.product.id,
          amount: price.unit_amount,
          currency: price.currency,
          type: price.type,
          recurring: price.recurring
        };
        
        console.log(`✅ ${region}: ${price.product} (${price.unit_amount/100} ${price.currency.toUpperCase()})`);
      } else {
        console.log(`❌ ${region}: No product found`);
      }
      
    } catch (error) {
      console.error(`❌ Error fetching price ${priceId} for ${region}:`, error.message);
    }
  }
  
  console.log('\n📋 Results:');
  console.log('export const REGION_PRODUCT_IDS = {');
  
  for (const [region, data] of Object.entries(results)) {
    console.log(`  '${region}': '${data.productId}',`);
  }
  
  console.log('};');
  
  console.log('\n📊 Summary:');
  console.log('Region | Price ID | Product ID | Amount | Type');
  console.log('-------|----------|------------|--------|------');
  
  for (const [region, data] of Object.entries(results)) {
    const recurringInfo = data.recurring ? ` (${data.recurring.interval_count} ${data.recurring.interval})` : '';
    console.log(`${region.padEnd(7)} | ${data.priceId.slice(-8)} | ${data.productId.slice(-8)} | ${(data.amount/100).toFixed(2)} ${data.currency.toUpperCase()} | ${data.type}${recurringInfo}`);
  }
  
  return results;
}

// Check if Stripe key is set
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
  console.log('Please set it with: export STRIPE_SECRET_KEY=sk_live_...');
  process.exit(1);
}

// Run the script
getProductIds()
  .then(() => {
    console.log('\n✅ Done! Copy the REGION_PRODUCT_IDS object to your pricing.js file.');
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 