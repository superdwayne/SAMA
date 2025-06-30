// SINGLE CONSOLIDATED API - All endpoints in one file
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const DATABASE_PATH = path.join(process.cwd(), 'database.json');

// Helper functions
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function loadDatabase() {
  try {
    const data = await fs.readFile(DATABASE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: {}, purchases: {}, activationLinks: {} };
  }
}

async function saveDatabase(database) {
  await fs.writeFile(DATABASE_PATH, JSON.stringify(database, null, 2));
}

function generateId(prefix = '') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function generateActivationLink(email, purchaseId, region) {
  const linkId = crypto.randomBytes(32).toString('hex');
  const baseUrl = process.env.FRONTEND_URL || 'https://www.streetartmapamsterdam.nl';
  return {
    linkId,
    url: `${baseUrl}/activate/${linkId}`,
    email,
    purchaseId,
    region,
    expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
    used: false,
    createdAt: new Date().toISOString(),
    requiresVerification: true,
    verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
    verificationExpires: new Date(Date.now() + (10 * 60 * 1000)).toISOString()
  };
}

async function createOrGetUser(email, stripeCustomerId = null) {
  const database = await loadDatabase();
  const existingUser = Object.values(database.users).find(user => user.email === email);
  
  if (existingUser) {
    if (stripeCustomerId && !existingUser.stripeCustomerId) {
      existingUser.stripeCustomerId = stripeCustomerId;
      await saveDatabase(database);
    }
    return existingUser;
  }
  
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

async function createPurchase(userId, sessionData) {
  const database = await loadDatabase();
  const purchaseId = generateId('purchase');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  
  const purchase = {
    id: purchaseId,
    userId,
    stripeSessionId: sessionData.id,
    stripePaymentIntentId: sessionData.payment_intent,
    region: sessionData.metadata.region,
    purchaseDate: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'pending_activation',
    amount: sessionData.amount_total,
    currency: sessionData.currency,
    activatedAt: null
  };
  
  database.purchases[purchaseId] = purchase;
  if (database.users[userId]) {
    database.users[userId].purchases.push(purchaseId);
  }
  
  await saveDatabase(database);
  return purchase;
}

async function sendActivationEmail(email, purchase) {
  const database = await loadDatabase();
  const activationLink = generateActivationLink(email, purchase.id, purchase.region);
  
  database.activationLinks[activationLink.linkId] = activationLink;
  await saveDatabase(database);
  
  const expirationDate = new Date(purchase.expiresAt);
  
  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL || 'noreply@streetartmap.com',
    subject: `Activate Your ${purchase.region} District Access - Amsterdam Street Art Map`,
    html: `<!DOCTYPE html><html><head><style>body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; } .container { max-width: 600px; margin: 0 auto; padding: 20px; } .header { background: linear-gradient(135deg, #FFFF00 0%, #FF6B6B 100%); color: #000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border: 2px solid #000; } .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px; border: 2px solid #000; border-top: none; } .activate-button { display: inline-block; background: #FF6B6B; color: white; padding: 20px 40px; text-decoration: none; border-radius: 10px; margin: 30px 0; font-weight: bold; border: 3px solid #000; box-shadow: 5px 5px 0px #000; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; } .street-art-title { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }</style></head><body><div class="container"><div class="header"><div class="street-art-title">Street Art<br>Museum<br>Amsterdam</div></div><div class="content"><h2>🎨 Thank you for your purchase!</h2><p>Your <strong>${purchase.region}</strong> district access is ready!</p><center><a href="${activationLink.url}" class="activate-button">🗝️ ACTIVATE ${purchase.region.toUpperCase()} ACCESS</a></center><p><strong>⏰ Valid for 30 days until:</strong> ${expirationDate.toLocaleDateString()}</p></div></div></body></html>`
  };
  
  await sgMail.send(msg);
  console.log('✅ Activation email sent to:', email);
}

async function sendVerificationEmail(email, code, region) {
  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL || 'noreply@streetartmap.com',
    subject: `Verification Code: ${code}`,
    html: `<!DOCTYPE html><html><head><style>.container { max-width: 400px; margin: 0 auto; padding: 20px; text-align: center; } .code { font-size: 32px; font-weight: bold; color: #FF6B6B; background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 3px solid #FF6B6B; letter-spacing: 8px; }</style></head><body><div class="container"><h2>🔒 Security Verification</h2><p>Your verification code for ${region} district:</p><div class="code">${code}</div><p>Expires in 10 minutes</p></div></body></html>`
  };
  
  await sgMail.send(msg);
}

export default async function handler(req, res) {
  const { action, linkId, email, adminKey } = req.query;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // STRIPE WEBHOOK (special handling for raw body)
    if (pathname === '/api/stripe/webhook' || (action === 'webhook' && req.method === 'POST')) {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!endpointSecret) {
        return res.status(400).json({ error: 'Webhook secret not configured' });
      }

      let event;
      try {
        const rawBody = await getRawBody(req);
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      } catch (err) {
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email || session.customer_email;
        const region = session.metadata?.region;
        
        if (customerEmail && region) {
          const user = await createOrGetUser(customerEmail, session.customer);
          const purchase = await createPurchase(user.id, session);
          await sendActivationEmail(customerEmail, purchase);
        }
      }

      return res.json({ received: true });
    }

    // CREATE CHECKOUT SESSION
    if (pathname === '/api/create-checkout-session' || (action === 'create-checkout' && req.method === 'POST')) {
      const { region } = req.body;
      const TEST_PRICE_ID = 'price_1RbnlIJ3urOr8HD7Gor4UvdG';

      if (!region) {
        return res.status(400).json({ error: 'Region is required' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: TEST_PRICE_ID, quantity: 1 }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/thank-you`,
        cancel_url: process.env.FRONTEND_URL,
        metadata: { region },
        custom_text: {
          submit: { message: 'Your access link will be sent to your email' }
        }
      });

      return res.json({ url: session.url });
    }

    // ACTIVATE LINK
    if (pathname.startsWith('/api/activate') || action === 'activate') {
      const activationLinkId = linkId || pathname.split('/').pop();
      const database = await loadDatabase();
      const activationLink = database.activationLinks[activationLinkId];

      if (!activationLink) {
        return res.status(404).json({ error: 'Invalid activation link' });
      }

      if (new Date() > new Date(activationLink.expiresAt)) {
        return res.status(410).json({ error: 'Link expired' });
      }

      if (activationLink.used) {
        const purchase = database.purchases[activationLink.purchaseId];
        if (purchase && new Date() < new Date(purchase.expiresAt)) {
          return res.json({
            success: true,
            alreadyActivated: true,
            data: {
              email: activationLink.email,
              region: activationLink.region,
              expiresAt: purchase.expiresAt,
              daysRemaining: Math.ceil((new Date(purchase.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
            }
          });
        }
      }

      return res.json({
        requiresVerification: true,
        email: activationLink.email,
        linkId: activationLinkId
      });
    }

    // VERIFY ACTIVATION
    if (action === 'verify' && req.method === 'POST') {
      const { linkId, verificationAction, verificationCode } = req.body;
      const database = await loadDatabase();
      const activationLink = database.activationLinks[linkId];

      if (!activationLink) {
        return res.status(404).json({ error: 'Invalid link' });
      }

      if (verificationAction === 'send_code') {
        await sendVerificationEmail(activationLink.email, activationLink.verificationCode, activationLink.region);
        return res.json({ success: true, message: 'Verification code sent' });
      }

      if (verificationAction === 'verify_code') {
        if (activationLink.verificationCode !== verificationCode) {
          return res.status(400).json({ error: 'Invalid verification code' });
        }

        if (new Date() > new Date(activationLink.verificationExpires)) {
          return res.status(410).json({ error: 'Verification code expired' });
        }

        // Activate access
        const purchase = database.purchases[activationLink.purchaseId];
        activationLink.used = true;
        activationLink.usedAt = new Date().toISOString();
        purchase.status = 'active';
        purchase.activatedAt = new Date().toISOString();

        await saveDatabase(database);

        return res.json({
          success: true,
          data: {
            email: activationLink.email,
            region: activationLink.region,
            expiresAt: purchase.expiresAt,
            daysRemaining: Math.ceil((new Date(purchase.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)),
            userSession: {
              sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              email: activationLink.email,
              regions: [activationLink.region],
              expiresAt: purchase.expiresAt
            }
          }
        });
      }
    }

    // USER PROFILE
    if (action === 'profile' && req.method === 'GET') {
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const database = await loadDatabase();
      const user = Object.values(database.users).find(u => u.email === email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const purchases = user.purchases.map(id => database.purchases[id]).filter(Boolean);
      const activeTokens = purchases
        .filter(p => p.status === 'active' && new Date(p.expiresAt) > new Date())
        .map(p => ({
          region: p.region,
          expiresAt: p.expiresAt,
          purchaseDate: p.purchaseDate,
          daysRemaining: Math.ceil((new Date(p.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        }));

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          stripeCustomerId: user.stripeCustomerId
        },
        purchases: purchases.map(p => ({
          id: p.id,
          region: p.region,
          amount: p.amount,
          currency: p.currency,
          purchaseDate: p.purchaseDate,
          expiresAt: p.expiresAt,
          status: p.status
        })),
        activeTokens,
        statistics: {
          totalPurchases: purchases.length,
          activeTokens: activeTokens.length,
          totalSpent: purchases.reduce((sum, p) => sum + (p.amount || 0), 0)
        }
      });
    }

    // ADMIN VALIDATION (for support)
    if (action === 'admin-validate' && req.method === 'POST') {
      if (adminKey !== process.env.ADMIN_ACCESS_KEY) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const database = await loadDatabase();
      const user = Object.values(database.users).find(u => u.email === email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const activePurchases = user.purchases
        .map(id => database.purchases[id])
        .filter(p => p && p.status === 'active' && new Date(p.expiresAt) > new Date());

      if (activePurchases.length === 0) {
        return res.status(404).json({ error: 'No active access' });
      }

      return res.json({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          regions: activePurchases.map(p => p.region),
          purchases: activePurchases.map(p => ({
            region: p.region,
            expiresAt: p.expiresAt,
            daysRemaining: Math.ceil((new Date(p.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
          }))
        }
      });
    }

    // HEALTH CHECK
    if (action === 'health' || pathname === '/api/health') {
      const database = await loadDatabase();
      return res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: Object.keys(database).length > 0 ? 'connected' : 'empty'
      });
    }

    return res.status(400).json({ error: 'Invalid endpoint' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Special config for webhook (disable body parser for raw body)
export const config = {
  api: {
    bodyParser: false,
  },
}
