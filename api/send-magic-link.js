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

  const html = `<!doctype html>
<html>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amsterdam Street Art Map – Your Magic Link</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Roboto+Mono&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      font-family: Verdana, Arial, sans-serif;
      color: #000000;
      line-height: 1.4;
      background-color: #FFFF00;
    }

    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    td {
      padding: 0;
      vertical-align: top;
    }

  </style>
  <body>
    <table align="center" width="100%" style="margin: 0 auto; max-width: 600px; background-color: #FFFF00; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;" role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tbody>
        <tr style="width: 100%;">
          <td style="background-color: #FFFF00; padding: 40px 20px;">
            
            <!-- Logo section -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td style="font-size: 48px; font-weight: 900; line-height: 0.9; color: #3416D8; text-transform: uppercase; font-family: 'PPNeueMachina-PlainUltrabold', Arial, Helvetica, sans-serif; padding-bottom: 24px;">
                  Amsterdam<br>
                  Street<br>
                  Art Map
                </td>
              </tr>
            </table>

            <!-- Intro text -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td style=" font-size: 18px; color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                  Your access link is ready!
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td style="padding: 32px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                    <tr>
                      <td style="height: 1px; background-color: #000; line-height: 1px; font-size: 1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Welcome Back section -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td style="font-size: 24px; font-weight: bold; color: #000; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;">
                  Welcome Back!
                </td>
              </tr>
              <tr>
                <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                  We found your purchase history!
                </td>
              </tr>
              <tr>
                <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                  You have access to ${regions.length} region${regions.length > 1 ? 's' : ''}: ${regions.join(', ')}.
                </td>
              </tr>
            </table>

            <!-- Accessible Regions section -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td style="font-size: 20px; font-weight: bold; color: #000; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;">
                  Your Accessible Regions:
                </td>
              </tr>
              <tr>
                <td style="font-weight: 500; color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                  ${regions.join('<br>')}
                </td>
              </tr>
              <tr>
                <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                  You purchased ${purchaseData.purchaseCount} access${purchaseData.purchaseCount > 1 ? 'es' : ''} total.
                </td>
              </tr>
            </table>

            <!-- Ready to explore section -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td style="font-size: 20px; font-weight: bold; color: #000; font-family: Verdana, Arial, sans-serif; padding: 32px 0 8px 0;">
                  Ready to explore Amsterdam's street art?
                </td>
              </tr>
              <tr>
                <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                  Click the button below to access your interactive map:
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td style="padding: 20px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                    <tr>
                      <td style="background-color: #3416D8; border-radius: 8px;">
                        <a href="${magicLinkUrl}" style="display: inline-block; background-color: #3416D8; color: #ffffff !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 17px; font-family: 'PPNeueMachina-PlainUltrabold', Arial, Helvetica, sans-serif;">Access My Map Now</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td style="padding: 10px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                    <tr>
                      <td style="height: 1px; background-color: #000; line-height: 1px; font-size: 1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
           </table>

            <!-- Important section -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                    <tr>
                      <td style="font-size: 20px; font-weight: bold; color: #000; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;">
                        Important:
                      </td>
                    </tr>
                    <tr>
                      <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                        This magic link expires in <strong>30 minutes</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding: 8px 0;">
                        • Can only be used once<br>
                        • Your access will be permanent after activation<br>
                        • You can always request a new magic link with this email
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Manual link section -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;">
                  Can't click the button? Copy and paste this link:
                </td>
              </tr>
              <tr>
                <td style="word-break: break-all; font-size: 12px; color: #3416D8; font-family: Verdana, Arial, sans-serif; padding: 0px 0px 180px 0px">
                  <a href="${magicLinkUrl}" style="color: #3416D8; text-decoration: none; word-break: break-all; font-size: 12px;">${magicLinkUrl}</a>
                </td>
              </tr>
            </table>

            
            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td style="padding-top: 48px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                    <tr>
                      <td style="font-size: 14px; color: #000; font-family: Verdana, Arial, sans-serif; ">
                        © 2024 Amsterdam Street Art Map
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size: 14px; color: #000; font-family: Verdana, Arial, sans-serif; ">
                        Need help? Reply to this email or contact us<br>
                        at info@streetartmapamsterdam.com
                      </td>
                    </tr>

                    <tr>
                      <td colspan="2" style="padding: 30px 0 20px 0px">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                          <tr>
                            <td style="height: 1px; background-color: #000; line-height: 1px; font-size: 1px;">&nbsp;</td>
                          </tr>
                        </table>
                      </td>
                    </tr>


                    <tr>
                    <td style="font-size: 18px; color: #000; font-family: 'PPNeueMachina-PlainUltrabold', Arial, Helvetica, sans-serif;">
                        Street Art <br/> Museum <br/> Amsterdam
                      </td>

                      <td style="padding: 32px 0 0 0; text-align: left;">
                        <img src="https://www.streetartmapamsterdam.nl/sama-logo.png" alt="Street Art Museum Amsterdam" style="width: 120px; height: auto; display: block;" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;

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
