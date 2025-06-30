import { promises as fs } from 'fs';
import path from 'path';

const DATABASE_PATH = path.join(process.cwd(), 'database.json');

async function loadDatabase() {
  try {
    const data = await fs.readFile(DATABASE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: {}, purchases: {}, activationLinks: {} };
  }
}

// Admin-only function to validate access (for support purposes)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, adminKey } = req.body;

  // Check admin access (only for support team)
  if (adminKey !== process.env.ADMIN_ACCESS_KEY) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'This endpoint is for support team only.'
    });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const database = await loadDatabase();
    const user = Object.values(database.users).find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'No user found with this email address.'
      });
    }

    // Get user's active purchases
    const activePurchases = user.purchases
      .map(id => database.purchases[id])
      .filter(p => p && p.status === 'active' && new Date(p.expiresAt) > new Date());

    if (activePurchases.length === 0) {
      return res.status(404).json({
        error: 'No active access',
        message: 'This user has no active access.'
      });
    }

    const regions = activePurchases.map(p => p.region);

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        regions: regions,
        purchases: activePurchases.map(p => ({
          region: p.region,
          expiresAt: p.expiresAt,
          daysRemaining: Math.ceil((new Date(p.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        }))
      }
    });

  } catch (error) {
    console.error('Admin validation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
