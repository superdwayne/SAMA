import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Critical for Stripe webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

// Database file paths
const DATABASE_PATH = path.join(process.cwd(), 'database.json');

// Helper function to get raw body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Database helper functions
async function loadDatabase() {
  try {
    const data = await fs.readFile(DATABASE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      users: {},
      purchases: {},
      activationLinks: {}  // Only activation links, no shareable tokens
    };
  }
}

async function saveDatabase(database) {
  await fs.writeFile(DATABASE_PATH, JSON.stringify(database, null, 2));
}

// Generate unique IDs
function generateId(prefix = '') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// Generate secure activation link (no shareable token)
function generateActivationLink(email, purchaseId, region) {
  const linkId = crypto.randomBytes(32).toString('hex');
  const baseUrl = process.env.FRONTEND_URL || 'https://www.streetartmapamsterdam.nl';
  return {
    linkId,
    url: `${baseUrl}/activate/${linkId}`,
    email,
    purchaseId,
    region,
    expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(), // 7 days to activate
    used: false,
    createdAt: new Date().toISOString()
  };
}

// Create or get user
async function createOrGetUser(email, stripeCustomerId = null) {
  const database = await loadDatabase();
  
  // Try to find existing user by email
  const existingUser = Object.values(database.users).find(user => user.email === email);
  
  if (existingUser) {
    // Update Stripe customer ID if provided and not already set
    if (stripeCustomerId && !existingUser.stripeCustomerId) {
      existingUser.stripeCustomerId = stripeCustomerId;
      await saveDatabase(database);
    }
    return existingUser;
  }
  
  // Create new user
  const userId = generateId('user');
  const newUser = {
    id: userId,
    email,
    stripeCustomerId,
    createdAt: new Date().toISOString(),
    purchases: []
  };
  
  database.users[userId] = newUser;
  await saveDatabase(database);
  
  return newUser;
}

// Create purchase record
async function createPurchase(userId, sessionData) {
  const database = await loadDatabase();
  
  const purchaseId = generateId('purchase');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
  
  const purchase = {
    id: purchaseId,
    userId,
    stripeSessionId: sessionData.id,
    stripePaymentIntentId: sessionData.payment_intent,
    region: sessionData.metadata.region,
    purchaseDate: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'pending_activation', // Starts as pending
    amount: sessionData.amount_total,
    currency: sessionData.currency,
    activatedAt: null
  };
  
  // Add purchase to database
  database.purchases[purchaseId] = purchase;
  
  // Add purchase to user's purchase list
  if (database.users[userId]) {
    database.users[userId].purchases.push(purchaseId);
  }
  
  await saveDatabase(database);
  
  return purchase;
}

// Send activation email (no shareable tokens)
async function sendActivationEmail(email, purchase) {
  const database = await loadDatabase();
  
  // Generate secure activation link
  const activationLink = generateActivationLink(email, purchase.id, purchase.region);
  
  // Store activation link in database
  database.activationLinks[activationLink.linkId] = activationLink;
  await saveDatabase(database);
  
  const expirationDate = new Date(purchase.expiresAt);
  
  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL || 'noreply@streetartmap.com',
    subject: `Activate Your ${purchase.region} District Access - Amsterdam Street Art Map`,
    text: `Thank you for your purchase!\n\nYour ${purchase.region} district access is ready to activate!\n\nACTIVATE YOUR ACCESS:\nClick this link: ${activationLink.url}\n\nIMPORTANT:\n• This activation link expires in 7 days\n• Once activated, your access lasts 30 days (until ${expirationDate.toLocaleDateString()})\n• This link is personal and cannot be shared\n\nIf you have any issues, contact us at info@streetartmuseumamsterdam.com\n\nBest regards,\nAmsterdam Street Art Map Team`,
    html: `<!DOCTYPE html><html><head><style>body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; } .container { max-width: 600px; margin: 0 auto; padding: 20px; } .header { background: linear-gradient(135deg, #FFFF00 0%, #FF6B6B 100%); color: #000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border: 2px solid #000; } .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px; border: 2px solid #000; border-top: none; } .activate-button { display: inline-block; background: #FF6B6B; color: white; padding: 20px 40px; text-decoration: none; border-radius: 10px; margin: 30px 0; font-weight: bold; border: 3px solid #000; box-shadow: 5px 5px 0px #000; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; } .activate-button:hover { background: #FF5252; } .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; } .street-art-title { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; } .warning { background: #FFF3CD; border: 2px solid #FFEB3B; padding: 15px; border-radius: 8px; margin: 20px 0; } .security-note { background: #E3F2FD; border: 2px solid #2196F3; padding: 15px; border-radius: 8px; margin: 20px 0; }</style></head><body><div class="container"><div class="header"><div class="street-art-title">Street Art<br>Museum<br>Amsterdam</div><p style="margin-top: 20px; font-size: 18px; font-weight: bold;">Activate Your Access</p></div><div class="content"><h2>🎨 Thank you for your purchase!</h2><p>Your <strong>${purchase.region}</strong> district access is ready to activate!</p><center><a href="${activationLink.url}" class="activate-button">🗝️ ACTIVATE ${purchase.region.toUpperCase()} ACCESS</a></center><p><strong>⏰ Access valid for 30 days until:</strong> ${expirationDate.toLocaleDateString()}</p><div class="warning"><strong>⚠️ Important:</strong> This activation link expires in 7 days. Click it soon to unlock your access!</div><div class="security-note"><strong>🔒 Security Note:</strong> This link is personal and tied to your email address. It cannot be shared with others.</div><div style="background: #FFFF00; padding: 15px; border-radius: 8px; border: 2px solid #000; margin-top: 20px;"><p style="margin: 0; font-weight: bold; color: #000;">🎯 Ready to explore ${purchase.region}'s hidden street art!</p></div></div><div class="footer"><p>Having trouble? Contact us at info@streetartmuseumamsterdam.com</p><p>&copy; 2024 Amsterdam Street Art Map</p></div></div></body></html>`
  };
  
  try {
    await sgMail.send(msg);
    console.log('✅ Activation email sent successfully to:', email);
    return { method: 'sendgrid', success: true };
  } catch (error) {
    console.error('❌ SendGrid email send error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  console.log(`🔔 Stripe webhook called: ${req.method}`);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  console.log('📧 SendGrid API Key:', process.env.SENDGRID_API_KEY ? 'Set' : 'Missing');
  console.log('📤 Sender Email:', process.env.SENDER_EMAIL);
  console.log('🔐 Webhook Secret:', endpointSecret ? 'Set' : 'Missing');
  
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
      const region = session.metadata?.region;
      
      console.log('📧 Customer email:', customerEmail);
      console.log('🗺️ Region:', region);
      
      if (!customerEmail || !region) {
        console.error('❌ Missing required data');
        return res.json({received: true});
      }

      try {
        // Create or get user
        const user = await createOrGetUser(customerEmail, session.customer);
        console.log('👤 User:', user.id, user.email);
        
        // Create purchase record (no token, just purchase)
        const purchase = await createPurchase(user.id, session);
        console.log('🛒 Purchase created:', purchase.id);
        
        // Send activation email (secure, non-shareable)
        await sendActivationEmail(customerEmail, purchase);
        console.log(`✅ Activation email sent to ${customerEmail}`);
        
      } catch (error) {
        console.error('❌ Failed to process webhook:', error);
        console.error('Error details:', error.response?.body);
      }
    }

    res.json({received: true});
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
