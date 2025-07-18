#!/usr/bin/env node

/**
 * Price Update Script
 * 
 * This script helps you update prices in the static price data.
 * Run it with: node update-prices.js
 */

// Current prices from src/utils/api.js
const currentPrices = {
  'price_1RlrHzJ3urOr8HD7UDo4U0vY': { amount: 499, currency: 'eur', formattedPrice: '€4,99' }, // Centre
  'price_1RlrKYJ3urOr8HD7HzOpJ8bJ': { amount: 599, currency: 'eur', formattedPrice: '€5,99' }, // North
  'price_1RbeqUJ3urOr8HD7ElBhh5rB': { amount: 499, currency: 'eur', formattedPrice: '€4,99' }, // East
  'price_1Rbf2kJ3urOr8HD7QTcbJLSo': { amount: 399, currency: 'eur', formattedPrice: '€3,99' }, // Nieuw-West
  'price_1RbeqwJ3urOr8HD7Rf6mUldT': { amount: 700, currency: 'eur', formattedPrice: '€7.00' }, // South
  'price_1Rbf8wJ3urOr8HD7gvLlK0aa': { amount: 549, currency: 'eur', formattedPrice: '€5,49' }, // South-East
  'price_1Rbf23J3urOr8HD7gxyHwFW0': { amount: 449, currency: 'eur', formattedPrice: '€4,49' }  // West
};

// Region names for better readability
const regionNames = {
  'price_1RlrHzJ3urOr8HD7UDo4U0vY': 'Centre',
  'price_1RlrKYJ3urOr8HD7HzOpJ8bJ': 'North',
  'price_1RbeqUJ3urOr8HD7ElBhh5rB': 'East',
  'price_1Rbf2kJ3urOr8HD7QTcbJLSo': 'Nieuw-West',
  'price_1RbeqwJ3urOr8HD7Rf6mUldT': 'South',
  'price_1Rbf8wJ3urOr8HD7gvLlK0aa': 'South-East',
  'price_1Rbf23J3urOr8HD7gxyHwFW0': 'West'
};

console.log('🎨 Amsterdam Street Art Map - Price Management');
console.log('==============================================\n');

console.log('Current Prices:');
console.log('---------------');
Object.entries(currentPrices).forEach(([priceId, priceData]) => {
  const regionName = regionNames[priceId] || 'Unknown';
  console.log(`${regionName.padEnd(12)}: ${priceData.formattedPrice} (${priceData.amount} cents)`);
});

console.log('\nTo update prices:');
console.log('1. Edit src/utils/api.js');
console.log('2. Update the STATIC_PRICES object');
console.log('3. Deploy with: vercel --prod');
console.log('\nNote: This approach avoids Vercel serverless function limits! 🎉'); 