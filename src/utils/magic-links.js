// src/utils/magicLinkUtils.js
// Simple magic link utilities

export class SimpleMagicLink {
  constructor() {
    this.accessKey = 'amsterdam_map_access';
  }

  // Check for magic link in URL
  checkForMagicLinkInUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const magicToken = urlParams.get('magic');
    
    if (magicToken) {
      // Clean the URL
      const url = new URL(window.location);
      url.searchParams.delete('magic');
      window.history.replaceState({}, document.title, url.toString());
      
      return magicToken;
    }
    
    return null;
  }

  // Verify magic token with server
  async verifyMagicToken(token) {
    try {
      const response = await fetch('/api/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Save access data
        this.saveAccess(result.email, result.regions, result.hasPurchased);
        return result;
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  // Save access to localStorage
  saveAccess(email, regions, hasPurchased) {
    const accessData = {
      email,
      regions: regions || [],
      hasPurchased: hasPurchased || false,
      accessedAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    };
    
    localStorage.setItem(this.accessKey, JSON.stringify(accessData));
    console.log('✅ Saved access data:', accessData);
  }

  // Get current access
  getCurrentAccess() {
    try {
      const accessData = localStorage.getItem(this.accessKey);
      if (!accessData) return null;

      const data = JSON.parse(accessData);
      
      // Check if access has expired
      if (Date.now() > data.expiresAt) {
        this.clearAccess();
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading access data:', error);
      return null;
    }
  }

  // Get unlocked regions
  getUnlockedRegions() {
    const access = this.getCurrentAccess();
    if (!access) return []; // No free regions - everything locked by default
    
    // Return only the specific regions they have access to
    return access.regions || [];
  }

  // Get user email
  getUserEmail() {
    const access = this.getCurrentAccess();
    return access?.email || null;
  }

  // Get remaining days
  getRemainingDays() {
    const access = this.getCurrentAccess();
    if (!access) return 0;
    
    const remaining = access.expiresAt - Date.now();
    if (remaining <= 0) return 0;
    
    return Math.ceil(remaining / (24 * 60 * 60 * 1000));
  }

  // Clear access
  clearAccess() {
    localStorage.removeItem(this.accessKey);
    // Also clear old auth system data
    localStorage.removeItem('streetArtMapTokenData');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('unlockedRegions');
  }

  // Check if user has access
  hasAccess() {
    return this.getCurrentAccess() !== null;
  }
}

// Create singleton instance
export const magicLink = new SimpleMagicLink();
