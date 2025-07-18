require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');


// Function to track API usage with Stripe meter
async function trackAPIUsage(eventName = 'api_requests', value = 1) {
  try {
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key_here') {
      await stripe.billing.meterEvents.create({
        event_name: eventName,
        payload: {
          value: value.toString(),
          stripe_customer_id: 'anonymous',
        },
        timestamp: Math.floor(Date.now() / 1000),
      });
      console.log(`📊 Tracked API usage: ${eventName} = ${value}`);
    }
  } catch (error) {
    console.error('Error tracking API usage:', error.message);
  }
}

const { Resend } = require('resend');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
console.log('🔑 Resend API Key loaded:', process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 20)}...` : 'NOT FOUND');

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000'
}));

// Special middleware for Stripe webhook (needs raw body)
app.use('/api/stripe/webhook', express.raw({type: 'application/json'}));

// Webhook route must come before express.json()
app.post('/api/stripe/webhook', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 [${timestamp}] WEBHOOK ENDPOINT CALLED`);
  console.log('📧 SendGrid API Key:', process.env.SENDGRID_API_KEY ? 'CONFIGURED' : 'MISSING');
  console.log('🔑 Webhook Secret:', process.env.STRIPE_WEBHOOK_SECRET ? 'CONFIGURED' : 'MISSING');
  
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    console.error('⚠️ STRIPE_WEBHOOK_SECRET not set');
    return res.status(400).send('Webhook secret not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    console.log(`❌ Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    console.log('💳 checkout.session.completed event received');
    const session = event.data.object;
    
    const customerEmail = session.customer_details?.email || session.customer_email;
    let region = session.metadata?.region;
    
    console.log('📧 Customer email:', customerEmail);
    console.log('🗺️ Region from session metadata:', region);
    
    // If no metadata on session, check if this came from a payment link
    if (!region && session.payment_link) {
      try {
        console.log('🔗 Session came from payment link, fetching metadata...');
        const paymentLink = await stripe.paymentLinks.retrieve(session.payment_link);
        console.log('🔍 Payment link metadata:', JSON.stringify(paymentLink.metadata, null, 2));
        region = paymentLink.metadata?.region || 'Centre';
      } catch (error) {
        console.error('❌ Error fetching payment link metadata:', error);
      }
    }
    
    // Send magic link to customer
    if (customerEmail) {
      console.log('🔗 Sending magic link to customer:', customerEmail);
      
      try {
        await sendMagicLinkViaAPI(customerEmail);
        console.log(`✅ Magic link sent to ${customerEmail}`);
        
        // Also send welcome email
        if (region) {
          await sendWelcomeEmail(customerEmail, region);
          console.log(`✅ Welcome email sent to ${customerEmail} for ${region} region`);
        }
        
      } catch (error) {
        console.error('❌ Failed to send magic link:', error);
      }
    } else {
      console.error('❌ No customer email found in session');
    }
  }

  res.json({received: true});
});

// Regular JSON middleware for other endpoints (must come after webhook)
app.use(express.json());




// Send welcome email function using Resend
async function sendWelcomeEmail(email, region) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.SENDER_EMAIL || 'noreply@streetartmapamsterdam.nl',
      to: [email],
      subject: `Welcome to Amsterdam Street Art Map - ${region} District`,
      text: `Welcome to the Amsterdam Street Art Map!

Thank you for purchasing access to the ${region} district. You're about to discover some of Amsterdam's most incredible street art!

What's included in your ${region} access:
✓ Interactive map with precise locations
✓ Artist information and artwork details
✓ Navigation and route planning
✓ Hidden gems only locals know about
✓ 30 days of unlimited access

Getting Started:
1. Check your email for your magic link
2. Click the magic link to access the map
3. Your ${region} district will be automatically unlocked
4. Start exploring!

Tips for your street art adventure:
🎨 Best time to visit: Early morning or late afternoon for great lighting
📱 Screenshot interesting pieces for your collection
🚶‍♂️ Wear comfortable walking shoes
📸 Don't forget your camera!

Happy exploring!
The Amsterdam Street Art Map Team

Questions? Reply to this email or contact info@streetartmuseumamsterdam.com`,
      html: `<!DOCTYPE html>
<html style="background-color: #FFFF00;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amsterdam Street Art Map – Welcome</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Roboto+Mono&display=swap');

    body {
      margin: 0;
      padding: 0;
      font-family: Verdana, Arial, sans-serif;
      color: #000000;
      line-height: 1.4;
      background-color: #FFFF00;
    }

    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    td {
      padding: 0;
      vertical-align: top;
    }

  </style>
</head>
<body style="background-color: #FFFF00; margin: 0; padding: 0;">
  <table align="center" width="100%" style="margin: 0 auto; max-width: 600px; background-color: #FFFF00; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;" role="presentation" cellspacing="0" cellpadding="0" border="0">
    <tbody>
      <tr>
        <td style="padding: 40px 20px;">
          <!-- Header -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              <td style="font-size: 48px; font-weight: 900; line-height: 0.9; color: #3416D8; text-transform: uppercase; font-family: 'PPNeueMachina-PlainUltrabold', Arial, Helvetica, sans-serif; padding-bottom: 24px;">
                Amsterdam<br>
                Street<br>
                Art Map
              </td>
            </tr>
          </table>

          <!-- Main content -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tbody>
              <tr>
                <td style="font-size: 32px; font-weight: 900; color: #3416D8; text-transform: uppercase; font-family: 'PPNeueMachina-PlainUltrabold', Arial, Helvetica, sans-serif; padding: 24px 0 8px 0;">
                  Welcome!
                </td>
              </tr>
              <tr>
                <td style="font-size: 18px; color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                  You're now part of Amsterdam's street art community
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFF00; border: 2px solid #000; border-radius: 25px; margin: 0 auto;">
                    <tr>
                      <td style="font-weight: bold; font-size: 18px; color: #000; font-family: Verdana, Arial, sans-serif; padding: 10px 20px;">
                        ${region} District Access
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                  You're about to discover some of Amsterdam's most incredible street art. Check your inbox for a separate email containing your magic link to access the map.
                </td>
              </tr>
              <tr>
                <td style="font-size: 18px; color: #000; font-family: Verdana, Arial, sans-serif; padding: 30px 0 8px 0; text-align: center;">
                  <strong>Happy exploring! 🎭</strong>
                </td>
              </tr>
              <tr>
                <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0; text-align: center;">
                  The Amsterdam Street Art Map Team
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Footer -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
            <tr>
              <td style="padding-top: 48px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tr>
                    <td colspan="2" style="font-size: 14px; color: #000; font-family: Verdana, Arial, sans-serif; ">
                      © 2024 Amsterdam Street Art Map
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="font-size: 14px; color: #000; font-family: Verdana, Arial, sans-serif; ">
                      Need help? Reply to this email or contact us<br>
                      at info@streetartmapamsterdam.com
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding: 10px 0;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                        <tr>
                          <td style="height: 1px; background-color: #000; line-height: 1px; font-size: 1px;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 18px; color: #000; font-family: 'PPNeueMachina-PlainUltrabold', Arial, Helvetica, sans-serif;">
                      Street Art <br/> Museum <br/> Amsterdam
                    </td>
                    <td style="padding: 32px 0 0 0; text-align: left;">
                      <img src="https://www.streetartmapamsterdam.nl/sama-logo.png" alt="Street Art Museum Amsterdam" style="width: 120px; height: auto; display: block;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`
    });

    if (error) {
      console.error('Resend welcome email error:', error);
      throw error;
    }

    console.log('Welcome email sent successfully via Resend to:', email);
    return { success: true };
  } catch (error) {
    console.error('Resend welcome email error:', error);
    throw error;
  }
}



// Send welcome email endpoint (for testing)
app.post('/api/email/send-welcome', async (req, res) => {
  try {
    const { email, region } = req.body;
    if (!email || !region) {
      return res.status(400).json({ error: 'Email and region are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Send welcome email
    await sendWelcomeEmail(email, region);
    
    return res.json({
      success: true,
      message: 'Welcome email sent successfully'
    });
  } catch (error) {
    console.error('Send welcome email error:', error);
    return res.status(500).json({
      error: 'Failed to send welcome email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});



// Test webhook simulation endpoint (for development)
app.post('/api/test/simulate-webhook', async (req, res) => {
  try {
    const { email = 'superdwayne@gmail.com', region = 'East' } = req.body;
    
    console.log('\n🧪 SIMULATING WEBHOOK WITH PROPER DATA');
    console.log('====================================');
    
    console.log('Customer email:', email);
    console.log('Region:', region);
    
    // Send magic link instead of token
    await sendMagicLinkViaAPI(email);
    console.log(`✅ Magic link sent to ${email}`);
    
    res.json({
      success: true,
      message: 'Webhook simulation completed - magic link sent',
      email: email,
      region: region
    });
    
  } catch (error) {
    console.error('❌ Webhook simulation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get price from Stripe price ID
app.get('/api/get-price', async (req, res) => {
  try {
    const { priceId } = req.query;
    
    console.log('🔍 Price API called with priceId:', priceId);
    
    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
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

    const priceData = {
      amount: price.unit_amount,
      currency: price.currency,
      formattedPrice: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: price.currency.toUpperCase(),
        minimumFractionDigits: 2
      }).format(price.unit_amount / 100)
    };

    console.log('💰 Final price data:', priceData);
    res.status(200).json(priceData);

  } catch (error) {
    console.error('❌ Error fetching price:', error);
    res.status(500).json({ 
      error: 'Failed to fetch price from Stripe',
      details: error.message 
    });
  }
});
app.post('/api/create-checkout-session', async (req, res) => {
  const { region } = req.body;
  const TEST_PRICE_ID = 'price_1RbnlIJ3urOr8HD7Gor4UvdG';

  if (!region) return res.status(400).json({ error: 'Region is required' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: TEST_PRICE_ID, quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/thank-you`,
      cancel_url: `${process.env.FRONTEND_URL}`,
      metadata: { region },
      payment_intent_data: {
        metadata: { region }
      },
      custom_text: {
        submit: { message: 'Your magic link will be sent to your email after payment' }
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Access to ${region} Street Art Map - Magic link will be sent via email`,
          custom_fields: [{ name: 'Access Method', value: 'Magic Link' }]
        }
      }
    });

    console.log(`💳 Created checkout session for ${region}`);
    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Magic Link Endpoints
app.post('/api/send-magic-link', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user has purchased access before
    const hasPurchased = checkPurchaseHistory(normalizedEmail);
    
    // Generate magic link token
    const magicToken = generateMagicToken(normalizedEmail);
    
    // Store the token temporarily (5 minutes expiry)
    storeMagicToken(magicToken, normalizedEmail, hasPurchased);
    
    // Create magic link URL
    const magicLinkUrl = `${req.headers.origin || process.env.CLIENT_URL || 'http://localhost:3000'}?magic=${magicToken}`;
    
    // Send email with magic link via API endpoint
    const emailSent = await sendMagicLinkViaAPI(normalizedEmail);
    
    if (!emailSent) {
      throw new Error('Failed to send email');
    }

    res.status(200).json({
      success: true,
      message: 'Magic link sent successfully!',
      hasPurchased
    });

  } catch (error) {
    console.error('Magic link error:', error);
    res.status(500).json({ 
      error: 'Failed to send magic link. Please try again.' 
    });
  }
});

app.post('/api/verify-magic-link', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const tokenData = verifyMagicToken(token);

    if (!tokenData) {
      return res.status(401).json({ 
        error: 'Invalid or expired magic link. Please request a new one.' 
      });
    }

    // Determine regions based on purchase history
    let regions = [];
    if (tokenData.hasPurchased) {
      regions = ['North', 'South', 'West', 'Nieuw-West'];
    }

    res.status(200).json({
      success: true,
      email: tokenData.email,
      regions,
      hasPurchased: tokenData.hasPurchased,
      message: tokenData.hasPurchased 
        ? 'Welcome back! You have full access to all regions.'
        : 'Welcome! You have access to the East region.'
    });

  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({ 
      error: 'Failed to verify magic link. Please try again.' 
    });
  }
});

// Magic Link Helper Functions
function checkPurchaseHistory(email) {
  const purchasedEmails = [
    'superdwayne@gmail.com'
  ];
  return purchasedEmails.includes(email);
}

function generateMagicToken(email) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const payload = `${email}:${timestamp}:${random}`;
  return Buffer.from(payload).toString('base64').replace(/[+/=]/g, '');
}

function storeMagicToken(token, email, hasPurchased) {
  if (!global.magicTokens) {
    global.magicTokens = new Map();
  }
  
  const tokenData = {
    email,
    hasPurchased,
    createdAt: Date.now(),
    expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
  };
  
  global.magicTokens.set(token, tokenData);
  
  // Clean up expired tokens
  cleanupExpiredTokens();
}

function cleanupExpiredTokens() {
  if (!global.magicTokens) return;
  
  const now = Date.now();
  for (const [token, data] of global.magicTokens.entries()) {
    if (now > data.expiresAt) {
      global.magicTokens.delete(token);
    }
  }
}

function verifyMagicToken(token) {
  if (!global.magicTokens) {
    return null;
  }
  
  const tokenData = global.magicTokens.get(token);
  
  if (!tokenData) {
    return null;
  }
  
  if (Date.now() > tokenData.expiresAt) {
    global.magicTokens.delete(token);
    return null;
  }
  
  global.magicTokens.delete(token);
  return tokenData;
}

// Send magic link email via API endpoint to ensure consistent template
async function sendMagicLinkViaAPI(email) {
  try {
    const baseUrl = process.env.API_URL || process.env.VITE_API_URL || 'https://www.streetartmapamsterdam.nl/';
    const apiUrl = baseUrl.endsWith('/') ? baseUrl + 'api' : baseUrl + '/api';
    const fullUrl = `${apiUrl}/send-magic-link`;
    
    console.log('🔗 Calling Vercel API:', fullUrl);
    console.log('📧 Email:', email);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    console.log('📡 API Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error response:', errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Magic link sent via API:', result);
    return true;
  } catch (error) {
    console.error('❌ Error sending magic link via API:', error);
    
    // Fallback for development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 DEVELOPMENT MODE - Magic link request for:', email);
      return true;
    }
    
    return false;
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the Express app for Vercel
module.exports = app;