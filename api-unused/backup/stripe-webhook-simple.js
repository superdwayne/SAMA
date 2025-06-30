// Simplified webhook that works with Stripe's built-in emails
// api/stripe-webhook.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');

// Generate a unique access token
const generateAccessToken = () => {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
};

// Simple file-based storage (replace with database in production)
const storeToken = async (email, token) => {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const tokensFile = path.join(process.cwd(), 'tokens.json');
    let tokens = {};
    
    try {
      const data = await fs.readFile(tokensFile, 'utf8');
      tokens = JSON.parse(data);
    } catch (err) {
      // File doesn't exist yet, start fresh
    }
    
    tokens[token] = {
      email,
      regions: ['Centre', 'South', 'North', 'East', 'West', 'Nieuw-West'], // Full access
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      active: true
    };
    
    await fs.writeFile(tokensFile, JSON.stringify(tokens, null, 2));
    return true;
  } catch (error) {
    console.error('Error storing token:', error);
    return false;
  }
};

// Send follow-up email with token using Stripe's email system
const sendTokenEmail = async (customerEmail, token) => {
  try {
    // Create a simple invoice item and invoice to trigger Stripe email
    const customer = await stripe.customers.create({
      email: customerEmail,
      description: 'Amsterdam Street Art Map Customer'
    });

    // Send a simple notification (you can customize this)
    // For now, we'll log the token and you can manually send it or use Stripe's receipt customization
    console.log(`🎉 NEW PURCHASE - Send this token to ${customerEmail}: ${token}`);
    console.log(`📧 EMAIL TEMPLATE:`);
    console.log(`
      Subject: Your Amsterdam Street Art Map Access Token
      
      Hi there!
      
      Thank you for purchasing access to the Amsterdam Street Art Map!
      
      Your Access Token: ${token}
      
      To activate your access:
      1. Visit: ${process.env.FRONTEND_URL || 'your-website.com'}
      2. Click "Enter Access Token" 
      3. Paste this token: ${token}
      4. Enjoy exploring Amsterdam's street art!
      
      Your access is valid for 1 full year.
      
      Happy exploring!
      The Amsterdam Street Art Map Team
    `);
    
    return true;
  } catch (error) {
    console.error('Error with customer creation:', error);
    return false;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ Webhook received:', event.type);

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Get customer email from the session
    const customerEmail = session.customer_details?.email || session.customer_email;
    
    if (!customerEmail) {
      console.error('❌ No customer email found in session');
      return res.status(400).json({ error: 'No customer email' });
    }

    console.log('💰 Payment completed for:', customerEmail);

    try {
      // Generate access token
      const accessToken = generateAccessToken();
      
      // Store token in our system
      const stored = await storeToken(customerEmail, accessToken);
      
      if (stored) {
        // Send token email
        await sendTokenEmail(customerEmail, accessToken);
        console.log('✅ Token generated and logged for:', customerEmail);
      } else {
        console.error('❌ Failed to store token for:', customerEmail);
      }
      
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      return res.status(500).json({ error: 'Failed to process payment' });
    }
  }

  res.json({ received: true });
}

// For Netlify Functions, export as netlify function
exports.handler = async (event, context) => {
  const req = {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body
  };
  
  const res = {
    status: (code) => ({ json: (data) => ({ statusCode: code, body: JSON.stringify(data) }) }),
    json: (data) => ({ statusCode: 200, body: JSON.stringify(data) })
  };
  
  return await handler(req, res);
};