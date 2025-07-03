// Updated authentication utilities with database-backed magic links

// Token structure: {token: string, expiresAt: timestamp, regions: array, email: string}
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

export const validateMagicLink = async (magicToken) => {
  try {
    console.log('🔍 Validating magic link token...');
    
    const response = await fetch('/api/validate-magic-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: magicToken }),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Magic link validated successfully');
      
      // Save the access data
      const accessData = {
        token: magicToken,
        expiresAt: result.expiresAt,
        regions: result.regions,
        email: result.email,
        createdAt: Date.now()
      };
      
      localStorage.setItem('streetArtMapTokenData', JSON.stringify(accessData));
      localStorage.setItem('userEmail', result.email);
      saveUnlockedRegions(result.regions);
      
      return { 
        valid: true, 
        data: accessData
      };
    } else {
      console.log('❌ Magic link validation failed:', result.error);
      return { 
        valid: false, 
        error: result.error || result.message || 'Invalid magic link'
      };
    }
  } catch (error) {
    console.error('❌ Error validating magic link:', error);
    return { 
      valid: false, 
      error: 'Network error during validation'
    };
  }
};

export const validateAccessToken = async (token) => {
  try {
    // Check if we have a magic link token in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const magicToken = urlParams.get('magic');
    
    if (magicToken) {
      console.log('🔗 Found magic link token in URL');
      
      // Validate magic link
      const magicResult = await validateMagicLink(magicToken);
      
      if (magicResult.valid) {
        // Clean up URL
        const url = new URL(window.location);
        url.searchParams.delete('magic');
        window.history.replaceState({}, document.title, url.toString());
        
        return magicResult;
      } else {
        return { valid: false, error: magicResult.error };
      }
    }
    
    // Fallback to regular token validation
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
    
    // Local validation for development
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
    
    return { valid: false, error: 'Token not found or expired' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Handle magic link authentication on page load
export const handleMagicLinkAuth = async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const magicToken = urlParams.get('magic');
    
    if (magicToken) {
      console.log('🔗 Processing magic link authentication...');
      
      const result = await validateMagicLink(magicToken);
      
      if (result.valid) {
        console.log('✅ Magic link authentication successful');
        
        // Clean up URL
        const url = new URL(window.location);
        url.searchParams.delete('magic');
        window.history.replaceState({}, document.title, url.toString());
        
        // Show success message
        showAuthSuccessMessage(result.data.email, result.data.regions);
        
        return {
          success: true,
          regions: result.data.regions,
          email: result.data.email
        };
      } else {
        console.log('❌ Magic link authentication failed:', result.error);
        showAuthErrorMessage(result.error);
        
        return {
          success: false,
          error: result.error
        };
      }
    }
    
    return { success: false, error: 'No magic link found' };
  } catch (error) {
    console.error('❌ Error handling magic link auth:', error);
    return { success: false, error: error.message };
  }
};

// Show success message after authentication
function showAuthSuccessMessage(email, regions) {
  const message = `🎉 Welcome! You now have access to ${regions.length} region${regions.length > 1 ? 's' : ''}: ${regions.join(', ')}`;
  
  // Create and show a temporary success notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    max-width: 400px;
    font-family: Arial, sans-serif;
  `;
  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">Authentication Successful!</div>
    <div style="font-size: 14px;">${message}</div>
  `;
  
  document.body.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

// Show error message for authentication failure
function showAuthErrorMessage(error) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dc3545;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    max-width: 400px;
    font-family: Arial, sans-serif;
  `;
  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">Authentication Failed</div>
    <div style="font-size: 14px;">${error}</div>
  `;
  
  document.body.appendChild(notification);
  
  // Remove notification after 8 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 8000);
}

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
    return ['Nieuw-West']; // Default free region
  }
  try {
    const parsed = JSON.parse(regions);
    // Always include the free region
    return [...new Set([...parsed, 'Nieuw-West'])];
  } catch {
    return ['Nieuw-West'];
  }
};

export const saveUnlockedRegions = (regions) => {
  // Always include the free region
  const allRegions = [...new Set([...regions, 'Nieuw-West'])];
  localStorage.setItem('unlockedRegions', JSON.stringify(allRegions));
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

// Send magic link request
export const requestMagicLink = async (email) => {
  try {
    const response = await fetch('/api/send-magic-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      return {
        success: true,
        message: result.message,
        regions: result.regions
      };
    } else {
      return {
        success: false,
        error: result.error,
        message: result.message,
        code: result.code
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Network error',
      message: 'Failed to send magic link. Please check your connection and try again.'
    };
  }
};
