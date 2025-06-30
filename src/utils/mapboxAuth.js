// src/utils/mapboxAuth.js
// Enhanced Mapbox token management utilities

export class MapboxTokenManager {
  constructor() {
    this.defaultToken = import.meta.env.VITE_MAPBOX_TOKEN;
    this.customTokenKey = 'mapbox_access_token';
    this.tokenValidationCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get the current active Mapbox token
   * Priority: Custom token > Environment token
   */
  getActiveToken() {
    const customToken = this.getCustomToken();
    return customToken || this.defaultToken;
  }

  /**
   * Get custom token from localStorage
   */
  getCustomToken() {
    try {
      const tokenData = localStorage.getItem(this.customTokenKey);
      if (!tokenData) return null;
      
      const data = JSON.parse(tokenData);
      
      // Check if token has expired
      if (data.expiresAt && Date.now() > data.expiresAt) {
        this.removeCustomToken();
        return null;
      }
      
      return data.token;
    } catch (error) {
      console.error('Error retrieving custom Mapbox token:', error);
      return null;
    }
  }

  /**
   * Save custom token to localStorage
   */
  saveCustomToken(token, expiresInDays = 30) {
    try {
      const tokenData = {
        token,
        createdAt: Date.now(),
        expiresAt: Date.now() + (expiresInDays * 24 * 60 * 60 * 1000)
      };
      
      localStorage.setItem(this.customTokenKey, JSON.stringify(tokenData));
      
      // Clear validation cache when token changes
      this.tokenValidationCache.clear();
      
      return true;
    } catch (error) {
      console.error('Error saving custom Mapbox token:', error);
      return false;
    }
  }

  /**
   * Remove custom token from localStorage
   */
  removeCustomToken() {
    localStorage.removeItem(this.customTokenKey);
    this.tokenValidationCache.clear();
  }

  /**
   * Validate a Mapbox token by making a test API call
   */
  async validateToken(token) {
    if (!token) return { valid: false, error: 'No token provided' };

    // Check cache first
    const cacheKey = token.substring(0, 20); // Use first 20 chars as cache key
    const cached = this.tokenValidationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.result;
    }

    try {
      // Test the token with a simple Mapbox API call
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/amsterdam.json?access_token=${token}&limit=1`
      );

      if (response.status === 200) {
        const result = { valid: true, token };
        this.tokenValidationCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
        return result;
      } else if (response.status === 401) {
        const result = { valid: false, error: 'Invalid or expired token' };
        this.tokenValidationCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
        return result;
      } else {
        return { valid: false, error: `API error: ${response.status}` };
      }
    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false, error: 'Network error during validation' };
    }
  }

  /**
   * Get token usage information (requires a valid token)
   */
  async getTokenUsage(token) {
    if (!token) return null;

    try {
      // Note: Mapbox doesn't have a public usage API endpoint
      // This is a placeholder for potential future implementation
      // You might integrate with Mapbox account API if available
      
      const validation = await this.validateToken(token);
      if (!validation.valid) return null;

      return {
        valid: true,
        // Add usage data here if Mapbox provides it
        message: 'Token is valid and active'
      };
    } catch (error) {
      console.error('Error getting token usage:', error);
      return null;
    }
  }

  /**
   * Check if user is using a custom token
   */
  isUsingCustomToken() {
    return !!this.getCustomToken();
  }

  /**
   * Get token information for display
   */
  getTokenInfo() {
    const customToken = this.getCustomToken();
    
    if (customToken) {
      try {
        const tokenData = JSON.parse(localStorage.getItem(this.customTokenKey));
        return {
          type: 'custom',
          token: customToken,
          masked: this.maskToken(customToken),
          createdAt: tokenData.createdAt,
          expiresAt: tokenData.expiresAt,
          daysRemaining: tokenData.expiresAt ? 
            Math.max(0, Math.ceil((tokenData.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))) : null
        };
      } catch (error) {
        console.error('Error parsing token data:', error);
      }
    }

    return {
      type: 'default',
      token: this.defaultToken,
      masked: this.maskToken(this.defaultToken),
      source: 'environment'
    };
  }

  /**
   * Mask token for display purposes
   */
  maskToken(token) {
    if (!token) return 'No token';
    if (token.length < 10) return token;
    
    return `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
  }

  /**
   * Reset to default token
   */
  resetToDefault() {
    this.removeCustomToken();
    this.tokenValidationCache.clear();
  }
}

// Create singleton instance
export const mapboxTokenManager = new MapboxTokenManager();

// Convenience functions
export const getMapboxToken = () => mapboxTokenManager.getActiveToken();
export const validateMapboxToken = (token) => mapboxTokenManager.validateToken(token);
export const saveMapboxToken = (token, expiresInDays) => mapboxTokenManager.saveCustomToken(token, expiresInDays);
