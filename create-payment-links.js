require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createPaymentLinksWithMetadata() {
  const regions = ['Centre', 'East', 'West', 'North', 'South'];
  const PRICE_ID = 'price_1RbnlIJ3urOr8HD7Gor4UvdG'; // Your existing price
  
  console.log('🔗 Creating Stripe Payment Links with Metadata...\n');
  
  for (const region of regions) {
    try {
      // Create payment link with metadata
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price: PRICE_ID,
            quantity: 1,
          },
        ],
        metadata: {
          region: region,
          source: 'hardcoded_link',
          auto_generate_token: 'true'
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: 'https://www.streetartmapamsterdam.nl/thank-you'
          }
        },
        custom_text: {
          submit: {
            message: `Your ${region} district access token will be sent to your email after payment`
          }
        },
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: `Amsterdam Street Art Map - ${region} District Access`,
            custom_fields: [
              {
                name: 'District',
                value: region
              }
            ]
          }
        }
      });
      
      console.log(`✅ ${region} District Payment Link:`);
      console.log(`   URL: ${paymentLink.url}`);
      console.log(`   ID: ${paymentLink.id}`);
      console.log(`   Metadata: region=${region}\n`);
      
    } catch (error) {
      console.error(`❌ Error creating payment link for ${region}:`, error.message);
    }
  }
  
  console.log('🎉 Payment links created! Use these URLs for hardcoded links.');
  console.log('\n📧 Make sure your webhook handles the metadata properly.');
}

// Run the script
createPaymentLinksWithMetadata()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
