// User management API - handles user data, validation, and admin functions
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

export default async function handler(req, res) {
  const { action } = req.query;

  try {
    const database = await loadDatabase();

    // GET USER DATA
    if (action === 'profile' && req.method === 'GET') {
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

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
      const { email, adminKey } = req.body;

      if (adminKey !== process.env.ADMIN_ACCESS_KEY) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

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
    if (action === 'health' && req.method === 'GET') {
      return res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: Object.keys(database).length > 0 ? 'connected' : 'empty'
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('User API Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
