import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATABASE_PATH = path.join(process.cwd(), 'database.json');

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

// Generate email verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { linkId } = req.query;

  if (!linkId) {
    return res.status(400).json({ error: 'Link ID is required' });
  }

  try {
    const database = await loadDatabase();
    const activationLink = database.activationLinks[linkId];

    if (!activationLink) {
      return res.status(404).json({ 
        error: 'Invalid activation link',
        message: 'This link does not exist or has been removed.'
      });
    }

    // Check if link has expired
    if (new Date() > new Date(activationLink.expiresAt)) {
      return res.status(410).json({ 
        error: 'Activation link expired',
        message: 'This activation link has expired. Please contact support.',
        canRetry: false
      });
    }

    // Check if link has already been used
    if (activationLink.used) {
      const purchase = database.purchases[activationLink.purchaseId];
      if (purchase && new Date() < new Date(purchase.expiresAt)) {
        return res.json({
          success: true,
          alreadyActivated: true,
          message: 'Your access was already activated and is still valid!',
          data: {
            email: activationLink.email,
            region: activationLink.region,
            expiresAt: purchase.expiresAt,
            daysRemaining: Math.ceil((new Date(purchase.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
          }
        });
      } else {
        return res.status(410).json({
          error: 'Access expired',
          message: 'This access has expired. Please purchase again.',
          canRetry: false
        });
      }
    }

    // Get the purchase
    const purchase = database.purchases[activationLink.purchaseId];
    if (!purchase) {
      return res.status(500).json({
        error: 'Purchase not found',
        message: 'There was an error finding your purchase. Please contact support.',
        canRetry: false
      });
    }

    // SECURITY: Require email verification for activation
    // Generate verification code and require email confirmation
    const verificationCode = generateVerificationCode();
    
    // Store verification requirement
    activationLink.requiresVerification = true;
    activationLink.verificationCode = verificationCode;
    activationLink.verificationExpires = new Date(Date.now() + (10 * 60 * 1000)).toISOString(); // 10 minutes
    
    await saveDatabase(database);

    // Return verification requirement (frontend will handle sending verification email)
    return res.json({
      requiresVerification: true,
      email: activationLink.email,
      message: 'For security, we need to verify this is really you. Check your email for a verification code.',
      linkId: linkId
    });

  } catch (error) {
    console.error('Activation error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: 'There was an error processing your activation. Please try again.',
      canRetry: true
    });
  }
}
