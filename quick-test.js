// Quick manual test of the magic link system
// Run with: node quick-test.js

console.log('🧪 Quick Magic Link Test');
console.log('========================\n');

// Test the exact same functions used in production
function createMagicToken(email, accessToken, region) {
  const data = {
    email,
    accessToken,
    region,
    hasPurchased: true,
    timestamp: Date.now()
  };
  
  const payload = JSON.stringify(data);
  return Buffer.from(payload).toString('base64').replace(/[+/=]/g, '');
}

function verifyMagicToken(token) {
  try {
    const payload = Buffer.from(token, 'base64').toString('utf8');
    const data = JSON.parse(payload);
    
    // Check if token is expired (10 minutes)
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - data.timestamp > tenMinutes) {
      return { valid: false, error: 'Token expired' };
    }
    
    return {
      valid: true,
      email: data.email,
      accessToken: data.accessToken,
      region: data.region,
      hasPurchased: data.hasPurchased
    };
  } catch (error) {
    return { valid: false, error: 'Invalid token' };
  }
}

// Simulate the complete flow
const testCases = [
  { email: 'customer1@example.com', region: 'Centre' },
  { email: 'customer2@example.com', region: 'North' },
  { email: 'customer3@example.com', region: 'East' }
];

console.log('Testing multiple scenarios...\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.email} - ${testCase.region}`);
  
  // Step 1: Create magic token (webhook does this)
  const accessToken = `${testCase.region.toUpperCase().substring(0,3)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
  const magicToken = createMagicToken(testCase.email, accessToken, testCase.region);
  
  // Step 2: Create magic link URL (email contains this)
  const magicUrl = `https://your-domain.com?magic=${magicToken}`;
  
  // Step 3: Verify magic token (frontend does this)
  const verification = verifyMagicToken(magicToken);
  
  if (verification.valid) {
    console.log(`  ✅ Success!`);
    console.log(`     Access Token: ${verification.accessToken}`);
    console.log(`     Region: ${verification.region}`);
    console.log(`     Magic URL: ${magicUrl.substring(0, 60)}...`);
  } else {
    console.log(`  ❌ Failed: ${verification.error}`);
  }
  
  console.log('');
});

console.log('🎯 All tests completed!');
console.log('\n📋 To test in browser:');
console.log('1. Start your dev server: npm run dev');
console.log('2. Copy one of the magic URLs above');
console.log('3. Replace "your-domain.com" with "localhost:5173"');
console.log('4. Open the URL in your browser');
console.log('5. Check browser console for verification logs');
