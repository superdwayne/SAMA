import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }
  
  try {
    const tokensFile = path.join(process.cwd(), 'tokens.json');
    const data = await fs.readFile(tokensFile, 'utf8');
    const tokens = JSON.parse(data);
    
    // Find token for this email
    const tokenEntry = Object.entries(tokens).find(
      ([token, info]) => info.email === email && info.active
    );
    
    if (tokenEntry) {
      return res.json({ 
        success: true, 
        token: tokenEntry[0],
        expiresAt: tokenEntry[1].expiresAt 
      });
    } else {
      return res.status(404).json({ error: 'No token found for this email' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
}
