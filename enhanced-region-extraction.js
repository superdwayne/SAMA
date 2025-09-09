// Enhanced webhook debugging for region extraction
// Add this to your webhook.js for better debugging

// Enhanced region extraction with multiple fallbacks
async function extractRegionFromSession(stripe, session) {
  console.log('🔍 ENHANCED REGION EXTRACTION');
  console.log('Session ID:', session.id);
  console.log('Customer:', session.customer_details?.email);
  
  let region = null;
  
  // Method 1: Session metadata (primary)
  if (session.metadata?.region) {
    region = session.metadata.region;
    console.log('✅ Found region in session metadata:', region);
    return region;
  }
  
  // Method 2: Payment link metadata
  if (session.payment_link) {
    try {
      console.log('🔗 Checking payment link metadata...');
      const paymentLink = await stripe.paymentLinks.retrieve(session.payment_link);
      if (paymentLink.metadata?.region) {
        region = paymentLink.metadata.region;
        console.log('✅ Found region in payment link metadata:', region);
        return region;
      }
    } catch (error) {
      console.error('❌ Error fetching payment link:', error);
    }
  }
  
  // Method 3: Line item price metadata
  try {
    console.log('🏷️ Checking line item price metadata...');
    const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items', 'line_items.data.price', 'line_items.data.price.product']
    });
    
    if (expandedSession.line_items?.data?.[0]) {
      const lineItem = expandedSession.line_items.data[0];
      const price = lineItem.price;
      const product = price?.product;
      
      console.log('Price ID:', price?.id);
      console.log('Price metadata:', JSON.stringify(price?.metadata, null, 2));
      console.log('Product name:', typeof product === 'object' ? product.name : product);
      console.log('Product metadata:', typeof product === 'object' ? JSON.stringify(product.metadata, null, 2) : 'Not expanded');
      
      // Check price metadata first
      if (price?.metadata?.region) {
        region = price.metadata.region;
        console.log('✅ Found region in price metadata:', region);
        return region;
      }
      
      // Check product metadata
      if (typeof product === 'object' && product.metadata?.region) {
        region = product.metadata.region;
        console.log('✅ Found region in product metadata:', region);
        return region;
      }
      
      // Check product name as last resort
      if (typeof product === 'object' && product.name) {
        const productName = product.name.toLowerCase();
        const regionFromName = extractRegionFromProductName(product.name);
        if (regionFromName) {
          region = regionFromName;
          console.log('✅ Found region in product name:', region);
          return region;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error fetching line item details:', error);
  }
  
  // Method 4: Payment intent metadata
  if (session.payment_intent) {
    try {
      console.log('💳 Checking payment intent metadata...');
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
      if (paymentIntent.metadata?.region) {
        region = paymentIntent.metadata.region;
        console.log('✅ Found region in payment intent metadata:', region);
        return region;
      }
    } catch (error) {
      console.error('❌ Error fetching payment intent:', error);
    }
  }
  
  console.log('❌ No region found in any metadata, using default: Centre');
  return 'Centre';
}

function extractRegionFromProductName(productName) {
  const name = productName.toLowerCase();
  
  if (name.includes('centre') || name.includes('center')) return 'Centre';
  if (name.includes('noord') || name.includes('north')) return 'Noord';
  if (name.includes('south')) return 'South';
  if (name.includes('east') || name.includes('oost')) return 'East';
  if (name.includes('west')) return 'West';
  if (name.includes('nieuw')) return 'Nieuw-West';
  
  return null;
}

// Usage in your webhook:
// const region = await extractRegionFromSession(stripe, session);
// const normalizedRegion = normalizeRegionName(region);

export { extractRegionFromSession };
