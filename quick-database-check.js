import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize Supabase client with frontend credentials (for testing)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 Quick Database Check for Region Storage');
console.log('==========================================\n');

// Check environment
console.log('📋 Environment Check:');
console.log('SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

try {
  // Try to check the users table (new structure)
  console.log('\n🔍 Checking users table...');
  
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('email, regions, regions_expires_at, total_spent, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (usersError) {
    console.log('⚠️ Users table query failed:', usersError.message);
    
    // Try old purchases table
    console.log('\n🔍 Checking purchases table (legacy)...');
    
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('customer_email, region, amount, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (purchasesError) {
      console.log('❌ Purchases table query failed:', purchasesError.message);
      console.log('\nThis might indicate a database structure issue or permissions problem.');
    } else {
      console.log(`✅ Found ${purchases.length} purchase records`);
      
      if (purchases.length > 0) {
        console.log('\n🎯 Recent purchases:');
        purchases.forEach((purchase, index) => {
          console.log(`   ${index + 1}. ${purchase.customer_email} - ${purchase.region} (€${(purchase.amount / 100).toFixed(2)})`);
        });
        
        // Check region distribution
        const regionCounts = {};
        purchases.forEach(p => {
          regionCounts[p.region] = (regionCounts[p.region] || 0) + 1;
        });
        
        console.log('\n📊 Region distribution:');
        Object.entries(regionCounts).forEach(([region, count]) => {
          console.log(`   ${region}: ${count} purchase${count > 1 ? 's' : ''}`);
        });
      }
    }
  } else {
    console.log(`✅ Found ${users.length} user records`);
    
    if (users.length > 0) {
      console.log('\n🎯 Recent users:');
      users.forEach((user, index) => {
        const status = user.regions_expires_at && new Date(user.regions_expires_at) > new Date() ? '✅ Active' : '❌ Expired';
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      Regions: [${user.regions?.join(', ') || 'None'}] - ${status}`);
        console.log(`      Total spent: €${(user.total_spent / 100).toFixed(2)}`);
      });
      
      // Check region distribution
      const allRegions = users.flatMap(u => u.regions || []);
      const regionCounts = {};
      allRegions.forEach(region => {
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      });
      
      console.log('\n📊 Region distribution:');
      Object.entries(regionCounts).forEach(([region, count]) => {
        console.log(`   ${region}: ${count} user${count > 1 ? 's' : ''}`);
      });

      // Check recent purchase history
      const { data: recentPurchases, error: historyError } = await supabase
        .from('purchase_history')
        .select(`
          region,
          amount,
          purchased_at,
          users!inner(email)
        `)
        .order('purchased_at', { ascending: false })
        .limit(5);

      if (!historyError && recentPurchases.length > 0) {
        console.log('\n📜 Recent purchase history:');
        recentPurchases.forEach((purchase, index) => {
          console.log(`   ${index + 1}. ${purchase.users.email} - ${purchase.region} (€${(purchase.amount / 100).toFixed(2)})`);
        });
      }
    }
  }

  console.log('\n✅ Database check completed successfully!');
  
} catch (error) {
  console.error('\n❌ Error during database check:', error.message);
}
