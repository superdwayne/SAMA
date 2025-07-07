import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import InfoModal from './InfoModal';
import EmailMagicLink from './EmailMagicLink';
import { magicLink } from '../utils/magic-links';
import './Landing.css'; 

// Updated region data - all regions now require purchase
const regions = [
  { 
    id: 'centre', 
    title: 'Centre', 
    description: 'Tourists, tags & tension.<br /> The city\'s loudest gallery', 
    latitude: 52.3728, 
    longitude: 4.8936, 
    isFree: false,
    image: '/images/center.png'
  },
  { 
    id: 'noord', 
    title: 'Noord', 
    description: 'From shipyards to street art. Noord is culture unleashed', 
    latitude: 52.4000, 
    longitude: 4.9000, 
    isFree: false,
    image: '/images/center.png'
  },
  { 
    id: 'east', 
    title: 'East', 
    description: 'East is hip, hungry and covered in color', 
    latitude: 52.3600, 
    longitude: 4.9400, 
    isFree: false,  // No longer free
    image: '/images/center.png' 
  },
  { 
    id: 'nieuw-west', 
    title: 'Nieuw-West', 
    description: 'Emerging street art destination with fresh perspectives', 
    latitude: 52.3700, 
    longitude: 4.8100, 
    isFree: false,  // Now requires purchase like all others
    image: '/images/center.png' 
  },
];

// Removed getRegionFeature - no longer needed for modal

const Landing = () => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  const [unlockedRegions, setUnlockedRegions] = useState([]); // No free regions - all require purchase
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for existing access on component load
  useEffect(() => {
    const checkExistingAccess = () => {
      console.log('🔍 Checking existing access on component load...');
      
      // Check magic link access
      const magicAccess = magicLink.getCurrentAccess();
      if (magicAccess) {
        console.log('✅ Found magic link access:', magicAccess);
        const regions = magicLink.getUnlockedRegions();
        console.log('🎆 Magic link unlocked regions:', regions);
        setUnlockedRegions(regions);
        return;
      }
      
      // Check token-based access
      const tokenData = localStorage.getItem('streetArtMapTokenData');
      if (tokenData) {
        try {
          const data = JSON.parse(tokenData);
          if (Date.now() <= data.expiresAt) {
            console.log('✅ Found token-based access:', data);
            const regions = data.regions || [];  // No default regions
            console.log('🎆 Token unlocked regions:', regions);
            setUnlockedRegions(regions);
            return;
          } else {
            console.log('⏰ Token-based access expired');
          }
        } catch (e) {
          console.error('Error reading token data:', e);
        }
      }
      
      // Check street art access
      const streetArtAccess = localStorage.getItem('streetArtAccess');
      if (streetArtAccess) {
        try {
          const data = JSON.parse(streetArtAccess);
          if (Date.now() <= data.expiresAt) {
            console.log('✅ Found street art access:', data);
            // Map the region name to our regions array
            const regionMap = {
              'Centre': 'Centre',  // Keep Centre as Centre
              'Center': 'Centre',  // Map Center to Centre 
              'Noord': 'Noord',    // Keep Noord as Noord
              'North': 'Noord',    // Map North to Noord
              'East': 'East',      // Keep East as East
              'Oost': 'East',      // Map Oost to East
              'Nieuw-West': 'Nieuw-West',
              'New-West': 'Nieuw-West',
              'Nieuw-west': 'Nieuw-West',  // Handle lowercase variations
              'New-west': 'Nieuw-West'
            };
            const mappedRegion = regionMap[data.region] || data.region;
            console.log('🗺 Mapped region:', data.region, '→', mappedRegion);
            setUnlockedRegions(prev => {
              const newRegions = [...new Set([...prev, mappedRegion])];
              console.log('🎆 Final unlocked regions:', newRegions);
              return newRegions;
            });
            return;
          } else {
            console.log('⏰ Street art access expired');
          }
        } catch (e) {
          console.error('Error reading street art access:', e);
        }
      }
      
      console.log('🎆 No access found, all regions locked');
    };
    
    checkExistingAccess();
  }, []);
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const activated = urlParams.get('activated');
    const magicToken = urlParams.get('magic');
    
    if (paymentSuccess === 'true') {
      setShowPaymentSuccess(true);
      // Clean up URL after showing success message
      window.history.replaceState({}, document.title, '/');
    }
    
    if (activated === 'true') {
      // User just activated via magic link, show a brief success message
      setTimeout(() => {
        navigate('/map');
      }, 1000);
    }
    
    // Handle magic links from emails
    if (magicToken) {
      console.log('🔗 Magic link detected, verifying...');
      handleMagicLink(magicToken);
    }
  }, [location.search, navigate]);
  
  // Handle magic link verification
  const handleMagicLink = async (token) => {
    try {
      const result = await magicLink.verifyMagicToken(token);
      
      if (result.success) {
        console.log('✅ Magic link verified successfully');
        
        // Update unlocked regions based on magic link result
        const newRegions = magicLink.getUnlockedRegions();
        setUnlockedRegions(newRegions);
        
        // Clean URL and redirect to map
        const url = new URL(window.location);
        url.searchParams.delete('magic');
        window.history.replaceState({}, document.title, url.toString());
        
        // Show success message and redirect
        setTimeout(() => {
          navigate('/map?activated=true');
        }, 1000);
      } else {
        console.error('❌ Magic link verification failed:', result.error);
        // Could show an error modal here
        alert('Magic link verification failed: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error verifying magic link:', error);
      alert('Error verifying magic link. Please try again.');
    }
  };
  
  // Helper function to check if a region is unlocked
  const isRegionUnlocked = (regionTitle) => {
    // Create a mapping for both English and Dutch region names
    const regionVariants = {
      'Centre': ['Centre', 'Center'],
      'Noord': ['Noord', 'North'],
      'East': ['East', 'Oost'],
      'Nieuw-West': ['Nieuw-West', 'New-West', 'Nieuw-west', 'New-west']
    };
    
    // Get all possible names for this region
    const possibleNames = regionVariants[regionTitle] || [regionTitle];
    
    // Check if any of the possible names are in unlocked regions
    const hasAccess = possibleNames.some(name => unlockedRegions.includes(name));
    
    console.log(`🔍 Checking access for ${regionTitle}:`, {
      possibleNames,
      unlockedRegions,
      hasAccess
    });
    
    return hasAccess;
  };
  
  // Debug function to manually add Center access (temporary)
  const addCenterAccess = () => {
    const accessData = {
      email: 'superdwayne@gmail.com',
      region: 'Center',
      accessToken: 'CEN-DEBUG-' + Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
    };
    localStorage.setItem('streetArtAccess', JSON.stringify(accessData));
    setUnlockedRegions(prev => [...new Set([...prev, 'Center'])]);
    console.log('✅ Added Center access for debugging');
  };
  
  // Debug function to check current state
  const debugState = () => {
    console.log('=== DEBUG STATE ===');
    console.log('unlockedRegions:', unlockedRegions);
    
    // Show locked vs unlocked for each region
    regions.forEach(region => {
      const isUnlocked = isRegionUnlocked(region.title);
      console.log(`${region.title}: ${isUnlocked ? '🔓 UNLOCKED' : '🔒 LOCKED'}`);
    });
    
    console.log('localStorage streetArtAccess:', localStorage.getItem('streetArtAccess'));
    console.log('localStorage amsterdam_map_access:', localStorage.getItem('amsterdam_map_access'));
    console.log('magicLink.getCurrentAccess():', magicLink.getCurrentAccess());
    console.log('magicLink.getUnlockedRegions():', magicLink.getUnlockedRegions());
    console.log('==================');
  };
  
  // Expose for debugging
  window.addCenterAccess = addCenterAccess;
  window.debugState = debugState;

  // Fix scrolling constraints on mount
  useEffect(() => {
    // Store original styles
    const body = document.body;
    const root = document.getElementById('root');
    
    const originalBodyStyles = {
      position: body.style.position,
      height: body.style.height,
      overflow: body.style.overflow
    };
    
    const originalRootStyles = {
      position: root.style.position,
      height: root.style.height,
      overflow: root.style.overflow
    };
    
    // Apply scrollable styles
    body.style.position = 'static';
    body.style.height = 'auto';
    body.style.overflow = 'auto';
    
    root.style.position = 'static';
    root.style.height = 'auto';
    root.style.overflow = 'visible';
    
    // Cleanup on unmount
    return () => {
      body.style.position = originalBodyStyles.position || '';
      body.style.height = originalBodyStyles.height || '';
      body.style.overflow = originalBodyStyles.overflow || '';
      
      root.style.position = originalRootStyles.position || '';
      root.style.height = originalRootStyles.height || '';
      root.style.overflow = originalRootStyles.overflow || '';
    };
  }, []);

  const handleGetItNow = (region) => {
    console.log('💆 handleGetItNow called for region:', region);
    console.log('🔓 isRegionUnlocked(region.title):', isRegionUnlocked(region.title));
    console.log('🎆 unlockedRegions:', unlockedRegions);
    
    if (region.isFree || isRegionUnlocked(region.title)) {
      // For free regions or unlocked regions, go to the region-specific map
      console.log('✅ Going to map for region:', region.title);
      navigate(`/map?region=${region.title}`);
    } else {
      // For locked regions, go directly to the region detail page (no modal)
      console.log('💼 Going to region detail page for region:', region.id);
      navigate(`/region/${region.id}`);
    }
  };

  // Removed handleClosePreview - no longer needed without modal

  // Removed useEffect for modal handling - region pages are now separate components

  return (
    <div className="landing-new-container">
      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <div className="payment-success-overlay">
          <div className="payment-success-modal">
            
            <h2 
              className="success-title"
              style={{ 
                color: '#3416D8', 
                fontFamily: 'PPNeueMachina-PlainUltrabold, Arial, sans-serif', 
                fontSize: '29px' 
              }}
            >
              Payment Successful!
            </h2>
            <div className="success-message">
              <strong style={{ fontFamily: 'PPNeueMachina-PlainUltrabold, Arial, sans-serif', fontSize: '16px' }}>Thank you for your purchase!</strong>
              <p>We've sent a magic link to your email address.</p>
              <p>Check your inbox and click the link to unlock your map access.</p>
            </div>
            <div className="success-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span className="step-text">Check your email</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span className="step-text">Click the magic link</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span className="step-text">Explore street art!</span>
              </div>
            </div>
            <button 
              className="close-success-btn"
              onClick={() => setShowPaymentSuccess(false)}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      
      {/* Header with logo and title */}
      <header className="landing-new-header">
        <div className="header-row">
          <div className="header-left">
            <img src="images/sama-logo.png" alt="SAMA Logo" className="sama-logo" />
            <div className="header-text">
              <span className="sama-subtitle">Street Art</span>
              <span className="sama-subtitle">Museum</span>
              <span className="sama-subtitle">Amsterdam</span>
            </div>
          </div>
          <div className="header-right">
            <button 
              className="magic-link-button"
              onClick={() => setShowMagicLinkModal(true)}
              title="Already a customer? Get instant access"
            >
              🔗 Magic Link
            </button>
            <button className="info-button" onClick={() => setShowInfoModal(true)}>
              <span className="info-icon">i</span>
            </button>
          </div>
        </div>
        
        <h1 className="main-title">
          <span className="title-line">STREET</span>
          <span className="title-line">ART MAP</span>
          <span className="title-line">AMSTERDAM</span>
        </h1>
      </header>

      {/* Region cards */}
      <div className="region-cards-container">
        {regions.map(region => (
          <div className="region-card-new" key={region.id} style={{ position: 'relative' }}>
            <div className="region-card-row">
              <div className="region-card-text">
                <h2 className="region-title-new">{region.title}</h2>
                <p className="region-description-new">{region.description}</p>
              </div>
              <div className="region-card-image-action">
                <div className="region-image-container">
                  {region.image ? (
                    <>
                      <img
                        src={region.image}
                        alt={region.title}
                        className="region-image"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                      {region.id === 'center' && (
                        <img
                          src="/images/Spray.png"
                          alt="Yellow spray overlay"
                          className="yellow-overlay"
                        />
                      )}
                      <button
                        className={`region-action-btn region-action-btn-overlay${(region.isFree || isRegionUnlocked(region.title)) ? ' open-map-btn free-region' : ' paid-region'}`}
                        onClick={() => handleGetItNow(region)}
                      >
                        {(region.isFree || isRegionUnlocked(region.title)) ? 'Open map' : 'Get it now'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="image-placeholder">
                        <span className="placeholder-text">Image Coming Soon</span>
                      </div>
                      <button
                        className={`region-action-btn region-action-btn-overlay${(region.isFree || isRegionUnlocked(region.title)) ? ' open-map-btn free-region' : ' paid-region'}`}
                        onClick={() => handleGetItNow(region)}
                      >
                        {(region.isFree || isRegionUnlocked(region.title)) ? 'Open map' : 'Get it now'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Lock/Unlock icon at bottom left */}
            <div className={`region-lock-badge${(region.isFree || isRegionUnlocked(region.title)) ? ' unlocked' : ''}`}>
              <img
                src={(region.isFree || isRegionUnlocked(region.title)) ? '/images/unlocked.png' : '/images/locked.png'}
                alt={(region.isFree || isRegionUnlocked(region.title)) ? 'Unlocked' : 'Locked'}
                className="region-lock-icon"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Removed RegionPreview modal - now using dedicated page */}
      
      <InfoModal 
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
      
      {showMagicLinkModal && (
        <EmailMagicLink 
          onSuccess={() => {
            setShowMagicLinkModal(false);
            // Could show a success message here
          }}
          onClose={() => setShowMagicLinkModal(false)}
        />
      )}
    </div>
  );
};

export default Landing;
