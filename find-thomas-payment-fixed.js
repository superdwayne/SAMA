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
    
    console.log('🎯 Looking for:');
    console.log('- Email:', targetEmail);
    console.log('- Amount: €5.95 (595 cents)');
    console.log('- Date: August 24, 2025\n');
    
    // Method 1: Search checkout sessions (with limited expansion)
    console.log('🔍 Method 1: Searching checkout sessions...');
    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
      expand: ['data.line_items', 'data.line_items.data.price']
    });
    
    console.log(`Found ${sessions.data.length} recent sessions\n`);
    
    // Look for exact email match
    let matchingSessions = sessions.data.filter(s => 
      s.customer_details?.email?.toLowerCase() === targetEmail.toLowerCase()
    );
    
    if (matchingSessions.length > 0) {
      console.log(`✅ Found ${matchingSessions.length} session(s) for ${targetEmail}:\n`);
      
      for (let i = 0; i < matchingSessions.length; i++) {
        const session = matchingSessions[i];
        console.log(`📋 Session ${i + 1}:`);
        console.log('  ID:', session.id);
        console.log('  Amount:', `€${(session.amount_total / 100).toFixed(2)}`);
        console.log('  Status:', session.payment_status);
        console.log('  Created:', new Date(session.created * 1000).toLocaleString());
        console.log('  Metadata:', JSON.stringify(session.metadata, null, 2));
        
        if (session.line_items?.data?.[0]) {
          const item = session.line_items.data[0];
          const price = item.price;
          
          console.log('  📦 Line Item Details:');
          console.log('    Price ID:', price?.id);
          console.log('    Amount:', `€${(price?.unit_amount / 100).toFixed(2)}`);
          console.log('    Price Metadata:', JSON.stringify(price?.metadata, null, 2));
          
          // Get product details separately to avoid expansion limits
          if (price?.product) {
            try {
              const product = await stripe.products.retrieve(price.product);
              console.log('    Product Name:', product.name);
              console.log('    Product Metadata:', JSON.stringify(product.metadata, null, 2));
              
              // Check if this is the South region purchase
              if (session.amount_total === targetAmount) {
                console.log('  🎯 THIS IS THE €5.95 TRANSACTION!');
                console.log(`  ✅ Price ID for South region: ${price.id}`);
                
                // Determine region from product name or metadata
                let detectedRegion = 'Unknown';
                if (product.metadata?.region) {
                  detectedRegion = product.metadata.region;
                } else if (product.name.toLowerCase().includes('south')) {
                  detectedRegion = 'South';
                }
                
                console.log(`  🏷️ Detected region: ${detectedRegion}`);
                console.log('\n🚨 ACTION REQUIRED:');
                console.log(`Add this to your REGION_PRICES mapping in create-checkout-session.js:`);
                console.log(`'South': '${price.id}',`);
              }
            } catch (productError) {
              console.log('    ⚠️ Could not fetch product details:', productError.message);
            }
          }
        }
        
        if (session.payment_intent) {
          console.log('  💳 Payment Intent:', session.payment_intent);
        }
        
        console.log(''); // Empty line between sessions
      }
    } else {
      console.log('❌ No sessions found for', targetEmail);
      
      // Show recent sessions for debugging
      console.log('\n🔍 Recent sessions (for debugging):');
      sessions.data.slice(0, 10).forEach((s, i) => {
        const email = s.customer_details?.email || 'No email';
        const amount = `€${(s.amount_total / 100).toFixed(2)}`;
        const date = new Date(s.created * 1000).toDateString();
        console.log(`  ${i + 1}. ${email} - ${amount} - ${date}`);
      });
    }
    
    // Method 2: Search by amount if no email match
    if (matchingSessions.length === 0) {
      console.log('\n🔍 Method 2: Searching by amount (€5.95)...');
      
      const amountMatches = sessions.data.filter(s => s.amount_total === targetAmount);
      
      if (amountMatches.length > 0) {
        console.log(`Found ${amountMatches.length} session(s) with €5.95 amount:`);
        
        for (const session of amountMatches) {
          console.log('\n💰 €5.95 Session:');
          console.log('  Email:', session.customer_details?.email || 'No email');
          console.log('  ID:', session.id);
          console.log('  Date:', new Date(session.created * 1000).toLocaleString());
          console.log('  Status:', session.payment_status);
          
          if (session.line_items?.data?.[0]?.price) {
            const priceId = session.line_items.data[0].price.id;
            console.log('  Price ID:', priceId);
            
            try {
              const product = await stripe.products.retrieve(session.line_items.data[0].price.product);
              console.log('  Product:', product.name);
              
              if (product.name.toLowerCase().includes('south')) {
                console.log('  🎯 This looks like the South region product!');
              }
            } catch (error) {
              console.log('  ⚠️ Could not fetch product details');
            }
          }
        }
      }
    }
    
    // Method 3: Check for payment links
    console.log('\n🔍 Method 3: Checking payment links...');
    try {
      const paymentLinks = await stripe.paymentLinks.list({ limit: 20 });
      
      console.log(`Found ${paymentLinks.data.length} payment links:`);
      for (const link of paymentLinks.data) {
        console.log(`\n🔗 Payment Link: ${link.id}`);
        console.log('  URL:', link.url);
        console.log('  Active:', link.active);
        console.log('  Metadata:', JSON.stringify(link.metadata, null, 2));
        
        // Get the line items to see what products are being sold
        if (link.line_items?.data?.[0]) {
          const priceId = link.line_items.data[0].price;
          console.log('  Price ID:', priceId);
          
          try {
            const price = await stripe.prices.retrieve(priceId);
            const product = await stripe.products.retrieve(price.product);
            
            console.log('  Product:', product.name);
            console.log('  Amount:', `€${(price.unit_amount / 100).toFixed(2)}`);
            
            if (product.name.toLowerCase().includes('south') || price.unit_amount === targetAmount) {
              console.log('  🎯 This might be the South region payment link!');
              console.log('  📝 Price ID for South:', priceId);
            }
          } catch (error) {
            console.log('  ⚠️ Could not fetch price/product details');
          }
        }
      }
    } catch (linkError) {
      console.log('⚠️ Could not fetch payment links:', linkError.message);
    }
    
  } catch (error) {
    console.error('❌ Error searching for payment:', error.message);
  }
}

// Run the search
findThomasPayment();
