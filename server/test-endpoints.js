// Add these endpoints to your existing server.js file (before the app.listen() at the bottom)

// Test endpoint - Generate token without payment (for testing only)
app.post('/api/test/generate-token', async (req, res) => {
  try {
    const { email, region } = req.body;
    
    if (!email || !region) {
      return res.status(400).json({ 
        error: 'Email and region are required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }
    
    // Generate test token
    const token = generateAccessToken(region);
    
    // Store token with 'active' status (skip payment for testing)
    tokens.set(token, {
      email,
      region,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'active', // Already active for testing
      activatedAt: Date.now(),
      testToken: true // Mark as test token
    });
    
    console.log(`🧪 TEST TOKEN GENERATED:
    ========================
    Email: ${email}
    Region: ${region}
    Token: ${token}
    Status: Active (Test Mode)
    ========================`);
    
    res.json({
      success: true,
      message: 'Test token generated successfully',
      token: token,
      region: region,
      email: email,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
      testMode: true
    });
    
  } catch (error) {
    console.error('Test token generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate test token',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Test endpoint - List all tokens (for debugging)
app.get('/api/test/tokens', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Only available in development mode' });
  }
  
  const tokenList = Array.from(tokens.entries()).map(([token, data]) => ({
    token: token.substring(0, 20) + '...', // Partial token for security
    email: data.email,
    region: data.region,
    status: data.status,
    createdAt: new Date(data.createdAt).toISOString(),
    expiresAt: new Date(data.expiresAt).toISOString(),
    isTestToken: data.testToken || false
  }));
  
  res.json({
    totalTokens: tokens.size,
    tokens: tokenList
  });
});

// Test endpoint - Clear all test tokens
app.delete('/api/test/clear-tokens', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Only available in development mode' });
  }
  
  let clearedCount = 0;
  for (const [token, data] of tokens.entries()) {
    if (data.testToken) {
      tokens.delete(token);
      clearedCount++;
    }
  }
  
  console.log(`🗑️ Cleared ${clearedCount} test tokens`);
  
  res.json({
    success: true,
    message: `Cleared ${clearedCount} test tokens`,
    remainingTokens: tokens.size
  });
});