// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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