import { promises as fs } from 'fs';
import path from 'path';

const DATABASE_PATH = path.join(process.cwd(), 'database.json');

async function loadDatabase() {
  try {
    const data = await fs.readFile(DATABASE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: {}, purchases: {}, tokens: {} };
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get user by email
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      const database = await loadDatabase();
      const user = Object.values(database.users).find(u => u.email === email);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's purchases and active tokens
      const purchases = user.purchases.map(id => database.purchases[id]).filter(Boolean);
      const activeTokens = purchases
        .filter(p => p.status === 'active' && new Date(p.expiresAt) > new Date())
        .map(p => ({
          token: p.accessToken,
          region: p.region,
          expiresAt: p.expiresAt,
          purchaseDate: p.purchaseDate,
          daysRemaining: Math.ceil((new Date(p.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        }));

      res.json({
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
          status: p.status,
          accessToken: p.accessToken
        })),
        activeTokens,
        statistics: {
          totalPurchases: purchases.length,
          activeTokens: activeTokens.length,
          totalSpent: purchases.reduce((sum, p) => sum + (p.amount || 0), 0)
        }
      });

    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
