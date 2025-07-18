// Static price data to avoid Vercel serverless function limits
const STATIC_PRICES = {
  'price_1RlrHzJ3urOr8HD7UDo4U0vY': { amount: 499, currency: 'eur', formattedPrice: '€4,99' }, // Centre
  'price_1RlrKYJ3urOr8HD7HzOpJ8bJ': { amount: 599, currency: 'eur', formattedPrice: '€5,99' }, // North
  'price_1RbeqUJ3urOr8HD7ElBhh5rB': { amount: 499, currency: 'eur', formattedPrice: '€4,99' }, // East
  'price_1Rbf2kJ3urOr8HD7QTcbJLSo': { amount: 399, currency: 'eur', formattedPrice: '€3,99' }, // Nieuw-West
  'price_1RbeqwJ3urOr8HD7Rf6mUldT': { amount: 700, currency: 'eur', formattedPrice: '€7.00' }, // South
  'price_1Rbf8wJ3urOr8HD7gvLlK0aa': { amount: 549, currency: 'eur', formattedPrice: '€5,49' }, // South-East
  'price_1Rbf23J3urOr8HD7gxyHwFW0': { amount: 449, currency: 'eur', formattedPrice: '€4,49' }  // West
};

// API utility for handling URLs in both development and production
export const getApiUrl = (endpoint) => {
  // In development, use the Vite proxy
  if (import.meta.env.DEV) {
    return `/api/${endpoint}`;
  }
  
  // In production, use the full URL if provided, otherwise relative
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return `${apiUrl}/api/${endpoint}`;
  }
  
  // Fallback to relative URL (works with Vercel rewrites)
  return `/api/${endpoint}`;
};

export const fetchPrice = async (priceId) => {
  try {
    // Use static price data to avoid serverless function limits
    if (STATIC_PRICES[priceId]) {
      console.log('💰 Using static price data for:', priceId);
      return STATIC_PRICES[priceId];
    }
    
    // Fallback to default price if price ID not found
    console.warn('⚠️ Price ID not found in static data, using fallback:', priceId);
    return {
      amount: 499,
      currency: 'eur',
      formattedPrice: '€4,99',
      fallback: true
    };
  } catch (error) {
    console.error('Error fetching price:', error);
    
    // Return fallback price data if anything fails
    return {
      amount: 499,
      currency: 'eur',
      formattedPrice: '€4,99',
      fallback: true
    };
  }
};

// Health check function (simplified)
export const checkApiHealth = async () => {
  return { 
    status: 'ok', 
    message: 'Using static price data - no serverless functions needed',
    timestamp: new Date().toISOString()
  };
};

// Payment API calls
export const createPaymentIntent = async (region, email) => {
  try {
    const response = await fetch(`${API_URL}/payment/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ region, email }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Payment intent error:', error);
    throw error;
  }
};

export const confirmPayment = async (paymentIntentId, email, region) => {
  try {
    const response = await fetch(`${API_URL}/payment/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        paymentIntentId, 
        email, 
        region 
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to confirm payment');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Payment confirmation error:', error);
    throw error;
  }
};

// Token API calls
export const validateToken = async (token, email) => {
  try {
    const response = await fetch(`${API_URL}/token/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, email }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { 
        valid: false, 
        error: data.error || 'Token validation failed' 
      };
    }
    
    return data;
  } catch (error) {
    console.error('Token validation error:', error);
    return { 
      valid: false, 
      error: 'Network error. Please try again.' 
    };
  }
};