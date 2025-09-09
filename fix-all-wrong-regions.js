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

// Extract region from product name
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

async function fixAllWrongRegions() {
  console.log('🔧 Fixing ALL customers with wrong regions due to payment link metadata issue...\n');
  
  try {
    // Step 1: Get all users with regions
    console.log('📊 Step 1: Getting all users...');
    
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

    console.log(`Found ${users.length} users\n`);

    // Step 2: Check each user's purchase history in Stripe
    const fixes = [];
    
    for (const user of users) {
      console.log(`🔍 Checking ${user.email}...`);
      
      if (!user.purchase_history || user.purchase_history.length === 0) {
        console.log('  No purchase history, skipping\n');
        continue;
      }

      for (const purchase of user.purchase_history) {
        try {
          // Get the actual Stripe session
          const session = await stripe.checkout.sessions.retrieve(purchase.stripe_session_id, {
            expand: ['line_items', 'line_items.data.price']
          });

          // Extract the real region from product metadata
          let realRegion = null;
          
          if (session.line_items?.data?.[0]?.price) {
            const price = session.line_items.data[0].price;
            
            try {
              const product = await stripe.products.retrieve(price.product);
              
              if (product.metadata?.region) {
                realRegion = normalizeRegionName(product.metadata.region);
              } else if (product.name) {
                const regionFromName = extractRegionFromProductName(product.name);
                if (regionFromName) {
                  realRegion = regionFromName;
                }
              }
            } catch (productError) {
              console.log(`    ⚠️ Could not fetch product for price ${price.id}`);
            }
          }

          if (realRegion && realRegion !== purchase.region) {
            console.log(`    🎯 MISMATCH FOUND:`);
            console.log(`      Stored: ${purchase.region}`);
            console.log(`      Should be: ${realRegion}`);
            
            fixes.push({
              user,
              purchase,
              correctRegion: realRegion,
              wrongRegion: purchase.region,
              sessionId: purchase.stripe_session_id
            });
          }
          
        } catch (sessionError) {
          console.log(`    ❌ Could not fetch session ${purchase.stripe_session_id}: ${sessionError.message}`);
        }
      }
      
      console.log(''); // Empty line between users
    }

    // Step 3: Report findings
    console.log(`\n📊 Step 3: Analysis Results\n`);
    console.log(`Total users checked: ${users.length}`);
    console.log(`Users with region mismatches: ${fixes.length}\n`);

    if (fixes.length === 0) {
      console.log('✅ No region mismatches found! All users have correct regions.');
      return;
    }

    console.log('🚨 Found region mismatches:');
    fixes.forEach((fix, index) => {
      console.log(`${index + 1}. ${fix.user.email}`);
      console.log(`   Wrong: ${fix.wrongRegion} → Correct: ${fix.correctRegion}`);
      console.log(`   Session: ${fix.sessionId}`);
    });

    // Step 4: Ask for confirmation to fix
    console.log(`\n🔧 Step 4: Applying fixes...\n`);

    for (const fix of fixes) {
      try {
        // Update user regions
        const currentRegions = fix.user.regions || [];
        const updatedRegions = currentRegions.map(r => 
          r === fix.wrongRegion ? fix.correctRegion : r
        );
        
        // Remove duplicates
        const uniqueRegions = [...new Set(updatedRegions)];

        await supabase
          .from('users')
          .update({
            regions: uniqueRegions,
            updated_at: new Date().toISOString()
          })
          .eq('id', fix.user.id);

        // Update purchase history
        await supabase
          .from('purchase_history')
          .update({
            region: fix.correctRegion
          })
          .eq('id', fix.purchase.id);

        console.log(`✅ Fixed ${fix.user.email}: ${fix.wrongRegion} → ${fix.correctRegion}`);
        
      } catch (fixError) {
        console.log(`❌ Failed to fix ${fix.user.email}: ${fixError.message}`);
      }
    }

    console.log(`\n🎉 Completed! Fixed ${fixes.length} users with wrong regions.`);
    console.log('\n📝 Next steps:');
    console.log('1. Deploy the enhanced webhook to prevent future issues');
    console.log('2. Test a few purchases to ensure regions are stored correctly');
    console.log('3. Monitor webhook logs for proper region extraction');

  } catch (error) {
    console.error('❌ Error during fix process:', error);
  }
}

// Run the fix
fixAllWrongRegions();
