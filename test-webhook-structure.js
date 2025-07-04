// Test the new webhook structure manually
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testWebhookFlow() {
  console.log('🧪 Testing webhook flow with new database structure...');
  
  try {
    // Test 1: Check if users table exists and has the right columns
    console.log('\n1️⃣ Checking users table structure...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public'` 
      });
    
    if (columnsError) {
      console.error('❌ Error checking table structure:', columnsError);
    } else {
      console.log('✅ Users table columns:', columns);
    }
    
    // Test 2: Try to create a test user
    console.log('\n2️⃣ Testing user creation...');
    const testEmail = 'test-webhook@example.com';
    const testRegion = 'North';
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // Clean up any existing test user first
    await supabase.from('users').delete().eq('email', testEmail);
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        email: testEmail,
        regions: [testRegion],
        regions_expires_at: expiresAt.toISOString(),
        total_spent: 50,
        first_purchase_at: new Date().toISOString(),
        last_purchase_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating test user:', createError);
      return;
    }
    
    console.log('✅ Test user created:', {
      id: newUser.id,
      email: newUser.email,
      regions: newUser.regions,
      expires: newUser.regions_expires_at
    });
    
    // Test 3: Try to create magic link
    console.log('\n3️⃣ Testing magic link creation...');
    const token = crypto.randomBytes(32).toString('hex');
    const magicExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    
    const { data: updatedUser, error: magicError } = await supabase
      .from('users')
      .update({
        magic_token: token,
        magic_token_expires_at: magicExpiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('email', testEmail)
      .select()
      .single();
    
    if (magicError) {
      console.error('❌ Error creating magic link:', magicError);
    } else {
      console.log('✅ Magic link created successfully');
      console.log('Token:', token.substring(0, 8) + '...');
    }
    
    // Test 4: Test magic link validation
    console.log('\n4️⃣ Testing magic link validation...');
    const { data: validationUser, error: validationError } = await supabase
      .from('users')
      .select('*')
      .eq('magic_token', token)
      .single();
    
    if (validationError) {
      console.error('❌ Error validating magic link:', validationError);
    } else {
      console.log('✅ Magic link validation successful');
      console.log('User regions:', validationUser.regions);
      console.log('Access expires:', validationUser.regions_expires_at);
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('users').delete().eq('email', testEmail);
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWebhookFlow();
