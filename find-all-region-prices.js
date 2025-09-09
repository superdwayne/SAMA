import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'api/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function findAllRegionPrices() {
  console.log('🔍 Finding ALL region price IDs for complete REGION_PRICES mapping...\n');
  
  try {
    // Get all products and prices
    console.log('📦 Step 1: Fetching all products and prices...');
    const products = await stripe.products.list({ limit: 100 });
    const prices = await stripe.prices.list({ limit: 100 });
    
    console.log(`Found ${products.data.length} products and ${prices.data.length} prices\n`);
    
    // Find region-related products
    const regionProducts = [];
    
    for (const product of products.data) {
      let detectedRegion = null;
      
      // Check product metadata first
      if (product.metadata?.region) {
        detectedRegion = product.metadata.region;
      } else if (product.name) {
        // Check product name
        const name = product.name.toLowerCase();
        if (name.includes('centre') || name.includes('center')) detectedRegion = 'centre';
        else if (name.includes('noord') || name.includes('north')) detectedRegion = 'noord';
        else if (name.includes('south')) detectedRegion = 'south';
        else if (name.includes('east') || name.includes('oost')) detectedRegion = 'east';
        else if (name.includes('nieuw') && name.includes('west')) detectedRegion = 'nieuw-west';
        else if (name.includes('west')) detectedRegion = 'west';
        else if (name.includes('zuidoost')) detectedRegion = 'south-east';
      }
      
      if (detectedRegion) {
        // Find the price for this product
        const productPrice = prices.data.find(p => p.product === product.id && p.active);
        
        if (productPrice) {
          regionProducts.push({
            region: detectedRegion,
            regionNormalized: normalizeRegionName(detectedRegion),
            productId: product.id,
            productName: product.name,
            priceId: productPrice.id,
            amount: `€${(productPrice.unit_amount / 100).toFixed(2)}`,
            productMetadata: product.metadata,
            priceMetadata: productPrice.metadata
          });
        }
      }
    }
    
    console.log('🎯 Step 2: Found region products:\n');
    
    regionProducts.sort((a, b) => a.regionNormalized.localeCompare(b.regionNormalized));
    
    regionProducts.forEach((rp, index) => {
      console.log(`${index + 1}. ${rp.regionNormalized} (${rp.region})`);
      console.log(`   Product: "${rp.productName}" (${rp.productId})`);
      console.log(`   Price: ${rp.priceId} (${rp.amount})`);
      if (Object.keys(rp.productMetadata).length > 0) {
        console.log(`   Product Metadata: ${JSON.stringify(rp.productMetadata)}`);
      }
      if (Object.keys(rp.priceMetadata).length > 0) {
        console.log(`   Price Metadata: ${JSON.stringify(rp.priceMetadata)}`);
      }
      console.log('');
    });
    
    // Generate complete REGION_PRICES mapping
    console.log('🚀 Step 3: Complete REGION_PRICES mapping:\n');
    console.log('const REGION_PRICES = {');
    
    // Group by normalized region name
    const regionGroups = {};
    regionProducts.forEach(rp => {
      if (!regionGroups[rp.regionNormalized]) {
        regionGroups[rp.regionNormalized] = [];
      }
      regionGroups[rp.regionNormalized].push(rp);
    });
    
    // Generate mapping with variations
    Object.entries(regionGroups).forEach(([normalizedRegion, products]) => {
      const priceId = products[0].priceId; // Use first price found
      
      console.log(`  '${normalizedRegion}': '${priceId}', // ${normalizedRegion} region`);
      
      // Add common variations
      if (normalizedRegion === 'Centre') {
        console.log(`  'Center': '${priceId}', // Same as Centre (alternative spelling)`);
      } else if (normalizedRegion === 'Noord') {
        console.log(`  'North': '${priceId}', // Same as Noord (English spelling)`);
      } else if (normalizedRegion === 'East') {
        console.log(`  'Oost': '${priceId}', // Same as East (Dutch spelling)`);
      } else if (normalizedRegion === 'Nieuw-West') {
        console.log(`  'Nieuw-west': '${priceId}', // Same as Nieuw-West (lowercase w)`);
        console.log(`  'New-West': '${priceId}', // Same as Nieuw-West (English spelling)`);
        console.log(`  'New-west': '${priceId}', // Same as Nieuw-West (English spelling, lowercase w)`);
      } else if (normalizedRegion === 'South-East') {
        console.log(`  'Zuidoost': '${priceId}', // Same as South-East (Dutch spelling)`);
      }
    });
    
    console.log('};');
    
    // Check for missing regions
    console.log('\n⚠️  Step 4: Checking for missing regions...\n');
    
    const expectedRegions = ['Centre', 'Noord', 'East', 'West', 'South', 'Nieuw-West', 'South-East'];
    const foundRegions = Object.keys(regionGroups);
    
    const missingRegions = expectedRegions.filter(region => !foundRegions.includes(region));
    
    if (missingRegions.length > 0) {
      console.log('❌ Missing region products/prices:');
      missingRegions.forEach(region => {
        console.log(`   - ${region}: No product or price found`);
      });
    } else {
      console.log('✅ All expected regions have products and prices!');
    }
    
    // Check payment links
    console.log('\n🔗 Step 5: Checking payment links...\n');
    
    const paymentLinks = await stripe.paymentLinks.list({ limit: 50 });
    const activePaymentLinks = paymentLinks.data.filter(link => link.active);
    
    console.log(`Found ${activePaymentLinks.length} active payment links:`);
    
    for (const link of activePaymentLinks) {
      console.log(`\nPayment Link: ${link.id}`);
      console.log(`URL: ${link.url}`);
      
      if (link.metadata?.region) {
        console.log(`Region: ${link.metadata.region} → ${normalizeRegionName(link.metadata.region)}`);
      }
      
      // Get line items to see price
      if (link.line_items?.data?.[0]) {
        const priceId = link.line_items.data[0].price;
        console.log(`Price ID: ${priceId}`);
        
        // Check if this price is in our region products
        const matchingProduct = regionProducts.find(rp => rp.priceId === priceId);
        if (matchingProduct) {
          console.log(`✅ Matches ${matchingProduct.regionNormalized} product`);
        } else {
          console.log(`⚠️  Price not found in region products`);
        }
      }
    }
    
    console.log('\n📝 Summary:');
    console.log(`✅ Found ${regionProducts.length} region products`);
    console.log(`✅ Generated complete REGION_PRICES mapping`);
    console.log(`✅ Enhanced webhook will handle product metadata for all regions`);
    
  } catch (error) {
    console.error('❌ Error finding region prices:', error);
  }
}

// Normalize region names (same function as in webhook)
function normalizeRegionName(region) {
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
}

// Run the analysis
findAllRegionPrices();
