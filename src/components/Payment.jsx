import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { trackPaymentEvent, trackRegionInteraction, trackUserJourney } from '../utils/analytics';
import './Payment.css';

const Payment = ({ setUnlockedRegions }) => {
  const navigate = useNavigate();
  const { region } = useParams();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Enable scrolling for payment page
  useEffect(() => {
    console.log('Payment page mounted, region:', region);
    
    // Add classes for CSS styling
    document.body.classList.add('payment-page');
    const root = document.getElementById('root');
    if (root) {
      root.classList.add('payment-container');
    }
    
    // Minimal style override for mobile scrolling
    const body = document.body;
    if (body && window.innerWidth <= 768) {
      body.style.position = 'static';
      body.style.overflow = 'auto';
      if (root) {
        root.style.position = 'static';
        root.style.overflow = 'auto';
      }
    }
    
    // Cleanup
    return () => {
      document.body.classList.remove('payment-page');
      if (root) {
        root.classList.remove('payment-container');
      }
    };
  }, [region]);
  
  // Get region info
  const regionInfo = {
    'centre': { artworks: 25, galleries: 3, walls: 2, artists: 15, description: 'Tourists, tags & tension.\nThe city\'s loudest gallery' },
    'center': { artworks: 25, galleries: 3, walls: 2, artists: 15, description: 'Tourists, tags & tension.\nThe city\'s loudest gallery' },
    'noord': { artworks: 40, galleries: 5, walls: 4, artists: 25, description: 'From shipyards to street art.\nNoord is culture unleashed' },
    'north': { artworks: 40, galleries: 5, walls: 4, artists: 25, description: 'From shipyards to street art.\nNorth is culture unleashed' },
    'east': { artworks: 30, galleries: 2, walls: 3, artists: 18, description: 'East is hip, hungry and\ncovered in color' },
    'nieuw-west': { artworks: 15, galleries: 1, walls: 3, artists: 8, description: 'Emerging street art destination\nwith fresh perspectives' }
  };
  
  const info = regionInfo[region?.toLowerCase()] || regionInfo['centre'];
  
  // Properly format region names to match Stripe links
  const formatRegionName = (regionStr) => {
    if (!regionStr) return 'Centre';
    const lower = regionStr.toLowerCase();
    if (lower === 'nieuw-west' || lower === 'new-west') return 'Nieuw-West';
    if (lower === 'centre' || lower === 'center') return 'Centre';
    if (lower === 'noord' || lower === 'north') return 'Noord';
    if (lower === 'east' || lower === 'oost') return 'East';
    return regionStr.charAt(0).toUpperCase() + regionStr.slice(1);
  };
  
  const displayRegion = formatRegionName(region);
  
  // Track payment page view
  useEffect(() => {
    trackRegionInteraction(displayRegion, 'payment_page_viewed');
    trackUserJourney('payment_page_view', { region: displayRegion });
  }, [displayRegion]);

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    // Direct Stripe links for each region (with embedded metadata)
    const stripeLinks = {
      'Centre': 'https://buy.stripe.com/5kQ8wQ4nF7GM1irgZx1oI01',
      'Center': 'https://buy.stripe.com/5kQ8wQ4nF7GM1irgZx1oI01', // Alternative spelling
      'Noord': 'https://buy.stripe.com/00w00k4nF8KQgdlgZx1oI03',
      'North': 'https://buy.stripe.com/00w00k4nF8KQgdlgZx1oI03', // Alternative spelling
      'East': 'https://buy.stripe.com/cNi8wQbQ70ekgdl38H1oI04',
      'Nieuw-West': 'https://buy.stripe.com/3cI4gA4nF3qw6CL9x51oI06',
      'New-West': 'https://buy.stripe.com/3cI4gA4nF3qw6CL9x51oI06' // Alternative spelling
    };

    const stripeUrl = stripeLinks[displayRegion];
    
    if (stripeUrl) {
      console.log('🔗 Redirecting to Stripe for', displayRegion, '→', stripeUrl);
      
      // Track payment initiation
      trackPaymentEvent(displayRegion, 4.99, 'EUR', 'redirected');
      trackUserJourney('payment_redirect_to_stripe', { region: displayRegion });
      
      window.location.href = stripeUrl;
    } else {
      console.error('❌ No Stripe link found for region:', displayRegion);
      setError(`No payment link configured for ${displayRegion}`);
      setProcessing(false);
    }
  };

  return (
    <div className="payment-container-new">
      {/* Back Button */}
      <button className="popup-back-btn payment-back-btn" onClick={() => navigate(`/region/${region}`)} aria-label="Back">
        <span className="back-arrow">
          <img src="/images/back.png" alt="Back" className="back-arrow-img" />
        </span>
      </button>
      
      {/* Main Content */}
      <div className="payment-content-new">
        {/* Header */}
        <h1 className="unlock-title">UNLOCK<br/>{displayRegion.toUpperCase()} DISTRICT</h1>
        
        {/* Featured Highlight Section */}
        <div className="featured-highlight">
          <h2 className="highlight-title">Featured Highlight</h2>
          <p className="highlight-description">{info.description}</p>
        </div>
        
        {/* What is included Section */}
        <div className="included-section">
          <h3 className="included-title">What is included:</h3>
          <div className="included-row">
            <span className="stat-icon">📍</span>
            <span className="stat-number">{info.artworks}</span>
            <span className="stat-label">Artworks</span>

            <span className="stat-icon">🏛️</span>
            <span className="stat-number">{info.galleries}</span>
            <span className="stat-label">Galleries</span>

            <span className="stat-icon">🎨</span>
            <span className="stat-number">{info.walls}</span>
            <span className="stat-label">Legal Walls</span>

            <span className="stat-icon">👥</span>
            <span className="stat-number">{info.artists}</span>
            <span className="stat-label">Artists</span>
          </div>
        </div>
        
        {/* Price and Payment Button */}
        <div className="payment-section">
          <div className="price-section">
            <div className="lock-icon">
              <img src="/images/unlockdis.png" alt="Locked" className="unlock-icon-img" />
            </div>
            <div className="price-large">€4,99</div>
            <div className="price-subtitle">One-time payment</div>
            <div className="price-description">
              Lifetime access to all<br/>
              content in this district
            </div>
          </div>
          
          <button 
            className="unlock-button" 
            onClick={handlePayment}
            disabled={processing}
          >
            {processing ? 'Redirecting to payment...' : `Unlock ${displayRegion.toUpperCase()} District`}
          </button>
          
          {error && (
            <div className="payment-error">
              ❌ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payment;
