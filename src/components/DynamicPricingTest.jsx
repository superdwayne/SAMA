import React, { useState } from 'react';
import DynamicPricing from './DynamicPricing.jsx';
import './DynamicPricingTest.css';

const DynamicPricingTest = () => {
  const [selectedRegion, setSelectedRegion] = useState('centre');
  const [selectedPrice, setSelectedPrice] = useState(null);

  const regions = [
    { id: 'centre', name: 'Centre' },
    { id: 'noord', name: 'North' },
    { id: 'east', name: 'East' },
    { id: 'nieuw-west', name: 'Nieuw-West' },
    { id: 'south', name: 'South' },
    { id: 'south-east', name: 'South-East' },
    { id: 'west', name: 'West' }
  ];

  const handlePriceSelect = (price) => {
    setSelectedPrice(price);
    console.log('Selected price:', price);
  };

  return (
    <div className="dynamic-pricing-test">
      <div className="test-header">
        <h1>Dynamic Pricing Test</h1>
        <p>Test the dynamic pricing component with different regions</p>
      </div>

      <div className="test-controls">
        <label htmlFor="region-select">Select Region:</label>
        <select 
          id="region-select"
          value={selectedRegion} 
          onChange={(e) => setSelectedRegion(e.target.value)}
        >
          {regions.map(region => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
      </div>

      <div className="test-content">
        <DynamicPricing 
          regionId={selectedRegion} 
          onPriceSelect={handlePriceSelect}
        />
      </div>

      {selectedPrice && (
        <div className="selected-price-info">
          <h3>Selected Price Details:</h3>
          <div className="price-details">
            <p><strong>Price ID:</strong> {selectedPrice.id}</p>
            <p><strong>Amount:</strong> {selectedPrice.formattedPrice}</p>
            <p><strong>Type:</strong> {selectedPrice.type}</p>
            {selectedPrice.recurring && (
              <p><strong>Recurring:</strong> {selectedPrice.recurring.formattedInterval}</p>
            )}
            <p><strong>Default:</strong> {selectedPrice.isDefault ? 'Yes' : 'No'}</p>
          </div>
        </div>
      )}

      <div className="test-instructions">
        <h3>How to Use:</h3>
        <ol>
          <li>Select a region from the dropdown above</li>
          <li>The component will fetch all pricing options for that region</li>
          <li>Click on different pricing options to see them selected</li>
          <li>The default price (usually recurring) will be highlighted</li>
          <li>Check the browser console for detailed logging</li>
        </ol>
        
        <h3>Next Steps:</h3>
        <ol>
          <li>Run <code>node get-product-ids.js</code> to get your actual product IDs</li>
          <li>Update the <code>REGION_PRODUCT_IDS</code> in <code>src/utils/pricing.js</code></li>
          <li>Deploy the updated API to Vercel</li>
          <li>Integrate the <code>DynamicPricing</code> component into your payment pages</li>
        </ol>
      </div>
    </div>
  );
};

export default DynamicPricingTest; 