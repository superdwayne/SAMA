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
    const response = await fetch(getApiUrl(`get-price?priceId=${encodeURIComponent(priceId)}`));
    
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error fetching price:', error);
    throw error;
  }
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