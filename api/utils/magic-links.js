// Magic Link Token System
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const magicLinksPath = path.join(process.cwd(), 'magic-links.json');

// Generate secure magic link token
function generateMagicToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Store magic link mapping
async function storeMagicLink(magicToken, data) {
  let magicLinks = {};
  try {
    const content = await fs.readFile(magicLinksPath, 'utf8');
    magicLinks = JSON.parse(content);
  } catch (err) {
    // File doesn't exist, start fresh
  }
  
  magicLinks[magicToken] = {
    ...data,
    createdAt: Date.now(),
    expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes for magic link
    used: false
  };
  
  await fs.writeFile(magicLinksPath, JSON.stringify(magicLinks, null, 2));
  return magicToken;
}

// Validate and consume magic link
async function validateMagicLink(magicToken, email) {
  try {
    const content = await fs.readFile(magicLinksPath, 'utf8');
    const magicLinks = JSON.parse(content);
    const linkData = magicLinks[magicToken];
    
    if (!linkData) {
      return { valid: false, error: 'Invalid magic link' };
    }
    
    if (linkData.used) {
      return { valid: false, error: 'Magic link already used' };
    }
    
    if (Date.now() > linkData.expiresAt) {
      return { valid: false, error: 'Magic link expired' };
    }
    
    if (linkData.email !== email) {
      return { valid: false, error: 'Email mismatch' };
    }
    
    // Mark as used
    linkData.used = true;
    linkData.usedAt = Date.now();
    magicLinks[magicToken] = linkData;
    await fs.writeFile(magicLinksPath, JSON.stringify(magicLinks, null, 2));
    
    return {
      valid: true,
      accessToken: linkData.accessToken,
      region: linkData.region,
      expiresAt: linkData.accessExpiresAt
    };
    
  } catch (error) {
    return { valid: false, error: 'Failed to validate magic link' };
  }
}

// Clean up expired magic links
async function cleanupExpiredLinks() {
  try {
    const content = await fs.readFile(magicLinksPath, 'utf8');
    const magicLinks = JSON.parse(content);
    const now = Date.now();
    
    const activeLinks = {};
    for (const [token, data] of Object.entries(magicLinks)) {
      if (now < data.expiresAt) {
        activeLinks[token] = data;
      }
    }
    
    await fs.writeFile(magicLinksPath, JSON.stringify(activeLinks, null, 2));
    console.log('🧹 Cleaned up expired magic links');
  } catch (error) {
    console.error('Failed to cleanup magic links:', error);
  }
}

module.exports = {
  generateMagicToken,
  storeMagicLink,
  validateMagicLink,
  cleanupExpiredLinks
};
