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
    const purchaseData = await getUserPurchases(validation.email);
    
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
    // Find the magic link
    const { data: magicLink, error } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();
    
    if (error || !magicLink) {
      return {
        valid: false,
        error: 'Magic link not found or already used'
      };
    }
    
    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(magicLink.expires_at);
    
    if (now > expiresAt) {
      return {
        valid: false,
        error: 'Magic link has expired'
      };
    }
    
    // Mark token as used
    const { error: updateError } = await supabase
      .from('magic_links')
      .update({ used: true })
      .eq('id', magicLink.id);
    
    if (updateError) {
      console.error('❌ Error marking magic link as used:', updateError);
      // Continue anyway, as the validation is still valid
    }
    
    return {
      valid: true,
      email: magicLink.email,
      id: magicLink.id
    };
    
  } catch (error) {
    console.error('❌ Error validating magic link:', error);
    return {
      valid: false,
      error: 'Database error during validation'
    };
  }
}

// Get user's purchased regions
async function getUserPurchases(email) {
  try {
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('customer_email', email)
      .eq('payment_status', 'completed');
    
    if (error) {
      console.error('❌ Error fetching purchases:', error);
      return { regions: [] };
    }
    
    if (!purchases || purchases.length === 0) {
      return { regions: [] };
    }
    
    // Extract unique regions
    const regions = [...new Set(purchases.map(p => p.region))];
    
    return {
      regions,
      purchaseCount: purchases.length,
      purchases: purchases.map(p => ({
        region: p.region,
        date: p.created_at,
        amount: p.amount
      }))
    };
    
  } catch (error) {
    console.error('❌ Error fetching user purchases:', error);
    return { regions: [] };
  }
}
