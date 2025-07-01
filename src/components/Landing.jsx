import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import RegionPreview from './RegionPreview';
import InfoModal from './InfoModal';
import { amsterdamRegions } from '../data/regions';
import './Landing.css'; 

// Updated region data to match your design
const regions = [
  { 
    id: 'center', 
    title: 'Center', 
    description: 'Tourists, tags & tension. The city\'s loudest gallery', 
    latitude: 52.3728, 
    longitude: 4.8936, 
    isFree: false,
    image: '/images/center.png' // You'll need to add this image
  },
  { 
    id: 'north', 
    title: 'North', 
    description: 'From shipyards to street art. North is culture unleashed', 
    latitude: 52.4000, 
    longitude: 4.9000, 
    isFree: false,
    image: '/images/center.png' // You'll need to add this image
  },
  { 
    id: 'east', 
    title: 'East', 
    description: 'East is hip, hungry and covered in color', 
    latitude: 52.3600, 
    longitude: 4.9400, 
    isFree: true,
    image: '/east-region.jpg' // You'll need to add this image
  },
  { 
    id: 'nieuw-west', 
    title: 'Nieuw-West', 
    description: 'Emerging street art destination with fresh perspectives', 
    latitude: 52.3700, 
    longitude: 4.8100, 
    isFree: true,
    image: '/nieuw-west-region.jpg' // You'll need to add this image
  },
];

function getRegionFeature(region) {
  // Map region id/title to amsterdamRegions feature
  const nameMap = {
    'center': 'Centre',
    'north': 'North', 
    'east': 'East',
    'nieuw-west': 'Nieuw-West',
  };
  const regionName = nameMap[region.id];
  return amsterdamRegions.features.find(f => f.properties.name === regionName);
}

const Landing = () => {
  const [previewRegion, setPreviewRegion] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [regionFeature, setRegionFeature] = useState(null);
  
  // Check for payment success parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const activated = urlParams.get('activated');
    
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
  }, [location.search, navigate]);

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
    if (region.isFree || region.id === 'east' || region.id === 'nieuw-west') {
      // For free regions, go to the region-specific map
      navigate(`/map?region=${region.title}`);
    } else {
      // For paid regions, show the preview/payment flow
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
    const match = location.pathname.match(/^\/region\/([\w-]+)/);
    if (match) {
      const region = regions.find(r => r.id === match[1]);
      if (region) {
        setPreviewRegion(region);
        setRegionFeature(getRegionFeature(region));
      }
    } else {
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
        <div className="header-content">
          <img src="images/sama-logo.png" alt="SAMA Logo" className="sama-logo" />
          <div className="header-text">
            <span className="sama-subtitle">Street Art</span>
            <span className="sama-subtitle">Museum</span>
            <span className="sama-subtitle">Amsterdam</span>
          </div>
          <button className="info-button" onClick={() => setShowInfoModal(true)}>
            <span className="info-icon">i</span>
          </button>
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
          <div className="region-card-new" key={region.id}>
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
                        className={`region-action-btn region-action-btn-overlay ${region.isFree ? 'free-region' : 'paid-region'}`}
                        onClick={() => handleGetItNow(region)}
                      >
                        {region.isFree ? 'Open map' : 'Get it now'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="image-placeholder">
                        <span className="placeholder-text">Image Coming Soon</span>
                      </div>
                      <button
                        className={`region-action-btn region-action-btn-overlay ${region.isFree ? 'free-region' : 'paid-region'}`}
                        onClick={() => handleGetItNow(region)}
                      >
                        {region.isFree ? 'Open map' : 'Get it now'}
                      </button>
                    </>
                  )}
                </div>
              </div>
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
    </div>
  );
};

export default Landing;
