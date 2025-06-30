// Simple webhook that handles payments and sends emails
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Critical for Stripe webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper function to get raw body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  console.log(`🔔 Stripe webhook called: ${req.method}`);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    console.error('⚠️ STRIPE_WEBHOOK_SECRET not set');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    console.log(`❌ Webhook signature verification failed:`, err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      console.log('💳 checkout.session.completed event received');
      const session = event.data.object;
      
      const customerEmail = session.customer_details?.email || session.customer_email;
      let region = session.metadata?.region;
      
      // If no region in metadata, try to identify by product/price
      if (!region) {
        // Get the line items to identify the product
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        
        console.log('🏷️ Price ID:', priceId);
        
        // Map price IDs to regions
        const priceToRegionMap = {
          'price_1RbnlIJ3urOr8HD7Gor4UvdG': 'Centre', // Your hardcoded link price ID
          // Add more price IDs as needed for other regions
        };
        
        region = priceToRegionMap[priceId] || 'Unknown';
        console.log('🗺️ Region identified from price:', region);
      }
      
      console.log('📧 Customer email:', customerEmail);
      console.log('🗺️ Final region:', region);
      console.log('💰 Amount:', session.amount_total);
      
      // Log the purchase
      console.log(`✅ Payment successful: ${customerEmail} bought ${region} for ${session.amount_total/100} EUR`);
      
      // Send SendGrid email with access token
      if (customerEmail && region !== 'Unknown') {
        console.log(`📧 Attempting to send email to: ${customerEmail}`);
        console.log(`🗺️ Region: ${region}`);
        console.log(`🔑 SendGrid API Key configured: ${process.env.SENDGRID_API_KEY ? 'YES' : 'NO'}`);
        
        try {
          // Generate a unique access token
          const accessToken = `sama_${region.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
          
          const msg = {
            to: customerEmail,
            from: {
              email: 'noreply@streetartmuseumamsterdam.com',
              name: 'Amsterdam Street Art Map'
            },
            subject: `🎨 Your ${region} District Access Token`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Amsterdam Street Art Map! 🎨</h2>
                
                <p>Thank you for purchasing access to the <strong>${region} District</strong>!</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Your Access Token:</h3>
                  <code style="background: #e9ecef; padding: 10px; display: block; font-size: 16px; letter-spacing: 1px;">${accessToken}</code>
                </div>
                
                <p><strong>How to use your token:</strong></p>
                <ol>
                  <li>Visit <a href="https://www.streetartmapamsterdam.nl">streetartmapamsterdam.nl</a></li>
                  <li>Click "🔑 Enter Access Token" in the top right</li>
                  <li>Enter your token: <code>${accessToken}</code></li>
                  <li>Start exploring the ${region} district!</li>
                </ol>
                
                <p>Your token unlocks:</p>
                <ul>
                  <li>📍 All street art locations in ${region}</li>
                  <li>🗺️ Interactive map with navigation</li>
                  <li>🎨 Artist information and stories</li>
                  <li>🏛️ Gallery and museum details</li>
                </ul>
                
                <hr style="margin: 30px 0;">
                <p><small>Questions? Reply to this email or contact us at info@streetartmuseumamsterdam.com</small></p>
                <p><small>Amsterdam Street Art Map - Discover the city's hidden artistic treasures</small></p>
              </div>
            `
          };
          
          console.log(`📧 Sending email with SendGrid...`);
          await sgMail.send(msg);
          console.log(`📧 Access token email sent to ${customerEmail}`);
          console.log(`🔑 Generated token: ${accessToken}`);
          
          // TODO: Store the token in your database so users can use it
          // You might want to save: { email: customerEmail, region, token: accessToken, createdAt: new Date() }
          
        } catch (emailError) {
          console.error('❌ Failed to send email:', emailError);
          console.error('❌ Email error details:', emailError.response?.body || emailError.message);
        }
      } else {
        console.log('⚠️ Skipping email - missing email or unknown region');
        console.log(`Customer email: ${customerEmail}`);
        console.log(`Region: ${region}`);
      }
    }

    res.json({received: true});
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
