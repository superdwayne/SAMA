import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'api/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Normalize region names
function normalizeRegionName(region) {
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
}

// Extract region from product
function extractRegionFromProductName(productName) {
  if (!productName) return null;
  
  const name = productName.toLowerCase();
  
  if (name.includes('centre') || name.includes('center')) return 'Centre';
  if (name.includes('noord') || name.includes('north')) return 'Noord';
  if (name.includes('south')) return 'South';
  if (name.includes('east') || name.includes('oost')) return 'East';
  if (name.includes('west') && name.includes('nieuw')) return 'Nieuw-West';
  if (name.includes('west')) return 'West';
  
  return null;
}

async function findAllMultipleRegionIssues() {
  console.log('🔍 Finding ALL customers affected by payment link metadata issue...\n');
  
  try {
    // Step 1: Get all users from database
    console.log('📊 Step 1: Getting all users from database...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        *,
        purchase_history(*)
      `)
      .order('created_at', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    console.log(`Found ${users.length} users in database\n`);

    // Step 2: For each user, check their actual Stripe purchases
    console.log('💳 Step 2: Cross-referencing with Stripe data...\n');
    
    const fixes = [];
    const multipleRegionCustomers = [];
    
    for (const user of users) {
      if (!user.purchase_history || user.purchase_history.length === 0) {
        continue;
      }

      console.log(`🔍 Checking ${user.email}...`);
      
      const actualRegions = [];
      const sessionDetails = [];
      
      // Check each purchase session in Stripe
      for (const purchase of user.purchase_history) {
        try {
          const session = await stripe.checkout.sessions.retrieve(purchase.stripe_session_id, {
            expand: ['line_items', 'line_items.data.price']
          });

          let actualRegion = 'Unknown';
          
          if (session.line_items?.data?.[0]?.price) {
            const price = session.line_items.data[0].price;
            
            try {
              const product = await stripe.products.retrieve(price.product);
              
              if (product.metadata?.region) {
                actualRegion = normalizeRegionName(product.metadata.region);
              } else if (product.name) {
                const regionFromName = extractRegionFromProductName(product.name);
                if (regionFromName) {
                  actualRegion = regionFromName;
                }
              }
              
              sessionDetails.push({
                sessionId: session.id,
                productName: product.name,
                actualRegion: actualRegion,
                storedRegion: purchase.region,
                amount: session.amount_total,
                date: new Date(session.created * 1000)
              });
              
              if (actualRegion !== 'Unknown') {
                actualRegions.push(actualRegion);
              }
              
            } catch (productError) {
              console.log(`    ⚠️ Could not fetch product for session ${session.id}`);
            }
          }
          
        } catch (sessionError) {
          console.log(`    ❌ Could not fetch session ${purchase.stripe_session_id}`);
        }
      }

      // Analyze this user's situation
      const uniqueActualRegions = [...new Set(actualRegions)];
      const currentDatabaseRegions = user.regions || [];
      
      console.log(`   Database regions: [${currentDatabaseRegions.join(', ')}]`);
      console.log(`   Actual regions: [${uniqueActualRegions.join(', ')}]`);
      
      // Check for issues
      const hasMissingRegions = uniqueActualRegions.some(r => !currentDatabaseRegions.includes(r));
      const hasExtraRegions = currentDatabaseRegions.some(r => !uniqueActualRegions.includes(r));
      const hasMultipleRegions = uniqueActualRegions.length > 1;
      
      if (hasMissingRegions || hasExtraRegions) {
        console.log(`   🚨 NEEDS FIXING`);
        fixes.push({
          user,
          correctRegions: uniqueActualRegions,
          wrongRegions: currentDatabaseRegions,
          sessionDetails
        });
      } else {
        console.log(`   ✅ Correct`);
      }
      
      if (hasMultipleRegions) {
        console.log(`   🌟 MULTIPLE REGIONS CUSTOMER`);
        multipleRegionCustomers.push({
          user,
          regions: uniqueActualRegions,
          sessionDetails
        });
      }
      
      console.log('');
    }

    // Step 3: Report findings
    console.log('\n📊 Step 3: Analysis Results\n');
    console.log(`Total users analyzed: ${users.length}`);
    console.log(`Users needing fixes: ${fixes.length}`);
    console.log(`Users with multiple regions: ${multipleRegionCustomers.length}\n`);

    // Show multiple region customers
    if (multipleRegionCustomers.length > 0) {
      console.log('🌟 MULTIPLE REGION CUSTOMERS:\n');
      
      multipleRegionCustomers.forEach((customer, index) => {
        console.log(`${index + 1}. ${customer.user.email}`);
        console.log(`   Regions: [${customer.regions.join(', ')}]`);
        console.log(`   Total Spent: €${(customer.user.total_spent / 100).toFixed(2)}`);
        console.log(`   Purchase Details:`);
        
        customer.sessionDetails.forEach((session, sIndex) => {
          console.log(`     ${sIndex + 1}. ${session.actualRegion} - €${(session.amount / 100).toFixed(2)} (${session.date.toLocaleDateString()})`);
          console.log(`        Product: "${session.productName}"`);
        });
        console.log('');
      });
    }

    // Show fixes needed
    if (fixes.length > 0) {
      console.log('🔧 USERS NEEDING FIXES:\n');
      
      fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix.user.email}`);
        console.log(`   Current: [${fix.wrongRegions.join(', ')}]`);
        console.log(`   Should be: [${fix.correctRegions.join(', ')}]`);
        console.log(`   Purchases:`);
        
        fix.sessionDetails.forEach(session => {
          const status = session.actualRegion === session.storedRegion ? '✅' : '❌';
          console.log(`     ${status} ${session.actualRegion} (stored as: ${session.storedRegion})`);
        });
        console.log('');
      });

      // Generate SQL fixes
      console.log('\n📝 SQL FIXES:\n');
      console.log('```sql');
      
      fixes.forEach(fix => {
        console.log(`-- Fix for ${fix.user.email}`);
        console.log(`UPDATE users`);
        console.log(`SET regions = ARRAY[${fix.correctRegions.map(r => `'${r}'`).join(', ')}],`);
        console.log(`    updated_at = NOW()`);
        console.log(`WHERE email = '${fix.user.email}';`);
        console.log('');
        
        // Fix purchase history
        fix.sessionDetails.forEach(session => {
          if (session.actualRegion !== session.storedRegion) {
            console.log(`UPDATE purchase_history`);
            console.log(`SET region = '${session.actualRegion}'`);
            console.log(`WHERE stripe_session_id = '${session.sessionId}';`);
            console.log('');
          }
        });
      });
      
      console.log('```');
    }

    console.log('\n🎯 SUMMARY:');
    console.log(`✅ Enhanced webhook will fix this for future purchases`);
    console.log(`✅ Found ${multipleRegionCustomers.length} legitimate multiple-region customers`);
    console.log(`⚠️  ${fixes.length} customers need database corrections`);
    
    if (fixes.length > 0) {
      console.log('\n📋 Next steps:');
      console.log('1. Run the SQL fixes above in Supabase');
      console.log('2. Deploy the enhanced webhook');
      console.log('3. Test a multiple-region purchase');
      console.log('4. Verify regions are appended correctly');
    }

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

// Run the comprehensive analysis
findAllMultipleRegionIssues();
