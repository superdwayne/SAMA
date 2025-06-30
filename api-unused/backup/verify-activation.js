import { promises as fs } from 'fs';
import path from 'path';
import sgMail from '@sendgrid/mail';

const DATABASE_PATH = path.join(process.cwd(), 'database.json');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function loadDatabase() {
  try {
    const data = await fs.readFile(DATABASE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: {}, purchases: {}, activationLinks: {} };
  }
}

async function saveDatabase(database) {
  await fs.writeFile(DATABASE_PATH, JSON.stringify(database, null, 2));
}

async function sendVerificationEmail(email, code, region) {
  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL || 'noreply@streetartmap.com',
    subject: `Verification Code: ${code} - Amsterdam Street Art Map`,
    text: `Security Verification\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't try to activate ${region} district access, please ignore this email.\n\nAmsterdam Street Art Map Team`,
    html: `<!DOCTYPE html><html><head><style>body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; } .container { max-width: 400px; margin: 0 auto; padding: 20px; } .header { background: #FF6B6B; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; } .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 2px solid #FF6B6B; border-top: none; text-align: center; } .code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #FF6B6B; background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 3px solid #FF6B6B; letter-spacing: 8px; } .warning { background: #FFF3CD; border: 2px solid #FFEB3B; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; }</style></head><body><div class="container"><div class="header"><h2 style="margin: 0;">🔒 Security Verification</h2></div><div class="content"><p>Your verification code for ${region} district access:</p><div class="code">${code}</div><p><strong>⏰ Expires in 10 minutes</strong></p><div class="warning">If you didn't try to activate access, please ignore this email.</div></div></div></body></html>`
  };
  
  try {
    await sgMail.send(msg);
    console.log('✅ Verification email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    return false;
  }
}

export default async function handler(req, res) {
  const { linkId, action, verificationCode } = req.body;

  if (!linkId) {
    return res.status(400).json({ error: 'Link ID is required' });
  }

  try {
    const database = await loadDatabase();
    const activationLink = database.activationLinks[linkId];

    if (!activationLink) {
      return res.status(404).json({ error: 'Invalid activation link' });
    }

    if (req.method === 'POST') {
      if (action === 'send_verification') {
        // Send verification code to original email
        const success = await sendVerificationEmail(
          activationLink.email, 
          activationLink.verificationCode, 
          activationLink.region
        );
        
        if (success) {
          return res.json({
            success: true,
            message: `Verification code sent to ${activationLink.email.substring(0, 3)}***@${activationLink.email.split('@')[1]}`
          });
        } else {
          return res.status(500).json({ error: 'Failed to send verification email' });
        }
      }
      
      if (action === 'verify') {
        // Verify the code
        if (!verificationCode) {
          return res.status(400).json({ error: 'Verification code is required' });
        }

        if (activationLink.verificationCode !== verificationCode) {
          return res.status(400).json({ error: 'Invalid verification code' });
        }

        if (new Date() > new Date(activationLink.verificationExpires)) {
          return res.status(410).json({ error: 'Verification code expired' });
        }

        // Verification successful - activate the access
        const purchase = database.purchases[activationLink.purchaseId];
        
        activationLink.used = true;
        activationLink.usedAt = new Date().toISOString();
        activationLink.verifiedAt = new Date().toISOString();
        
        purchase.status = 'active';
        purchase.activatedAt = new Date().toISOString();

        await saveDatabase(database);

        console.log(`✅ Verified activation for ${activationLink.email}, purchase: ${purchase.id}`);

        return res.json({
          success: true,
          message: `Successfully activated ${activationLink.region} district access!`,
          data: {
            email: activationLink.email,
            region: activationLink.region,
            expiresAt: purchase.expiresAt,
            daysRemaining: Math.ceil((new Date(purchase.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)),
            userSession: {
              sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              email: activationLink.email,
              regions: [activationLink.region],
              expiresAt: purchase.expiresAt
            }
          }
        });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
