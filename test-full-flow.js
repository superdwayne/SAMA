require('dotenv').config();

// Test the webhook processing logic directly
const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');

// Copy the functions from server.js
const generateAccessToken = (region) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = crypto.randomBytes(6).toString('hex').toUpperCase();
  const regionCode = region ? region.substring(0, 3).toUpperCase() : 'AMS';
  return `${regionCode}-${timestamp}-${randomStr}`;
};

async function storeToken(token, data) {
  const tokensPath = path.join(process.cwd(), 'tokens.json');
  let tokens = {};
  try {
    const content = await fs.readFile(tokensPath, 'utf8');
    tokens = JSON.parse(content);
  } catch (err) {
    // Ignore if file does not exist
  }
  tokens[token] = data;
  await fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2));
}

// Simulate a hardcoded payment link scenario
async function simulateHardcodedPayment() {
  console.log('🧪 Simulating hardcoded payment link webhook...');
  
  const customerEmail = 'superdwayne@gmail.com';
  const region = 'Centre';
  const newAccessToken = generateAccessToken(region);
  
  console.log('📧 Customer email:', customerEmail);
  console.log('🔑 Generated token:', newAccessToken);
  console.log('🗺️ Region:', region);
  
  try {
    await storeToken(newAccessToken, {
      email: customerEmail,
      region: region,
      status: 'active',
      stripeSessionId: 'test_session_123',
      activatedAt: Date.now(),
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
      source: 'hardcoded_link'
    });
    
    console.log('✅ Token stored successfully');
    console.log('🎯 Now testing email sending...');
    
    // Test SendGrid email
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    
    const msg = {
      to: customerEmail,
      from: process.env.SENDER_EMAIL || 'admin@creativetechnologists.nl',
      subject: 'Your Amsterdam Street Art Map Access Token',
      text: `Thank you for your purchase!\n\nYour access token for the ${region} district is:\n${newAccessToken}\n\nThis token is valid for 30 days until ${expirationDate.toLocaleDateString()}.`,
      html: `<h2>🎨 Thank you for your purchase!</h2><p>Your access token for the <strong>${region}</strong> district is:</p><div style="background: #FFFF00; padding: 20px; text-align: center; font-family: monospace; font-size: 24px; font-weight: bold;">${newAccessToken}</div>`
    };
    
    await sgMail.send(msg);
    console.log('✅ Access token email sent successfully!');
    console.log('📧 Check your email for the access token!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.response) {
      console.error('SendGrid response:', error.response.body);
    }
  }
}

simulateHardcodedPayment();
