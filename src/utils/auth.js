// Magic link authentication utilities

export const validateMagicLink = async (magicToken) => {
  try {
    console.log('🔍 Validating magic link token...');
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/verify-magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: magicToken }),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Magic link validated successfully');
      
      // Save the access data - ONLY purchased regions
      const accessData = {
        token: magicToken,
        expiresAt: result.expiresAt,
        regions: result.regions, // Only regions from purchases
        email: result.email,
        createdAt: Date.now()
      };
      
      localStorage.setItem('streetArtMapTokenData', JSON.stringify(accessData));
      localStorage.setItem('userEmail', result.email);
      saveUnlockedRegions(result.regions); // Only purchased regions
      
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
    console.error('🔍 API URL:', import.meta.env.VITE_API_URL || 'http://localhost:3001');
    console.error('🔍 Token length:', magicToken ? magicToken.length : 'No token');
    console.error('🔍 Token preview:', magicToken ? magicToken.substring(0, 8) + '...' : 'No token');
    
    return { 
      valid: false, 
      error: 'Network error during validation'
    };
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
  const message = regions.length > 0 
    ? `🎉 Welcome! You now have access to ${regions.length} region${regions.length > 1 ? 's' : ''}: ${regions.join(', ')}`
    : `🎉 Welcome! Please purchase a region to start exploring Amsterdam's street art.`;
  
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

export const getTokenData = () => {
  try {
    const data = localStorage.getItem('streetArtMapTokenData');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const getUserEmail = () => {
  const data = getTokenData();
  return data?.email || localStorage.getItem('userEmail');
};

// UPDATED: No free regions - all regions must be purchased
export const getUnlockedRegions = () => {
  const regions = localStorage.getItem('unlockedRegions');
  if (!regions) {
    return []; // NO FREE REGIONS
  }
  try {
    const parsed = JSON.parse(regions);
    return parsed; // Return only purchased regions
  } catch {
    return [];
  }
};

// UPDATED: Save only purchased regions
export const saveUnlockedRegions = (regions) => {
  // Save only the purchased regions, no automatic free regions
  localStorage.setItem('unlockedRegions', JSON.stringify(regions));
};

// Check if user has access to a specific region
export const hasRegionAccess = (regionName) => {
  const unlockedRegions = getUnlockedRegions();
  return unlockedRegions.includes(regionName);
};

// Get list of locked regions
export const getLockedRegions = () => {
  const allRegions = ['Centre', 'Noord', 'East', 'Nieuw-West', 'West', 'South', 'South-East'];
  const unlockedRegions = getUnlockedRegions();
  return allRegions.filter(region => !unlockedRegions.includes(region));
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
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/send-magic-link`, {
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
