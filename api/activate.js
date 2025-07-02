// api/activate.js
// Magic link activation endpoint

// Verify magic token (decode embedded data)
function verifyMagicToken(token) {
  try {
    // Decode the token
    const payload = Buffer.from(token, 'base64').toString('utf8');
    const data = JSON.parse(payload);
    
    // Check if token is expired (10 minutes)
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - data.timestamp > tenMinutes) {
      return null; // Expired
    }
    
    return {
      email: data.email,
      accessToken: data.accessToken,
      region: data.region,
      hasPurchased: data.hasPurchased,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Token decode error:', error);
    return null; // Invalid token
  }
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { token, email } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('🔑 Activating magic link for:', email);

    // Decode token data
    const tokenData = verifyMagicToken(token);

    if (!tokenData) {
      console.log('❌ Invalid or expired token');
      return res.status(401).json({ 
        error: 'Invalid or expired magic link. Please request a new one.' 
      });
    }

    // Verify email matches
    if (tokenData.email !== email) {
      console.log('❌ Email mismatch');
      return res.status(401).json({ 
        error: 'Email mismatch. This link is not valid for your email address.' 
      });
    }

    console.log('✅ Magic link verified successfully');
    console.log('📧 Email:', tokenData.email);
    console.log('🗺️ Region:', tokenData.region);
    console.log('🎫 Access Token:', tokenData.accessToken);

    // Return access data
    res.status(200).json({
      success: true,
      email: tokenData.email,
      region: tokenData.region,
      accessToken: tokenData.accessToken,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
      message: `Welcome! You now have access to the ${tokenData.region} district.`
    });

  } catch (error) {
    console.error('❌ Magic link activation error:', error);
    res.status(500).json({ 
      error: 'Failed to activate magic link. Please try again.' 
    });
  }
};