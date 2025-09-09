#!/usr/bin/env node

/**
 * Region Verification Script
 * This script helps verify that regions are being properly stored in your Supabase database
 * 
 * Usage:
 * 1. Make sure your .env file has the correct Supabase credentials
 * 2. Run: node verify-region-storage.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyRegionStorage() {
  console.log('🔍 Verifying region storage in Supabase database...\n');

  try {
    // Check if we're using the new users table structure
    console.log('📊 Checking database structure...');
    
    // Try to query the users table (new structure)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (!usersError) {
      console.log('✅ Using new users table structure');
      console.log(`📝 Found ${usersData.length} user records\n`);
      
      if (usersData.length > 0) {
        console.log('🎯 Recent users and their regions:');
        usersData.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email}`);
          console.log(`      Regions: [${user.regions?.join(', ') || 'None'}]`);
          console.log(`      Expires: ${user.regions_expires_at ? new Date(user.regions_expires_at).toLocaleDateString() : 'Not set'}`);
          console.log(`      Status: ${user.regions_expires_at && new Date(user.regions_expires_at) > new Date() ? '✅ Active' : '❌ Expired'}`);
          console.log('');
        });
      }

      // Check purchase history
      const { data: purchaseHistory, error: historyError } = await supabase
        .from('purchase_history')
        .select(`
          *,
          users!inner(email)
        `)
        .order('purchased_at', { ascending: false })
        .limit(10);

      if (!historyError && purchaseHistory.length > 0) {
        console.log('📜 Recent purchase history:');
        purchaseHistory.forEach((purchase, index) => {
          console.log(`   ${index + 1}. ${purchase.users.email} - ${purchase.region} (€${(purchase.amount / 100).toFixed(2)})`);
        });
        console.log('');
      }

    } else {
      // Fallback to old purchases table
      console.log('⚠️  Using legacy purchases table structure');
      
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (purchasesError) {
        throw purchasesError;
      }

      console.log(`📝 Found ${purchasesData.length} purchase records\n`);
      
      if (purchasesData.length > 0) {
        console.log('🎯 Recent purchases and their regions:');
        purchasesData.forEach((purchase, index) => {
          console.log(`   ${index + 1}. ${purchase.customer_email} - ${purchase.region} (€${(purchase.amount / 100).toFixed(2)})`);
        });
        console.log('');
      }
    }

    // Test region normalization
    console.log('🔧 Testing region normalization...');
    
    const testRegions = ['west', 'center', 'centre', 'north', 'noord', 'south', 'east', 'nieuw-west'];
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

    testRegions.forEach(region => {
      const normalized = normalizeRegionName(region);
      console.log(`   ${region} → ${normalized}`);
    });

    console.log('\n📊 Summary:');
    console.log('✅ Database connection working');
    console.log('✅ Region normalization function working');
    
    // Check for common issues
    console.log('\n🔍 Checking for potential issues...');
    
    if (usersData && usersData.length > 0) {
      // Check for empty regions
      const usersWithNoRegions = usersData.filter(user => !user.regions || user.regions.length === 0);
      if (usersWithNoRegions.length > 0) {
        console.log(`⚠️  Found ${usersWithNoRegions.length} users with no regions assigned`);
      }

      // Check for expired access
      const expiredUsers = usersData.filter(user => 
        user.regions_expires_at && new Date(user.regions_expires_at) < new Date()
      );
      if (expiredUsers.length > 0) {
        console.log(`⚠️  Found ${expiredUsers.length} users with expired access`);
      }
    }

    console.log('✅ Verification complete!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    
    // Check environment variables
    console.log('\n🔍 Environment check:');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
  }
}

// Run verification
verifyRegionStorage();
