require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');

// For Vercel, we'll use /tmp directory for temporary files
const tokensPath = path.join('/tmp', 'tokens.json');

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

const sgMail = require('@sendgrid/mail');

const app = express();

// Initialize SendGrid
console.log('🔑 SendGrid API Key loaded:', process.env.SENDGRID_API_KEY ? `${process.env.SENDGRID_API_KEY.substring(0, 20)}...` : 'NOT FOUND');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000'
}));

// Special middleware for Stripe webhook (needs raw body)
app.use('/stripe/webhook', express.raw({type: 'application/json'}));

// Webhook route must come before express.json()
app.post('/stripe/webhook', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 [${timestamp}] WEBHOOK ENDPOINT CALLED`);
  
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
    const accessToken = session.metadata?.access_token;
    const region = session.metadata?.region;
    
    console.log('Customer email:', customerEmail);
    console.log('Access token:', accessToken);
    console.log('Region:', region);
    
    if (!customerEmail || !accessToken || !region) {
      console.error('❌ Missing required data');
      return res.json({received: true});
    }

    try {
      const tokenData = await getToken(accessToken);
      if (!tokenData) {
        console.error('❌ Token not found in storage:', accessToken);
        return res.json({received: true});
      }

      await storeToken(accessToken, {
        ...tokenData,
        email: customerEmail,
        status: 'active',
        stripeSessionId: session.id,
        activatedAt: Date.now()
      });
      console.log('✅ Token status updated to active');
      
      await sendTokenEmail(customerEmail, accessToken, region);
      console.log(`✅ Access token email sent to ${customerEmail}`);
      
    } catch (error) {
      console.error('❌ Failed to process webhook:', error);
    }
  }

  res.json({received: true});
});

// Regular JSON middleware for other endpoints (must come after webhook)
app.use(express.json());

// Generate access token
const generateAccessToken = (region) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = crypto.randomBytes(6).toString('hex').toUpperCase();
  const regionCode = region ? region.substring(0, 3).toUpperCase() : 'AMS';
  return `${regionCode}-${timestamp}-${randomStr}`;
};

// Enhanced send email function using SendGrid only
async function sendTokenEmail(email, token, region) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  
  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL || 'noreply@streetartmap.com',
    subject: 'Your Amsterdam Street Art Map Access Token',
    text: `Thank you for your purchase!\n\nYour access token for the ${region} district is:\n${token}\n\nThis token is valid for 30 days until ${expirationDate.toLocaleDateString()}.\n\nTo activate your access:\n1. Go to ${process.env.CLIENT_URL || 'http://localhost:3000'}/token\n2. Enter your email address\n3. Enter the token above\n4. Enjoy exploring Amsterdam's street art!\n\nImportant: Keep this token safe. You'll need it to access the map.\n\nIf you have any questions, please contact us at info@streetartmuseumamsterdam.com\n\nBest regards,\nAmsterdam Street Art Map Team`,
    html: `<!DOCTYPE html><html><head><style>body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; } .container { max-width: 600px; margin: 0 auto; padding: 20px; } .header { background: linear-gradient(135deg, #FFFF00 0%, #FF6B6B 100%); color: #000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border: 2px solid #000; } .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px; border: 2px solid #000; border-top: none; } .token-box { background: white; border: 3px solid #000; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; box-shadow: 5px 5px 0px #000; } .token { font-family: 'Courier New', monospace; font-size: 24px; color: #000; font-weight: bold; background: #FFFF00; padding: 10px; border-radius: 5px; } .button { display: inline-block; background: #0066FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; border: 2px solid #000; box-shadow: 3px 3px 0px #000; } .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; } .street-art-title { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }</style></head><body><div class="container"><div class="header"><div class="street-art-title">Street Art<br>Museum<br>Amsterdam</div><p style="margin-top: 20px; font-size: 18px; font-weight: bold;">Your Access Token</p></div><div class="content"><h2>🎨 Thank you for your purchase!</h2><p>Your access token for the <strong>${region}</strong> district is:</p><div class="token-box"><div class="token">${token}</div></div><p><strong>⏰ Valid until:</strong> ${expirationDate.toLocaleDateString()}</p><h3>🚀 How to activate:</h3><ol style="font-size: 16px; line-height: 1.8;"><li>Click the button below or go to our website</li><li>Enter your email address</li><li>Enter the token above</li><li>Start exploring Amsterdam's hidden street art!</li></ol><center><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/token" class="button">🗝️ Activate Your Access</a></center><p><strong>⚠️ Important:</strong> Keep this email safe. You'll need the token to access the map.</p><div style="background: #FFFF00; padding: 15px; border-radius: 8px; border: 2px solid #000; margin-top: 20px;"><p style="margin: 0; font-weight: bold; color: #000;">🎯 Start your street art adventure in ${region}!</p></div></div><div class="footer"><p>Questions? Contact us at info@streetartmuseumamsterdam.com</p><p>&copy; 2024 Amsterdam Street Art Map</p></div></div></body></html>`
  };
  try {
    await sgMail.send(msg);
    console.log('Email sent successfully via SendGrid to:', email);
    return { method: 'sendgrid', success: true };
  } catch (error) {
    console.error('SendGrid email send error:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('DEVELOPMENT MODE - Token for', email, ':', token);
      return { method: 'console', success: true };
    }
    throw error;
  }
}

async function storeToken(token, data) {
  let tokens = {};
  try {
    const content = await fs.readFile(tokensPath, 'utf8');
    tokens = JSON.parse(content);
  } catch (err) {
    // Ignore if file does not exist
  }
  tokens[token] = data;
  await fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2));
}

async function getToken(token) {
  try {
    const content = await fs.readFile(tokensPath, 'utf8');
    const tokens = JSON.parse(content);
    return tokens[token];
  } catch (err) {
    return null;
  }
}

// Send token email endpoint (for manual token generation)
app.post('/email/send-token', async (req, res) => {
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
    // Generate token
    const token = generateAccessToken(region);
    // Store token
    await storeToken(token, {
      email,
      region,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
      status: 'active',
      activatedAt: Date.now(),
      testToken: true
    });
    // Send email
    const emailResult = await sendTokenEmail(email, token, region);
    
    return res.json({
      success: true,
      message: 'Access token sent to email successfully',
      emailMethod: emailResult.method,
      token: process.env.NODE_ENV === 'development' ? token : undefined
    });
  } catch (error) {
    console.error('Send token email error:', error);
    if (res.headersSent) return;
    return res.status(500).json({
      error: 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Validate token endpoint
app.post('/token/validate', async (req, res) => {
  try {
    const { token, email } = req.body;
    
    const tokenData = await getToken(token);
    
    if (!tokenData) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Token not found' 
      });
    }
    
    if (tokenData.email !== email) {
      return res.status(403).json({ 
        valid: false, 
        error: 'Email does not match token' 
      });
    }
    
    const tokenStatus = tokenData.status || 'active';
    
    if (tokenStatus !== 'active') {
      return res.status(402).json({ 
        valid: false, 
        error: 'Token not activated - payment may still be processing' 
      });
    }
    
    if (Date.now() > tokenData.expiresAt) {
      return res.status(410).json({ 
        valid: false, 
        error: 'Token has expired' 
      });
    }
    
    res.json({
      valid: true,
      region: tokenData.region,
      expiresAt: tokenData.expiresAt,
      activatedAt: tokenData.activatedAt,
      isTestToken: tokenData.testToken || false
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/create-checkout-session', async (req, res) => {
  const { region } = req.body;
  const TEST_PRICE_ID = 'price_1RbnlIJ3urOr8HD7Gor4UvdG';

  if (!region) return res.status(400).json({ error: 'Region is required' });

  const accessToken = generateAccessToken(region);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: TEST_PRICE_ID, quantity: 1 }],
      mode: 'payment',
      success_url: `https://www.streetartmapamsterdam.nl/thank-you`,
      cancel_url: `https://www.streetartmapamsterdam.nl`,
      metadata: { access_token: accessToken, region },
      payment_intent_data: {
        metadata: { access_token: accessToken, region }
      },
      custom_text: {
        submit: { message: 'Your access token will be included in your receipt email' }
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Access to ${region} Street Art Map - Your token: ${accessToken}`,
          custom_fields: [{ name: 'Access Token', value: accessToken }]
        }
      }
    });

    await storeToken(accessToken, {
      region,
      email: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      stripeSessionId: session.id
    });

    console.log(`💳 Created checkout session for ${region}, token: ${accessToken}`);
    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Export for Vercel
module.exports = app;