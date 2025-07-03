// Test database connection
const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    console.log('🔍 Testing database connection...');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing');

    // Test inserting a dummy purchase
    const testPurchase = {
      stripe_session_id: 'test_session_' + Date.now(),
      customer_email: 'test@example.com',
      region: 'Test',
      amount: 2500,
      currency: 'eur',
      payment_status: 'completed',
      stripe_payment_intent_id: 'test_pi_' + Date.now()
    };

    const { data, error } = await supabase
      .from('purchases')
      .insert([testPurchase])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message,
        supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Missing',
        supabaseKey: process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing'
      });
    }

    console.log('✅ Test purchase created:', data.id);

    // Clean up test data
    await supabase
      .from('purchases')
      .delete()
      .eq('id', data.id);

    res.status(200).json({
      success: true,
      message: 'Database connection working!',
      testPurchaseId: data.id
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({ 
      error: 'Test failed', 
      details: error.message 
    });
  }
}
