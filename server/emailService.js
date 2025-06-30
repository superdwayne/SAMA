const nodemailer = require('nodemailer');

// Create transporter based on email service
function createEmailTransporter() {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    // Gmail configuration
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use app password, not regular password
      }
    });
  } else if (process.env.SENDGRID_API_KEY) {
    // SendGrid configuration (handled separately)
    return null;
  } else {
    // Development/test configuration (Ethereal Email)
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal_user',
        pass: 'ethereal_pass'
      }
    });
  }
}

// Send email with Nodemailer
async function sendEmailWithNodemailer(email, token, region) {
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    throw new Error('Email transporter not configured');
  }
  
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@streetartmap.com',
    to: email,
    subject: 'Your Amsterdam Street Art Map Access Token',
    text: `
Thank you for your purchase!

Your access token for the ${region} district is:
${token}

This token is valid for 30 days until ${expirationDate.toLocaleDateString()}.

To activate your access:
1. Go to ${process.env.CLIENT_URL || 'http://localhost:3000'}/token
2. Enter your email address
3. Enter the token above
4. Enjoy exploring Amsterdam's street art!

Important: Keep this token safe. You'll need it to access the map.

If you have any questions, please contact us at info@streetartmuseumamsterdam.com

Best regards,
Amsterdam Street Art Map Team
    `,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px; }
    .token-box { background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
    .token { font-family: 'Courier New', monospace; font-size: 20px; color: #667eea; font-weight: bold; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Amsterdam Street Art Map</h1>
      <p>Your Access Token</p>
    </div>
    <div class="content">
      <h2>Thank you for your purchase!</h2>
      <p>Your access token for the <strong>${region}</strong> district is:</p>
      
      <div class="token-box">
        <div class="token">${token}</div>
      </div>
      
      <p><strong>Valid until:</strong> ${expirationDate.toLocaleDateString()}</p>
      
      <h3>How to activate:</h3>
      <ol>
        <li>Click the button below or go to our website</li>
        <li>Enter your email address</li>
        <li>Enter the token above</li>
        <li>Start exploring!</li>
      </ol>
      
      <center>
        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/token" class="button">Activate Your Access</a>
      </center>
      
      <p><strong>Important:</strong> Keep this email safe. You'll need the token to access the map.</p>
    </div>
    <div class="footer">
      <p>Questions? Contact us at info@streetartmuseumamsterdam.com</p>
      <p>&copy; 2024 Amsterdam Street Art Map</p>
    </div>
  </div>
</body>
</html>
    `
  };
  
  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent:', info.messageId);
  
  // For Ethereal, log the preview URL
  if (process.env.NODE_ENV === 'development') {
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  }
  
  return info;
}

module.exports = {
  sendEmailWithNodemailer
};