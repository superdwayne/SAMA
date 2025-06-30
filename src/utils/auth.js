// Authentication utilities

// Token structure: {token: string, expiresAt: timestamp, regions: array}
export const checkAccessToken = async () => {
  try {
    const tokenData = localStorage.getItem('streetArtMapTokenData');
    
    if (!tokenData) {
      return false;
    }
    
    const data = JSON.parse(tokenData);
    const now = Date.now();
    
    // Check if token has expired
    if (now > data.expiresAt) {
      // Token expired, clear all access
      clearAccess();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking access token:', error);
    return false;
  }
};

export const validateAccessToken = async (token) => {
  try {
    // First check if we have an API endpoint for validation
    if (process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost') {
      try {
        const response = await fetch('/api/validate-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
          return { 
            valid: true, 
            data: {
              token,
              expiresAt: new Date(result.expiresAt).getTime(),
              regions: result.regions,
              email: result.email
            }
          };
        } else {
          return { valid: false, error: result.error || 'Invalid token' };
        }
      } catch (apiError) {
        console.warn('API validation failed, falling back to local validation:', apiError);
        // Fall through to local validation
      }
    }
    
    // Fallback local validation for development
    if (!token || token.length < 10) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    // Check if token exists in localStorage
    const storedData = localStorage.getItem('streetArtMapTokenData');
    if (storedData) {
      const data = JSON.parse(storedData);
      if (data.token === token && Date.now() <= data.expiresAt) {
        return { valid: true, data };
      }
    }
    
    // For demo purposes, accept valid-looking tokens
    // In production, this would only check against the database via API
    if (token.length >= 10) {
      return { 
        valid: true, 
        data: {
          token,
          expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
          regions: ['East', 'South', 'North', 'East', 'West', 'Nieuw-West'], // Full access for demo
        }
      };
    }
    
    return { valid: false, error: 'Token not found or expired' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

export const saveAccessToken = (token, regions, email = null) => {
  const tokenData = {
    token,
    expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year from now
    regions,
    createdAt: Date.now(),
    email
  };
  
  localStorage.setItem('streetArtMapTokenData', JSON.stringify(tokenData));
  if (email) {
    localStorage.setItem('userEmail', email);
  }
  saveUnlockedRegions(regions);
};

export const getTokenData = () => {
  try {
    const data = localStorage.getItem('streetArtMapTokenData');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const getAccessToken = () => {
  const data = getTokenData();
  return data?.token || null;
};

export const getUserEmail = () => {
  const data = getTokenData();
  return data?.email || localStorage.getItem('userEmail');
};

export const getUnlockedRegions = () => {
  const regions = localStorage.getItem('unlockedRegions');
  if (!regions) {
    return ['East']; // East is always free
  }
  try {
    return JSON.parse(regions);
  } catch {
    return ['East'];
  }
};

export const saveUnlockedRegions = (regions) => {
  localStorage.setItem('unlockedRegions', JSON.stringify(regions));
};

export const getRemainingDays = () => {
  const data = getTokenData();
  if (!data) return 0;
  
  const now = Date.now();
  const remaining = data.expiresAt - now;
  
  if (remaining <= 0) return 0;
  
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
};

export const clearAccess = () => {
  localStorage.removeItem('streetArtMapTokenData');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('unlockedRegions');
};