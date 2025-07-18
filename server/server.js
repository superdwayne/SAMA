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
    const accessToken = session.metadata?.access_token;
    let region = session.metadata?.region;
    
    console.log('📧 Customer email:', customerEmail);
    console.log('🔑 Access token from metadata:', accessToken);
    console.log('🗺️ Region from session metadata:', region);
    
    // If no metadata on session, check if this came from a payment link
    if (!region && session.payment_link) {
      try {
        console.log('🔗 Session came from payment link, fetching metadata...');
        const paymentLink = await stripe.paymentLinks.retrieve(session.payment_link);
        console.log('🔍 Payment link metadata:', JSON.stringify(paymentLink.metadata, null, 2));
        region = paymentLink.metadata?.region || 'Center';
        
        // Log additional metadata for debugging
        console.log('🔍 Payment link source:', paymentLink.metadata?.source);
        console.log('🔍 Payment link auto_generate_token:', paymentLink.metadata?.auto_generate_token);
      } catch (error) {
        console.error('❌ Error fetching payment link metadata:', error);
      }
    }
    
    // Check if this is a hardcoded payment link with metadata
    const isHardcodedLink = session.metadata?.source === 'hardcoded_link' || session.metadata?.auto_generate_token === 'true' || 
                           (session.payment_link && !accessToken); // Also detect payment links without explicit source
    
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

// Enhanced send email function using Resend
async function sendTokenEmail(email, token, region) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.SENDER_EMAIL || 'noreply@streetartmapamsterdam.nl',
      to: [email],
      subject: 'Your Amsterdam Street Art Map Access Token',
      text: `Thank you for your purchase!\n\nYour access token for the ${region} district is:\n${token}\n\nThis token is valid for 30 days until ${expirationDate.toLocaleDateString()}.\n\nTo activate your access:\n1. Go to ${process.env.CLIENT_URL || 'http://localhost:3000'}/token\n2. Enter your email address\n3. Enter the token above\n4. Enjoy exploring Amsterdam's street art!\n\nImportant: Keep this token safe. You'll need it to access the map.\n\nIf you have any questions, please contact us at info@streetartmuseumamsterdam.com\n\nBest regards,\nAmsterdam Street Art Map Team`,
      html: `<!DOCTYPE html>
<html style="background-color: #FFFF00;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amsterdam Street Art Map – Your Token</title>
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
<body>
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
                <td style="font-size: 24px; font-weight: bold; color: #000; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;">
                  🎨 Thank you for your purchase!
                </td>
              </tr>
              <tr>
                <td style="font-size: 18px; color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                  Your access to the <strong>${region}</strong> district is now active.
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFF00; border: 2px solid #000; border-radius: 8px;">
                    <tr>
                      <td style="padding: 15px; text-align: center; font-weight: bold; color: #000; font-family: 'PPNeueMachina-PlainUltrabold', Arial, Helvetica, sans-serif; margin: 0;">
                        🎯 Start your street art adventure in ${region}!
                      </td>
                    </tr>
                  </table>
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
      console.error('Resend email send error:', error);
      if (process.env.NODE_ENV === 'development') {
        console.log('DEVELOPMENT MODE - Token for', email, ':', token);
        return { method: 'console', success: true };
      }
      throw error;
    }

    console.log('Email sent successfully via Resend to:', email);
    return { method: 'resend', success: true };
  } catch (error) {
    console.error('Resend email send error:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('DEVELOPMENT MODE - Token for', email, ':', token);
      return { method: 'console', success: true };
    }
    throw error;
  }
}

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