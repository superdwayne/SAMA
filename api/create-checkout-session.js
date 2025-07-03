// Create checkout session with region-specific pricing
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Region-specific price IDs
const REGION_PRICES = {
  'Center': 'price_1RbnlIJ3urOr8HD7Gor4UvdG', // Original Center price
  'Centre': 'price_1RbnlIJ3urOr8HD7Gor4UvdG', // Same as Center (alternative spelling)
  'Noord': 'price_1Rgm27J3urOr8HD7hOYvi8Ql', // Noord region
  'North': 'price_1Rgm27J3urOr8HD7hOYvi8Ql', // Same as Noord (English spelling)
  'East': 'price_1RgmMdJ3urOr8HD7RodagBPn',  // East region (corrected)
  'Oost': 'price_1RgmMdJ3urOr8HD7RodagBPn',  // Same as East (Dutch spelling)
  'Nieuw-West': 'price_1RgmTNJ3urOr8HD72uzjhCvR', // Nieuw-West region
  'New-West': 'price_1RgmTNJ3urOr8HD72uzjhCvR',   // Same as Nieuw-West (English spelling)
  // Available for future regions:
  // 'West': 'price_1234567890',
  // 'South': 'price_1234567891',
  // 'South-East': 'price_1234567892',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { region } = req.body;

  if (!region) {
    return res.status(400).json({ error: 'Region is required' });
  }

  // Get the price ID for the region
  const priceId = REGION_PRICES[region];
  
  if (!priceId) {
    console.error(`❌ No price ID found for region: ${region}`);
    console.log('Available regions:', Object.keys(REGION_PRICES));
    return res.status(400).json({ 
      error: 'Invalid region',
      availableRegions: Object.keys(REGION_PRICES),
      requestedRegion: region
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `https://www.streetartmapamsterdam.nl/thank-you`,
      cancel_url: `https://www.streetartmapamsterdam.nl`,
      metadata: { region }
    });

    console.log(`💳 Created checkout session for ${region} with price ${priceId}`);
    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: err.message });
  }
}
