const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Generate secure magic token
const generateMagicToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Store purchase in database
async function storePurchase(session, region) {
  try {
    console.log('💾 Storing purchase - session metadata:', session.metadata);
    console.log('💾 Region being stored:', region);
    
    const customerEmail = session.customer_details.email.toLowerCase().trim();
    
    // First, get or create the user
    let { data: user, error: userFetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', customerEmail)
      .single();
    
    if (userFetchError && userFetchError.code !== 'PGRST116') {
      throw userFetchError;
    }
    
    if (!user) {
      // Create new user with 30-day expiration
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email: customerEmail,
          regions: [region],
          regions_expires_at: expiresAt.toISOString(),
          total_spent: session.amount_total,
          first_purchase_at: new Date().toISOString(),
          last_purchase_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (createError) throw createError;
      user = newUser;
      console.log('✅ Created new user with 30-day access:', user.id);
    } else {
      // Update existing user - add region if not already present and extend expiration
      const currentRegions = user.regions || [];
      const updatedRegions = currentRegions.includes(region) 
        ? currentRegions 
        : [...currentRegions, region];
      
      // Extend expiration by 30 days from now (regardless of when previous access expires)
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          regions: updatedRegions,
          regions_expires_at: newExpiresAt.toISOString(),
          total_spent: (user.total_spent || 0) + session.amount_total,
          last_purchase_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      console.log('✅ Updated user regions and extended access to:', newExpiresAt.toISOString());
      console.log('✅ User now has regions:', updatedRegions);
    }
    
    // Add to purchase history
    const { error: historyError } = await supabase
      .from('purchase_history')
      .insert([{
        user_id: user.id,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent,
        region: region,
        amount: session.amount_total,
        currency: session.currency
      }]);
    
    if (historyError) throw historyError;
    
    console.log('✅ Purchase stored successfully');
    return { user, region };
  } catch (error) {
    console.error('❌ Failed to store purchase:', error);
    throw error;
  }
}

// Create and store magic link
async function createMagicLink(email) {
  try {
    const token = generateMagicToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Update the user with the new magic token
    const { data, error } = await supabase
      .from('users')
      .update({
        magic_token: token,
        magic_token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase().trim())
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating magic link:', error);
      throw error;
    }

    console.log('✅ Magic link created for user:', data.id);
    return { token, expiresAt };
  } catch (error) {
    console.error('❌ Failed to create magic link:', error);
    throw error;
  }
}

// Send purchase confirmation email with magic link
async function sendPurchaseConfirmationEmail(email, region, baseUrl) {
  try {
    // Create magic link
    const { token } = await createMagicLink(email);
    const magicLink = `${baseUrl}?magic=${token}`;
    
    // Calculate expiration date (30 days from now)
    const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const formattedExpiration = expirationDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const msg = {
      to: email,
      from: process.env.SENDER_EMAIL || 'admin@creativetechnologists.nl',
      subject: `🎉 Welcome to Amsterdam Street Art Map - ${region} District Access`,
      html: `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Amsterdam Street Art Map – Purchase Confirmation</title>
      <style>
        /* Custom font (only supported in some clients) */
        @font-face {
          font-family: 'PPNeueMachina';
          src: url('https://www.streetartmapamsterdam.nl/fonts/PPNeueMachina-PlainRegular.otf') format('opentype');
          font-weight: 400;
        }
        @font-face {
          font-family: 'PPNeueMachina';
          src: url('https://www.streetartmapamsterdam.nl/fonts/PPNeueMachina-PlainUltrabold.otf') format('opentype');
          font-weight: 700;
        }

        body {
          margin: 0;
          padding: 40px 20px;
          background-color: #d9f33b;
          color: #000;
          font-family: 'PPNeueMachina', Arial, Helvetica, sans-serif;
        }

        /* Stacked purple logo */
        .logo {
          font-size: 32px;
          font-weight: 900;
          line-height: 0.95;
          color: #4e36ff;
          text-transform: uppercase;
        }
        .logo span {
          display: block;
        }

        .divider {
          width: 100%;
          height: 1px;
          background: #000;
          margin: 24px 0;
        }

        h2 {
          margin: 0 0 10px 0;
        }

        .button {
          display: inline-block;
          background: #4e36ff;
          color: #fff !important;
          text-decoration: none;
          padding: 14px 28px;
          font-weight: bold;
          border-radius: 4px;
          margin: 20px 0;
        }

        .success-box {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .footer {
          margin-top: 48px;
          font-size: 12px;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <!-- Logo / Header -->
      <div class="logo">
        <span>Amsterdam</span>
        <span>Street</span>
        <span>Art Map</span>
      </div>

      <p style="margin-top: 24px; font-weight: bold;">Thank you for your purchase!</p>
      <div class="divider"></div>

      <!-- Success notice -->
      <div class="success-box">
        <h2>🎉 Payment Successful!</h2>
        <p>Your purchase has been confirmed. You now have access to the <strong>${region}</strong> district.</p>
      </div>

      <!-- What's included list -->
      <h3>What's included in your ${region} access:</h3>
      <ul>
        <li>✅ Interactive map with precise locations</li>
        <li>✅ Artist information and artwork details</li>
        <li>✅ Navigation and route planning</li>
        <li>✅ Hidden gems only locals know about</li>
        <li>✅ <strong>30 days of unlimited access</strong></li>
      </ul>
      <p><strong>📅 Your access expires on: ${formattedExpiration}</strong></p>

      <!-- CTA -->
      <p><a href="${magicLink}" class="button">Access Your Map Now</a></p>

      <!-- Security notes -->
      <h3>Important:</h3>
      <ul>
        <li>This magic link expires in 30 minutes</li>
        <li>Can only be used once</li>
        <li>Your access will be permanent after activation</li>
        <li>You can always request a new magic link with this email</li>
      </ul>

      <p style="margin-top: 24px;">Can't click the button? Copy and paste this link:<br />
        <a href="${magicLink}" style="color:#4e36ff; word-break: break-all;">${magicLink}</a>
      </p>

      <!-- Footer -->
      <div class="footer">
        <p>© 2024 Amsterdam Street Art Map</p>
        <p>Need help? Reply to this email or contact us at info@streetartmapamsterdam.com</p>
        <br />
        <strong>Street Art<br />Museum<br />Amsterdam</strong>
      </div>
    </body>
  </html>`
    };

    await sgMail.send(msg);
    console.log('✅ Purchase confirmation email sent to:', email);
  } catch (error) {
    console.error('❌ Failed to send purchase confirmation email:', error);
    throw error;
  }
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
  console.log('🔔 Stripe webhook received - START');
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔍 Request body type:', typeof req.body);
  console.log('🔍 Request body preview:', req.body ? String(req.body).substring(0, 200) : 'No body');
  
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

  let event;
  try {
    let rawBody = req.body;
    
    if (!Buffer.isBuffer(rawBody)) {
      rawBody = await getRawBody(req);
    }
    
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log('✅ Webhook verified:', event.type);
  } catch (err) {
    console.error('❌ Webhook verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const customerEmail = session.customer_details?.email;
        
        // Debug: Log the entire session metadata
        console.log('🔍 Full session metadata:', JSON.stringify(session.metadata, null, 2));
        console.log('🔍 Session metadata keys:', Object.keys(session.metadata || {}));
        
        let region = session.metadata?.region || 'Center';
        
        // For payment links, check payment link metadata first
        if (session.payment_link) {
          try {
            console.log('🔗 Session came from payment link, fetching metadata...');
            const paymentLink = await stripe.paymentLinks.retrieve(session.payment_link);
            console.log('🔍 Payment link metadata:', JSON.stringify(paymentLink.metadata, null, 2));
            
            if (paymentLink.metadata?.region) {
              region = paymentLink.metadata.region;
              console.log('✅ Using region from payment link metadata:', region);
            }
          } catch (error) {
            console.error('❌ Error fetching payment link metadata:', error);
          }
        }
        
        // If still no region, check the price metadata from line items
        if (!region || region === 'Center') {
          try {
            console.log('🏷️ Checking price metadata from line items...');
            
            // Expand line_items to get price data
            const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ['line_items', 'line_items.data.price']
            });
            
            if (expandedSession.line_items?.data?.[0]?.price) {
              const price = expandedSession.line_items.data[0].price;
              console.log('🔍 Price ID:', price.id);
              console.log('🔍 Price metadata:', JSON.stringify(price.metadata, null, 2));
              
              if (price.metadata?.region) {
                region = price.metadata.region;
                console.log('✅ Using region from price metadata:', region);
              }
            }
          } catch (error) {
            console.error('❌ Error fetching price metadata:', error);
          }
        }
        
        console.log('💳 Processing completed payment:');
        console.log('  Email:', customerEmail);
        console.log('  Region:', region);
        console.log('  Amount:', session.amount_total);
        console.log('  Session ID:', session.id);
        
        if (customerEmail) {
          // Store purchase in database
          await storePurchase(session, region);
          
          // Send confirmation email with magic link
          const baseUrl = req.headers.host ? 
            `https://${req.headers.host}` : 
            'https://www.streetartmapamsterdam.nl';
          
          await sendPurchaseConfirmationEmail(customerEmail, region, baseUrl);
          
          console.log('✅ Purchase processed successfully');
        } else {
          console.log('⚠️  No customer email found in session');
        }
        break;
        
      case 'payment_intent.succeeded':
        console.log('✅ Payment intent succeeded:', event.data.object.id);
        break;
        
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', event.data.object.id);
        break;
        
      default:
        console.log('ℹ️  Unhandled event type:', event.type);
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }

  res.json({ received: true });
};
