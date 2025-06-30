const express = require('express');
const router = express.Router();
const { validateToken, generateToken, verifyActivation } = require('./utils/auth');
const { sendActivationEmail } = require('./utils/email');

// Validate token
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;
    const isValid = await validateToken(token);
    res.json({ valid: isValid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get new token
router.post('/get-token', async (req, res) => {
  try {
    const token = await generateToken();
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify activation
router.post('/verify-activation', async (req, res) => {
  try {
    const { token } = req.body;
    const result = await verifyActivation(token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Activate token
router.post('/activate', async (req, res) => {
  try {
    const { token, email } = req.body;
    await sendActivationEmail(email, token);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 