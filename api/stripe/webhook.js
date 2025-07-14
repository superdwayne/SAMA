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
<html style="background-color: #FFFF00;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amsterdam Street Art Map – Thank You</title>
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
              <td style="font-size: 48px; font-weight: 900; line-height: 0.9; color: #3416D8; text-transform: uppercase; font-family: 'PP Neue Machina Inktrap Ultrabold', 'Inter', Arial, sans-serif; padding-bottom: 24px;">
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
                <td style="padding: 30px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                    <tr>
                      <td style="background-color: #3416D8; border-radius: 8px;">
                        <a href="${magicLink}" style="display: inline-block; background-color: #3416D8; color: #ffffff !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 17px; font-family: 'PPNeueMachina-PlainUltrabold', Arial, Helvetica, sans-serif;">Access My Map Now</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Manual link section -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;">
                Can't click the button? Copy and paste this link:
              </td>
            </tr>
            <tr>
              <td style="word-break: break-all; font-size: 12px; color: #3416D8; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                <a href="${magicLink}" style="color: #3416D8; text-decoration: none; word-break: break-all; font-size: 12px;">${magicLink}</a>
              </td>
            </tr>
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
