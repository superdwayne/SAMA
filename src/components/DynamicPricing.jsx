import React, { useState, useEffect } from 'react';
import { fetchAllRegionPrices } from '../utils/pricing.js';
import './DynamicPricing.css';

const DynamicPricing = ({ regionId, onPriceSelect }) => {
  const [pricingData, setPricingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPriceId, setSelectedPriceId] = useState(null);

  useEffect(() => {
    const loadPricing = async () => {
      if (!regionId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Loading pricing for region:', regionId);
        const data = await fetchAllRegionPrices(regionId);
        
        setPricingData(data);
        
        // Set the default price as selected
        if (data.allPrices && data.allPrices.length > 0) {
          const defaultPrice = data.allPrices.find(p => p.isDefault) || data.allPrices[0];
          setSelectedPriceId(defaultPrice.id);
        }
        
        console.log('✅ Pricing loaded:', data);
      } catch (err) {
        console.error('❌ Failed to load pricing:', err);
        setError('Failed to load pricing options');
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
  }, [regionId]);

  const handlePriceSelect = (priceId) => {
    setSelectedPriceId(priceId);
    if (onPriceSelect) {
      const selectedPrice = pricingData.allPrices.find(p => p.id === priceId);
      onPriceSelect(selectedPrice);
    }
  };

  if (loading) {
    return (
      <div className="dynamic-pricing">
        <div className="pricing-loading">
          <div className="loading-spinner"></div>
          <p>Loading pricing options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dynamic-pricing">
        <div className="pricing-error">
          <p>⚠️ {error}</p>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!pricingData || !pricingData.allPrices || pricingData.allPrices.length === 0) {
    return (
      <div className="dynamic-pricing">
        <div className="pricing-error">
          <p>No pricing options available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dynamic-pricing">
      <h3 className="pricing-title">Pricing</h3>
      
      <div className="pricing-options">
        {pricingData.allPrices.map((price, index) => (
          <div 
            key={price.id}
            className={`pricing-option ${price.isDefault ? 'default' : ''} ${selectedPriceId === price.id ? 'selected' : ''}`}
            onClick={() => handlePriceSelect(price.id)}
          >
            <div className="price-info">
              <div className="price-amount">{price.formattedPrice}</div>
              <div className="price-interval">
                {price.recurring ? price.recurring.formattedInterval : 'One-off'}
              </div>
            </div>
            
            <div className="price-badge">
              {price.isDefault ? (
                <span className="badge default-badge">Default</span>
              ) : (
                <span className="badge alternative-badge">Limited Access</span>
              )}
            </div>
            
            <div className="price-actions">
              <button className="more-options-btn">
                <span>⋯</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {pricingData.allPrices.length > 1 && (
        <div className="pricing-note">
          <p>💡 The default option is recommended for most users</p>
        </div>
      )}
    </div>
  );
};

export default DynamicPricing; 