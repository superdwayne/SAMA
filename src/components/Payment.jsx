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
    'Centre': { artworks: 25, galleries: 3, walls: 2, artists: 15 },
    'North': { artworks: 40, galleries: 5, walls: 4, artists: 25 },
    'South': { artworks: 20, galleries: 2, walls: 1, artists: 12 },
    'East': { artworks: 30, galleries: 2, walls: 3, artists: 18 },
    'West': { artworks: 22, galleries: 3, walls: 2, artists: 14 },
    'South-East': { artworks: 18, galleries: 1, walls: 2, artists: 10 },
    'Nieuw-West': { artworks: 15, galleries: 1, walls: 3, artists: 8 }
  };
  
  const info = regionInfo[region] || { artworks: 0, galleries: 0, walls: 0, artists: 0 };

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    // Use hardcoded Stripe payment link for Centre region
    if (region === 'Centre') {
      window.location.href = 'https://buy.stripe.com/5kQ8wQ4nF7GM1irgZx1oI01';
      return;
    }
    
    // Fall back to API for other regions
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ region }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;

    } catch (error) {
      console.error('Payment error:', error);
      setError('Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-wrapper">
        <button 
          className="back-button"
          onClick={() => navigate('/')}
        >
          ← Back to Map
        </button>

        <div className="payment-content">
          <h1>Unlock {region === 'Centre' ? 'Centrum' : region} District</h1>
          
          <div className="purchase-summary">
            <h2>What's Included</h2>
            
            <div className="district-stats">
              <div className="stat-item">
                <span className="stat-icon">📍</span>
                <span className="stat-number">{info.artworks}</span>
                <span className="stat-label">Artworks</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🏛️</span>
                <span className="stat-number">{info.galleries}</span>
                <span className="stat-label">Galleries</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🎨</span>
                <span className="stat-number">{info.walls}</span>
                <span className="stat-label">Legal Walls</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">👥</span>
                <span className="stat-number">{info.artists}</span>
                <span className="stat-label">Artists</span>
              </div>
            </div>
            
            <ul className="features-list">
              <li>✓ Full access to {region === 'Centre' ? 'Centrum' : region} district</li>
              <li>✓ Detailed location information</li>
              <li>✓ Navigation to all artworks</li>
              <li>✓ Artist background & stories</li>
              <li>✓ Opening hours for galleries</li>
              <li>✓ You'll receive a unique access token via email after payment</li>
            </ul>
            
            <div className="price-box">
              <span className="price">€4.99</span>
              <span className="price-note">One-time payment</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={processing}
            className="pay-button"
          >
            {processing ? 'Redirecting...' : (region === 'Centre' ? '🔓 Unlock Centrum District' : 'Pay €4.99 with Stripe')}
          </button>

          <p className="payment-info">
            🔒 Secure payment powered by Stripe
          </p>

          <div className="payment-footer">
            <p>By purchasing, you agree to our terms of service</p>
            <p>Questions? Contact: info@streetartmuseumamsterdam.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
