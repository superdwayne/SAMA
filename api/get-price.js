import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Get price information from Stripe by price ID
 * This endpoint fetches real-time pricing from Stripe for dynamic pricing per region
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId } = req.query;
    
    console.log('🔍 Get Price API called with priceId:', priceId);
    
    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    // Validate that we have Stripe configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    console.log('💰 Fetching price from Stripe with ID:', priceId);

    // Fetch the price directly from Stripe
    const price = await stripe.prices.retrieve(priceId);
    
    console.log('📦 Price data from Stripe:', {
      id: price.id,
      unit_amount: price.unit_amount,
      currency: price.currency,
      active: price.active,
      product: price.product
    });

    // Check if price is active
    if (!price.active) {
      console.warn('⚠️ Price is not active:', priceId);
      return res.status(400).json({ error: 'Price is not active' });
    }

    // Format the price data for frontend consumption
    const priceData = {
      id: price.id,
      amount: price.unit_amount,
      currency: price.currency.toUpperCase(),
      formattedPrice: new Intl.NumberFormat('en-NL', {
        style: 'currency',
        currency: price.currency.toUpperCase(),
        minimumFractionDigits: 2
      }).format(price.unit_amount / 100)
    };

    console.log('💰 Final price data:', priceData);
    
    // Set cache headers for better performance (cache for 5 minutes)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return res.status(200).json(priceData);

  } catch (error) {
    console.error('❌ Error fetching price from Stripe:', error);
    
    // Return different error messages based on error type
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid price ID',
        details: error.message 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch price from Stripe',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
