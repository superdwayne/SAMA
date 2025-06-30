// Simple create checkout session
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { region } = req.body;
  const PRICE_ID = 'price_1RbnlIJ3urOr8HD7Gor4UvdG';

  if (!region) {
    return res.status(400).json({ error: 'Region is required' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      mode: 'payment',
      success_url: `https://www.streetartmapamsterdam.nl/thank-you`,
      cancel_url: `https://www.streetartmapamsterdam.nl`,
      metadata: { region }
    });

    console.log(`💳 Created checkout session for ${region}`);
    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: err.message });
  }
}
