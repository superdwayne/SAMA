const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    console.log('🔍 Magic link request for:', email);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('📧 Normalized email:', normalizedEmail);
    
    // Check purchase history in database
    const purchaseData = await checkPurchaseHistory(normalizedEmail);
    console.log('💳 Purchase data result:', purchaseData);
    
    if (!purchaseData.found) {
      if (purchaseData.expired) {
        console.log('❌ Access expired, returning 410');
        return res.status(410).json({
          error: 'Access expired',
          message: 'Your map access has expired. Please purchase again to continue exploring Amsterdam\'s street art.',
          code: 'ACCESS_EXPIRED',
          email: normalizedEmail,
          expiredAt: purchaseData.expiredAt
        });
      }
      
      console.log('❌ No purchase found, returning 404');
      return res.status(404).json({
        error: 'No purchase record found',
        message: 'We could not find any purchases associated with this email address. To access premium regions, please make a purchase first.',
        code: 'NO_PURCHASE_FOUND',
        email: normalizedEmail
      });
    }

    if (purchaseData.regions.length === 0) {
      console.log('❌ No regions purchased, returning 403');
      return res.status(403).json({
        error: 'No regions purchased',
        message: 'You need to purchase access to unlock premium regions. Please make a purchase first.',
        code: 'NO_REGIONS_PURCHASED',
        email: normalizedEmail
      });
    }

    console.log('✅ Purchase found, sending magic link');
    
    // Create magic link
    const magicToken = await createMagicLink(normalizedEmail);
    const magicLinkUrl = `${req.headers.origin || 'https://www.streetartmapamsterdam.nl'}?magic=${magicToken}`;
    
    // Send email
    const emailSent = await sendMagicLinkEmail(normalizedEmail, magicLinkUrl, purchaseData);
    
    if (!emailSent) {
      throw new Error('Failed to send email');
    }

    res.status(200).json({
      success: true,
      message: 'Magic link sent successfully!',
      regions: purchaseData.regions
    });

  } catch (error) {
    console.error('❌ Magic link error:', error);
    res.status(500).json({ 
      error: 'Failed to send magic link. Please try again.',
      details: error.message 
    });
  }
}

// Check purchase history from database
async function checkPurchaseHistory(email) {
  try {
    console.log(`🔎 Checking purchase history for: "${email}"`);
    
    // Check the new users table
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Database error:', error);
      throw error;
    }
    
    if (!user) {
      console.log(`❌ No user found for "${email}"`);
      return {
        found: false,
        regions: []
      };
    }
    
    const regions = user.regions || [];
    
    // Check if user's access has expired
    const now = new Date();
    const regionsExpiresAt = new Date(user.regions_expires_at);
    
    if (now > regionsExpiresAt) {
      console.log(`❌ User access has expired on ${regionsExpiresAt.toISOString()}`);
      return {
        found: false,
        regions: [],
        expired: true,
        expiredAt: user.regions_expires_at
      };
    }
    
    console.log(`✅ Found user with active regions (expires ${regionsExpiresAt.toISOString()}):`, regions);
    return {
      found: true,
      regions,
      purchaseCount: regions.length,
      totalSpent: user.total_spent || 0,
      lastPurchase: user.last_purchase_at
    };
    
  } catch (error) {
    console.error('❌ Error checking purchase history:', error);
    return {
      found: false,
      regions: []
    };
  }
}

// Create and store magic link token
async function createMagicLink(email) {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    // Update the user with the new magic token
    const { data, error } = await supabase
      .from('users')
      .update({
        magic_token: token,
        magic_token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase().trim())
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating magic link:', error);
      throw error;
    }
    
    console.log('✅ Magic link created for user:', data.id);
    return token;
    
  } catch (error) {
    console.error('❌ Failed to create magic link:', error);
    throw error;
  }
}

// Send magic link email
async function sendMagicLinkEmail(email, magicLinkUrl, purchaseData) {
  const regions = purchaseData.regions;
  const regionText = regions.length === 1 ? 
    `the ${regions[0]} region` : 
    `${regions.length} regions: ${regions.join(', ')}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { padding: 40px 20px; background: white; border: 1px solid #ddd; border-radius: 0 0 12px 12px; }
        .access-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; font-size: 18px; }
        .access-button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .status-box { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .regions-list { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .button-container { text-align: center; margin: 30px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .region-badge { display: inline-block; background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin: 2px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎨 Amsterdam Street Art Map</h1>
        <p>Your access link is ready!</p>
      </div>
      
      <div class="content">
        <div class="status-box">
          <h2>🎉 Welcome Back!</h2>
          <p>We found your purchase history! You have access to ${regionText}.</p>
        </div>
        
        <div class="regions-list">
          <h3>Your Accessible Regions:</h3>
          <p>
            ${regions.map(region => `<span class="region-badge">${region}</span>`).join('')}
          </p>
          <p><small>You purchased ${purchaseData.purchaseCount} access${purchaseData.purchaseCount > 1 ? 'es' : ''} total.</small></p>
        </div>
        
        <h2>Ready to explore Amsterdam's street art?</h2>
        <p>Click the button below to access your interactive map:</p>
        
        <div class="button-container">
          <a href="${magicLinkUrl}" class="access-button">🚀 Access My Map Now</a>
        </div>
        
        <div class="warning">
          <p><strong>⏰ Important:</strong></p>
          <ul>
            <li>This magic link expires in <strong>30 minutes</strong></li>
            <li>Can only be used <strong>once</strong></li>
            <li>Your access will be permanent after activation</li>
            <li>You can always request a new magic link with this email</li>
          </ul>
        </div>
        
        <p>Can't click the button? Copy and paste this link:<br>
        <code style="background: #f8f9fa; padding: 8px; border-radius: 4px; font-size: 12px; word-break: break-all;">${magicLinkUrl}</code></p>
      </div>
      
      <div class="footer">
        <p>© 2024 Amsterdam Street Art Map</p>
        <p>Need help? Reply to this email or contact us at info@streetartmapamsterdam.com</p>
      </div>
    </body>
    </html>
  `;

  const msg = {
    to: email,
    from: {
      email: process.env.SENDER_EMAIL || 'admin@creativetechnologists.nl',
      name: 'Amsterdam Street Art Map'
    },
    subject: `🎨 Your Amsterdam Street Art Map Access Link`,
    html: html
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Magic link email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ SendGrid error:', error);
    return false;
  }
}
