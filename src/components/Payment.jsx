import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Payment.css';

const Payment = ({ setUnlockedRegions }) => {
  const navigate = useNavigate();
  const { region } = useParams();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  
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
  const displayRegion = region ? region.charAt(0).toUpperCase() + region.slice(1) : 'Centre';

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    // Direct Stripe links for each region
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
      <button className="popup-back-btn payment-back-btn" onClick={() => navigate(-1)} aria-label="Back">
        <span className="back-arrow">←</span>
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
          <div className="included-stats">
            <div className="stat-item">
              <span className="stat-number">{info.artworks}</span>
              <span className="stat-label">Artworks</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{info.galleries}</span>
              <span className="stat-label">Galleries</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{info.walls}</span>
              <span className="stat-label">Legal Walls</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{info.artists}</span>
              <span className="stat-label">Artists</span>
            </div>
          </div>
        </div>
        
        {/* Price and Payment Button */}
        <div className="payment-section">
          <div className="price-section">
            <div className="lock-icon">🔒</div>
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
