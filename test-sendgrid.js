require('dotenv').config();
const sgMail = require('@sendgrid/mail');

console.log('🔑 SendGrid API Key:', process.env.SENDGRID_API_KEY ? `${process.env.SENDGRID_API_KEY.substring(0, 20)}...` : 'NOT FOUND');
console.log('📧 Sender Email:', process.env.SENDER_EMAIL);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testSendGrid() {
  const msg = {
    to: 'superdwayne@gmail.com', // Replace with your email
    from: process.env.SENDER_EMAIL || 'admin@creativetechnologists.nl',
    subject: 'Test Email from Amsterdam Street Art Map',
    text: 'This is a test email to verify SendGrid is working!',
    html: '<strong>This is a test email to verify SendGrid is working!</strong>'
  };

  try {
    console.log('📤 Sending test email...');
    await sgMail.send(msg);
    console.log('✅ Test email sent successfully!');
  } catch (error) {
    console.error('❌ SendGrid error:', error);
    if (error.response) {
      console.error('Response body:', error.response.body);
    }
  }
}

testSendGrid();
