// Simple investigation script - just checks recent payments
import Stripe from 'stripe';

// Replace with your actual Stripe secret key
const stripe = new Stripe('sk_test_...'); // PUT YOUR STRIPE SECRET KEY HERE

async function simpleCheck() {
  console.log('🔍 Checking recent payments for thomasmendes@hotmail.com...\n');
  
  try {
    // Get recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 20,
      expand: ['data.line_items', 'data.line_items.data.price', 'data.line_items.data.price.product']
    });
    
    // Find Thomas's session
    const thomasSession = sessions.data.find(s => 
      s.customer_details?.email?.toLowerCase() === 'thomasmendes@hotmail.com'
    );
    
    if (thomasSession) {
      console.log('✅ Found session for Thomas:');
      console.log('Session ID:', thomasSession.id);
      console.log('Amount:', `€${(thomasSession.amount_total / 100).toFixed(2)}`);
      console.log('Status:', thomasSession.payment_status);
      console.log('Metadata:', JSON.stringify(thomasSession.metadata, null, 2));
      
      if (thomasSession.line_items?.data?.[0]) {
        const item = thomasSession.line_items.data[0];
        console.log('\nProduct Details:');
        console.log('Price ID:', item.price?.id);
        console.log('Product Name:', item.price?.product?.name || item.price?.product);
        console.log('Price Metadata:', JSON.stringify(item.price?.metadata, null, 2));
      }
    } else {
      console.log('❌ No session found for thomasmendes@hotmail.com');
      console.log('\nRecent sessions:');
      sessions.data.slice(0, 5).forEach((s, i) => {
        console.log(`${i + 1}. ${s.customer_details?.email || 'No email'} - €${(s.amount_total / 100).toFixed(2)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleCheck();
