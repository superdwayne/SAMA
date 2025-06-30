// This tells Vercel to not parse the body for this function
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Generate access token function
const generateAccessToken = (region) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = crypto.randomBytes(6).toString('hex').toUpperCase();
  const regionCode = region ? region.substring(0, 3).toUpperCase() : 'AMS';
  return `${regionCode}-${timestamp}-${randomStr}`;
};

// Send token email function
async function sendTokenEmail(email, token, region) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  
  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL || 'admin@creativetechnologists.nl',
    subject: 'Your Amsterdam Street Art Map Access Token',
    text: `Thank you for your purchase!\n\nYour access token for the ${region} district is:\n${token}\n\nThis token is valid for 30 days until ${expirationDate.toLocaleDateString()}.\n\nTo activate your access:\n1. Go to https://www.streetartmapamsterdam.nl/token\n2. Enter your email address\n3. Enter the token above\n4. Start exploring Amsterdam's street art!\n\nImportant: Keep this token safe. You'll need it to access the map.`,
    html: `<!DOCTYPE html><html><head><style>body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; } .container { max-width: 600px; margin: 0 auto; padding: 20px; } .header { background: linear-gradient(135deg, #FFFF00 0%, #FF6B6B 100%); color: #000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border: 2px solid #000; } .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px; border: 2px solid #000; border-top: none; } .token-box { background: white; border: 3px solid #000; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; box-shadow: 5px 5px 0px #000; } .token { font-family: 'Courier New', monospace; font-size: 24px; color: #000; font-weight: bold; background: #FFFF00; padding: 10px; border-radius: 5px; } .button { display: inline-block; background: #0066FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; border: 2px solid #000; box-shadow: 3px 3px 0px #000; } .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; } .street-art-title { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }</style></head><body><div class="container"><div class="header"><div class="street-art-title">Street Art<br>Museum<br>Amsterdam</div><p style="margin-top: 20px; font-size: 18px; font-weight: bold;">Your Access Token</p></div><div class="content"><h2>🎨 Thank you for your purchase!</h2><p>Your access token for the <strong>${region}</strong> district is:</p><div class="token-box"><div class="token">${token}</div></div><p><strong>⏰ Valid until:</strong> ${expirationDate.toLocaleDateString()}</p><h3>🚀 How to activate:</h3><ol style="font-size: 16px; line-height: 1.8;"><li>Click the button below or go to our website</li><li>Enter your email address</li><li>Enter the token above</li><li>Start exploring Amsterdam's hidden street art!</li></ol><center><a href="https://www.streetartmapamsterdam.nl/token" class="button">🗝️ Activate Your Access</a></center><p><strong>⚠️ Important:</strong> Keep this email safe. You'll need the token to access the map.</p><div style="background: #FFFF00; padding: 15px; border-radius: 8px; border: 2px solid #000; margin-top: 20px;"><p style="margin: 0; font-weight: bold; color: #000;">🎯 Start your street art adventure in ${region}!</p></div></div><div class="footer"><p>Questions? Contact us at info@streetartmuseumamsterdam.com</p><p>&copy; 2024 Amsterdam Street Art Map</p></div></div></body></html>`
  };
  
  try {
    await sgMail.send(msg);
    console.log('✅ Email sent successfully via SendGrid to:', email);
    return { method: 'sendgrid', success: true };
  } catch (error) {
    console.error('❌ SendGrid email send error:', error);
    console.error('❌ SendGrid error details:', {
      code: error.code,
      message: error.message,
      response: error.response?.body
    });
    throw error;
  }
}

// Raw body parser for webhooks
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(Buffer.from(data, 'utf8'));
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req;
  
  console.log(`Request: ${req.method} ${url}`);

  // Health check
  if (url === '/api/health' && req.method === 'GET') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // Test SendGrid email endpoint
  if (url === '/api/test-email' && req.method === 'POST') {
    console.log('📧 Test email endpoint called');
    
    try {
      // For test endpoint, we need to read the body since bodyParser is disabled
      const rawBody = await getRawBody(req);
      const body = JSON.parse(rawBody.toString());
      
      console.log('🔍 Parsed body:', body);
      
      const { email, region } = body;
      console.log('📧 Test email for:', email, 'Region:', region);
      
      if (!email || !region) {
        console.log('❌ Missing email or region');
        return res.status(400).json({ error: 'Email and region required' });
      }
      
      const testToken = generateAccessToken(region);
      console.log('🔑 Generated test token:', testToken);
      
      await sendTokenEmail(email, testToken, region);
      console.log('✅ Test email sent successfully');
      
      return res.json({ 
        success: true, 
        message: 'Test email sent',
        token: testToken,
        email: email,
        region: region
      });
    } catch (error) {
      console.error('❌ Test email failed:', error);
      return res.status(500).json({ error: error.message, stack: error.stack });
    }
  }

  // Stripe webhook - handle raw body properly
  if (url === '/api/stripe/webhook' && req.method === 'POST') {
    console.log('🔔 Webhook endpoint called');
    
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!endpointSecret) {
      console.error('⚠️ STRIPE_WEBHOOK_SECRET not set');
      return res.status(400).send('Webhook secret not configured');
    }

    let event;
    try {
      // With bodyParser: false, req.body should be a Buffer
      const rawBody = req.body;
      
      console.log('🔍 Raw body type:', typeof rawBody);
      console.log('🔍 Raw body is Buffer:', Buffer.isBuffer(rawBody));
      console.log('🔍 Raw body length:', rawBody?.length);
      console.log('🔍 Signature header:', sig ? 'Present' : 'Missing');
      
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      console.log('✅ Webhook signature verified:', event.type);
    } catch (err) {
      console.log(`❌ Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email || session.customer_email;
      const region = session.metadata?.region;
      const isHardcodedLink = session.metadata?.source === 'hardcoded_link' || session.metadata?.auto_generate_token === 'true';
      
      console.log('📧 Customer email:', customerEmail);
      console.log('🗺️ Region:', region);
      console.log('🔗 Is hardcoded link:', isHardcodedLink);
      
      // For hardcoded links with region metadata, generate token and send email
      if (isHardcodedLink && region && customerEmail) {
        console.log('🔗 Hardcoded payment link detected with region:', region);
        const newAccessToken = generateAccessToken(region);
        
        console.log('🔑 Generated new token:', newAccessToken);
        
        try {
          await sendTokenEmail(customerEmail, newAccessToken, region);
          console.log(`✅ Access token email sent to ${customerEmail} with token ${newAccessToken}`);
        } catch (error) {
          console.error('❌ Failed to send email for hardcoded payment:', error);
        }
      }
      // Fallback for completely missing metadata (legacy)
      else if (!region && customerEmail) {
        console.log('⚠️ Legacy hardcoded link detected, using default region Centre');
        const newAccessToken = generateAccessToken('Centre');
        const defaultRegion = 'Centre';
        
        try {
          await sendTokenEmail(customerEmail, newAccessToken, defaultRegion);
          console.log(`✅ Legacy payment processed - access token email sent to ${customerEmail}`);
        } catch (error) {
          console.error('❌ Failed to send email for legacy payment:', error);
        }
      }
      // Log if we couldn't process the payment
      else {
        console.log('⚠️ Could not process payment - missing email or region:', { customerEmail, region });
      }
    }

    return res.json({received: true});
  }

  // Default response
  return res.status(404).json({ error: 'Not found', url: url, method: req.method });
};
