import React from 'react';
import './UnlockPrompt.css';

const UnlockPrompt = ({ region, onUnlock, onClose }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleUnlock = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: region.name }),
      });
      const data = await response.json();
      if (data.url) {
        console.log('Stripe Checkout session created:', data.url);
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session.');
        console.error('Failed to create checkout session:', data.error);
      }
    } catch (err) {
      setError('Error creating checkout session.');
      console.error('Error creating checkout session:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unlock-prompt-overlay">
      <div className="unlock-prompt">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="unlock-icon">🔒</div>
        
        <h2>Unlock {region.name} District</h2>
        
        <p className="unlock-description">
          This district contains {region.artworkCount || 0} amazing street art locations, 
          including galleries, legal walls, and curated artworks.
        </p>
        
        <div className="district-highlights">
          <h3>What's included in {region.name}:</h3>
          <ul className="highlights-list">
            <li>📍 {region.artworkCount || 0} Street Art Locations</li>
            <li>🏛️ {region.galleryCount || 0} Galleries & Museums</li>
            <li>🎨 {region.legalWallCount || 0} Legal Walls</li>
            <li>👥 {region.artistCount || 0} Featured Artists</li>
          </ul>
          
          <div className="featured-info">
            <h4>Featured Highlights:</h4>
            <p>{region.featuredInfo || 'Discover amazing street art in this district!'}</p>
          </div>
        </div>
        
        <div className="unlock-single-option">
          <div className="price-display">
            <span className="price">€4.99</span>
            <span className="price-label">One-time payment</span>
          </div>
          
          <button className="unlock-button" onClick={handleUnlock} disabled={loading}>
            {loading ? 'Processing...' : `🔓 Unlock ${region.name} District`}
          </button>
          
          {error && <p className="unlock-error">{error}</p>}
          
          <p className="unlock-note">
            You'll receive a magic link via email after payment for instant access
          </p>
        </div>
        
        <div className="alternative-options">
          <p className="or-text">Or</p>
          <button className="text-button request-magic-link" onClick={() => {
            // Navigate to magic link request
            window.location.href = '/token';
          }}>
            🔗 Already purchased? Request Magic Link
          </button>
        </div>
        
        <p className="premium-note">
          <strong>🎨 Premium Experience:</strong> All regions require purchase to access Amsterdam's best street art locations.
        </p>
      </div>
    </div>
  );
};

export default UnlockPrompt;
