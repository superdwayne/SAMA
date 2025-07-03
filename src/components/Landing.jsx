import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import RegionPreview from './RegionPreview';
import InfoModal from './InfoModal';
import EmailMagicLink from './EmailMagicLink';
import { amsterdamRegions } from '../data/regions';
import { magicLink } from '../utils/magic-links';
import './Landing.css'; 

// Updated region data - all regions now require purchase
const regions = [
  { 
    id: 'center', 
    title: 'Center', 
    description: 'Tourists, tags & tension. </br> The city\'s loudest gallery', 
    latitude: 52.3728, 
    longitude: 4.8936, 
    isFree: false,
    image: '/images/center.png'
  },
  { 
    id: 'north', 
    title: 'North', 
    description: 'From shipyards to street art. North is culture unleashed', 
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
    isFree: true,  // This region is free
    image: '/images/center.png' 
  },
];

function getRegionFeature(region) {
  // Map region id/title to amsterdamRegions feature
  const nameMap = {
    'center': 'Centre',   // Map to 'Centre' (what's actually in the data)
    'north': 'North', 
    'east': 'East',
    'nieuw-west': 'Nieuw-West',
  };
  const regionName = nameMap[region.id];
  
  console.log('🗺 Looking for region feature with name:', regionName);
  console.log('🗺 Available regions in amsterdamRegions:', 
    amsterdamRegions.features.map(f => f.properties.name));
  
  const feature = amsterdamRegions.features.find(f => f.properties.name === regionName);
  console.log('🗺 Found feature:', feature);
  
  return feature;
}

const Landing = () => {
  const [previewRegion, setPreviewRegion] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  const [unlockedRegions, setUnlockedRegions] = useState(['Nieuw-West']); // Nieuw-West is free, others require purchase
  const navigate = useNavigate();
  const location = useLocation();
  const [regionFeature, setRegionFeature] = useState(null);
  
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
              'Centre': 'Center',  // Map Stripe "Centre" to "Center"
              'Center': 'Center', 
              'North': 'North',
              'East': 'East',
              'Nieuw-West': 'Nieuw-West'
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
    return unlockedRegions.includes(regionTitle);
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
      // For locked regions, show the preview/payment flow
      console.log('💳 Going to payment for region:', region.id);
      setPreviewRegion(region);
      setRegionFeature(getRegionFeature(region));
      navigate(`/region/${region.id}`);
    }
  };

  const handleClosePreview = () => {
    setPreviewRegion(null);
    setRegionFeature(null);
    navigate('/');
  };

  React.useEffect(() => {
    // Open modal if URL is /region/:id
    console.log('📏 Checking URL pathname:', location.pathname);
    const match = location.pathname.match(/^\/region\/([\w-]+)/);
    console.log('🎯 URL match result:', match);
    
    if (match) {
      const regionId = match[1];
      console.log('🔍 Looking for region with id:', regionId);
      const region = regions.find(r => r.id === regionId);
      console.log('🎆 Found region:', region);
      
      if (region) {
        console.log('✅ Setting preview region:', region.title);
        setPreviewRegion(region);
        const feature = getRegionFeature(region);
        console.log('🗺 Region feature:', feature);
        setRegionFeature(feature);
      } else {
        console.log('❌ No region found for id:', regionId);
      }
    } else {
      console.log('🏠 Not a region URL, clearing preview');
      setPreviewRegion(null);
      setRegionFeature(null);
    }
  }, [location.pathname]);

  return (
    <div className="landing-new-container">
      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <div className="payment-success-overlay">
          <div className="payment-success-modal">
            <div className="success-icon">🎉</div>
            <h2 className="success-title">Payment Successful!</h2>
            <div className="success-message">
              <p><strong>Thank you for your purchase!</strong></p>
              <p>We've sent a magic link to your email address.</p>
              <p><strong>Check your inbox and click the link to unlock your map access.</strong></p>
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

      {previewRegion && regionFeature && (
        <RegionPreview 
          region={previewRegion} 
          regionFeature={regionFeature} 
          onClose={handleClosePreview} 
        />
      )}
      
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
