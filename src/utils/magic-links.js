// src/utils/magicLinkUtils.js
// Simple magic link utilities with readable date formatting

export class SimpleMagicLink {
  constructor() {
    this.accessKey = 'amsterdam_map_access';
  }

  // Helper function to format timestamps
  formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  // Helper function to get days remaining
  getDaysRemaining(expiresAt) {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / (24 * 60 * 60 * 1000));
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
      // First check if user already has access
      const currentAccess = this.getCurrentAccess();
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/verify-magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Check if this is a duplicate verification
        if (currentAccess && currentAccess.email === result.email) {
          return { 
            success: true, 
            alreadyVerified: true,
            message: 'You\'re already signed in! Welcome back.',
            email: result.email,
            regions: result.regions,
            hasPurchased: result.hasPurchased
          };
        }
        
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
    
    // Log readable information
    console.log('✅ Access granted:', {
      email: accessData.email,
      regions: accessData.regions,
      hasPurchased: accessData.hasPurchased,
      accessedOn: this.formatTimestamp(accessData.accessedAt),
      expiresOn: this.formatTimestamp(accessData.expiresAt),
      daysOfAccess: this.getDaysRemaining(accessData.expiresAt)
    });
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
    if (!access) return ['Nieuw-West']; // Nieuw-West is always free
    
    // Return Nieuw-West + any purchased regions
    const purchasedRegions = access.regions || [];
    return ['Nieuw-West', ...purchasedRegions.filter(region => region !== 'Nieuw-West')];
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
    
    return this.getDaysRemaining(access.expiresAt);
  }

  // Get readable access info
  getReadableAccess() {
    const access = this.getCurrentAccess();
    if (!access) return null;

    return {
      email: access.email,
      regions: access.regions,
      hasPurchased: access.hasPurchased,
      accessedOn: this.formatTimestamp(access.accessedAt),
      expiresOn: this.formatTimestamp(access.expiresAt),
      daysRemaining: this.getDaysRemaining(access.expiresAt),
      isExpired: Date.now() > access.expiresAt
    };
  }

  // Log readable access info to console
  logAccessInfo() {
    const readable = this.getReadableAccess();
    if (readable) {
      console.log('📅 Current Access Information:', readable);
    } else {
      console.log('❌ No access found');
    }
    return readable;
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

// Global helper functions for browser console
if (typeof window !== 'undefined') {
  // Make helper functions available in browser console
  window.showMyAccess = () => magicLink.logAccessInfo();
  window.getReadableAccess = () => magicLink.getReadableAccess();
  window.formatTimestamp = (timestamp) => magicLink.formatTimestamp(timestamp);
  
  console.log('🔧 Helper functions available:');
  console.log('- showMyAccess() - Shows your current access in readable format');
  console.log('- getReadableAccess() - Returns readable access object');
  console.log('- formatTimestamp(timestamp) - Converts timestamp to readable date');
}
