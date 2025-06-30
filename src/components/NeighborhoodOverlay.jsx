import React from 'react';
import QRCode from 'qrcode.react';
import { getCategoryColor } from '../data/neighborhoods';
import './NeighborhoodOverlay.css';

const NeighborhoodOverlay = ({ neighborhood, description, position, qrCodeUrl, isUnlocked, category, icon }) => {
  // Create a shorter description for display
  const getShortDescription = (desc) => {
    if (desc.length <= 60) return desc;
    return desc.substring(0, 60) + '...';
  };

  const categoryColor = getCategoryColor(category);

  return (
    <div 
      className={`neighborhood-overlay ${!isUnlocked ? 'locked' : ''}`}
    >
      <div className="overlay-header">
        <span className="category-icon">{icon}</span>
        <h3 className="neighborhood-title">{neighborhood}</h3>
      </div>
      
      <p className="neighborhood-description">
        {getShortDescription(description)}
      </p>
      
      
      {!isUnlocked && (
        <div className="unlock-badge">
          🔒
        </div>
      )}
    </div>
  );
};

export default NeighborhoodOverlay;