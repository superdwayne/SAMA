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
    'center': { artworks: 25, galleries: 3, walls: 2, artists: 15, description: 'Tourists, tags & tension.\nThe city\'s loudest gallery' },
    'Center': { artworks: 25, galleries: 3, walls: 2, artists: 15, description: 'Tourists, tags & tension.\nThe city\'s loudest gallery' },
    'North': { artworks: 40, galleries: 5, walls: 4, artists: 25, description: 'From shipyards to street art.\nNorth is culture unleashed' },
    'East': { artworks: 30, galleries: 2, walls: 3, artists: 18, description: 'East is hip, hungry and\ncovered in color' }
  };
  
  const info = regionInfo[region] || regionInfo['center'];
  const displayRegion = region === 'center' || region === 'Center' ? 'CENTER' : region.toUpperCase();

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    // Use hardcoded Stripe payment link for all regions
    window.location.href = 'https://buy.stripe.com/5kQ8wQ4nF7GM1irgZx1oI01';
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
        <h1 className="unlock-title">UNLOCK<br/>{displayRegion} DISTRICT</h1>
        
        {/* Featured Highlight Section */}
        <div className="featured-highlight">
          <h2 className="highlight-title">Featured Highlight</h2>
          <p className="highlight-description">{info.description}</p>
        </div>
        
        {/* What is included Section */}
        <div className="included-section">
          <h3 className="included-title">What is included:</h3>
          
          <div className="stats-list-new">
            <div className="stat-item-new">
              <span className="stat-icon-new">📍</span>
              <span className="stat-text-new">{info.artworks} Artworks</span>
            </div>
            <div className="stat-item-new">
              <span className="stat-icon-new">🏛️</span>
              <span className="stat-text-new">{info.galleries} Galleries</span>
            </div>
            <div className="stat-item-new">
              <span className="stat-icon-new">🎨</span>
              <span className="stat-text-new">{info.walls} Legal Walls</span>
            </div>
            <div className="stat-item-new">
              <span className="stat-icon-new">👥</span>
              <span className="stat-text-new">{info.artists} Featured Artists</span>
            </div>
          </div>
        </div>
        
        {/* Price Section */}
        <div className="price-section">
          <div className="lock-icon">🔒</div>
          <div className="price-large">€4,99</div>
          <div className="price-subtitle">One-time payment</div>
          <div className="price-description">
            Lifetime access to all<br/>
            content in this district
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="error-message-new">
            {error}
          </div>
        )}
        
        {/* Unlock Button */}
        <button
          onClick={handlePayment}
          disabled={processing}
          className="unlock-button"
        >
          {processing ? 'Redirecting...' : `Unlock ${displayRegion} District`}
        </button>
      </div>
      
      {/* Bottom indicator */}
      <div className="bottom-indicator"></div>
    </div>
  );
};

export default Payment;