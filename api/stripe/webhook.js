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
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email: customerEmail,
          regions: [region],
          total_spent: session.amount_total,
          first_purchase_at: new Date().toISOString(),
          last_purchase_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (createError) throw createError;
      user = newUser;
      console.log('✅ Created new user:', user.id);
    } else {
      // Update existing user - add region if not already present
      const currentRegions = user.regions || [];
      const updatedRegions = currentRegions.includes(region) 
        ? currentRegions 
        : [...currentRegions, region];
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          regions: updatedRegions,
          total_spent: (user.total_spent || 0) + session.amount_total,
          last_purchase_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      console.log('✅ Updated user regions:', updatedRegions);
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

    const msg = {
      to: email,
      from: process.env.SENDER_EMAIL || 'admin@creativetechnologists.nl',
      subject: `🎉 Welcome to Amsterdam Street Art Map - ${region} District Access`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { padding: 40px 20px; background: white; border: 1px solid #ddd; border-radius: 0 0 12px 12px; }
            .access-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; font-size: 18px; }
            .access-button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
            .success-box { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .region-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .security-note { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .button-container { text-align: center; margin: 30px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎨 Amsterdam Street Art Map</h1>
            <p>Thank you for your purchase!</p>
          </div>
          
          <div class="content">
            <div class="success-box">
              <h2>🎉 Payment Successful!</h2>
              <p>Your purchase has been confirmed. You now have access to the <strong>${region}</strong> district.</p>
            </div>
            
            <div class="region-info">
              <h3>What's included in your ${region} access:</h3>
              <ul>
                <li>✅ Interactive map with precise locations</li>
                <li>✅ Artist information and artwork details</li>
                <li>✅ Navigation and route planning</li>
                <li>✅ Hidden gems only locals know about</li>
                <li>✅ Regular updates with new artwork</li>
              </ul>
            </div>
            
            <div class="button-container">
              <a href="${magicLink}" class="access-button">🚀 Access Your Map Now</a>
            </div>
            
            <div class="security-note">
              <p><strong>🔒 Security Notice:</strong></p>
              <ul>
                <li>This magic link expires in <strong>30 minutes</strong></li>
                <li>Can only be used <strong>once</strong></li>
                <li>Your access will be permanent after activation</li>
                <li>You can always request a new magic link using your email</li>
              </ul>
            </div>
            
            <p><strong>Need help?</strong> Reply to this email or contact us at info@streetartmapamsterdam.com</p>
            
            <p>Can't click the button? Copy and paste this link:<br>
            <code style="background: #f8f9fa; padding: 8px; border-radius: 4px; font-size: 12px; word-break: break-all;">${magicLink}</code></p>
          </div>
          
          <div class="footer">
            <p>© 2024 Amsterdam Street Art Map</p>
            <p>You're receiving this email because you purchased access to our street art map.</p>
          </div>
        </body>
        </html>
      `
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
