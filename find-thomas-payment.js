import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables from multiple possible locations
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'api/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function findThomasPayment() {
  console.log('🔍 Searching for Thomas\'s South region payment...\n');
  
  try {
    // Search by multiple criteria
    const targetEmail = 'thomasmendes@hotmail.com';
    const targetAmount = 595; // €5.95 in cents
    const targetDate = '2025-08-24'; // From your database screenshot
    
    console.log('🎯 Looking for:');
    console.log('- Email:', targetEmail);
    console.log('- Amount: €5.95 (595 cents)');
    console.log('- Date: August 24, 2025\n');
    
    // Method 1: Search checkout sessions
    console.log('🔍 Method 1: Searching checkout sessions...');
    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
      expand: ['data.line_items', 'data.line_items.data.price', 'data.line_items.data.price.product']
    });
    
    console.log(`Found ${sessions.data.length} recent sessions\n`);
    
    // Look for exact match
    let matchingSessions = sessions.data.filter(s => 
      s.customer_details?.email?.toLowerCase() === targetEmail.toLowerCase()
    );
    
    if (matchingSessions.length > 0) {
      console.log(`✅ Found ${matchingSessions.length} session(s) for ${targetEmail}:\n`);
      
      matchingSessions.forEach((session, index) => {
        console.log(`📋 Session ${index + 1}:`);
        console.log('  ID:', session.id);
        console.log('  Amount:', `€${(session.amount_total / 100).toFixed(2)}`);
        console.log('  Status:', session.payment_status);
        console.log('  Created:', new Date(session.created * 1000).toLocaleString());
        console.log('  Metadata:', JSON.stringify(session.metadata, null, 2));
        
        if (session.line_items?.data?.[0]) {
          const item = session.line_items.data[0];
          const price = item.price;
          const product = price?.product;
          
          console.log('  📦 Product Details:');
          console.log('    Price ID:', price?.id);
          console.log('    Product:', typeof product === 'object' ? product.name : product);
          console.log('    Price Metadata:', JSON.stringify(price?.metadata, null, 2));
          
          if (typeof product === 'object') {
            console.log('    Product Metadata:', JSON.stringify(product.metadata, null, 2));
          }
        }
        
        if (session.payment_intent) {
          console.log('  💳 Payment Intent:', session.payment_intent);
        }
        
        console.log(''); // Empty line between sessions
      });
      
      // Find the specific €5.95 transaction
      const targetSession = matchingSessions.find(s => s.amount_total === targetAmount);
      
      if (targetSession) {
        console.log('🎯 Found the €5.95 transaction!');
        console.log('Session ID:', targetSession.id);
        
        // Get the price ID used
        if (targetSession.line_items?.data?.[0]?.price?.id) {
          const priceId = targetSession.line_items.data[0].price.id;
          console.log('✅ Price ID used:', priceId);
          console.log('\n📝 Action needed: Add this to your REGION_PRICES mapping:');
          console.log(`'South': '${priceId}',`);
        }
        
        return targetSession;
      }
    } else {
      console.log('❌ No sessions found for', targetEmail);
    }
    
    // Method 2: Search payment intents
    console.log('🔍 Method 2: Searching payment intents...');
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 50
    });
    
    console.log(`Found ${paymentIntents.data.length} recent payment intents\n`);
    
    // Look for matching amount and timeframe
    const recentPayments = paymentIntents.data.filter(pi => 
      pi.amount === targetAmount && 
      pi.currency === 'eur' &&
      new Date(pi.created * 1000).getDate() === 24 && // August 24th
      new Date(pi.created * 1000).getMonth() === 7    // August (0-indexed)
    );
    
    if (recentPayments.length > 0) {
      console.log('🎯 Found matching payment intents by amount and date:\n');
      
      for (const pi of recentPayments) {
        console.log('💳 Payment Intent:', pi.id);
        console.log('  Amount:', `€${(pi.amount / 100).toFixed(2)}`);
        console.log('  Status:', pi.status);
        console.log('  Created:', new Date(pi.created * 1000).toLocaleString());
        console.log('  Metadata:', JSON.stringify(pi.metadata, null, 2));
        
        // Try to get the associated session
        try {
          const sessionSearch = await stripe.checkout.sessions.list({
            payment_intent: pi.id,
            expand: ['data.line_items', 'data.line_items.data.price', 'data.line_items.data.price.product']
          });
          
          if (sessionSearch.data.length > 0) {
            const relatedSession = sessionSearch.data[0];
            console.log('  🔗 Associated Session:', relatedSession.id);
            console.log('  Customer:', relatedSession.customer_details?.email);
            
            if (relatedSession.customer_details?.email?.toLowerCase() === targetEmail.toLowerCase()) {
              console.log('  ✅ This matches Thomas\'s email!');
              
              if (relatedSession.line_items?.data?.[0]?.price?.id) {
                const priceId = relatedSession.line_items.data[0].price.id;
                console.log('  📋 Price ID:', priceId);
                console.log('\n🎯 FOUND IT! Add this to REGION_PRICES:');
                console.log(`'South': '${priceId}',`);
              }
            }
          }
        } catch (sessionError) {
          console.log('  ⚠️ Could not fetch associated session');
        }
        
        console.log('');
      }
    }
    
    // Method 3: Show all recent products for context
    console.log('🔍 Method 3: Analyzing all products for South region...');
    const products = await stripe.products.list({ limit: 20 });
    const prices = await stripe.prices.list({ limit: 50 });
    
    console.log('\n📦 All available products:');
    for (const product of products.data) {
      const productPrices = prices.data.filter(p => p.product === product.id);
      
      console.log(`- ${product.name} (${product.id})`);
      if (product.metadata && Object.keys(product.metadata).length > 0) {
        console.log(`  Product metadata: ${JSON.stringify(product.metadata)}`);
      }
      
      productPrices.forEach(price => {
        console.log(`  💰 €${(price.unit_amount / 100).toFixed(2)} (${price.id})`);
        if (price.metadata && Object.keys(price.metadata).length > 0) {
          console.log(`    Price metadata: ${JSON.stringify(price.metadata)}`);
        }
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error searching for payment:', error.message);
  }
}

// Run the search
findThomasPayment();
