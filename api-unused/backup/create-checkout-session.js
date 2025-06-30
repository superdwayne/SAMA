import Stripe from 'stripe';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DATABASE_PATH = path.join(process.cwd(), 'database.json');

// Generate access token
const generateAccessToken = (region) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = crypto.randomBytes(6).toString('hex').toUpperCase();
  const regionCode = region ? region.substring(0, 3).toUpperCase() : 'AMS';
  return `${regionCode}-${timestamp}-${randomStr}`;
};

async function loadDatabase() {
  try {
    const data = await fs.readFile(DATABASE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: {}, purchases: {}, tokens: {} };
  }
}

async function saveDatabase(database) {
  await fs.writeFile(DATABASE_PATH, JSON.stringify(database, null, 2));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { region } = req.body;
  const TEST_PRICE_ID = 'price_1RbnlIJ3urOr8HD7Gor4UvdG';

  if (!region) {
    return res.status(400).json({ error: 'Region is required' });
  }

  const accessToken = generateAccessToken(region);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: TEST_PRICE_ID, quantity: 1 }],
      mode: 'payment',
      success_url: `https://www.streetartmapamsterdam.nl/thank-you?token=${accessToken}`,
      cancel_url: `https://www.streetartmapamsterdam.nl`,
      metadata: { access_token: accessToken, region },
      payment_intent_data: {
        metadata: { access_token: accessToken, region }
      },
      custom_text: {
        submit: { message: 'Your access token will be sent to your email (valid for 30 days)' }
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `30-day access to ${region} Street Art Map - Token: ${accessToken}`,
          custom_fields: [
            { name: 'Access Token', value: accessToken },
            { name: 'Valid For', value: '30 days' },
            { name: 'Region', value: region }
          ]
        }
      }
    });

    // Store pending token in database
    const database = await loadDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days

    database.tokens[accessToken] = {
      purchaseId: null, // Will be filled when webhook processes
      userId: null,     // Will be filled when webhook processes
      email: 'pending',
      region,
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      stripeSessionId: session.id
    };

    await saveDatabase(database);

    console.log(`💳 Created checkout session for ${region}, token: ${accessToken}, expires: ${expiresAt.toISOString()}`);
    res.json({ url: session.url, token: accessToken });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: err.message });
  }
}
