const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Generate access token
const generateAccessToken = (region) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = crypto.randomBytes(6).toString('hex').toUpperCase();
  const regionCode = region ? region.substring(0, 3).toUpperCase() : 'AMS';
  return `${regionCode}-${timestamp}-${randomStr}`;
};

// Create magic token with embedded data (same approach as send-magic-link.js)
function createMagicToken(email, accessToken, region) {
  const data = {
    email,
    accessToken,
    region,
    hasPurchased: true, // If they're getting this from webhook, they purchased
    timestamp: Date.now()
  };
  
  // Encode data in the token itself
  const payload = JSON.stringify(data);
  return Buffer.from(payload).toString('base64').replace(/[+/=]/g, '');
}

// Send magic link email
async function sendMagicLinkEmail(email, accessToken, region, baseUrl) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  
  // Generate magic link using embedded token approach
  const magicToken = createMagicToken(email, accessToken, region);
  const magicLink = `${baseUrl}?magic=${magicToken}`;
  
  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL || 'admin@creativetechnologists.nl',
    subject: `🎨 Activate Your Amsterdam Street Art Map Access - ${region} District`,
    text: `Thank you for your purchase!\n\nClick the link below to activate your access to the ${region} district:\n${magicLink}\n\nThis link is valid for 30 minutes and can only be used once.\n\nBest regards,\nAmsterdam Street Art Map Team`,
    html: `<!DOCTYPE html><html><head><style>
      body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #FFFF00 0%, #FF6B6B 100%); color: #000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border: 2px solid #000; }
      .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px; border: 2px solid #000; border-top: none; }
      .magic-button { display: inline-block; background: #0066FF; color: white; padding: 20px 40px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 18px; border: 3px solid #000; box-shadow: 4px 4px 0px #000; }
      .magic-button:hover { background: #0052CC; }
      .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      .street-art-title { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
      .security-note { background: #E8F4FD; border: 2px solid #0066FF; border-radius: 8px; padding: 15px; margin: 20px 0; }
    </style></head><body>
      <div class="container">
        <div class="header">
          <div class="street-art-title">Street Art<br>Museum<br>Amsterdam</div>
          <p style="margin-top: 20px; font-size: 18px; font-weight: bold;">🎨 Activate Your Access</p>
        </div>
        <div class="content">
          <h2>Welcome to Amsterdam's Hidden Street Art!</h2>
          <p>Thank you for purchasing access to the <strong>${region}</strong> district. You're one click away from exploring incredible street art!</p>
          
          <center>
            <a href="${magicLink}" class="magic-button">🚀 Activate ${region} District Access</a>
          </center>
          
          <div class="security-note">
            <p><strong>🔒 Security Notice:</strong></p>
            <ul>
              <li>This link expires in <strong>30 minutes</strong></li>
              <li>Can only be used <strong>once</strong></li>
              <li>Only works with your email address</li>
              <li>Your access will be valid for <strong>30 days</strong> after activation</li>
            </ul>
          </div>
          
          <p><strong>What's included in your ${region} access:</strong></p>
          <ul>
            <li>✓ Interactive map with precise locations</li>
            <li>✓ Artist information and artwork details</li>
            <li>✓ Navigation and route planning</li>
            <li>✓ Hidden gems only locals know about</li>
          </ul>
          
          <p>Can't click the button? Copy and paste this link: <br><code>${magicLink}</code></p>
        </div>
        <div class="footer">
          <p>Questions? Contact us at info@streetartmuseumamsterdam.com</p>
          <p>&copy; 2024 Amsterdam Street Art Map</p>
        </div>
      </div>
    </body></html>`
  };
  
  await sgMail.send(msg);
  console.log('✅ Magic link email sent to:', email);
  console.log('🔗 Magic token generated:', magicToken.substring(0, 8) + '...');
}

// Read raw body from request
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(Buffer.from(data, 'utf8')));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  console.log('🔔 Webhook endpoint /api/webhook called');
  console.log('📝 Method:', req.method);
  console.log('📋 Headers:', Object.keys(req.headers));
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('🔍 Body type:', typeof req.body);
  console.log('🔍 Is Buffer:', Buffer.isBuffer(req.body));
  console.log('🔍 Signature present:', !!sig);
  
  let event;
  try {
    // Try req.body first (if Vercel gives us raw body)
    let rawBody = req.body;
    
    // If still not a buffer, read from stream
    if (!Buffer.isBuffer(rawBody)) {
      console.log('📖 Reading raw body from stream...');
      rawBody = await getRawBody(req);
    }
    
    console.log('🔍 Final raw body length:', rawBody.length);
    
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log('✅ Webhook verified:', event.type);
  } catch (err) {
    console.error('❌ Webhook failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Process the webhook
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;
    const region = session.metadata?.region || 'Center';
    
    console.log('📧 Email:', customerEmail);
    console.log('🗺️ Region:', region);
    
    if (customerEmail) {
      try {
        const accessToken = generateAccessToken(region);
        const baseUrl = req.headers.host ? `https://${req.headers.host}` : 'https://www.streetartmapamsterdam.nl';
        
        await sendMagicLinkEmail(customerEmail, accessToken, region, baseUrl);
        console.log('✅ Success! Magic link sent for access token:', accessToken.substring(0, 8) + '...');
      } catch (error) {
        console.error('❌ Email failed:', error);
      }
    }
  }

  res.json({ received: true });
};