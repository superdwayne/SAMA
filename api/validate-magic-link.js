const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    console.log('🔍 Validating magic link token:', token.substring(0, 8) + '...');

    // Validate magic link token
    const validation = await validateMagicLink(token);
    
    if (!validation.valid) {
      console.log('❌ Invalid magic link:', validation.error);
      return res.status(401).json({
        error: 'Invalid or expired magic link',
        message: validation.error
      });
    }

    // Get user's purchased regions
    const purchaseData = getUserRegions(validation.user);
    
    console.log('✅ Magic link validated successfully for:', validation.email);
    
    res.status(200).json({
      success: true,
      email: validation.email,
      regions: purchaseData.regions,
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
      message: 'Access granted successfully'
    });

  } catch (error) {
    console.error('❌ Magic link validation error:', error);
    res.status(500).json({ 
      error: 'Failed to validate magic link',
      details: error.message 
    });
  }
}

// Validate magic link token
async function validateMagicLink(token) {
  try {
    // Find the user with this magic token
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('magic_token', token)
      .single();
    
    if (error || !user) {
      return {
        valid: false,
        error: 'Magic link not found or invalid'
      };
    }
    
    // Check if token has expired
    const now = new Date();
    const tokenExpiresAt = new Date(user.magic_token_expires_at);
    
    if (now > tokenExpiresAt) {
      return {
        valid: false,
        error: 'Magic link has expired'
      };
    }
    
    // Check if user's regions access has expired
    const regionsExpiresAt = new Date(user.regions_expires_at);
    if (now > regionsExpiresAt) {
      return {
        valid: false,
        error: 'Your access has expired. Please purchase again to continue using the map.'
      };
    }
    
    // Clear the magic token after use (one-time use)
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        magic_token: null,
        magic_token_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Error clearing magic token:', updateError);
      // Continue anyway, as the validation is still valid
    }
    
    return {
      valid: true,
      email: user.email,
      user: user
    };
    
  } catch (error) {
    console.error('❌ Error validating magic link:', error);
    return {
      valid: false,
      error: 'Database error during validation'
    };
  }
}

// Get user's regions from user object
function getUserRegions(user) {
  try {
    const regions = user.regions || [];
    
    return {
      regions,
      purchaseCount: regions.length,
      totalSpent: user.total_spent || 0,
      lastPurchase: user.last_purchase_at
    };
    
  } catch (error) {
    console.error('❌ Error getting user regions:', error);
    return { regions: [] };
  }
}
