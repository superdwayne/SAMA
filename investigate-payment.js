import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables from multiple possible locations
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'api/.env' });

// Check if we have the required variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
  console.log('💡 Make sure you have STRIPE_SECRET_KEY in one of:');
  console.log('   - .env');
  console.log('   - .env.local'); 
  console.log('   - api/.env');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// The payment intent ID from the Stripe screenshot
// If this doesn't work, replace with the correct payment intent ID from Stripe dashboard
const paymentIntentId = 'pi_3BzkIhJ3urOr8HD70GAgHyyk';

// Alternative: You can also search by customer email if payment intent doesn't work
const customerEmail = 'thomasmendes@hotmail.com';

async function investigatePayment() {
  try {
    console.log('🔍 Investigating payment intent:', paymentIntentId);
    
    // Get the payment intent details
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['charges.data.balance_transaction']
    });
    
    console.log('💳 Payment Intent Details:');
    console.log('- Amount:', paymentIntent.amount);
    console.log('- Currency:', paymentIntent.currency);
    console.log('- Status:', paymentIntent.status);
    console.log('- Metadata:', JSON.stringify(paymentIntent.metadata, null, 2));
    
    // Get the checkout session if available
    if (paymentIntent.metadata?.checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(
        paymentIntent.metadata.checkout_session_id,
        { expand: ['line_items', 'line_items.data.price'] }
      );
      
      console.log('\n🛒 Checkout Session Details:');
      console.log('- Session ID:', session.id);
      console.log('- Customer Email:', session.customer_details?.email);
      console.log('- Metadata:', JSON.stringify(session.metadata, null, 2));
      
      if (session.line_items?.data?.[0]) {
        const lineItem = session.line_items.data[0];
        console.log('\n🏷️ Line Item Details:');
        console.log('- Price ID:', lineItem.price?.id);
        console.log('- Price Metadata:', JSON.stringify(lineItem.price?.metadata, null, 2));
        console.log('- Product ID:', lineItem.price?.product);
        
        // Get product details
        if (lineItem.price?.product) {
          const product = await stripe.products.retrieve(lineItem.price.product);
          console.log('\n📦 Product Details:');
          console.log('- Product Name:', product.name);
          console.log('- Product Metadata:', JSON.stringify(product.metadata, null, 2));
        }
      }
    } else {
      console.log('\n⚠️ No checkout session ID found in payment intent metadata');
      
      // Try to find checkout sessions for this customer
      const charges = paymentIntent.charges?.data || [];
      if (charges.length > 0) {
        const customerEmail = charges[0].billing_details?.email;
        if (customerEmail) {
          console.log('🔍 Searching for checkout sessions for:', customerEmail);
          // Note: We can't directly search sessions by customer email via API
          // This would require looking at your webhook logs or database
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error investigating payment:', error.message);
    
    // If payment intent doesn't exist, try searching recent sessions
    console.log('\n🔍 Searching recent checkout sessions...');
    try {
      const sessions = await stripe.checkout.sessions.list({
        limit: 10,
        expand: ['data.line_items', 'data.line_items.data.price']
      });
      
      const targetSession = sessions.data.find(s => 
        s.customer_details?.email === 'thomasmendes@hotmail.com' ||
        s.amount_total === 595 // €5.95 in cents
      );
      
      if (targetSession) {
        console.log('✅ Found matching session:', targetSession.id);
        console.log('- Customer:', targetSession.customer_details?.email);
        console.log('- Metadata:', JSON.stringify(targetSession.metadata, null, 2));
        console.log('- Line Items:', targetSession.line_items?.data?.map(item => ({
          price_id: item.price?.id,
          price_metadata: item.price?.metadata
        })));
      } else {
        console.log('❌ No matching session found');
      }
    } catch (searchError) {
      console.error('❌ Error searching sessions:', searchError.message);
    }
  }
}

console.log('🕵️ Payment Investigation Tool');
console.log('============================\n');
investigatePayment();
