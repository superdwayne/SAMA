import { Resend } from 'resend';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Amsterdam Street Art Map – Your Magic Link</title>
        <style>
          :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
          }
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Roboto+Mono&display=swap');
          
          @media (prefers-color-scheme: dark) {
            .dark-mode-bg { background-color: #1a1a1a !important; }
            .dark-mode-text, .dark-mode-text strong { color: #e0e0e0 !important; }
            .dark-mode-header { color: #8a7ffc !important; }
            .dark-mode-link { color: #8a7ffc !important; }
            .dark-mode-button-cell { background-color: #8a7ffc !important; }
            .dark-mode-button-link { color: #1a1a1a !important; }
          }
        </style>
      </head>
      <body style="background-color: #FFFF00; margin: 0; padding: 0; font-family: Verdana, Arial, sans-serif; color: #000000; line-height: 1.4;" class="dark-mode-bg">
        <table align="center" width="100%" style="margin: 0 auto; max-width: 600px; background-color: #FFFF00; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;" role="presentation" cellspacing="0" cellpadding="0" border="0" class="dark-mode-bg">
          <tbody>
            <tr style="width: 100%;">
              <td style="background-color: #FFFF00; padding: 40px 20px;" class="dark-mode-bg">
                
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tr>
                    <td width="50%" style="font-size: 30px; font-weight: 900; line-height: 0.9; color: #3416D8; text-transform: uppercase; font-family: 'PPNeueMachina-PlainUltrabold', Arial, Helvetica, sans-serif; padding-bottom: 24px; vertical-align: top;" class="dark-mode-header">
                      Street<br>
                      Art Map<br>
                      Amsterdam
                    </td>
                    <td width="50%" style="text-align: right; padding-bottom: 24px; vertical-align: top;">
                      <img src="https://www.streetartmapamsterdam.nl/images/URBANITES_UNITED.png" alt="Urbanites United" style="width: 200px; height: auto; display: block; margin-left: auto;" />
                    </td>
                  </tr>
                </table>
    
    
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tr>
                    <td style="font-size: 16px; font-weight: bold; color: #000; font-family: Verdana, Arial, sans-serif; padding: 24px 0 10px 0;" class="dark-mode-text">
                      Dear Street Art Explorer, 
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #000; font-family: Verdana, Arial, sans-serif; padding-bottom: 10px;" class="dark-mode-text">
                     Thank you for your purchase! </br>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #000; font-size: 13px; font-family: Verdana, Arial, sans-serif;" class="dark-mode-text">
                      Your access to ${regions.join(', ')} district${regions.length > 1 ? 's' : ''}  is now active. We're excited to have you explore the area through the lens of street art and
discover the stories that shape this vibrant part of Amsterdam.
                    </td>
                  </tr>
                </table>
    
               
    
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tr>
                    <td style="font-size: 16px; font-weight: bold; color: #000; font-family: Verdana, Arial, sans-serif; padding: 32px 0 8px 0;" class="dark-mode-text">
                      Ready to explore Amsterdam's street art?
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #000; font-size: 13px; font-family: Verdana, Arial, sans-serif; padding: 8px 0;" class="dark-mode-text">
                      Click the button below to access your interactive map:
                    </td>
                  </tr>
                </table>
    
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tr>
                    <td style="padding: 20px 0;">
                      <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                        <tr>
                          <td style="background-color: #3416D8;" class="dark-mode-button-cell">
                            <a href="${magicLinkUrl}" style="display: inline-block; background-color: #3416D8; color: #ffffff !important; text-decoration: none; padding: 10px 32px; border-radius: 8px; font-size: 17px; font-family: 'PPNeueMachina-PlainUltrabold', Arial, Helvetica, sans-serif;" class="dark-mode-button-link">Enter the Street Art Map</a>
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
    
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                        <tr>
                          <td style="font-size: 16px; font-weight: bold; color: #000; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;" class="dark-mode-text">
                            Important:
                          </td>
                        </tr>
                        <tr>
                          <td style="color: #000; font-size: 13px; font-family: Verdana, Arial, sans-serif; padding: 8px 0;" class="dark-mode-text">
                            This magic link expires in <strong class="dark-mode-text">30 minutes</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style="color: #000; font-size: 13px; font-family: Verdana, Arial, sans-serif; padding: 8px 0;" class="dark-mode-text">
                            • Can only be used once<br>
                            • Your access will be permanent after activation<br>
                            • You can always request a new magic link with this email
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
    
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tr>
                    <td style="color: #000; font-size: 13px; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;" class="dark-mode-text">
                      Having trouble clicking the button?  Try copying and pasting this link into your browser:
                    </td>
                  </tr>
                  <tr>
                    <td style="word-break: break-all; font-size: 10px; color: #3416D8; font-family: Verdana, Arial, sans-serif; padding: 0px 0px 0px 0px">
                      <a href="${magicLinkUrl}" style="color: #3416D8; text-decoration: none; word-break: break-all; font-size: 12px;" class="dark-mode-link">${magicLinkUrl}</a>
                    </td>
                  </tr>
                   <tr>
                    <td style="color: #000; font-size: 13px; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;" class="dark-mode-text">
                     If you have any questions or need assistance, feel free to reach out to us at <br />
                     to reach out to us at <br />
Answers@StreetArtMuseumAmsterdam.com
                    </td>
                  </tr>
                   <tr>
                    <td style="color: #000; font-size: 13px; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;" class="dark-mode-text">
                    Enjoy your journey,
                    </td>
                  </tr>
                   <tr>
                    <td style="color: #000; font-size: 13px; font-family: Verdana, Arial, sans-serif; padding: 24px 0 8px 0;" class="dark-mode-text">
                    SAMA Crew
                    </td>
                  </tr>
                </table>
    
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                  <tr>
                    <td style="padding-top: 48px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                        <tr>
                          <td style="font-size: 13px; color: #000; font-family: Verdana, Arial, sans-serif;" class="dark-mode-text">
                            © 2025 Stichting Street Museum Amsterdam
                          </td>
                        </tr>
                      </table>
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
                    <td style=" width: 100%; font-size: 18px; color: #000; font-family: 'PPNeueMachina-InktrapRegular', Arial, Helvetica, sans-serif;" class="dark-mode-text">
                        Street Art <br/> Museum <br/> Amsterdam
                      </td>

                      <td style="padding: 32px 0 0 0; text-align: left;">
                        <img src="https://www.streetartmapamsterdam.nl/sama-logo.png" alt="Street Art Museum Amsterdam" style="width: 120px; height: auto; display: block;" />
                      </td>
                    </tr>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.SENDER_EMAIL || 'noreply@streetartmapamsterdam.nl',
      to: [email],
      subject: `Thank You for Your Purchase - Your Map Access is Now Active`,
      html: html
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return false;
    }

    console.log('✅ Magic link email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Resend error:', error);
    return false;
  }
}
