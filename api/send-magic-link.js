// api/send-magic-link.js
// Simple magic link that works on serverless

const sgMail = require('@sendgrid/mail');

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
    
    const purchaseData = checkPurchaseHistory(normalizedEmail);
    console.log('💳 Purchase data result:', purchaseData);
    
    if (!purchaseData.found) {
      console.log('❌ No purchase found, returning 404');
      return res.status(404).json({
        error: 'No purchase record found',
        message: 'We could not find any purchases associated with this email address. To access premium regions, please make a purchase first.',
        code: 'NO_PURCHASE_FOUND',
        email: normalizedEmail
      });
    } else if (!purchaseData.hasPurchased) {
      console.log('❌ Purchase required, returning 403');
      return res.status(403).json({
        error: 'Purchase required',
        message: 'You need to purchase access to unlock premium regions. Please make a purchase first.',
        code: 'PURCHASE_REQUIRED',
        email: normalizedEmail
      });
    } else {
      console.log('✅ Purchase found, sending magic link');
      // Create a simple magic token with email and timestamp embedded
      const magicToken = createMagicToken(normalizedEmail, purchaseData);
      // Create magic link URL
      const magicLinkUrl = `${req.headers.origin || 'https://amsterdamstreetart-byu4ocgn-dpms-projects-8cd1083b.vercel.app'}?magic=${magicToken}`;
      // Send email
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const emailSent = await sendMagicLinkEmail(normalizedEmail, magicLinkUrl, purchaseData.hasPurchased);
      if (!emailSent) {
        throw new Error('Failed to send email');
      }
      res.status(200).json({
        success: true,
        message: 'Magic link sent successfully!',
        hasPurchased: purchaseData.hasPurchased
      });
    }

  } catch (error) {
    console.error('Magic link error:', error);
    res.status(500).json({ 
      error: 'Failed to send magic link. Please try again.' 
    });
  }
}

// Check purchase history
function checkPurchaseHistory(email) {
  // TESTING: Only these emails have purchases
  const purchasedEmails = {
    'superdwayne@gmail.com': { 
      hasPurchased: true, 
      regions: ['East', 'West', 'North', 'South', 'Center', 'Nieuw-West']  // Added all regions including Center
    }
    // NO OTHER EMAILS HAVE PURCHASES FOR TESTING
  };
  
  console.log(`🔎 Checking purchase history for: "${email}"`);
  console.log(`💰 Emails with purchases:`, Object.keys(purchasedEmails));
  console.log(`🎯 Email match check: ${email} in list? ${email in purchasedEmails}`);
  
  if (purchasedEmails[email]) {
    console.log(`✅ FOUND purchase for ${email}:`, purchasedEmails[email]);
    return {
      found: true,
      hasPurchased: true,
      ...purchasedEmails[email]
    };
  }
  
  console.log(`❌ NO PURCHASE found for "${email}" - should return 404`);
  // No purchase record found
  return {
    found: false,
    hasPurchased: false
  };
}

// Create magic token with embedded data (no storage needed)
function createMagicToken(email, purchaseData) {
  const data = {
    email,
    hasPurchased: purchaseData.hasPurchased,
    regions: purchaseData.regions || ['East'],
    timestamp: Date.now()
  };
  
  // Encode data in the token itself
  const payload = JSON.stringify(data);
  return Buffer.from(payload).toString('base64').replace(/[+/=]/g, '');
}

// Send magic link email
async function sendMagicLinkEmail(email, magicLinkUrl, hasPurchased) {
  const subject = hasPurchased 
    ? '🎨 Your Amsterdam Street Art Map Access Link'
    : '🎨 Welcome to Amsterdam Street Art Map';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { padding: 40px 20px; background: white; border: 1px solid #ddd; }
        .access-button { display: inline-block; background: #3498db; color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; margin: 20px 0; }
        .status-box { background: ${hasPurchased ? '#d4edda' : '#fff3cd'}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .warning { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .button-container { text-align: center; margin: 30px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎨 Amsterdam Street Art Map</h1>
        <p>Your magic access link is ready!</p>
      </div>
      <div class="content">
        ${hasPurchased ? `
          <div class="status-box">
            <h2>🎉 Welcome Back!</h2>
            <p>We found your previous purchase! You have full access to all map regions.</p>
          </div>
        ` : `
          <div class="status-box">
            <h2>🗺️ Welcome!</h2>
            <p>You'll have access to the East region (free) and can purchase additional regions once inside.</p>
          </div>
        `}
        
        <h2>Ready to explore Amsterdam's street art?</h2>
        <p>Click the button below to access your interactive map:</p>
        
        <div class="button-container">
          <a href="${magicLinkUrl}" class="access-button">🚀 Access My Map Now</a>
        </div>
        
        <div class="warning">
          ⏰ <strong>Important:</strong> This magic link expires in 10 minutes and can only be used once.
        </div>
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
    subject: subject,
    html: html
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('SendGrid error:', error);
    return false;
  }
}
