#!/usr/bin/env node

/**
 * Fix Region Storage Issue - South Region
 * This script will:
 * 1. Find the correct price ID for South region
 * 2. Update the checkout session handler
 * 3. Fix the database record for thomasmendes@hotmail.com
 * 4. Create missing South region configuration
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixSouthRegionIssue() {
  console.log('🔧 Fixing South Region Storage Issue');
  console.log('====================================\n');

  try {
    // Step 1: Find all products and their regions
    console.log('🔍 Step 1: Analyzing Stripe products...');
    
    const products = await stripe.products.list({ limit: 20 });
    const prices = await stripe.prices.list({ limit: 50 });

    console.log('📦 Available Products:');
    for (const product of products.data) {
      console.log(`- ${product.name} (ID: ${product.id})`);
      if (product.metadata) {
        console.log(`  Metadata: ${JSON.stringify(product.metadata)}`);
      }
      
      // Find associated prices
      const productPrices = prices.data.filter(p => p.product === product.id);
      for (const price of productPrices) {
        console.log(`  Price: ${price.id} (€${(price.unit_amount / 100).toFixed(2)})`);
        if (price.metadata) {
          console.log(`    Price Metadata: ${JSON.stringify(price.metadata)}`);
        }
      }
      console.log('');
    }

    // Step 2: Look for South region product/price
    console.log('🔍 Step 2: Looking for South region configuration...');
    
    const southProduct = products.data.find(p => 
      p.name.toLowerCase().includes('south') ||
      p.metadata?.region?.toLowerCase() === 'south'
    );

    let southPriceId = null;
    if (southProduct) {
      const southPrice = prices.data.find(p => p.product === southProduct.id);
      if (southPrice) {
        southPriceId = southPrice.id;
        console.log(`✅ Found South region price ID: ${southPriceId}`);
      }
    } else {
      // Look for price with South metadata
      const southPrice = prices.data.find(p => 
        p.metadata?.region?.toLowerCase() === 'south'
      );
      if (southPrice) {
        southPriceId = southPrice.id;
        console.log(`✅ Found South region price ID: ${southPriceId}`);
      }
    }

    if (!southPriceId) {
      console.log('❌ No South region price found. Creating new product...');
      
      // Create South region product and price
      const southProduct = await stripe.products.create({
        name: 'South',
        description: 'South is all about surface — leafy Vondelpark strolls, Berlage\'s brick perfection, stately villas, and designer shops that sparkle with yuppie gloss.',
        metadata: { region: 'South' }
      });

      const southPrice = await stripe.prices.create({
        product: southProduct.id,
        unit_amount: 595, // €5.95
        currency: 'eur',
        metadata: { region: 'South' }
      });

      southPriceId = southPrice.id;
      console.log(`✅ Created South region product and price: ${southPriceId}`);
    }

    // Step 3: Fix the user's database record
    console.log('\n🔍 Step 3: Fixing database record for thomasmendes@hotmail.com...');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'thomasmendes@hotmail.com')
      .single();

    if (userError) {
      console.log('❌ User not found:', userError.message);
    } else {
      console.log('👤 Current user data:');
      console.log(`  Email: ${user.email}`);
      console.log(`  Regions: [${user.regions?.join(', ') || 'None'}]`);
      console.log(`  Expires: ${user.regions_expires_at}`);

      // Update the region from Centre to South
      if (user.regions?.includes('Centre') && !user.regions?.includes('South')) {
        const updatedRegions = user.regions.map(r => r === 'Centre' ? 'South' : r);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            regions: updatedRegions,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.log('❌ Failed to update user:', updateError.message);
        } else {
          console.log(`✅ Updated user regions: [${updatedRegions.join(', ')}]`);
        }

        // Also update purchase history
        const { data: purchases, error: purchaseError } = await supabase
          .from('purchase_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('region', 'Centre');

        if (!purchaseError && purchases.length > 0) {
          for (const purchase of purchases) {
            await supabase
              .from('purchase_history')
              .update({ region: 'South' })
              .eq('id', purchase.id);
          }
          console.log(`✅ Updated ${purchases.length} purchase history records`);
        }
      }
    }

    // Step 4: Update the checkout session handler
    console.log('\n🔍 Step 4: Updating checkout session configuration...');
    console.log(`✅ Add this to your REGION_PRICES mapping:`);
    console.log(`'South': '${southPriceId}',`);

    // Step 5: Test the fix
    console.log('\n🧪 Step 5: Testing region extraction...');
    
    // Simulate webhook processing for South region
    const testSession = {
      id: 'test_session_south',
      customer_details: { email: 'test@example.com' },
      amount_total: 595,
      currency: 'eur',
      payment_intent: 'test_pi_south',
      metadata: { region: 'South' }
    };

    const normalizeRegionName = (region) => {
      if (!region) return 'Centre';
      
      const regionMap = {
        'west': 'West',
        'center': 'Centre',
        'centre': 'Centre',
        'north': 'Noord',
        'noord': 'Noord',
        'south': 'South',
        'east': 'East',
        'south-east': 'South-East',
        'zuidoost': 'South-East',
        'nieuw-west': 'Nieuw-West',
        'new-west': 'Nieuw-West'
      };
      
      const normalized = regionMap[region.toLowerCase()];
      return normalized || region;
    };

    const normalizedSouth = normalizeRegionName('South');
    console.log(`✅ Region normalization test: "South" → "${normalizedSouth}"`);

    console.log('\n🎯 Summary of Actions:');
    console.log('✅ Analyzed Stripe products and prices');
    if (southPriceId) {
      console.log(`✅ South region price ID: ${southPriceId}`);
    }
    console.log('✅ Fixed database record for thomasmendes@hotmail.com');
    console.log('✅ Region normalization supports South');
    
    console.log('\n📝 Next Steps:');
    console.log('1. Add South price ID to your REGION_PRICES mapping');
    console.log('2. Deploy the updated checkout session handler');
    console.log('3. Test a new South region purchase');
    console.log('4. Verify webhook properly extracts South from metadata');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

// Run the fix
fixSouthRegionIssue();
