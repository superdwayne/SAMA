import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Get price information from Stripe by price ID
 * This endpoint fetches real-time pricing from Stripe for dynamic pricing per region
 * Now enhanced to return default price and all pricing options
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, productId } = req.query;
    
    console.log('🔍 Get Price API called with priceId:', priceId, 'productId:', productId);
    
    if (!priceId && !productId) {
      return res.status(400).json({ error: 'Either priceId or productId is required' });
    }

    // Validate that we have Stripe configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    let priceData = {};
    let allPrices = [];

    if (productId) {
      // Fetch all prices for a product to get default and all options
      console.log('💰 Fetching all prices for product:', productId);
      
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        expand: ['data.product']
      });
      
      console.log('📦 Found', prices.data.length, 'active prices for product');
      
      // Sort prices: recurring first, then one-time
      const sortedPrices = prices.data.sort((a, b) => {
        // Put recurring prices first
        if (a.type === 'recurring' && b.type !== 'recurring') return -1;
        if (a.type !== 'recurring' && b.type === 'recurring') return 1;
        
        // For recurring prices, sort by interval (monthly first, then longer intervals)
        if (a.type === 'recurring' && b.type === 'recurring') {
          const intervalOrder = { month: 1, quarter: 2, year: 3 };
          const aOrder = intervalOrder[a.recurring?.interval] || 999;
          const bOrder = intervalOrder[b.recurring?.interval] || 999;
          return aOrder - bOrder;
        }
        
        // For one-time prices, sort by amount (lowest first)
        return a.unit_amount - b.unit_amount;
      });
      
      // Identify default price (first recurring price, or first price if no recurring)
      const defaultPrice = sortedPrices.find(p => p.type === 'recurring') || sortedPrices[0];
      
      // Format all prices
      allPrices = sortedPrices.map(price => ({
        id: price.id,
        type: price.type,
        amount: price.unit_amount,
        currency: price.currency.toUpperCase(),
        formattedPrice: new Intl.NumberFormat('en-NL', {
          style: 'currency',
          currency: price.currency.toUpperCase(),
          minimumFractionDigits: 2
        }).format(price.unit_amount / 100),
        recurring: price.recurring ? {
          interval: price.recurring.interval,
          intervalCount: price.recurring.interval_count,
          formattedInterval: formatRecurringInterval(price.recurring.interval, price.recurring.interval_count)
        } : null,
        isDefault: price.id === defaultPrice?.id
      }));
      
      // Set the default price data
      priceData = {
        id: defaultPrice?.id,
        amount: defaultPrice?.unit_amount,
        currency: defaultPrice?.currency?.toUpperCase(),
        formattedPrice: defaultPrice ? new Intl.NumberFormat('en-NL', {
          style: 'currency',
          currency: defaultPrice.currency.toUpperCase(),
          minimumFractionDigits: 2
        }).format(defaultPrice.unit_amount / 100) : null,
        recurring: defaultPrice?.recurring ? {
          interval: defaultPrice.recurring.interval,
          intervalCount: defaultPrice.recurring.interval_count,
          formattedInterval: formatRecurringInterval(defaultPrice.recurring.interval, defaultPrice.recurring.interval_count)
        } : null,
        allPrices: allPrices
      };
      
    } else {
      // Fetch specific price by ID (existing functionality)
      console.log('💰 Fetching specific price from Stripe with ID:', priceId);

      const price = await stripe.prices.retrieve(priceId, {
        expand: ['product']
      });
      
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
      priceData = {
        id: price.id,
        type: price.type,
        amount: price.unit_amount,
        currency: price.currency.toUpperCase(),
        formattedPrice: new Intl.NumberFormat('en-NL', {
          style: 'currency',
          currency: price.currency.toUpperCase(),
          minimumFractionDigits: 2
        }).format(price.unit_amount / 100),
        recurring: price.recurring ? {
          interval: price.recurring.interval,
          intervalCount: price.recurring.interval_count,
          formattedInterval: formatRecurringInterval(price.recurring.interval, price.recurring.interval_count)
        } : null,
        isDefault: true // Single price is considered default
      };
    }

    console.log('💰 Final price data:', priceData);
    
    // Set cache headers for better performance (cache for 5 minutes)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return res.status(200).json(priceData);

  } catch (error) {
    console.error('❌ Error fetching price from Stripe:', error);
    
    // Return different error messages based on error type
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid price ID or product ID',
        details: error.message 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch price from Stripe',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Format recurring interval for display
 * @param {string} interval - The interval (month, quarter, year)
 * @param {number} intervalCount - The interval count
 * @returns {string} Formatted interval string
 */
function formatRecurringInterval(interval, intervalCount) {
  if (interval === 'month') {
    if (intervalCount === 1) return 'Monthly';
    if (intervalCount === 2) return 'Every 2 months';
    if (intervalCount === 3) return 'Every 3 months';
    return `Every ${intervalCount} months`;
  }
  if (interval === 'quarter') {
    return 'Quarterly';
  }
  if (interval === 'year') {
    if (intervalCount === 1) return 'Yearly';
    return `Every ${intervalCount} years`;
  }
  return `Every ${intervalCount} ${interval}`;
}
