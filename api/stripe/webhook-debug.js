// Debug webhook to see what's happening
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  console.log('🔔 DEBUG WEBHOOK - START');
  console.log('🔍 Method:', req.method);
  console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.method !== 'POST') {
    console.log('❌ Not a POST request');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  console.log('🔍 Stripe signature present:', !!sig);
  console.log('🔍 Webhook secret present:', !!endpointSecret);

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    console.log('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    console.log('💳 checkout.session.completed event received');
    const session = event.data.object;
    
    console.log('🔍 Session ID:', session.id);
    console.log('🔍 Customer email:', session.customer_details?.email);
    console.log('🔍 Session metadata:', JSON.stringify(session.metadata, null, 2));
    console.log('🔍 Payment link:', session.payment_link);
    
    // Test database connection
    try {
      console.log('🔍 Testing database connection...');
      const { data, error } = await supabase
        .from('users')
        .select('count(*)')
        .single();
      
      if (error) {
        console.error('❌ Database connection error:', error);
      } else {
        console.log('✅ Database connection working, user count:', data);
      }
    } catch (dbError) {
      console.error('❌ Database test failed:', dbError);
    }
    
    console.log('✅ Debug webhook completed successfully');
  }

  res.json({ received: true, debug: true });
};
