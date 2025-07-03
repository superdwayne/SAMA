import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NoAccessPrompt.css';

const NoAccessPrompt = ({ onRequestMagicLink }) => {
  const navigate = useNavigate();

  const availableRegions = [
    { name: 'Centre', price: '€4.99', highlights: 'Historic canals, STRAAT Museum, Jordaan gems' },
    { name: 'Noord', price: '€4.99', highlights: 'NDSM wharf, massive murals, creative hub' },
    { name: 'East', price: '€4.99', highlights: 'Multicultural art, Javastraat, diverse styles' },
    { name: 'Nieuw-West', price: '€4.99', highlights: 'Emerging artists, experimental works, fresh perspectives' }
  ];

  return (
    <div className="no-access-overlay">
      <div className="no-access-prompt">
        <div className="welcome-section">
          <h1>🎨 Welcome to Amsterdam Street Art Map</h1>
          <p className="welcome-description">
            Discover Amsterdam's incredible street art scene through our interactive map. 
            Each district offers unique artworks, hidden gems, and cultural stories.
          </p>
        </div>

        <div className="regions-grid">
          <h2>Choose Your Adventure</h2>
          <div className="regions-list">
            {availableRegions.map((region) => (
              <div key={region.name} className="region-card">
                <div className="region-header">
                  <h3>{region.name}</h3>
                  <span className="region-price">{region.price}</span>
                </div>
                <p className="region-highlights">{region.highlights}</p>
                <button 
                  className="buy-region-btn"
                  onClick={() => navigate(`/payment/${region.name}`)}
                >
                  🔓 Unlock {region.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="existing-customer">
          <h3>Already a customer?</h3>
          <p>Request a magic link to access your purchased regions</p>
          <button 
            className="magic-link-btn"
            onClick={() => navigate('/token')}
          >
            🔗 Request Magic Link
          </button>
        </div>

        <div className="why-premium">
          <h3>Why Premium?</h3>
          <ul className="premium-benefits">
            <li>🗺️ Precise GPS locations of street art</li>
            <li>🎨 Artist information and artwork stories</li>
            <li>📱 Mobile-optimized navigation</li>
            <li>🔄 Regular updates with new discoveries</li>
            <li>🏛️ Gallery and museum recommendations</li>
            <li>🎯 Curated routes and walking tours</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NoAccessPrompt;
