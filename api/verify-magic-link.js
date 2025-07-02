// api/verify-magic-link.js
// Simple verification without file storage

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Decode token data
    const tokenData = verifyMagicToken(token);

    if (!tokenData) {
      return res.status(401).json({ 
        error: 'Invalid or expired magic link. Please request a new one.' 
      });
    }

    // Determine regions based on purchase history
    let regions = [];
    if (tokenData.hasPurchased) {
      // Only unlock the specific regions purchased, not all regions
      regions = tokenData.regions || [];
    }

    res.status(200).json({
      success: true,
      email: tokenData.email,
      regions,
      hasPurchased: tokenData.hasPurchased,
      message: tokenData.hasPurchased 
        ? 'Welcome back! You have full access to all regions.'
        : 'Welcome! You have access to the East region.'
    });

  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({ 
      error: 'Failed to verify magic link. Please try again.' 
    });
  }
}

// Verify magic token (decode embedded data)
function verifyMagicToken(token) {
  try {
    // Decode the token
    const payload = Buffer.from(token, 'base64').toString('utf8');
    const data = JSON.parse(payload);
    
    // Check if token is expired (10 minutes to match email)
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - data.timestamp > tenMinutes) {
      return null; // Expired
    }
    
    return {
      email: data.email,
      hasPurchased: data.hasPurchased,
      regions: data.regions || ['East'],
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Token decode error:', error);
    return null; // Invalid token
  }
}
