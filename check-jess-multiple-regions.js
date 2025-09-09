import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'api/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findMultipleRegionCustomers() {
  console.log('🔍 Finding customers with multiple regions...\n');
  
  try {
    // Get all users with their purchase history
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        email,
        regions,
        regions_expires_at,
        total_spent,
        purchase_history(
          region,
          amount,
          purchased_at,
          stripe_session_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`📊 Analyzing ${users.length} users...\n`);

    // Find users with multiple regions
    const multipleRegionUsers = users.filter(user => 
      user.regions && user.regions.length > 1
    );

    if (multipleRegionUsers.length === 0) {
      console.log('❌ No users found with multiple regions');
      console.log('   This could mean:');
      console.log('   1. No customers have bought multiple regions yet');
      console.log('   2. Multiple region purchases are being stored incorrectly');
      console.log('   3. The webhook is overwriting instead of appending regions\n');
    } else {
      console.log(`✅ Found ${multipleRegionUsers.length} users with multiple regions:\n`);
      
      multipleRegionUsers.forEach((user, index) => {
        const status = user.regions_expires_at && new Date(user.regions_expires_at) > new Date() ? '✅ Active' : '❌ Expired';
        
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Regions: [${user.regions.join(', ')}] - ${status}`);
        console.log(`   Total Spent: €${(user.total_spent / 100).toFixed(2)}`);
        console.log(`   Purchases: ${user.purchase_history?.length || 0}`);
        
        if (user.purchase_history && user.purchase_history.length > 0) {
          console.log('   Purchase breakdown:');
          user.purchase_history.forEach((purchase, pIndex) => {
            console.log(`     ${pIndex + 1}. ${purchase.region} - €${(purchase.amount / 100).toFixed(2)} (${new Date(purchase.purchased_at).toLocaleDateString()})`);
          });
        }
        console.log('');
      });
    }

    // Find users who bought multiple different regions (even if stored wrong)
    console.log('🔍 Looking for diverse purchase patterns...\n');
    
    const diversePurchasers = users.filter(user => {
      if (!user.purchase_history || user.purchase_history.length < 2) return false;
      
      // Check if they have purchases of different regions in history
      const uniqueRegions = [...new Set(user.purchase_history.map(p => p.region))];
      return uniqueRegions.length > 1;
    });

    if (diversePurchasers.length > 0) {
      console.log(`✅ Found ${diversePurchasers.length} users with diverse region purchases:\n`);
      
      diversePurchasers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Database regions: [${user.regions?.join(', ') || 'None'}]`);
        
        const purchasedRegions = [...new Set(user.purchase_history.map(p => p.region))];
        console.log(`   Actually purchased: [${purchasedRegions.join(', ')}]`);
        
        const isCorrect = user.regions?.length === purchasedRegions.length && 
                         user.regions?.every(r => purchasedRegions.includes(r));
        
        console.log(`   Status: ${isCorrect ? '✅ Correct' : '❌ Needs fixing'}`);
        console.log('');
      });
    } else {
      console.log('❌ No users found with purchases of different regions');
    }

    // Show statistics
    console.log('📊 Regional Statistics:\n');
    
    // Count by regions in user records
    const regionCounts = {};
    users.forEach(user => {
      if (user.regions) {
        user.regions.forEach(region => {
          regionCounts[region] = (regionCounts[region] || 0) + 1;
        });
      }
    });

    console.log('Users by region (from user.regions):');
    Object.entries(regionCounts).sort().forEach(([region, count]) => {
      console.log(`   ${region}: ${count} user${count > 1 ? 's' : ''}`);
    });

    // Count by purchase history
    const purchaseRegionCounts = {};
    users.forEach(user => {
      if (user.purchase_history) {
        user.purchase_history.forEach(purchase => {
          purchaseRegionCounts[purchase.region] = (purchaseRegionCounts[purchase.region] || 0) + 1;
        });
      }
    });

    console.log('\nPurchases by region (from purchase_history):');
    Object.entries(purchaseRegionCounts).sort().forEach(([region, count]) => {
      console.log(`   ${region}: ${count} purchase${count > 1 ? 's' : ''}`);
    });

    // Compare for discrepancies
    console.log('\n🔍 Checking for data discrepancies:');
    const allRegionsFromUsers = Object.keys(regionCounts);
    const allRegionsFromPurchases = Object.keys(purchaseRegionCounts);
    
    const userOnlyRegions = allRegionsFromUsers.filter(r => !allRegionsFromPurchases.includes(r));
    const purchaseOnlyRegions = allRegionsFromPurchases.filter(r => !allRegionsFromUsers.includes(r));
    
    if (userOnlyRegions.length > 0) {
      console.log('⚠️ Regions in user records but not in purchase history:', userOnlyRegions);
    }
    
    if (purchaseOnlyRegions.length > 0) {
      console.log('⚠️ Regions in purchase history but not in user records:', purchaseOnlyRegions);
    }
    
    if (userOnlyRegions.length === 0 && purchaseOnlyRegions.length === 0) {
      console.log('✅ User regions and purchase history are consistent');
    }

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

// Run the analysis
findMultipleRegionCustomers();
