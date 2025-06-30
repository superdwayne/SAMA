require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const tokensPath = path.join(process.cwd(), 'tokens.json');

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
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize SendGrid
console.log('🔑 SendGrid API Key loaded:', process.env.SENDGRID_API_KEY ? `${process.env.SENDGRID_API_KEY.substring(0, 20)}...` : 'NOT FOUND');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
    const accessToken = session.metadata?.access_token;
    const region = session.metadata?.region;
    
    console.log('📧 Customer email:', customerEmail);
    console.log('🔑 Access token from metadata:', accessToken);
    console.log('🗺️ Region from metadata:', region);
    
    // Check if this is a hardcoded payment link with metadata
    const isHardcodedLink = session.metadata?.source === 'hardcoded_link' || session.metadata?.auto_generate_token === 'true';
    
    // For hardcoded links with region metadata, generate token
    if (isHardcodedLink && region && customerEmail) {
      console.log('🔗 Hardcoded payment link detected with region:', region);
      const newAccessToken = generateAccessToken(region);
      
      console.log('🔑 Generated new token:', newAccessToken);
      console.log('🗺️ Using region:', region);
      
      try {
        await storeToken(newAccessToken, {
          email: customerEmail,
          region: region,
          status: 'active',
          stripeSessionId: session.id,
          activatedAt: Date.now(),
          createdAt: Date.now(),
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
          source: 'hardcoded_link'
        });
        
        await sendTokenEmail(customerEmail, newAccessToken, region);
        console.log(`✅ Access token email sent to ${customerEmail} with token ${newAccessToken}`);
        
      } catch (error) {
        console.error('❌ Failed to process hardcoded payment:', error);
      }
      
      return res.json({received: true});
    }
    
    // Fallback for completely missing metadata (legacy hardcoded links)
    if (!accessToken && !region && customerEmail) {
      console.log('⚠️ Legacy hardcoded link detected, using default region');
      const newAccessToken = generateAccessToken('Centre');
      const newRegion = 'Centre';
      
      try {
        await storeToken(newAccessToken, {
          email: customerEmail,
          region: newRegion,
          status: 'active',
          stripeSessionId: session.id,
          activatedAt: Date.now(),
          createdAt: Date.now(),
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
          source: 'legacy_hardcoded_link'
        });
        
        await sendTokenEmail(customerEmail, newAccessToken, newRegion);
        console.log(`✅ Legacy payment processed - access token email sent to ${customerEmail}`);
        
      } catch (error) {
        console.error('❌ Failed to process legacy payment:', error);
      }
      
      return res.json({received: true});
    }
    
    // Original logic for API-generated payments
    if (!customerEmail || !accessToken || !region) {
      console.error('❌ Missing required data for API payment');
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
      console.error('❌ Failed to process API payment:', error);
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

// Send welcome email function
async function sendWelcomeEmail(email, region) {
  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL || 'noreply@streetartmap.com',
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
1. Check your email for your access token
2. Visit our map at ${process.env.CLIENT_URL || 'http://localhost:3000'}
3. Enter your token to unlock the ${region} district
4. Start exploring!

Tips for your street art adventure:
🎨 Best time to visit: Early morning or late afternoon for great lighting
📱 Screenshot interesting pieces for your collection
🚶‍♂️ Wear comfortable walking shoes
📸 Don't forget your camera!

Happy exploring!
The Amsterdam Street Art Map Team

Questions? Reply to this email or contact info@streetartmuseumamsterdam.com`,
    html: `<!DOCTYPE html><html><head><style>body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; } .container { max-width: 600px; margin: 0 auto; padding: 20px; } .header { background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 15px 15px 0 0; } .content { background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 15px 15px; border: 3px solid #000; border-top: none; } .welcome-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); } .region-badge { background: #FFFF00; color: #000; padding: 10px 20px; border-radius: 25px; font-weight: bold; font-size: 18px; border: 2px solid #000; display: inline-block; margin: 20px 0; box-shadow: 3px 3px 0px #000; } .features-list { background: white; border: 3px solid #000; border-radius: 10px; padding: 25px; margin: 25px 0; box-shadow: 5px 5px 0px #000; } .features-list h3 { color: #FF6B6B; margin-top: 0; font-size: 20px; } .feature-item { margin: 10px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; } .tips-section { background: #E8F4FD; border: 3px solid #0066FF; border-radius: 10px; padding: 25px; margin: 25px 0; } .button { display: inline-block; background: #0066FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; border: 3px solid #000; box-shadow: 4px 4px 0px #000; } .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; padding: 20px; }</style></head><body><div class="container"><div class="header"><div class="welcome-title">Welcome!</div><p style="font-size: 18px; margin: 15px 0 0 0;">You're now part of Amsterdam's street art community</p></div><div class="content"><div class="region-badge">${region} District Access</div><h2 style="color: #FF6B6B;">🎨 Your Street Art Adventure Begins!</h2><p style="font-size: 18px;">Thank you for purchasing access to the <strong>${region}</strong> district. You're about to discover some of Amsterdam's most incredible street art!</p><div class="features-list"><h3>🗺️ What's included in your ${region} access:</h3><div class="feature-item">✓ Interactive map with precise locations</div><div class="feature-item">✓ Artist information and artwork details</div><div class="feature-item">✓ Navigation and route planning</div><div class="feature-item">✓ Hidden gems only locals know about</div><div class="feature-item">✓ 30 days of unlimited access</div></div><h3 style="color: #4ECDC4;">🚀 Getting Started:</h3><ol style="font-size: 16px; line-height: 1.8;"><li>Check your email for your access token</li><li>Visit our map and enter your token</li><li>Unlock the ${region} district</li><li>Start exploring!</li></ol><center><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">🗺️ Start Exploring Now</a></center><div class="tips-section"><h3 style="color: #0066FF; margin-top: 0;">💡 Tips for your street art adventure:</h3><p><strong>🎨 Best time to visit:</strong> Early morning or late afternoon for great lighting</p><p><strong>📱 Pro tip:</strong> Screenshot interesting pieces for your collection</p><p><strong>🚶‍♂️ Comfort first:</strong> Wear comfortable walking shoes</p><p><strong>📸 Don't forget:</strong> Your camera for amazing shots!</p></div><p style="font-size: 18px; text-align: center; margin-top: 30px;"><strong>Happy exploring! 🎭</strong></p><p style="text-align: center;">The Amsterdam Street Art Map Team</p></div><div class="footer"><p>Questions? Reply to this email or contact info@streetartmuseumamsterdam.com</p><p>&copy; 2024 Amsterdam Street Art Map</p></div></div></body></html>`
  };

  try {
    await sgMail.send(msg);
    console.log('Welcome email sent successfully via SendGrid to:', email);
    return { success: true };
  } catch (error) {
    console.error('SendGrid welcome email error:', error);
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

// Send token email endpoint (for manual token generation)
app.post('/api/email/send-token', async (req, res) => {
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
app.post('/api/token/validate', async (req, res) => {
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

// Test webhook simulation endpoint (for development)
app.post('/api/test/simulate-webhook', async (req, res) => {
  try {
    const { email = 'superdwayne@gmail.com', region = 'East' } = req.body;
    
    console.log('\n🧪 SIMULATING WEBHOOK WITH PROPER DATA');
    console.log('====================================');
    
    // Generate test data like a real payment
    const accessToken = generateAccessToken(region);
    
    // Store token first (like create-checkout-session does)
    await storeToken(accessToken, {
      region,
      email: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      stripeSessionId: 'sim_test_session_123'
    });
    
    console.log('Customer email:', email);
    console.log('Access token:', accessToken);
    console.log('Region:', region);
    
    // Now simulate the webhook processing
    const tokenData = await getToken(accessToken);
    if (!tokenData) {
      console.error('❌ Token not found in storage:', accessToken);
      return res.status(500).json({ error: 'Token not found' });
    }

    await storeToken(accessToken, {
      ...tokenData,
      email: email,
      status: 'active',
      stripeSessionId: 'sim_test_session_123',
      activatedAt: Date.now()
    });
    console.log('✅ Token status updated to active');
    
    await sendTokenEmail(email, accessToken, region);
    console.log(`✅ Access token email sent to ${email}`);
    
    res.json({
      success: true,
      message: 'Webhook simulation completed',
      accessToken: accessToken,
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
app.post('/api/create-checkout-session', async (req, res) => {
  const { region } = req.body;
  const TEST_PRICE_ID = 'price_1RbnlIJ3urOr8HD7Gor4UvdG';

  if (!region) return res.status(400).json({ error: 'Region is required' });

  const accessToken = generateAccessToken(region);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: TEST_PRICE_ID, quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/thank-you`,
      cancel_url: `${process.env.FRONTEND_URL}`,
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
    
    // Send email with magic link
    const emailSent = await sendMagicLinkEmail(normalizedEmail, magicLinkUrl, hasPurchased);
    
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

async function sendMagicLinkEmail(email, magicLinkUrl, hasPurchased) {
  const subject = hasPurchased 
    ? '🎨 Your Amsterdam Street Art Map Access Link'
    : '🎨 Welcome to Amsterdam Street Art Map';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f8f9fa;
        }
        .container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 20px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 2rem;
        }
        .content { 
          padding: 40px 20px; 
        }
        .access-button { 
          display: inline-block; 
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white; 
          padding: 16px 32px; 
          text-decoration: none; 
          border-radius: 10px; 
          font-weight: bold; 
          font-size: 1.1rem;
          margin: 20px 0; 
          text-align: center;
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }
        .status-box {
          background: ${hasPurchased ? '#d4edda' : '#fff3cd'};
          border: 1px solid ${hasPurchased ? '#c3e6cb' : '#ffeaa7'};
          color: ${hasPurchased ? '#155724' : '#856404'};
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
        }
        .footer { 
          background: #f8f9fa; 
          padding: 20px; 
          text-align: center; 
          font-size: 0.9rem; 
          color: #666; 
        }
        .warning { 
          background: #fff3cd; 
          border: 1px solid #ffeaa7; 
          color: #856404; 
          padding: 15px; 
          border-radius: 6px; 
          margin: 20px 0; 
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎨 Amsterdam Street Art Map</h1>
          <p>Your magic access link is ready!</p>
        </div>
        
        <div class="content">
          ${hasPurchased ? `
            <div class="status-box">
              <h2>🎉 Welcome Back!</h2>
              <p>We found your previous purchase! You have full access to all map regions.</p>
            </div>
          ` : `
            <div class="status-box">
              <h2>🗺️ Welcome!</h2>
              <p>You'll have access to the East region (free) and can purchase additional regions once inside.</p>
            </div>
          `}
          
          <h2>Ready to explore Amsterdam's street art?</h2>
          <p>Click the button below to access your interactive map:</p>
          
          <div class="button-container">
            <a href="${magicLinkUrl}" class="access-button">
              🚀 Access My Map Now
            </a>
          </div>
          
          <div class="warning">
            ⏰ <strong>Important:</strong> This magic link expires in 5 minutes and can only be used once.
          </div>
          
          <h3>What you'll discover:</h3>
          <ul>
            <li>🎨 Interactive map of Amsterdam's best street art</li>
            <li>📍 Exact locations with walking directions</li>
            <li>🖼️ High-quality photos of each artwork</li>
            <li>🚶‍♂️ Curated walking routes through the city</li>
          </ul>
          
          <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #f8f9fa; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 0.9rem; border: 1px solid #e9ecef;">
            ${magicLinkUrl}
          </p>
        </div>
        
        <div class="footer">
          <p>This email was sent to ${email}</p>
          <p>Amsterdam Street Art Map - Discover the city's hidden artistic treasures</p>
          <p>If you didn't request this link, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Amsterdam Street Art Map - Your Magic Access Link
    
    ${hasPurchased ? 
      'Welcome back! We found your previous purchase - you have full access!' : 
      'Welcome! You have access to the East region and can purchase more inside.'
    }
    
    Click this link to access your map: ${magicLinkUrl}
    
    This link expires in 5 minutes and can only be used once.
    
    Discover Amsterdam's amazing street art with interactive maps, exact locations, and walking directions!
    
    If you didn't request this link, you can safely ignore this email.
  `;

  const msg = {
    to: email,
    from: {
      email: process.env.SENDER_EMAIL || 'admin@creativetechnologists.nl',
      name: 'Amsterdam Street Art Map'
    },
    subject: subject,
    html: html,
    text: text
  };

  try {
    await sgMail.send(msg);
    console.log('Magic link email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('SendGrid error:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('DEVELOPMENT MODE - Magic link for', email, ':', magicLinkUrl);
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