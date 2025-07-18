import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId } = req.query;

  if (!priceId) {
    return res.status(400).json({ error: 'Price ID is required' });
  }

  try {
    console.log('🔍 Price API called with priceId:', priceId);
    console.log('💰 Fetching price from Stripe with ID:', priceId);

    const price = await stripe.prices.retrieve(priceId);
    
    console.log('📦 Price data from Stripe:', {
      id: price.id,
      unit_amount: price.unit_amount,
      currency: price.currency,
      active: price.active,
      product: price.product
    });

    const formattedPrice = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: price.currency.toUpperCase(),
    }).format(price.unit_amount / 100);

    const priceData = {
      amount: price.unit_amount,
      currency: price.currency,
      formattedPrice: formattedPrice
    };

    console.log('💰 Final price data:', priceData);
    
    res.status(200).json(priceData);
  } catch (error) {
    console.error('❌ Error fetching price:', error);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
} 