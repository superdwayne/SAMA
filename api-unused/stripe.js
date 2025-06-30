const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { validateToken, activateToken } = require('./utils/auth');

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { token } = req.body;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success?token=${token}`,
      cancel_url: `${process.env.CLIENT_URL}?token=${token}`,
      metadata: {
        token: token,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const token = session.metadata.token;

    try {
      await activateToken(token);
    } catch (error) {
      console.error('Error activating token:', error);
      return res.status(500).send('Error activating token');
    }
  }

  res.json({ received: true });
});

module.exports = router; 